"use client";

import { useState, useEffect } from "react";

interface Profile {
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  plan: string;
}

const PLAN_INFO: Record<string, { label: string; price: string }> = {
  trial:   { label: "Essai gratuit",  price: "48h d'essai" },
  starter: { label: "Plan Starter",   price: "149 CHF/mois" },
  growth:  { label: "Plan Growth",    price: "299 CHF/mois" },
  pro:     { label: "Plan Pro",       price: "599 CHF/mois" },
  admin:   { label: "Administrateur", price: "Accès illimité" },
};

function TrustedVendorsEditor() {
  const [vendors, setVendors] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/company-context/get")
      .then((r) => r.json())
      .then((d: { trusted_vendors?: string[] }) => {
        setVendors(d?.trusted_vendors ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function addVendor() {
    const v = input.trim();
    if (v && !vendors.includes(v)) setVendors([...vendors, v]);
    setInput("");
  }

  async function save() {
    setSaving(true);
    await fetch("/api/company-context/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trusted_vendors: vendors }),
    });
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-gray-400">Chargement…</p>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
      {vendors.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {vendors.map((v) => (
            <span key={v} className="flex items-center gap-1.5 bg-[#1e3a5f]/10 text-[#1e3a5f] text-sm px-3 py-1.5 rounded-full font-medium">
              {v}
              <button onClick={() => setVendors(vendors.filter((x) => x !== v))} className="text-[#1e3a5f]/50 hover:text-[#1e3a5f] leading-none">×</button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Aucun fournisseur de confiance configuré.</p>
      )}
      {vendors.length > 0 && (
        <button
          onClick={save}
          disabled={saving}
          className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#162c45] transition-colors disabled:opacity-60"
        >
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      )}
    </div>
  );
}

export default function SettingsClient({
  profile,
  email,
}: {
  profile: Profile;
  email: string;
}) {
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const planInfo  = PLAN_INFO[profile.plan] ?? PLAN_INFO.trial;
  const isAdmin   = profile.plan === "admin";
  const isPaid    = profile.plan !== "trial";

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: fd.get("first_name"),
        last_name:  fd.get("last_name"),
        company:    fd.get("company"),
      }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveError("Erreur lors de la sauvegarde");
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setPortalError(null);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } else {
      setPortalError("Impossible d'accéder au portail de facturation");
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Abonnement */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Abonnement actuel</h2>
        <div className="flex items-center justify-between p-4 bg-[#1e3a5f] rounded-xl text-white">
          <div>
            <p className="font-bold text-lg">{planInfo.label}</p>
            <p className="text-blue-200 text-sm">{planInfo.price}</p>
          </div>
          {isAdmin ? (
            <span className="text-xs bg-white/20 text-white px-3 py-1.5 rounded-full font-semibold">
              ⚙️ Compte interne
            </span>
          ) : isPaid ? (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="bg-white text-[#1e3a5f] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-60"
              >
                {portalLoading ? "Chargement…" : "Gérer l'abonnement"}
              </button>
              {portalError && (
                <p className="text-xs text-red-300">{portalError}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <a
                href="/checkout?plan=starter"
                className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/30 transition-colors"
              >
                Starter — 149 CHF/mois
              </a>
              <a
                href="/checkout?plan=growth"
                className="bg-[#e85d04] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#c94d00] transition-colors"
              >
                Growth — 299 CHF/mois ★
              </a>
              <a
                href="/checkout?plan=pro"
                className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/30 transition-colors"
              >
                Pro — 599 CHF/mois
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Profil */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Profil</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                name="first_name"
                type="text"
                defaultValue={profile.first_name ?? ""}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                name="last_name"
                type="text"
                defaultValue={profile.last_name ?? ""}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié ici.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
            <input
              name="company"
              type="text"
              defaultValue={profile.company ?? ""}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#162c45] transition-colors disabled:opacity-60"
            >
              {saving ? "Sauvegarde…" : "Sauvegarder"}
            </button>
            {saved     && <span className="text-sm text-green-600 font-medium">✓ Sauvegardé</span>}
            {saveError && <span className="text-sm text-red-500">{saveError}</span>}
          </div>
        </form>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Notifications email</h2>
        <div className="space-y-3">
          {[
            { label: "Nouvelle fuite détectée",  sublabel: "Alerte immédiate dès qu'une anomalie est trouvée",  defaultChecked: true },
            { label: "Rapport mensuel",           sublabel: "Résumé de vos économies chaque début de mois",       defaultChecked: true },
            { label: "Variations importantes",    sublabel: "Quand un fournisseur augmente de plus de 15%",       defaultChecked: false },
          ].map((notif) => (
            <div key={notif.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">{notif.label}</p>
                <p className="text-xs text-gray-400">{notif.sublabel}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked={notif.defaultChecked}
                className="w-4 h-4 accent-[#1e3a5f]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Fournisseurs de confiance */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Fournisseurs de confiance</h2>
        <p className="text-sm text-gray-400 mb-4">Ces fournisseurs ne déclencheront pas d&apos;alerte de hausse anormale.</p>
        <TrustedVendorsEditor />
      </div>
    </div>
  );
}
