import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, created_at, email, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <DashboardClient
      user={user}
      profile={profile}
      initialTransactions={transactions ?? []}
    />
  );
}
