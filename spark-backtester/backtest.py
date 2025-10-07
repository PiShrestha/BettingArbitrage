import argparse
from dataclasses import dataclass
from typing import List

from pyspark.sql import SparkSession, functions as F, Window


@dataclass
class TradeSummary:
    event_id: str
    market_type: str
    timestamp: str
    stake: float
    payout: float
    profit: float


def parse_args():
    parser = argparse.ArgumentParser(description="Spark arbitrage backtester")
    parser.add_argument("--snapshots", required=True, help="Parquet path of odds snapshots")
    parser.add_argument("--bankroll", type=float, default=1000.0)
    parser.add_argument("--output", required=True, help="Output directory for results")
    return parser.parse_args()


def main():
    args = parse_args()
    spark = (
        SparkSession.builder.appName("arbitrage-backtester")
        .config("spark.sql.shuffle.partitions", "200")
        .getOrCreate()
    )

    df = spark.read.parquet(args.snapshots)

    # Normalize provider odds into per-event structures
    window_spec = Window.partitionBy("event_id", "market_type", "selection", "timestamp")
    df = df.withColumn("best_odds", F.max("decimal_odds").over(window_spec))
    df = df.filter(F.col("decimal_odds") == F.col("best_odds"))

    # Aggregate selections per event/time
    grouped = (
        df.groupBy("event_id", "market_type", "timestamp")
        .agg(
            F.collect_list(F.struct(
                F.col("selection").alias("selection"),
                F.col("provider").alias("provider"),
                F.col("decimal_odds").alias("odds"),
            )).alias("quotes"),
            F.max("winner").alias("winner")
        )
    )

    # Explode quotes to compute implied probabilities
    exploded = grouped.select(
        "event_id",
        "market_type",
        "timestamp",
        "winner",
        F.explode("quotes").alias("quote")
    ).selectExpr(
        "event_id",
        "market_type",
        "timestamp",
        "winner",
        "quote.selection as selection",
        "quote.provider as provider",
        "quote.odds as odds",
        "1 / quote.odds as implied_probability"
    )

    summed = exploded.groupBy("event_id", "market_type", "timestamp").agg(
        F.collect_list(
            F.struct(
                "selection",
                "provider",
                "odds",
                "implied_probability"
            )
        ).alias("legs"),
        F.max("winner").alias("winner"),
        F.sum("implied_probability").alias("sum_implied")
    )

    def simulate(row):
        legs: List[dict] = row["legs"]
        sum_implied = row["sum_implied"]
        if sum_implied >= 1.0 or len(legs) < 2:
            return None

        return_per_leg = []
        stake_total = args.bankroll
        for leg in legs:
            stake_fraction = leg["implied_probability"] / sum_implied
            stake_amount = stake_fraction * stake_total
            payout = stake_amount * leg["odds"]
            return_per_leg.append((leg["selection"], payout))

        guaranteed_profit = return_per_leg[0][1] - stake_total
        winner = row["winner"]
        realized = next((payout for selection, payout in return_per_leg if selection == winner), 0.0) - stake_total

        return TradeSummary(
            event_id=row["event_id"],
            market_type=row["market_type"],
            timestamp=str(row["timestamp"]),
            stake=stake_total,
            payout=realized + stake_total,
            profit=realized,
        )

    trades = summed.rdd.map(simulate).filter(lambda x: x is not None)
    trades_df = spark.createDataFrame(trades)
    trades_df.write.mode("overwrite").parquet(f"{args.output}/trades")

    metrics = trades_df.selectExpr(
        "avg(profit) as mean_profit",
        "stddev_pop(profit) as std_profit",
        "sum(profit) as total_profit",
        "sum(case when profit > 0 then 1 else 0 end) / count(*) as hit_rate"
    ).collect()[0]

    metrics_df = spark.createDataFrame([(metrics.mean_profit, metrics.std_profit, metrics.total_profit, metrics.hit_rate)],
                                       ["mean_profit", "std_profit", "total_profit", "hit_rate"])
    metrics_df.write.mode("overwrite").json(f"{args.output}/metrics")

    spark.stop()


if __name__ == "__main__":
    main()
