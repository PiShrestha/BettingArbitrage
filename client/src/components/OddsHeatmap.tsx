import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  Tooltip,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Cell,
} from "recharts";
import type { ArbitrageOpportunity } from "@shared/schema";

interface OddsHeatmapProps {
  opportunities: ArbitrageOpportunity[];
}

type HeatmapDatum = {
  x: number; // stake percentage
  y: number; // odds
  z: number; // stake amount
  event: string;
  provider: string;
  runner: string;
  profitPercent: number;
  stakeAmount: number;
};

export function OddsHeatmap({ opportunities }: OddsHeatmapProps) {
  const heatmapData: HeatmapDatum[] = opportunities.flatMap((opp) =>
    opp.stakes.map((stake) => ({
      x: stake.stakeFraction * 100,
      y: stake.odds,
      z: stake.stakeAmount,
      event: opp.eventName,
      provider: stake.providerName,
      runner: stake.runner,
      profitPercent: opp.guaranteedProfitFraction * 100,
      stakeAmount: stake.stakeAmount,
    }))
  );

  const getColor = (profitPercent: number) => {
    if (profitPercent <= 0) return "#ef4444"; // red
    const intensity = Math.min(profitPercent / 10, 1);
    const green = Math.round(180 + intensity * 75);
    const red = Math.round(220 - intensity * 120);
    return `rgb(${red}, ${green}, 60)`;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Stake Allocation Heatmap</CardTitle>
      </CardHeader>
      <CardContent className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis
              type="number"
              dataKey="x"
              name="Stake (%)"
              domain={[0, 100]}
              label={{ value: "Stake (% of bankroll)", position: "bottom" }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Odds"
              domain={["auto", "auto"]}
              label={{ value: "Odds", angle: -90, position: "left" }}
            />
            <ZAxis type="number" dataKey="z" range={[40, 300]} name="Stake" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as HeatmapDatum;
                  return (
                    <div className="bg-background/95 p-2 rounded-lg border shadow-sm text-xs space-y-1">
                      <p className="font-medium text-sm">{data.event}</p>
                      <p>
                        <span className="font-medium">{data.provider}</span> ·{" "}
                        {data.runner}
                      </p>
                      <p>Stake: ${data.stakeAmount.toFixed(2)}</p>
                      <p>Stake %: {data.x.toFixed(1)}%</p>
                      <p>Odds: {data.y.toFixed(2)}x</p>
                      <p className="text-green-500">
                        Opportunity Edge: {data.profitPercent.toFixed(2)}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter data={heatmapData}>
              {heatmapData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColor(entry.profitPercent)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
