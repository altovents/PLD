import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  getClientAccessToken,
  createAuthorizationCode,
  buildTinkLinkUrl,
} from "@/lib/tink";

/**
 * POST /api/tink/sync
 * Initiates a new Tink Link session so the user can re-connect their bank
 * and pull fresh transactions. Redirects to Tink Link.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("tink_user_id")
    .eq("id", user.id)
    .single();

  const tinkUserId = profile?.tink_user_id as string | null;

  if (!tinkUserId) {
    // Never connected — send to authorize flow instead
    return NextResponse.json(
      { redirect: "/api/tink/authorize" },
      { status: 200 }
    );
  }

  try {
    const clientToken = await getClientAccessToken("authorization:grant");
    const authCode = await createAuthorizationCode(tinkUserId, clientToken);
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/tink/callback`;
    const tinkUrl = buildTinkLinkUrl(authCode, redirectUri);

    return NextResponse.json({ redirect: tinkUrl });
  } catch (error) {
    console.error("Tink sync error:", error);
    return NextResponse.json({ error: "Failed to start sync" }, { status: 500 });
  }
}
