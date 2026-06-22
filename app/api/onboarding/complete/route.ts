import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    industry: string;
    employees_count: string;
    trusted_vendors: string[];
    budget_categories: Record<string, number>;
    alert_thresholds: {
      price_increase_pct: number;
      duplicate_days: number;
      progressive_drift_pct: number;
    };
  };

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await admin
    .from("company_context")
    .upsert({
      user_id: user.id,
      industry: body.industry,
      employees_count: body.employees_count,
      trusted_vendors: body.trusted_vendors,
      budget_categories: body.budget_categories,
      alert_thresholds: body.alert_thresholds,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Onboarding save error:", error);
    return NextResponse.json({ error: "Failed to save context" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
