import Link from "next/link";
import FaqAccordion from "@/components/landing/FaqAccordion";
import CursorGlow from "@/components/landing/CursorGlow";

// ─── Shared background with blobs ─────────────────────────────────────────────

function Blobs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {/* Warm purple — top left */}
      <div
        className="animate-blob absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.18), rgba(109,40,217,0.08), transparent 70%)" }}
      />
      {/* Warm cream/gold — top right */}
      <div
        className="animate-blob-2 absolute -top-20 -right-40 w-[600px] h-[500px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(251,191,36,0.07), rgba(245,158,11,0.04), transparent 70%)" }}
      />
      {/* Soft blue — bottom center */}
      <div
        className="animate-blob absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%)" }}
      />
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  { icon: "💳", label: "Abonnements SaaS fantômes",        sublabel: "Slack, Adobe, Zoom oubliés" },
  { icon: "📈", label: "Hausses fournisseurs silencieuses", sublabel: "+12–25% sans préavis" },
  { icon: "🔁", label: "Double facturation",               sublabel: "Même prestataire, deux fois" },
  { icon: "🏦", label: "Frais bancaires évitables",        sublabel: "Virements, change, tenue" },
  { icon: "⚠️", label: "Micro-erreurs répétées",           sublabel: "Petits montants, gros impact" },
];

const STEPS = [
  { num: "01", title: "Exportez votre relevé",   desc: "Téléchargez votre relevé en CSV depuis e-banking. PostFinance, UBS, Raiffeisen. 2 minutes." },
  { num: "02", title: "L'algorithme analyse",    desc: "Chaque transaction est scannée. Doublons, abonnements fantômes, hausses progressives détectés." },
  { num: "03", title: "Vous récupérez l'argent", desc: "Rapport PDF avec actions concrètes. Nos clients récupèrent 1 800 CHF en moyenne dès le premier mois." },
];

const TESTIMONIALS = [
  {
    quote: "En 10 minutes j'ai découvert qu'on payait Adobe deux fois et un Slack abandonné depuis 8 mois.",
    name: "Marc Dubois", role: "Directeur financier · Genève",
    savings: "180 CHF récupérés", avatar: "MD",
  },
  {
    quote: "Notre fournisseur télécom avait augmenté ses prix de 23% sur 6 mois. Profit Leak l'a détecté en 30 secondes.",
    name: "Sophie Rochat", role: "CFO · Lausanne",
    savings: "340 CHF/mois", avatar: "SR",
  },
  {
    quote: "Indispensable pour une PME sans contrôleur de gestion. Le rapport PDF est parfait pour présenter aux associés.",
    name: "Thomas Kellenberger", role: "Co-fondateur · Nyon",
    savings: "2 100 CHF/mois", avatar: "TK",
  },
];

const PLANS = [
  {
    name: "Starter", target: "PME 10–30 employés", price: 149, featured: false,
    href: "/checkout?plan=starter",
    features: ["1 import CSV / mois", "Détection complète des fuites", "Dashboard + alertes", "1 rapport PDF/mois", "Support email"],
  },
  {
    name: "Growth", target: "PME 30–100 employés", price: 299, featured: true,
    href: "/checkout?plan=growth",
    features: ["5 imports CSV / mois", "Détection complète des fuites", "Dashboard + alertes en temps réel", "Rapports PDF illimités", "3 utilisateurs", "Support prioritaire"],
  },
  {
    name: "Pro", target: "100–200 employés", price: 599, featured: false,
    href: "/checkout?plan=pro",
    features: ["Imports CSV illimités", "Multi-entités + benchmarks", "Dashboard personnalisable", "Rapports sur-mesure", "Utilisateurs illimités", "Account manager + SLA"],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="relative min-h-screen text-white" style={{ background: "#0c0c12" }}>
      <CursorGlow />
      <Blobs />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="liquid-glass-nav sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl liquid-glass-sm flex items-center justify-center">
              <span className="text-white font-bold text-xs">PL</span>
            </div>
            <span className="font-semibold text-white/90 text-sm">Profit Leak</span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-sm text-white/45">
            <a href="#how"      className="hover:text-white/80 transition-colors duration-200">Comment ça marche</a>
            <a href="#pricing"  className="hover:text-white/80 transition-colors duration-200">Tarifs</a>
            <a href="#faq"      className="hover:text-white/80 transition-colors duration-200">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-white/40 hover:text-white/70 text-sm transition-colors hidden md:block">
              Connexion
            </Link>
            <Link
              href="/import"
              className="liquid-glass-sm text-white/90 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              Essai gratuit 48h
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden dot-grid">
        <div className="relative max-w-4xl mx-auto px-6 pt-28 pb-8 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-10 liquid-glass-sm text-white/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Suisse romande · Genève · Lausanne
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-[64px] font-bold leading-[1.08] tracking-tight mb-6">
            <span className="text-white">Votre PME perd de l&apos;argent</span>
            <br />
            <span style={{ color: "#f97316" }}>chaque mois sans le savoir.</span>
          </h1>

          <p className="text-lg text-white/45 mb-10 max-w-xl mx-auto leading-relaxed">
            Abonnements oubliés, doubles facturations, hausses silencieuses.
            Importez votre relevé CSV — résultats en 60 secondes.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
            <Link
              href="/import"
              className="text-white font-semibold px-8 py-3.5 rounded-2xl text-base transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
              style={{
                background: "linear-gradient(135deg, #ff7c32 0%, #f97316 50%, #ea580c 100%)",
                boxShadow: "0 4px 24px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              Analyser mon relevé gratuitement →
            </Link>
            <a
              href="#how"
              className="liquid-glass-sm text-white/65 hover:text-white/90 font-medium px-8 py-3.5 rounded-2xl text-base hover:bg-white/8 transition-all duration-200 w-full sm:w-auto"
            >
              Comment ça marche
            </a>
          </div>
          <p className="text-xs text-white/25">Sans engagement · Données analysées localement · Gratuit 48h</p>
        </div>

        {/* ── Floating glass card (product preview) ── */}
        <div className="relative max-w-2xl mx-auto px-6 pb-24 mt-8">
          <div className="animate-float-card liquid-glass rounded-3xl p-6 shadow-2xl">
            {/* Card header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-white/40 text-xs mb-1">Analyse terminée · exemple-postfinance.csv</p>
                <p className="text-white font-semibold text-sm">86 transactions · 6 mois analysés</p>
              </div>
              <div
                className="liquid-glass-sm px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ color: "#4ade80" }}
              >
                +1 501 CHF/mois
              </div>
            </div>

            {/* Fake leak rows */}
            {[
              { icon: "🔁", label: "Double facturation — Dropbox",          amount: "+120 CHF", badge: "Urgent",  badgeColor: "rgba(239,68,68,0.15)",  badgeText: "#f87171" },
              { icon: "💸", label: "Abonnement récurrent — Salesforce",      amount: "+290 CHF", badge: "Moyen",   badgeColor: "rgba(249,115,22,0.12)", badgeText: "#fb923c" },
              { icon: "📈", label: "Hausse de prix — Microsoft 365 (+12%)", amount: "+17 CHF",  badge: "Moyen",   badgeColor: "rgba(249,115,22,0.12)", badgeText: "#fb923c" },
              { icon: "🏦", label: "Frais bancaires — PostFinance",          amount: "+13 CHF",  badge: "Faible",  badgeColor: "rgba(255,255,255,0.07)", badgeText: "rgba(255,255,255,0.4)" },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3 border-t border-white/6"
              >
                <span className="text-base w-7 text-center flex-shrink-0">{row.icon}</span>
                <span className="text-white/70 text-xs flex-1 truncate">{row.label}</span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: row.badgeColor, color: row.badgeText }}
                >
                  {row.badge}
                </span>
                <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#4ade80" }}>{row.amount}</span>
              </div>
            ))}

            {/* Progress bar */}
            <div className="mt-5 rounded-full overflow-hidden h-1.5" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full animate-shimmer-line"
                style={{ width: "83%", background: "linear-gradient(90deg, #4ade80, #22d3ee)" }}
              />
            </div>
            <p className="text-white/25 text-xs mt-2">13 fuites détectées sur 86 transactions</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative max-w-3xl mx-auto px-6 pb-20">
          <div className="liquid-glass rounded-2xl px-8 py-6 grid grid-cols-3 gap-8">
            {[
              { value: "1 800 CHF", label: "économies moyennes / mois" },
              { value: "94%",       label: "des PME ont ≥ 1 fuite" },
              { value: "60 s",      label: "pour obtenir les résultats" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/35 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problems ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest text-center mb-3">Le problème</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-3">Où fuit votre argent ?</h2>
          <p className="text-center text-white/35 mb-14 text-sm max-w-md mx-auto">
            Ces 5 catégories représentent 800–2 000 CHF de pertes invisibles chaque mois.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {PROBLEMS.map((item) => (
              <div
                key={item.label}
                className="liquid-glass-sm rounded-2xl p-6 text-center group hover:-translate-y-1 transition-all duration-300 cursor-default"
              >
                <div className="text-2xl mb-3">{item.icon}</div>
                <p className="text-xs font-semibold text-white/80 mb-1 leading-snug">{item.label}</p>
                <p className="text-xs text-white/30">{item.sublabel}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────────── */}
      <section id="how" className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest text-center mb-3">Comment ça marche</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-3">3 étapes, moins de 5 minutes</h2>
          <p className="text-center text-white/35 mb-16 text-sm max-w-md mx-auto">
            Pas de connexion bancaire. Pas d&apos;installation. Juste un fichier CSV.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.num} className="liquid-glass rounded-2xl p-7 hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(167,139,250,0.15)", color: "#c4b5fd" }}
                  >
                    {step.num}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="text-white/15 hidden md:block">→</span>
                  )}
                </div>
                <h3 className="font-semibold text-white/90 mb-2 text-sm">{step.title}</h3>
                <p className="text-white/35 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/import"
              className="inline-block text-white font-semibold px-7 py-3.5 rounded-2xl text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #ff7c32, #f97316, #ea580c)",
                boxShadow: "0 4px 20px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
            >
              Essayer maintenant — gratuit
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest text-center mb-3">Témoignages</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">Ce que disent nos clients</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="liquid-glass rounded-2xl p-7 flex flex-col hover:-translate-y-0.5 transition-all duration-300">
                <p className="text-xs font-semibold mb-4" style={{ color: "#4ade80" }}>{t.savings}</p>
                <p className="text-white/55 text-sm leading-relaxed flex-1 mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-5 border-t border-white/6">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white/80 flex-shrink-0 liquid-glass-sm"
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white/80 text-xs font-semibold">{t.name}</p>
                    <p className="text-white/30 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest text-center mb-3">Tarifs</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-3">Un investissement, pas un coût</h2>
          <p className="text-center text-white/35 mb-16 text-sm max-w-md mx-auto">
            Ratio moyen 6:1 — pour 299 CHF investis, récupérez 1 800 CHF.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-7 relative flex flex-col transition-all duration-300 hover:-translate-y-0.5 ${
                  plan.featured ? "liquid-glass-featured" : "liquid-glass-sm"
                }`}
              >
                {plan.featured && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-white/90 text-xs font-semibold px-4 py-1 rounded-full"
                    style={{ background: "rgba(139,92,246,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(167,139,250,0.4)" }}
                  >
                    Recommandé
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-semibold text-white/90 mb-0.5">{plan.name}</h3>
                  <p className="text-white/35 text-xs">{plan.target}</p>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-white/35 text-sm"> CHF/mois</span>
                </div>

                <ul className="space-y-2.5 mb-7 text-xs text-white/50 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 items-start">
                      <span className="mt-px flex-shrink-0" style={{ color: "#4ade80" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 ${
                    plan.featured ? "text-white" : "text-white/65 hover:text-white liquid-glass-sm"
                  }`}
                  style={plan.featured ? {
                    background: "linear-gradient(135deg, #ff7c32, #f97316)",
                    boxShadow: "0 4px 16px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.18)",
                  } : undefined}
                >
                  Commencer
                </Link>
              </div>
            ))}
          </div>

          {/* Audit one-shot */}
          <div className="liquid-glass rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-5">
            <div>
              <p className="font-semibold text-white/85 mb-1 text-sm">Audit Ponctuel</p>
              <p className="text-white/35 text-xs">15 imports CSV · Analyse 3–6 mois · Rapport PDF détaillé · Présentation 30 min incluse</p>
            </div>
            <div className="flex items-center gap-5 flex-shrink-0">
              <span className="text-2xl font-bold text-white">990 CHF</span>
              <Link
                href="/import"
                className="text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #ff7c32, #f97316)", boxShadow: "0 4px 16px rgba(249,115,22,0.25)" }}
              >
                Demander un audit
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6 relative">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest text-center mb-3">FAQ</p>
          <h2 className="text-3xl font-bold text-center text-white mb-14">Questions fréquentes</h2>
          <FaqAccordion />
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 relative">
        <div className="relative max-w-xl mx-auto text-center">
          <div className="liquid-glass rounded-3xl px-10 py-16">
            <div className="text-5xl mb-7 animate-float-card inline-block">💸</div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Combien perdez-vous ce mois-ci ?
            </h2>
            <p className="text-white/40 mb-10 text-sm leading-relaxed">
              Importez votre relevé bancaire. Résultats en 60 secondes.
              Aucune donnée transmise. Gratuit 48h.
            </p>
            <Link
              href="/import"
              className="inline-block text-white font-bold px-10 py-4 rounded-2xl text-base transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #ff7c32, #f97316, #ea580c)",
                boxShadow: "0 6px 32px rgba(249,115,22,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              Analyser mon relevé gratuitement →
            </Link>
            <p className="text-xs text-white/25 mt-5">Sans carte de crédit · Sans installation · Sans engagement</p>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/6 py-10 px-6 relative">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg liquid-glass-sm flex items-center justify-center">
              <span className="text-white/80 font-bold text-xs">PL</span>
            </div>
            <span className="font-semibold text-white/50 text-sm">Profit Leak</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <a href="#how"     className="hover:text-white/60 transition-colors">Comment ça marche</a>
            <a href="#pricing" className="hover:text-white/60 transition-colors">Tarifs</a>
            <a href="#faq"     className="hover:text-white/60 transition-colors">FAQ</a>
            <Link href="/login" className="hover:text-white/60 transition-colors">Connexion</Link>
          </div>
          <p className="text-xs text-white/20">
            © 2025 Profit Leak · Genève · Lausanne · LPD
          </p>
        </div>
      </footer>
    </div>
  );
}
