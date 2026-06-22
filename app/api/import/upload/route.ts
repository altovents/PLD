import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import { runAnalysis } from "@/lib/analysis-engine";

export const dynamic = "force-dynamic";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface IncomingTransaction {
  date: string; // ISO from JSON serialization
  description: string;
  vendor: string;
  amount: number;
  currency: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transactions, filename, format } = await request.json() as {
    transactions: IncomingTransaction[];
    leaks: unknown; // ignored — analysis runs server-side
    filename: string;
    format: string;
  };

  // ── 1. Check plan limit ──────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = (profile?.plan as string | undefined) ?? "trial";
  const limitConfig = PLAN_LIMITS[plan] ?? PLAN_LIMITS.trial;

  const db = admin();

  if (limitConfig.imports !== Infinity) {
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
    const used = count ?? 0;

    if (used >= limitConfig.imports) {
      return NextResponse.json(
        {
          error: "limit_reached",
          used,
          limit: limitConfig.imports,
          period: limitConfig.period,
          plan,
        },
        { status: 403 }
      );
    }
  }

  // ── 2. Replace transactions (CSV = full history export) ──────────────────────
  await db.from("transactions").delete().eq("user_id", user.id);

  if (transactions.length > 0) {
    const rows = transactions.map((t) => ({
      user_id: user.id,
      amount: t.amount,
      currency: t.currency || "CHF",
      description: t.description,
      vendor: t.vendor,
      // date is ISO string, extract YYYY-MM-DD for the date column
      date: new Date(t.date).toISOString().split("T")[0],
      category: "other" as const,
    }));

    // Insert in batches of 500 to stay within Supabase payload limits
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from("transactions").insert(rows.slice(i, i + 500));
      if (error) {
        console.error("Failed to insert transactions batch:", error);
        return NextResponse.json({ error: "Failed to save transactions" }, { status: 500 });
      }
    }
  }

  // ── 3. Run analysis with the server-side engine (respects structural costs filter) ──
  const analysis = await runAnalysis(user.id);

  // ── 4. Record the import ─────────────────────────────────────────────────────
  await db.from("imports").insert({
    user_id: user.id,
    filename,
    transaction_count: transactions.length,
    leaks_count: analysis.leaks_count,
    format,
  });

  return NextResponse.json({
    ok: true,
    leaks_count: analysis.leaks_count,
    transactions_count: transactions.length,
  });
}
