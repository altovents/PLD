import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("company_context")
    .select("trusted_vendors, budget_categories, alert_thresholds, industry, employees_count")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json(data ?? {});
}
