import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";
import { isFreeDomain, FREE_DOMAIN_ERROR } from "@/lib/free-email-domains";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const firstName = String(formData.get("first_name"));
  const lastName = String(formData.get("last_name"));
  const company = String(formData.get("company"));

  // Block free/consumer email domains
  if (isFreeDomain(email)) {
    return NextResponse.redirect(
      new URL(`/register?error=${encodeURIComponent(FREE_DOMAIN_ERROR)}`, request.url)
    );
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

  if (error) {
    return NextResponse.redirect(
      new URL(`/register?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  // Send welcome email (non-blocking — don't fail registration if email fails)
  sendWelcomeEmail(email, firstName).catch((err) =>
    console.error("Welcome email failed:", err)
  );

  // Redirect to onboarding wizard instead of dashboard
  return NextResponse.redirect(new URL("/onboarding", request.url));
}
