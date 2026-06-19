import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const firstName =
    (user.user_metadata?.first_name as string | undefined) ?? "là";

  const steps = [
    {
      id: "account",
      title: "Compte créé",
      description: "Votre espace Profit Leak Detection est prêt.",
      done: true,
      cta: null as null | { label: string; href: string },
    },
    {
      id: "import",
      title: "Importer votre relevé bancaire",
      description:
        "Exportez un CSV depuis votre banque (PostFinance, UBS, Raiffeisen, BCGE, BCV…) et déposez-le dans l'import. Aucune donnée bancaire ne transite sur nos serveurs.",
      done: false,
      cta: { label: "Importer mon CSV", href: "/import" },
    },
    {
      id: "analysis",
      title: "Résultats de l'analyse",
      description:
        "Notre moteur détecte doublons, abonnements inutilisés, hausses fournisseurs et dérives progressives. Résultats en moins de 60 secondes.",
      done: false,
      cta: null,
    },
  ];

  const currentStep = steps.findIndex((s) => !s.done);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "#0c0c12" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl opacity-25"
        style={{
          background:
            "radial-gradient(ellipse, rgba(139,92,246,0.2), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
            >
              <span className="text-white font-bold text-sm">PL</span>
            </div>
            <span className="text-white font-semibold">Profit Leak</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">
            Bienvenue, {firstName}&nbsp;!
          </h1>
          <p className="text-white/40 text-sm mt-2">
            2 étapes pour découvrir où part votre argent
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => {
            const isActive = i === currentStep;
            const isPast = step.done;
            const isFuture = !step.done && i > currentStep;

            return (
              <div
                key={step.id}
                className="rounded-2xl p-6 transition-all"
                style={{
                  background: isPast
                    ? "rgba(34,197,94,0.07)"
                    : isActive
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(255,255,255,0.03)",
                  border: isPast
                    ? "1px solid rgba(34,197,94,0.25)"
                    : isActive
                    ? "1px solid rgba(255,255,255,0.15)"
                    : "1px solid rgba(255,255,255,0.06)",
                  opacity: isFuture ? 0.45 : 1,
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Step indicator */}
                  <div className="flex-shrink-0 mt-0.5">
                    {isPast ? (
                      <div className="w-[22px] h-[22px] rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    ) : isActive ? (
                      <div
                        className="w-[22px] h-[22px] rounded-full flex items-center justify-center"
                        style={{
                          border: "2px solid rgba(99,102,241,0.8)",
                        }}
                      >
                        <span className="text-indigo-400 font-bold text-xs">
                          {i + 1}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="w-[22px] h-[22px] rounded-full"
                        style={{ border: "2px solid rgba(255,255,255,0.15)" }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2
                        className="font-semibold text-sm"
                        style={{
                          color: isPast
                            ? "rgba(134,239,172,1)"
                            : isActive
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(255,255,255,0.35)",
                        }}
                      >
                        {step.title}
                      </h2>
                      {isPast && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: "rgba(34,197,94,0.15)",
                            color: "rgba(134,239,172,1)",
                          }}
                        >
                          Fait
                        </span>
                      )}
                    </div>
                    {!isFuture && (
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {step.description}
                      </p>
                    )}

                    {step.cta && isActive && (
                      <Link
                        href={step.cta.href}
                        className="inline-flex items-center gap-2 mt-4 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                        style={{
                          background:
                            "linear-gradient(135deg, #ff7c32, #f97316, #ea580c)",
                          boxShadow:
                            "0 4px 20px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.18)",
                        }}
                      >
                        {step.cta.label}
                        <span>→</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Skip */}
        <p className="text-center mt-6 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          <Link
            href="/dashboard"
            className="hover:underline transition-colors"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Accéder au tableau de bord sans importer →
          </Link>
        </p>
      </div>
    </div>
  );
}
