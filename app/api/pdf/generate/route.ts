import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import ReportDocument from "@/components/pdf/ReportDocument";
import { createElement, type ReactElement } from "react";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Auth
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

  // 2. Fetch profile + open leaks in parallel
  const [{ data: profile }, { data: leaks }] = await Promise.all([
    admin
      .from("profiles")
      .select("first_name, last_name, company, plan")
      .eq("id", user.id)
      .single(),
    admin
      .from("leaks")
      .select("type, title, description, estimated_savings, priority, vendor")
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("estimated_savings", { ascending: false }),
  ]);

  if (!leaks || leaks.length === 0) {
    return NextResponse.json(
      { error: "No leaks found. Run an analysis first." },
      { status: 404 }
    );
  }

  const totalSavings = leaks.reduce((s, l) => s + (l.estimated_savings ?? 0), 0);
  const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  const company = profile?.company ? profile.company : (fullName || "Votre entreprise");

  // Plan price for ROI calculation
  const PLAN_PRICES: Record<string, number> = {
    starter: 149,
    growth: 299,
    pro: 599,
    trial: 299,
  };
  const planPrice = PLAN_PRICES[profile?.plan ?? "growth"] ?? 299;

  // 3. Render PDF to buffer (server-side)
  const element = createElement(ReportDocument, {
    data: {
      company,
      generatedAt: new Date().toISOString(),
      leaks,
      totalSavings: Math.round(totalSavings),
      planPrice,
    },
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  // 4. Return PDF as downloadable file
  const filename = `profit-leak-report-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
