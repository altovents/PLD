/**
 * Blocked free/consumer email domains.
 * Anti-abuse: trial requires a professional email address.
 */
export const FREE_EMAIL_DOMAINS = new Set([
  // Google
  "gmail.com", "googlemail.com",
  // Microsoft
  "hotmail.com", "hotmail.fr", "hotmail.ch", "hotmail.de", "hotmail.it",
  "outlook.com", "outlook.fr", "outlook.ch", "outlook.de",
  "live.com", "live.fr", "live.ch", "live.de", "live.it",
  "msn.com",
  // Yahoo
  "yahoo.com", "yahoo.fr", "yahoo.ch", "yahoo.de", "yahoo.co.uk",
  "ymail.com",
  // Apple
  "icloud.com", "me.com", "mac.com",
  // AOL / Verizon
  "aol.com",
  // GMX
  "gmx.com", "gmx.ch", "gmx.de", "gmx.net", "gmx.at",
  // Web.de
  "web.de",
  // Free email providers
  "free.fr", "laposte.net", "orange.fr", "sfr.fr", "wanadoo.fr",
  // Swiss ISP consumer emails (not professional)
  "bluewin.ch", "hispeed.ch",
  // Temporary / disposable
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwam.com",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com",
  "dispostable.com", "mailnull.com", "trashmail.com",
]);

export function isFreeDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return FREE_EMAIL_DOMAINS.has(domain);
}

export const FREE_DOMAIN_ERROR =
  "Veuillez utiliser votre adresse email professionnelle (pas de Gmail, Hotmail, etc.).";
