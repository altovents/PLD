"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode]         = useState<"login" | "forgot">("login");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "Email ou mot de passe incorrect."
        : error.message);
    } else {
      router.push("/dashboard");
    }
  }

  async function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      String(fd.get("email")),
      { redirectTo: `${window.location.origin}/api/auth/callback?type=recovery` }
    );
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "#0c0c12" }}
    >
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
          <h1 className="text-2xl font-bold text-white">
            {mode === "login" ? "Connexion" : "Mot de passe oublié"}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {mode === "login" ? "Accédez à votre tableau de bord" : "Recevez un lien de réinitialisation"}
          </p>
        </div>

        <div className="liquid-glass rounded-3xl p-8">
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-300 border border-red-500/20" style={{ background: "rgba(239,68,68,0.1)" }}>
              {error}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-white/50">Mot de passe</label>
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setError(null); }}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
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
                disabled={loading}
                className="w-full text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:opacity-90 active:scale-[0.98] mt-2 disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #ff7c32, #f97316, #ea580c)",
                  boxShadow: "0 4px 20px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.18)",
                }}
              >
                {loading ? "Connexion…" : "Se connecter"}
              </button>
            </form>
          ) : resetSent ? (
            <div className="text-center space-y-3">
              <div className="text-4xl mb-2">📧</div>
              <p className="font-semibold text-white">Email envoyé !</p>
              <p className="text-sm text-white/40">Vérifiez votre boîte mail et cliquez sur le lien pour réinitialiser votre mot de passe.</p>
              <button
                onClick={() => { setMode("login"); setResetSent(false); setError(null); }}
                className="text-sm text-white/40 hover:text-white/70 transition-colors mt-2"
              >
                ← Retour à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="ceo@entreprise.ch"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #ff7c32, #f97316, #ea580c)",
                  boxShadow: "0 4px 20px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.18)",
                }}
              >
                {loading ? "Envoi…" : "Envoyer le lien"}
              </button>
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); }}
                className="w-full text-white/30 hover:text-white/60 text-sm transition-colors py-1"
              >
                ← Retour à la connexion
              </button>
            </form>
          )}
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
