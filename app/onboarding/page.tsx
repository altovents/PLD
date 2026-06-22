"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INDUSTRIES = [
  { value: "restauration", label: "Restauration & Hôtellerie", icon: "🍽️" },
  { value: "industrie",    label: "Industrie & Production",    icon: "🏭" },
  { value: "services",     label: "Services professionnels",   icon: "💼" },
  { value: "commerce",     label: "Commerce & Distribution",   icon: "🛒" },
  { value: "sante",        label: "Santé & Médical",           icon: "🏥" },
  { value: "autre",        label: "Autre secteur",             icon: "🏢" },
];

const EMPLOYEE_RANGES = [
  { value: "1-5",   label: "1 à 5 personnes" },
  { value: "6-20",  label: "6 à 20 personnes" },
  { value: "21-50", label: "21 à 50 personnes" },
  { value: "51-200",label: "51 à 200 personnes" },
  { value: "200+",  label: "Plus de 200 personnes" },
];

const CATEGORY_LABELS: Record<string, string> = {
  logiciels:     "Logiciels & SaaS",
  telecoms:      "Télécom & Internet",
  fournitures:   "Fournitures & Matériel",
  maintenance:   "Maintenance & Réparations",
  marketing:     "Marketing & Publicité",
  formation:     "Formation & RH",
  assurances:    "Assurances",
  energie:       "Énergie & Utilities",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [industry, setIndustry] = useState("");
  const [employees, setEmployees] = useState("");
  const [trustedVendorInput, setTrustedVendorInput] = useState("");
  const [trustedVendors, setTrustedVendors] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [thresholds, setThresholds] = useState({
    price_increase_pct: "10",
    duplicate_days: "7",
    progressive_drift_pct: "15",
  });

  function addVendor() {
    const v = trustedVendorInput.trim();
    if (v && !trustedVendors.includes(v)) {
      setTrustedVendors([...trustedVendors, v]);
    }
    setTrustedVendorInput("");
  }

  function removeVendor(v: string) {
    setTrustedVendors(trustedVendors.filter((x) => x !== v));
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        industry,
        employees_count: employees,
        trusted_vendors: trustedVendors,
        budget_categories: Object.fromEntries(
          Object.entries(budgets)
            .filter(([, v]) => v !== "" && !isNaN(Number(v)))
            .map(([k, v]) => [k, Number(v)])
        ),
        alert_thresholds: {
          price_increase_pct: Number(thresholds.price_increase_pct) || 10,
          duplicate_days: Number(thresholds.duplicate_days) || 7,
          progressive_drift_pct: Number(thresholds.progressive_drift_pct) || 15,
        },
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/dashboard");
    } else {
      setError("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  }

  const progressPct = Math.round((step / 4) * 100);

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-[#e85d04] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="p-8">
        <div className="mb-6">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Étape {step} sur 4
          </span>
          <h1 className="text-2xl font-bold text-[#1e3a5f] mt-1">
            {step === 1 && "Parlez-nous de votre entreprise"}
            {step === 2 && "Vos fournisseurs de confiance"}
            {step === 3 && "Vos budgets par catégorie"}
            {step === 4 && "Seuils d'alerte"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 1 && "Ces informations permettent d'adapter les analyses à votre secteur."}
            {step === 2 && "Les fournisseurs listés ici ne déclencheront pas d'alerte \"hausse anormale\"."}
            {step === 3 && "Optionnel — aide à contextualiser vos dépenses (peut être complété plus tard)."}
            {step === 4 && "Définissez à partir de quel seuil une variation est considérée comme anormale."}
          </p>
        </div>

        {/* Step 1 — Industry + employees */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Secteur d&apos;activité</label>
              <div className="grid grid-cols-2 gap-3">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind.value}
                    onClick={() => setIndustry(ind.value)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${
                      industry === ind.value
                        ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]"
                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                    }`}
                  >
                    <span className="text-xl">{ind.icon}</span>
                    {ind.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Taille de l&apos;entreprise</label>
              <div className="space-y-2">
                {EMPLOYEE_RANGES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setEmployees(r.value)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      employees === r.value
                        ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]"
                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Trusted vendors */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-xl p-3">
              Exemple : votre fiduciaire, votre fournisseur d&apos;énergie principal, votre assurance de base — des fournisseurs dont les variations de prix sont normales ou déjà connues.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={trustedVendorInput}
                onChange={(e) => setTrustedVendorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addVendor()}
                placeholder="Nom du fournisseur…"
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
              <button
                onClick={addVendor}
                className="px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#162c45] transition-colors"
              >
                Ajouter
              </button>
            </div>
            {trustedVendors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {trustedVendors.map((v) => (
                  <span
                    key={v}
                    className="flex items-center gap-1.5 bg-[#1e3a5f]/10 text-[#1e3a5f] text-sm px-3 py-1.5 rounded-full font-medium"
                  >
                    {v}
                    <button
                      onClick={() => removeVendor(v)}
                      className="text-[#1e3a5f]/50 hover:text-[#1e3a5f] leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Aucun fournisseur de confiance ajouté (vous pourrez le faire plus tard dans les paramètres).</p>
            )}
          </div>
        )}

        {/* Step 3 — Budgets */}
        {step === 3 && (
          <div className="space-y-3">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">{label}</label>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="Budget mensuel"
                    value={budgets[key] ?? ""}
                    onChange={(e) => setBudgets({ ...budgets, [key]: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                  <span className="text-sm text-gray-400 w-10">CHF</span>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 mt-2">Tous les champs sont optionnels. Laissez vide si inconnu.</p>
          </div>
        )}

        {/* Step 4 — Alert thresholds */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-4">
              {[
                {
                  key: "price_increase_pct" as const,
                  label: "Seuil hausse soudaine",
                  sublabel: "Alerte si un fournisseur augmente de plus de X% vs les 3 mois précédents",
                  suffix: "%",
                  default: "10",
                },
                {
                  key: "duplicate_days" as const,
                  label: "Fenêtre doublon",
                  sublabel: "Considérer comme doublon si même montant + même fournisseur en moins de X jours",
                  suffix: "jours",
                  default: "7",
                },
                {
                  key: "progressive_drift_pct" as const,
                  label: "Seuil dérive progressive",
                  sublabel: "Alerte si la dérive sur 6 mois dépasse X% chez un même fournisseur",
                  suffix: "%",
                  default: "15",
                },
              ].map((field) => (
                <div key={field.key} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-700">{field.label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={thresholds[field.key]}
                        onChange={(e) => setThresholds({ ...thresholds, [field.key]: e.target.value })}
                        className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                      />
                      <span className="text-sm text-gray-500">{field.suffix}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{field.sublabel}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              ← Précédent
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!industry || !employees)}
              className="bg-[#1e3a5f] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#162c45] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="bg-[#e85d04] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#c94d00] transition-colors disabled:opacity-60"
            >
              {saving ? "Sauvegarde…" : "Commencer l'analyse →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
