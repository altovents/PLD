import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { stripe, AUDIT_PRICE_ID } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function CheckoutAuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/register?plan=audit");
  }

  if (!AUDIT_PRICE_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-2">
          <p className="font-semibold text-red-700">Configuration manquante</p>
          <p className="text-sm text-red-600">
            La variable <code className="bg-red-100 px-1 rounded">STRIPE_PRICE_AUDIT</code> n&apos;est pas définie sur Vercel.
          </p>
          <a href="/" className="inline-block mt-3 text-sm text-red-700 underline">Retour à l&apos;accueil</a>
        </div>
      </div>
    );
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`).replace(/\/$/, "");

  let sessionUrl: string;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [{ price: AUDIT_PRICE_ID, quantity: 1 }],
      success_url: `${baseUrl}/dashboard?audit=true`,
      cancel_url: `${baseUrl}/#pricing`,
      metadata: { user_id: user.id, plan: "audit" },
    });
    sessionUrl = session.url!;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-2">
          <p className="font-semibold text-red-700">Erreur Stripe</p>
          <p className="text-sm text-red-600 font-mono break-all">{message}</p>
          <a href="/" className="inline-block mt-3 text-sm text-red-700 underline">Retour à l&apos;accueil</a>
        </div>
      </div>
    );
  }

  redirect(sessionUrl);
}
