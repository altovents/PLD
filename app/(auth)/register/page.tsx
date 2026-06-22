import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";
import { isFreeDomain, FREE_DOMAIN_ERROR } from "@/lib/free-email-domains";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { error?: string; plan?: string };
}) {
  const params = searchParams;

  async function registerAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const firstName = String(formData.get("first_name"));
    const lastName = String(formData.get("last_name"));
    const company = String(formData.get("company"));

    // Block free/consumer email domains
    if (isFreeDomain(email)) {
      redirect(`/register?error=${encodeURIComponent(FREE_DOMAIN_ERROR)}`);
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, company },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      },
    });

    if (error) redirect(`/register?error=${encodeURIComponent(error.message)}`);

    // Non-blocking welcome email (Resend key may not be set yet)
    sendWelcomeEmail(email, firstName).catch(() => {});

    redirect("/import");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "#0c0c12" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.2), transparent 70%)" }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
            >
              <span className="text-white font-bold text-sm">PL</span>
            </div>
            <span className="text-white font-semibold">Profit Leak</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Audit gratuit 48h</h1>
          <p className="text-white/40 text-sm mt-1">Découvrez combien vous perdez chaque mois</p>
        </div>

        {/* Card */}
        <div className="liquid-glass rounded-3xl p-8">
          {params.error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-300 border border-red-500/20" style={{ background: "rgba(239,68,68,0.1)" }}>
              {params.error}
            </div>
          )}

          <form action={registerAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Prénom</label>
                <input
                  type="text"
                  name="first_name"
                  required
                  placeholder="Jean"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Nom</label>
                <input
                  type="text"
                  name="last_name"
                  required
                  placeholder="Dupont"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Email professionnel</label>
              <input
                type="email"
                name="email"
                required
                placeholder="ceo@entreprise.ch"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Entreprise</label>
              <input
                type="text"
                name="company"
                required
                placeholder="Mon Entreprise SA"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Mot de passe</label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                placeholder="Minimum 8 caractères"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <button
              type="submit"
              className="w-full text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:opacity-90 active:scale-[0.98] mt-2"
              style={{
                background: "linear-gradient(135deg, #ff7c32, #f97316, #ea580c)",
                boxShadow: "0 4px 20px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
            >
              Démarrer mon audit gratuit
            </button>
          </form>

          <p className="text-center text-xs text-white/20 mt-5">
            Données protégées LPD · Sans engagement · Résultats en 60s
          </p>
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-white/70 font-semibold hover:text-white transition-colors">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
