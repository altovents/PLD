import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });
    if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
    redirect("/dashboard");
  }

  const errorMsg =
    params.error === "Invalid login credentials"
      ? "Email ou mot de passe incorrect."
      : params.error;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "#0c0c12" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl opacity-30"
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
          <h1 className="text-2xl font-bold text-white">Connexion</h1>
          <p className="text-white/40 text-sm mt-1">Accédez à votre tableau de bord</p>
        </div>

        {/* Card */}
        <div className="liquid-glass rounded-3xl p-8">
          {errorMsg && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-300 border border-red-500/20" style={{ background: "rgba(239,68,68,0.1)" }}>
              {errorMsg}
            </div>
          )}

          <form action={loginAction} className="space-y-4">
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
              <label className="block text-xs font-medium text-white/50 mb-1.5">Mot de passe</label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
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
              Se connecter
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-white/70 font-semibold hover:text-white transition-colors">
            Essai gratuit 48h
          </Link>
        </p>
      </div>
    </div>
  );
}
