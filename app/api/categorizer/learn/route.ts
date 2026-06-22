import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vendor_key, category, vat_rate_override } = await request.json() as {
    vendor_key: string;
    category: string;
    vat_rate_override?: number;
  };

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await admin
    .from("vendor_category_mappings")
    .upsert({
      user_id: user.id,
      vendor_key,
      category,
      vat_rate_override: vat_rate_override ?? null,
      updated_at: new Date().toISOString(),
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("vendor_category_mappings")
    .select("vendor_key, category, vat_rate_override")
    .eq("user_id", user.id);

  // Return as a flat map: { vendor_key: category }
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.vendor_key] = row.category;
  }
  return NextResponse.json(map);
}
