import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, company, plan")
    .eq("id", user!.id)
    .single();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-1">Gérez votre compte et abonnement</p>
      </div>
      <SettingsClient
        profile={profile ?? { first_name: null, last_name: null, company: null, plan: "trial" }}
        email={user?.email ?? ""}
      />
    </div>
  );
}
