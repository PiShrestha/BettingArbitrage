import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, Tooltip, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Cell } from 'recharts';
import { Opportunity, BettingSite } from "@shared/schema";

interface OddsHeatmapProps {
  opportunities: Opportunity[];
  bettingSites: BettingSite[];
}

export function OddsHeatmap({ opportunities, bettingSites }: OddsHeatmapProps) {
  // Transform opportunities data for the heatmap
  const heatmapData = opportunities.map(opp => ({
    x: parseFloat(opp.site1Odds),
    y: parseFloat(opp.site2Odds),
    z: parseFloat(opp.profit),
    event: opp.event,
    profit: parseFloat(opp.profit)
  }));

  // Calculate color based on profit percentage
  const getColor = (profit: number) => {
    // Red to green gradient based on profit
    if (profit <= 0) return '#ff0000';
    const intensity = Math.min(profit / 15, 1); // Max intensity at 15% profit
    return `rgb(${Math.round(255 * (1 - intensity))}, ${Math.round(255 * intensity)}, 0)`;
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Odds Comparison Heatmap</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <XAxis
              type="number"
              dataKey="x"
              name="Site 1 Odds"
              domain={['auto', 'auto']}
              label={{ value: 'Site 1 Odds', position: 'bottom' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Site 2 Odds"
              domain={['auto', 'auto']}
              label={{ value: 'Site 2 Odds', angle: -90, position: 'left' }}
            />
            <ZAxis
              type="number"
              dataKey="z"
              range={[50, 400]}
              name="Profit"
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background/95 p-2 rounded-lg border shadow-sm">
                      <p className="font-medium">{data.event}</p>
                      <p>Site 1 Odds: {data.x.toFixed(2)}</p>
                      <p>Site 2 Odds: {data.y.toFixed(2)}</p>
                      <p className="text-green-500">Profit: {data.profit.toFixed(2)}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter data={heatmapData}>
              {heatmapData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.profit)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
