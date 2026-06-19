import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import {
  exchangeCodeForUserToken,
  fetchAllTransactions,
  tinkAmountToNumber,
  inferCategory,
  TinkTransaction,
} from "@/lib/tink";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tinkError = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Tink returned an error (user cancelled, bank unavailable, etc.)
  if (tinkError) {
    console.warn("Tink callback error:", tinkError, searchParams.get("message"));
    return NextResponse.redirect(
      new URL(`/transactions?error=${encodeURIComponent(tinkError)}`, appUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/transactions?error=missing_code", appUrl)
    );
  }

  // Retrieve the Supabase user ID stored during the authorize step
  const cookieStore = await cookies();
  const userId = cookieStore.get("tink_pending_user_id")?.value;

  if (!userId) {
    return NextResponse.redirect(
      new URL("/transactions?error=session_expired", appUrl)
    );
  }

  // Clear the pending cookie immediately
  cookieStore.delete("tink_pending_user_id");

  try {
    // 1. Exchange the Tink Link code for a user access token
    const userAccessToken = await exchangeCodeForUserToken(code);

    // 2. Fetch all booked transactions from Tink
    const tinkTransactions = await fetchAllTransactions(userAccessToken);

    if (tinkTransactions.length === 0) {
      return NextResponse.redirect(
        new URL("/transactions?connected=true&count=0", appUrl)
      );
    }

    // 3. Map Tink transactions to our DB schema
    const rows = tinkTransactions.map((tx: TinkTransaction) => ({
      user_id: userId,
      tink_id: tx.id,
      amount: tinkAmountToNumber(tx.amount),
      currency: tx.amount.currencyCode,
      description: tx.descriptions.display || tx.descriptions.original,
      vendor: tx.merchantInformation?.merchantName ?? null,
      category: inferCategory(tx),
      date: tx.dates.booked,
    }));

    // 4. Upsert into Supabase (tink_id is UNIQUE — safe to re-run)
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("transactions")
      .upsert(rows, { onConflict: "tink_id", ignoreDuplicates: false });

    if (error) {
      console.error("Tink callback Supabase upsert error:", error);
      return NextResponse.redirect(
        new URL("/transactions?error=db_error", appUrl)
      );
    }

    return NextResponse.redirect(
      new URL(`/transactions?connected=true&count=${rows.length}`, appUrl)
    );
  } catch (error) {
    console.error("Tink callback error:", error);
    return NextResponse.redirect(
      new URL("/transactions?error=sync_failed", appUrl)
    );
  }
}
