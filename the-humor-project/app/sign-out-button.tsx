"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <button className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60" disabled={busy} onClick={signOut} type="button">
      {busy ? "Signing out..." : "Sign out"}
    </button>
  );
}
