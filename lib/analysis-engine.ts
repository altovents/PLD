import { createClient } from "@supabase/supabase-js";
import { detectDuplicates } from "@/lib/detectors/duplicates";
import { detectUnusedSubscriptions } from "@/lib/detectors/unused-subscriptions";
import { detectPriceIncreases } from "@/lib/detectors/price-increase";
import { detectProgressiveIncreases } from "@/lib/detectors/progressive-increase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DbTransaction {
  id: string;
  date: string;
  amount: number;
  description: string | null;
  vendor: string | null;
  category: string | null;
}

export interface LeakCandidate {
  type: "duplicate" | "unused_subscription" | "price_increase" | "progressive_increase";
  title: string;
  description: string;
  estimated_savings: number;
  priority: "high" | "medium" | "low";
  vendor: string | null;
}

export interface AnalysisResult {
  leaks_count: number;
  total_savings: number;
  by_type: Record<string, number>;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Runs all 4 detectors for a given user, clears old open leaks, and saves new ones.
 * Uses the service-role client to bypass RLS.
 */
export async function runAnalysis(userId: string): Promise<AnalysisResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch all transactions for this user
  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("id, date, amount, description, vendor, category")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (txError) throw new Error(`Failed to fetch transactions: ${txError.message}`);
  if (!transactions || transactions.length === 0) {
    return { leaks_count: 0, total_savings: 0, by_type: {} };
  }

  // 2. Run detectors
  const duplicates = detectDuplicates(transactions);
  const subscriptions = detectUnusedSubscriptions(transactions);
  const priceIncreases = detectPriceIncreases(transactions);

  // Pass price_increase vendors to avoid double-counting in progressive detector
  const flaggedVendors = new Set(
    priceIncreases.map((l) => l.vendor).filter((v): v is string => v !== null)
  );
  const progressiveIncreases = detectProgressiveIncreases(transactions, flaggedVendors);

  const allLeaks: LeakCandidate[] = [
    ...duplicates,
    ...subscriptions,
    ...priceIncreases,
    ...progressiveIncreases,
  ];

  // 3. Delete existing open leaks for this user (full refresh on each analysis run)
  await supabase
    .from("leaks")
    .delete()
    .eq("user_id", userId)
    .eq("status", "open");

  // 4. Insert new leaks (if any)
  if (allLeaks.length > 0) {
    const rows = allLeaks.map((leak) => ({
      user_id: userId,
      type: leak.type,
      title: leak.title,
      description: leak.description,
      estimated_savings: leak.estimated_savings,
      priority: leak.priority,
      vendor: leak.vendor,
      status: "open",
    }));

    const { error: insertError } = await supabase.from("leaks").insert(rows);
    if (insertError) throw new Error(`Failed to save leaks: ${insertError.message}`);
  }

  // 5. Build summary
  const by_type: Record<string, number> = {};
  for (const leak of allLeaks) {
    by_type[leak.type] = (by_type[leak.type] ?? 0) + 1;
  }

  const total_savings = allLeaks.reduce((s, l) => s + l.estimated_savings, 0);

  return {
    leaks_count: allLeaks.length,
    total_savings: Math.round(total_savings),
    by_type,
  };
}
