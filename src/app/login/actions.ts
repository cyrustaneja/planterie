"use server";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/env";

export interface SendMagicLinkResult {
  ok: boolean;
  error?: string;
}

export async function sendMagicLink(email: string): Promise<SendMagicLinkResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: { emailRedirectTo: `${env.APP_URL}/auth/callback` },
  });

  if (error) {
    console.error("sendMagicLink: signInWithOtp failed", { message: error.message });
    return { ok: false, error: "Couldn't send the sign-in link. Try again in a minute." };
  }

  return { ok: true };
}
