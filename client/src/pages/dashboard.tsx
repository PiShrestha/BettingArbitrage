import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { OddsHeatmap } from "@/components/OddsHeatmap";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type {
  ArbitrageOpportunity,
  Market,
  SimulationSummary,
} from "@shared/schema";

const OPPORTUNITIES_ENDPOINT = "/api/arbitrage/opportunities" as const;
const MARKETS_ENDPOINT = "/api/markets" as const;

export default function Dashboard() {
  const { toast } = useToast();
  const [simulationResults, setSimulationResults] = useState<
    Record<string, SimulationSummary>
  >({});
  const [activeSimulationKey, setActiveSimulationKey] = useState<string | null>(
    null
  );

  const { data: opportunities, isLoading: loadingOpportunities } = useQuery<
    ArbitrageOpportunity[]
  >({
    queryKey: [OPPORTUNITIES_ENDPOINT],
  });

  const { data: markets, isLoading: loadingMarkets } = useQuery<Market[]>({
    queryKey: [MARKETS_ENDPOINT],
  });

  const isLoading = loadingOpportunities || loadingMarkets;

  const stats = useMemo(() => {
    const opps = opportunities ?? [];
    const marketSnapshots = markets ?? [];
    const withMetrics = opps.filter((opp) => Boolean(opp.metrics));
    const averageExpectedValue = withMetrics.length
      ? withMetrics.reduce(
          (acc, opp) => acc + (opp.metrics?.expectedValue ?? 0),
          0
        ) / withMetrics.length
      : 0;
    const averageWinProbability = withMetrics.length
      ? withMetrics.reduce(
          (acc, opp) => acc + (opp.metrics?.winProbability ?? 0),
          0
        ) / withMetrics.length
      : 0;
    return {
      totalOpportunities: opps.length,
      averageProfit: calculateAverageProfit(opps),
      bestProfit: findBestProfit(opps),
      marketCount: marketSnapshots.length,
      averageExpectedValue,
      averageWinProbability,
    };
  }, [opportunities, markets]);

  const simulationMutation = useMutation({
    mutationKey: ["simulate"],
    mutationFn: async ({
      opportunity,
      trials,
    }: {
      opportunity: ArbitrageOpportunity;
      trials?: number;
    }) => {
      const response = await fetch("/api/arbitrage/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity,
          trials,
          bankroll: opportunity.bankroll,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Simulation request failed");
      }

      return (await response.json()) as SimulationSummary;
    },
    onSuccess: (data, variables) => {
      const key = opportunityKey(variables.opportunity);
      setSimulationResults((prev) => ({ ...prev, [key]: data }));
      setActiveSimulationKey(null);
      toast({
        title: "Simulation complete",
        description: `Mean profit $${data.mean.toFixed(2)} · P(>0) ${(
          data.pPositive * 100
        ).toFixed(1)}%`,
      });
    },
    onError: (error: unknown) => {
      setActiveSimulationKey(null);
      toast({
        title: "Simulation failed",
        description:
          error instanceof Error ? error.message : "Unable to run simulation",
        variant: "destructive",
      });
    },
  });

  const runSimulation = useCallback(
    (opportunity: ArbitrageOpportunity) => {
      const key = opportunityKey(opportunity);
      setActiveSimulationKey(key);
      simulationMutation.mutate({ opportunity, trials: 5000 });
    },
    [simulationMutation]
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold">Arbitrage Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            Updated every {DEFAULT_REFRESH_INTERVAL_SECONDS} seconds from
            fixture feeds
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6 mb-8">
          <StatsCard
            title="Total Opportunities"
            value={stats.totalOpportunities.toString()}
          />
          <StatsCard
            title="Average Profit"
            value={`${stats.averageProfit.toFixed(2)}%`}
          />
          <StatsCard
            title="Best Edge"
            value={`${stats.bestProfit.toFixed(2)}%`}
          />
          <StatsCard
            title="Markets Tracked"
            value={stats.marketCount.toString()}
          />
          <StatsCard
            title="Avg Expected Value"
            value={`$${stats.averageExpectedValue.toFixed(2)}`}
          />
          <StatsCard
            title="Avg Win Probability"
            value={`${(stats.averageWinProbability * 100).toFixed(1)}%`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <OddsHeatmap opportunities={opportunities ?? []} />
          <RecentMarkets markets={markets ?? []} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Latest Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Profit %</TableHead>
                  <TableHead>Sum Implied</TableHead>
                  <TableHead>Stakes</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Simulation</TableHead>
                  <TableHead>Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(opportunities ?? []).map((opp) => (
                  <TableRow
                    key={`${opp.eventId}-${opp.marketName}-${opp.createdAt}`}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{opp.eventName}</span>
                        {opp.league && (
                          <span className="text-xs text-muted-foreground">
                            {opp.league}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {opp.sport ?? "-"}
                    </TableCell>
                    <TableCell>{opp.marketName}</TableCell>
                    <TableCell className="text-green-600">
                      {(opp.guaranteedProfitFraction * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      {(opp.sumImpliedProbability * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <StakeList stakes={opp.stakes} />
                    </TableCell>
                    <TableCell>
                      <OpportunityMetrics metrics={opp.metrics} />
                    </TableCell>
                    <TableCell>
                      <SimulationCell
                        opportunity={opp}
                        simulation={simulationResults[opportunityKey(opp)]}
                        onSimulate={runSimulation}
                        isLoading={
                          activeSimulationKey === opportunityKey(opp) &&
                          simulationMutation.isPending
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(opp.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function StatsCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

const DEFAULT_REFRESH_INTERVAL_SECONDS = 15;

function calculateAverageProfit(opportunities: ArbitrageOpportunity[]): number {
  if (opportunities.length === 0) return 0;
  const sum = opportunities.reduce(
    (acc, opp) => acc + opp.guaranteedProfitFraction,
    0
  );
  return (sum / opportunities.length) * 100;
}

function opportunityKey(opportunity: ArbitrageOpportunity): string {
  return `${opportunity.eventId}-${opportunity.marketName}`;
}

function findBestProfit(opportunities: ArbitrageOpportunity[]): number {
  if (opportunities.length === 0) return 0;
  return (
    Math.max(...opportunities.map((opp) => opp.guaranteedProfitFraction)) * 100
  );
}

interface StakeListProps {
  stakes: ArbitrageOpportunity["stakes"];
}

function StakeList({ stakes }: StakeListProps) {
  return (
    <div className="space-y-1">
      {stakes.map((stake) => (
        <div
          key={`${stake.providerId}-${stake.runner}`}
          className="rounded-md border p-2"
        >
          <div className="flex justify-between text-xs font-medium">
            <span>{stake.providerName}</span>
            <span>@ {stake.odds.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stake.runner}</span>
            <span>
              Stake ${stake.stakeAmount.toFixed(2)} (
              {(stake.stakeFraction * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OpportunityMetrics({
  metrics,
}: {
  metrics?: ArbitrageOpportunity["metrics"];
}) {
  if (!metrics) {
    return <p className="text-xs text-muted-foreground">Metrics unavailable</p>;
  }

  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">EV</span>
        <span className="font-medium">${metrics.expectedValue.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">σ</span>
        <span className="font-medium">
          ${metrics.standardDeviation.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">P(Win)</span>
        <span className="font-medium">
          {(metrics.winProbability * 100).toFixed(1)}%
        </span>
      </div>
      {metrics.kellyFraction !== undefined && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Kelly</span>
          <span className="font-medium">
            {(metrics.kellyFraction * 100).toFixed(1)}%
          </span>
        </div>
      )}
      {metrics.sharpeRatio !== undefined && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Sharpe</span>
          <span className="font-medium">{metrics.sharpeRatio.toFixed(2)}</span>
        </div>
      )}
      {metrics.valueAtRisk !== undefined && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">VaR95</span>
          <span className="font-medium">${metrics.valueAtRisk.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

function SimulationCell({
  opportunity,
  simulation,
  onSimulate,
  isLoading,
}: {
  opportunity: ArbitrageOpportunity;
  simulation?: SimulationSummary;
  onSimulate: (opportunity: ArbitrageOpportunity) => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onSimulate(opportunity)}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running…
          </span>
        ) : (
          "Simulate"
        )}
      </Button>
      {simulation ? (
        <div className="rounded-md border p-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trials</span>
            <span>{simulation.trials}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">μ</span>
            <span>${simulation.mean.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">σ</span>
            <span>${simulation.stddev.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{"P(>0)"}</span>
            <span>{(simulation.pPositive * 100).toFixed(1)}%</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Run Monte Carlo to view distribution
        </p>
      )}
    </div>
  );
}

function RecentMarkets({ markets }: { markets: Market[] }) {
  const latestMarkets = markets.slice(0, 12);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Market Snapshots</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {latestMarkets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Waiting for the next ingestion tick...
          </p>
        ) : (
          latestMarkets.map((market) => (
            <div
              key={`${market.id}-${market.timestamp}`}
              className="rounded-md border p-3"
            >
              <div className="flex justify-between text-sm font-medium">
                <span>{market.eventName}</span>
                <span>{market.provider.name}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>
                  {market.runner.name} • {market.marketName}
                </span>
                <span>{market.oddsDecimal.toFixed(2)}x</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(market.timestamp), {
                  addSuffix: true,
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
