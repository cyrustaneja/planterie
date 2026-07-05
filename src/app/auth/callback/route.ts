import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
    console.error("auth callback: exchangeCodeForSession failed", { message: error.message });
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "sign-in-failed");
  return NextResponse.redirect(loginUrl);
}
