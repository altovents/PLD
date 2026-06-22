import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  getClientAccessToken,
  createTinkUser,
  createAuthorizationCode,
  buildTinkLinkUrl,
} from "@/lib/tink";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Get the authenticated Supabase user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_APP_URL!)
    );
  }

  try {
    // 2. Get client access token (needs scope to create users + grant auth)
    const clientToken = await getClientAccessToken(
      "user:create,authorization:grant"
    );

    // 3. Get or create Tink user for this Supabase user
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("tink_user_id")
      .eq("id", user.id)
      .single();

    let tinkUserId = profile?.tink_user_id as string | null;

    if (!tinkUserId) {
      // First-time connection — create the Tink user
      const created = await createTinkUser(user.id, clientToken);

      if (created) {
        // Store tink_user_id for future connections
        tinkUserId = created;
        await admin
          .from("profiles")
          .update({ tink_user_id: tinkUserId })
          .eq("id", user.id);
      } else {
        // 409: user exists in Tink but we lost the ID — fetch it via list users
        // For MVP, surface a clear error rather than silently failing
        return NextResponse.json(
          { error: "Tink user exists but tink_user_id is missing in profile. Please contact support." },
          { status: 500 }
        );
      }
    }

    // 4. Create one-time authorization code for Tink Link
    const authCode = await createAuthorizationCode(tinkUserId, clientToken);

    // 5. Store user ID in a short-lived cookie so the callback can identify the user
    //    (Tink redirects back without session context)
    const cookieStore = await cookies();
    cookieStore.set("tink_pending_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 600, // 10 minutes — enough to complete the bank connection flow
      path: "/",
      sameSite: "lax",
    });

    // 6. Redirect to Tink Link
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/tink/callback`;
    const tinkUrl = buildTinkLinkUrl(authCode, redirectUri);

    return NextResponse.redirect(tinkUrl);
  } catch (error) {
    console.error("Tink authorize error:", error);
    return NextResponse.redirect(
      new URL("/transactions?error=tink_auth_failed", process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
}
