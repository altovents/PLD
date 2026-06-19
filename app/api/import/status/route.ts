import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PLAN_LIMITS } from "@/lib/plan-limits";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = (profile?.plan as string | undefined) ?? "trial";
  const limitConfig = PLAN_LIMITS[plan] ?? PLAN_LIMITS.trial;

  const db = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let countQuery = db
    .from("imports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (limitConfig.period === "monthly") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    countQuery = countQuery.gte("created_at", startOfMonth.toISOString());
  }

  const { count } = await countQuery;

  return NextResponse.json({
    plan,
    used: count ?? 0,
    limit: limitConfig.imports === Infinity ? null : limitConfig.imports,
    period: limitConfig.period,
  });
}
