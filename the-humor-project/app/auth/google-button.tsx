"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function GoogleButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setBusy(true);
    setError("");
    const { error: signInError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (signInError) {
      setError(signInError.message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button className="flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-stone-300 bg-white px-4 font-medium text-stone-900 transition hover:bg-stone-50 disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={signIn} type="button">
        <span aria-hidden="true" className="text-lg font-semibold text-[#4285F4]">G</span>
        {busy ? "Connecting to Google..." : "Continue with Google"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
