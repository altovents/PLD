import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe, PLANS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const planKey = searchParams.plan as keyof typeof PLANS | undefined;

  if (!planKey || !PLANS[planKey]) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/register?plan=${planKey}`);
  }

  // Check if user already has a paid plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan && profile.plan !== "trial") {
    redirect("/settings");
  }

  const priceId = PLANS[planKey].priceId;

  // Guard: priceId env var not set
  if (!priceId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-2">
          <p className="font-semibold text-red-700">Configuration manquante</p>
          <p className="text-sm text-red-600">
            La variable d&apos;environnement <code className="bg-red-100 px-1 rounded">STRIPE_PRICE_{planKey.toUpperCase()}</code> n&apos;est pas définie sur Vercel.
          </p>
          <a href="/settings" className="inline-block mt-3 text-sm text-red-700 underline">Retour aux paramètres</a>
        </div>
      </div>
    );
  }

  let sessionUrl: string;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
      metadata: { user_id: user.id, plan: planKey },
    });
    sessionUrl = session.url!;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-2">
          <p className="font-semibold text-red-700">Erreur Stripe</p>
          <p className="text-sm text-red-600 font-mono break-all">{message}</p>
          <a href="/settings" className="inline-block mt-3 text-sm text-red-700 underline">Retour aux paramètres</a>
        </div>
      </div>
    );
  }

  redirect(sessionUrl);
}
