import { useAuth } from "@/hooks/use-auth";
import Dashboard from "./dashboard";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main>
      <Dashboard />
    </main>
  );
}
