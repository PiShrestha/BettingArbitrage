import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BettingSite, insertBettingSiteSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SitesPage() {
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const { data: sites, isLoading } = useQuery<BettingSite[]>({
    queryKey: ["/api/betting-sites"],
  });

  const form = useForm({
    resolver: zodResolver(insertBettingSiteSchema),
    defaultValues: {
      name: "",
      url: "",
    },
  });

  const addSiteMutation = useMutation({
    mutationFn: async (data: { name: string; url: string }) => {
      const res = await apiRequest("POST", "/api/betting-sites", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/betting-sites"] });
      setIsAdding(false);
      form.reset();
      toast({
        title: "Success",
        description: "Betting site added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Betting Sites</h1>
          <Button onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? "Cancel" : "Add New Site"}
          </Button>
        </div>

        {isAdding && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add New Betting Site</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => addSiteMutation.mutate(data))} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Site Name</Label>
                    <Input {...form.register("name")} placeholder="e.g. Bet365" />
                  </div>
                  <div>
                    <Label htmlFor="url">Website URL</Label>
                    <Input {...form.register("url")} placeholder="e.g. https://bet365.com" />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={addSiteMutation.isPending}
                  >
                    {addSiteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add Site"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites?.map((site) => (
            <Card key={site.id}>
              <CardHeader>
                <CardTitle>{site.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <a 
                  href={site.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Visit Site
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}