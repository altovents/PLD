import { NextResponse } from "next/server";

// This route is no longer used — the onboarding flow now directs users to /import.
export async function GET() {
  return NextResponse.redirect(
    new URL("/import", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  );
}
