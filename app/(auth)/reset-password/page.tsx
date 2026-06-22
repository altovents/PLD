"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "#0c0c12" }}
    >
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.2), transparent 70%)" }}
      />

      <div className="relative w-full max-w-sm">
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
          <h1 className="text-2xl font-bold text-white">Nouveau mot de passe</h1>
          <p className="text-white/40 text-sm mt-1">Choisissez un mot de passe sécurisé</p>
        </div>

        <div className="liquid-glass rounded-3xl p-8">
          {done ? (
            <div className="text-center space-y-2">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-white">Mot de passe mis à jour !</p>
              <p className="text-sm text-white/40">Redirection vers le dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-300 border border-red-500/20" style={{ background: "rgba(239,68,68,0.1)" }}>
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimum 8 caractères"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Répétez le mot de passe"
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
                {loading ? "Mise à jour…" : "Enregistrer"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
