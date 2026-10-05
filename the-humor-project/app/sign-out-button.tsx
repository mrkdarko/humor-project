"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const { error: signOutError } = await createClient().auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      // Clear the previous account's client-side page cache along with its session.
      window.location.assign(window.location.origin);
    } catch {
      setError("Could not sign out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0">
      <button
        className="btn-ghost-chunky"
        disabled={busy}
        onClick={signOut}
        type="button"
      >
        {busy ? "EXITING..." : "SIGN OUT"}
      </button>
      {error && <p role="alert" className="mt-2 max-w-60 text-sm text-red-700">{error}</p>}
    </div>
  );
}
