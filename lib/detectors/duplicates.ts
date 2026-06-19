import type { DbTransaction, LeakCandidate } from "@/lib/analysis-engine";

/**
 * Détecte les doublons : même montant + même fournisseur/description
 * dans une fenêtre de 7 jours.
 *
 * Roadmap: "Même montant + même bénéficiaire dans un intervalle de 7 jours"
 */
export function detectDuplicates(transactions: DbTransaction[]): LeakCandidate[] {
  const debits = transactions.filter((tx) => tx.amount < 0);
  const results: LeakCandidate[] = [];
  const flagged = new Set<string>();

  for (let i = 0; i < debits.length; i++) {
    const a = debits[i];
    const keyA = `${a.vendor ?? a.description?.slice(0, 30)}`;

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

      // Within 7 days
      const daysDiff =
        Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysDiff > 7) continue;

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
      });
    }
  }

  return results;
}
