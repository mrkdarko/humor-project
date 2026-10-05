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
    <button
      className="btn-ghost-chunky"
      disabled={busy}
      onClick={signOut}
      type="button"
    >
      {busy ? "EXITING..." : "SIGN OUT"}
    </button>
  );
}
