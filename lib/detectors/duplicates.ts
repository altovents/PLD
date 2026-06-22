import type { DbTransaction, LeakCandidate, CompanyContext } from "@/lib/types";

/**
 * Détecte les doublons : même montant + même fournisseur/description
 * dans une fenêtre de 7 jours.
 *
 * Roadmap: "Même montant + même bénéficiaire dans un intervalle de 7 jours"
 */
export function detectDuplicates(transactions: DbTransaction[], context?: CompanyContext): LeakCandidate[] {
  const debits = transactions.filter((tx) => tx.amount < 0);
  const results: LeakCandidate[] = [];
  const flagged = new Set<string>();
  const maxDays = context?.alert_thresholds?.duplicate_days ?? 7;
  const trustedVendors = (context?.trusted_vendors ?? []).map((v) => v.toLowerCase());

  for (let i = 0; i < debits.length; i++) {
    const a = debits[i];
    const keyA = `${a.vendor ?? a.description?.slice(0, 30)}`;

    // Skip trusted vendors
    if (keyA && trustedVendors.includes(keyA.toLowerCase())) continue;

    for (let j = i + 1; j < debits.length; j++) {
      const b = debits[j];

      // Skip already flagged pairs
      if (flagged.has(a.id) && flagged.has(b.id)) continue;

      // Same vendor/description key
      const keyB = `${b.vendor ?? b.description?.slice(0, 30)}`;
      if (!keyA || !keyB || keyA.toLowerCase() !== keyB.toLowerCase()) continue;

      // Same amount (within 2% to handle rounding)
      const amtA = Math.abs(a.amount);
      const amtB = Math.abs(b.amount);
      if (Math.abs(amtA - amtB) / amtA > 0.02) continue;

      // Within configured days window
      const daysDiff =
        Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysDiff > maxDays) continue;

      flagged.add(a.id);
      flagged.add(b.id);

      const vendor = a.vendor ?? a.description ?? "Fournisseur inconnu";
      results.push({
        type: "duplicate",
        title: `Double paiement — ${vendor}`,
        description: `2 paiements identiques de ${amtA.toFixed(2)} CHF détectés en ${Math.round(daysDiff)} jour(s).`,
        estimated_savings: amtB, // the duplicate payment
        priority: "high",
        vendor,
        trigger_transaction_ids: [a.id, b.id],
        detection_logic: `Même fournisseur "${vendor}", montant ${amtA.toFixed(2)} CHF, intervalle ${Math.round(daysDiff)} jour(s) — seuil configuré : ${maxDays} jours`,
        comparison_basis: { transaction_a: { id: a.id, date: a.date, amount: amtA }, transaction_b: { id: b.id, date: b.date, amount: amtB }, days_apart: Math.round(daysDiff) },
      });
    }
  }

  return results;
}
