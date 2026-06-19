const TINK_API = "https://api.tink.com";
const TINK_LINK = "https://link.tink.com/1.0/transactions/connect-accounts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TinkTransaction {
  id: string;
  accountId: string;
  amount: {
    currencyCode: string;
    value: { scale: number; unscaledValue: number };
  };
  descriptions: { display: string; original: string };
  dates: { booked: string };
  status: string;
  merchantInformation?: { merchantName?: string; merchantCategoryCode?: string };
}

export type TransactionCategory =
  | "subscription"
  | "supplier"
  | "one_shot"
  | "bank_fee"
  | "other";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Converts Tink's scaled integer to a decimal number. */
export function tinkAmountToNumber(amount: TinkTransaction["amount"]): number {
  return amount.value.unscaledValue / Math.pow(10, amount.value.scale);
}

/**
 * Infers a transaction category from its description and merchant category code.
 * This is a lightweight heuristic — the analysis engine refines it later.
 */
export function inferCategory(tx: TinkTransaction): TransactionCategory {
  const mcc = tx.merchantInformation?.merchantCategoryCode ?? "";
  const desc = (tx.descriptions.display + " " + tx.descriptions.original).toLowerCase();

  // Bank fees: MCC 6012 (financial institutions) or keyword match
  if (mcc === "6012" || /frais|commission|tenue de compte|interbank/i.test(desc)) {
    return "bank_fee";
  }

  // SaaS / subscriptions: common keywords
  if (/abonnement|subscription|monthly|annuel|saas|adobe|slack|notion|microsoft|google workspace|dropbox|zoom/i.test(desc)) {
    return "subscription";
  }

  // Supplier / recurring vendor
  if (/facture|invoice|fournisseur/i.test(desc)) {
    return "supplier";
  }

  return "other";
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Gets a client access token using client_credentials grant. */
export async function getClientAccessToken(scope: string): Promise<string> {
  const res = await fetch(`${TINK_API}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TINK_CLIENT_ID!,
      client_secret: process.env.TINK_CLIENT_SECRET!,
      grant_type: "client_credentials",
      scope,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tink getClientAccessToken failed: ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

/**
 * Creates a Tink user with the Supabase user ID as external_user_id.
 * Returns the Tink-internal user_id.
 * If the user already exists (409), returns null — caller should use stored tink_user_id.
 */
export async function createTinkUser(
  supabaseUserId: string,
  clientToken: string
): Promise<string | null> {
  const res = await fetch(`${TINK_API}/api/v1/user/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clientToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_user_id: supabaseUserId,
      locale: "fr_FR",
      market: "CH",
    }),
  });

  if (res.status === 409) return null; // user already exists
  if (!res.ok) throw new Error(`Tink createTinkUser failed: ${await res.text()}`);

  const data = await res.json();
  return data.user_id as string;
}

/**
 * Creates an authorization grant for an existing Tink user (delegate flow).
 * Returns a one-time code to embed in the Tink Link URL.
 */
export async function createAuthorizationCode(
  tinkUserId: string,
  clientToken: string
): Promise<string> {
  const res = await fetch(`${TINK_API}/api/v1/oauth/authorization-grant/delegate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clientToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      user_id: tinkUserId,
      actor_client_id: process.env.TINK_CLIENT_ID!,
      scope: "transactions:read,accounts:read,credentials:read",
    }),
  });

  if (!res.ok) {
    throw new Error(`Tink createAuthorizationCode failed: ${await res.text()}`);
  }

  const data = await res.json();
  return data.code as string;
}

/** Builds the Tink Link URL the user is redirected to in order to connect their bank. */
export function buildTinkLinkUrl(authorizationCode: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.TINK_CLIENT_ID!,
    redirect_uri: redirectUri,
    market: "CH",
    locale: "fr_FR",
    authorization_code: authorizationCode,
  });
  return `${TINK_LINK}?${params.toString()}`;
}

/**
 * Exchanges the authorization code returned by Tink Link for a user access token.
 * This is the code in the ?code= query param of the callback URL.
 */
export async function exchangeCodeForUserToken(code: string): Promise<string> {
  const res = await fetch(`${TINK_API}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TINK_CLIENT_ID!,
      client_secret: process.env.TINK_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tink exchangeCodeForUserToken failed: ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

/**
 * Fetches all booked transactions for a user (handles cursor-based pagination).
 * Capped at 500 transactions for MVP.
 */
export async function fetchAllTransactions(
  userAccessToken: string
): Promise<TinkTransaction[]> {
  const transactions: TinkTransaction[] = [];
  let pageToken: string | undefined;
  const PAGE_SIZE = 100;
  const MAX_PAGES = 5;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${TINK_API}/data/v2/transactions?${params}`, {
      headers: { Authorization: `Bearer ${userAccessToken}` },
    });

    if (!res.ok) throw new Error(`Tink fetchTransactions failed: ${await res.text()}`);

    const data = await res.json();
    const booked = (data.transactions as TinkTransaction[]).filter(
      (tx) => tx.status === "BOOKED"
    );
    transactions.push(...booked);

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return transactions;
}
