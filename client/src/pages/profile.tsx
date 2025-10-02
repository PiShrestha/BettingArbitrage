import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Layout>
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Profile</h1>
          <Button 
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                {isEditing ? (
                  <Input id="username" defaultValue={user?.username} />
                ) : (
                  <p>{user?.username}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input id="email" type="email" defaultValue={user?.email} />
                ) : (
                  <p>{user?.email}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="notifications">Email Notifications</Label>
                <Switch 
                  id="notifications" 
                  checked={user?.notificationsEnabled}
                  disabled={!isEditing}
                />
              </div>
              {isEditing && (
                <Button className="w-full">Save Changes</Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Minimum Profit Threshold</Label>
                {isEditing ? (
                  <Input type="number" placeholder="5%" />
                ) : (
                  <p>Not set</p>
                )}
              </div>
              <div>
                <Label>Maximum Bet Size</Label>
                {isEditing ? (
                  <Input type="number" placeholder="1000" />
                ) : (
                  <p>Not set</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}