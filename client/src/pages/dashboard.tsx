import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Opportunity, BettingSite } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { OddsHeatmap } from "@/components/OddsHeatmap";
import { Layout } from "@/components/layout/Layout";

export default function Dashboard() {
  const { data: opportunities, isLoading: loadingOpportunities } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities"],
  });

  const { data: bettingSites, isLoading: loadingSites } = useQuery<BettingSite[]>({
    queryKey: ["/api/betting-sites"],
  });

  if (loadingOpportunities || loadingSites) {
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
        <h1 className="text-3xl font-bold mb-8">Arbitrage Opportunities</h1>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <StatsCard
            title="Total Opportunities"
            value={opportunities?.length.toString() || "0"}
          />
          <StatsCard
            title="Average Profit"
            value={`${calculateAverageProfit(opportunities || [])}%`}
          />
          <StatsCard
            title="Best Opportunity"
            value={`${findBestProfit(opportunities || [])}%`}
          />
        </div>

        {/* Add the heatmap visualization */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <OddsHeatmap 
            opportunities={opportunities || []} 
            bettingSites={bettingSites || []} 
          />
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
                  <TableHead>Site 1</TableHead>
                  <TableHead>Odds 1</TableHead>
                  <TableHead>Site 2</TableHead>
                  <TableHead>Odds 2</TableHead>
                  <TableHead>Profit %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities?.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell>{opp.event}</TableCell>
                    <TableCell>{opp.sport}</TableCell>
                    <TableCell>
                      {bettingSites?.find((site) => site.id === opp.site1Id)?.name}
                    </TableCell>
                    <TableCell>{parseFloat(opp.site1Odds).toFixed(2)}</TableCell>
                    <TableCell>
                      {bettingSites?.find((site) => site.id === opp.site2Id)?.name}
                    </TableCell>
                    <TableCell>{parseFloat(opp.site2Odds).toFixed(2)}</TableCell>
                    <TableCell className="text-green-600">
                      {parseFloat(opp.profit).toFixed(2)}%
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

function calculateAverageProfit(opportunities: Opportunity[]): string {
  if (opportunities.length === 0) return "0.00";
  const sum = opportunities.reduce((acc, opp) => acc + parseFloat(opp.profit), 0);
  return (sum / opportunities.length).toFixed(2);
}

function findBestProfit(opportunities: Opportunity[]): string {
  if (opportunities.length === 0) return "0.00";
  const best = Math.max(...opportunities.map((opp) => parseFloat(opp.profit)));
  return best.toFixed(2);
}