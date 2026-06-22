import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendWeeklyDigestEmail } from "@/lib/email";

// This route is meant to be called by a cron job (e.g., every Monday at 8:00)
// Protect it with a shared secret in the Authorization header.
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all users who have completed onboarding
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, first_name, plan");

  if (error || !profiles) {
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }

  // Fetch auth users to get emails
  const { data: authUsers } = await admin.auth.admin.listUsers();
  const emailMap = new Map(authUsers?.users?.map((u) => [u.id, u.email]) ?? []);

  const now = new Date();
  const weekLabel = now.toLocaleDateString("fr-CH", { day: "numeric", month: "long" });

  // One week ago
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let sent = 0;
  let errors = 0;

  for (const profile of profiles) {
    const email = emailMap.get(profile.id);
    if (!email) continue;

    try {
      // Fetch open leaks
      const { data: openLeaks } = await admin
        .from("leaks")
        .select("title, estimated_savings, status")
        .eq("user_id", profile.id)
        .eq("status", "open")
        .order("estimated_savings", { ascending: false })
        .limit(5);

      // Count resolved this week
      const { count: resolvedCount } = await admin
        .from("leaks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("status", "resolved")
        .gte("resolved_at", oneWeekAgo.toISOString());

      const totalOpenSavings = (openLeaks ?? []).reduce(
        (s, l) => s + l.estimated_savings,
        0
      );

      await sendWeeklyDigestEmail(
        email,
        profile.first_name ?? "là",
        openLeaks ?? [],
        totalOpenSavings,
        resolvedCount ?? 0,
        weekLabel
      );
      sent++;
    } catch (err) {
      console.error(`Weekly digest failed for ${profile.id}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ sent, errors });
}
