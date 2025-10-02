import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SocialPage() {
  return (
    <Layout>
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Community</h1>
        <Card>
          <CardHeader>
            <CardTitle>Community Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Community posts and discussions will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
