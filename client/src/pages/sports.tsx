import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SportsPage() {
  return (
    <Layout>
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Sports</h1>
        <Card>
          <CardHeader>
            <CardTitle>Followed Sports and Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Your followed sports and teams will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
