import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export interface DbLeak {
  id: string;
  type: string;
  title: string;
  description: string | null;
  estimated_savings: number;
  priority: string;
  vendor: string | null;
  detected_at: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: dbLeaks }, { data: profile }] = await Promise.all([
    supabase
      .from("leaks")
      .select("id, type, title, description, estimated_savings, priority, vendor, detected_at")
      .eq("user_id", user!.id)
      .eq("status", "open")
      .order("estimated_savings", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("plan")
      .eq("id", user!.id)
      .single(),
  ]);

  return (
    <DashboardClient
      dbLeaks={dbLeaks ?? []}
      plan={profile?.plan ?? "trial"}
      paymentSuccess={searchParams.success === "true"}
    />
  );
}
