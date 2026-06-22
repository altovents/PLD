import { createClient } from "@/lib/supabase/server";
import ComptabiliteClient from "./ComptabiliteClient";

export default async function ComptabilitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user!.id)
    .single();

  const plan = profile?.plan ?? "trial";

  return <ComptabiliteClient plan={plan} />;
}
