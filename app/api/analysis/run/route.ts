import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { runAnalysis } from "@/lib/analysis-engine";
import { sendLeakAlertEmail } from "@/lib/email";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAnalysis(user.id);

    // Send alert email if leaks were found (non-blocking)
    if (result.leaks_count > 0 && user.email) {
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Fetch profile + top leaks for the email
      const [{ data: profile }, { data: topLeaks }] = await Promise.all([
        admin.from("profiles").select("first_name").eq("id", user.id).single(),
        admin
          .from("leaks")
          .select("title, description, estimated_savings")
          .eq("user_id", user.id)
          .eq("status", "open")
          .order("estimated_savings", { ascending: false })
          .limit(3),
      ]);

      sendLeakAlertEmail(
        user.email,
        profile?.first_name ?? "là",
        result.leaks_count,
        result.total_savings,
        topLeaks ?? []
      ).catch((err) => console.error("Leak alert email failed:", err));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis engine error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
