import { createClient } from "@supabase/supabase-js";
import { detectDuplicates } from "@/lib/detectors/duplicates";
import { detectUnusedSubscriptions } from "@/lib/detectors/unused-subscriptions";
import { detectPriceIncreases } from "@/lib/detectors/price-increase";
import { detectProgressiveIncreases } from "@/lib/detectors/progressive-increase";
import { detectOverlappingServices } from "@/lib/detectors/overlapping-services";
import { detectGhostReactivations } from "@/lib/detectors/ghost-reactivation";
import type { DbTransaction, CompanyContext, LeakCandidate } from "@/lib/types";

export type { DbTransaction, CompanyContext, LeakCandidate };

export interface AnalysisResult {
  leaks_count: number;
  total_savings: number;
  by_type: Record<string, number>;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Runs all 6 detectors for a given user, clears old open leaks, and saves new ones.
 * Uses the service-role client to bypass RLS.
 *
 * Deduplication order:
 *  1. overlapping_services  (highest signal — structural doublon)
 *  2. ghost_reactivation    (involuntary reactivation)
 *  3. unused_subscription   (skip vendors already in 1 or 2)
 *  4. duplicate             (exact-amount duplicates — independent)
 *  5. price_increase        (skip vendors in 1–3)
 *  6. progressive_increase  (skip vendors in 1–5)
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

  // Fetch company context for custom thresholds
  const { data: contextRow } = await supabase
    .from("company_context")
    .select("alert_thresholds, trusted_vendors, budget_categories")
    .eq("user_id", userId)
    .single();

  const context: CompanyContext = contextRow ?? {};

  // 2. Run detectors in deduplication order

  // Step 1 — overlapping services (structural doublons)
  const overlapping = detectOverlappingServices(transactions);

  // Step 2 — ghost reactivations
  const ghost = detectGhostReactivations(transactions);

  // Build excluded-vendor set for downstream detectors
  const excludedVendors = new Set<string>([
    ...overlapping.map((l) => l.vendor).filter((v): v is string => v !== null),
    ...ghost.map((l) => l.vendor).filter((v): v is string => v !== null),
    // Also exclude ALL vendors referenced in overlapping alerts (not just the first vendor)
    ...overlapping.flatMap((l) =>
      Array.isArray((l.comparison_basis as { vendors?: string[] })?.vendors)
        ? ((l.comparison_basis as { vendors: string[] }).vendors)
        : []
    ),
  ]);

  // Step 3 — unused subscriptions (skip doublon & ghost vendors, skip variable-billing)
  const subscriptions = detectUnusedSubscriptions(transactions, context, excludedVendors);

  // Step 4 — exact duplicates (independent, no vendor exclusion needed)
  const duplicates = detectDuplicates(transactions, context);

  // Step 5 — price increases (skip vendors already flagged in steps 1–3)
  const subscriptionVendors = new Set(
    subscriptions.map((l) => l.vendor).filter((v): v is string => v !== null)
  );
  const duplicateVendors = new Set(
    duplicates.map((l) => l.vendor).filter((v): v is string => v !== null)
  );

  const flaggedForPrice = new Set<string>([
    ...excludedVendors,
    ...subscriptionVendors,
    ...duplicateVendors,
  ]);

  const priceIncreases = detectPriceIncreases(transactions, context);
  const filteredPriceIncreases = priceIncreases.filter(
    (l) => !l.vendor || !flaggedForPrice.has(l.vendor)
  );

  // Step 6 — progressive increases (skip vendors already covered by any detector above)
  const priceVendors = new Set(
    filteredPriceIncreases.map((l) => l.vendor).filter((v): v is string => v !== null)
  );
  const allFlaggedVendors = new Set<string>([
    ...flaggedForPrice,
    ...priceVendors,
  ]);

  const progressiveIncreases = detectProgressiveIncreases(transactions, allFlaggedVendors, context);

  const allLeaks: LeakCandidate[] = [
    ...overlapping,
    ...ghost,
    ...subscriptions,
    ...duplicates,
    ...filteredPriceIncreases,
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
      trigger_transaction_ids: leak.trigger_transaction_ids ?? [],
      detection_logic: leak.detection_logic ?? null,
      comparison_basis: leak.comparison_basis ?? {},
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
