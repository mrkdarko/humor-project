import { redirect } from "next/navigation";
import { GoogleButton } from "./auth/google-button";
import { createClient } from "@/utils/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="grid min-h-screen bg-[#f7f8f5] text-stone-950 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex min-h-[42vh] flex-col justify-between bg-[#153e35] px-7 py-8 text-white sm:px-12 sm:py-10 lg:min-h-screen lg:px-16">
        <p className="text-sm font-semibold tracking-wide">HUMOR PROJECT</p>
        <div className="max-w-xl py-12"><p className="text-sm font-medium text-emerald-200">A PLACE TO CONNECT</p><h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">Good to have you here.</h1><p className="mt-5 max-w-md text-base leading-7 text-emerald-50/80">Sign in to continue to your account and community.</p></div>
        <p className="text-sm text-emerald-100/70">Your profile stays yours.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm"><p className="text-sm font-medium text-emerald-800">WELCOME BACK</p><h2 className="mt-2 text-2xl font-semibold">Sign in to your account</h2><p className="mb-7 mt-2 text-sm leading-6 text-stone-600">New here? Google sign-in will create your account.</p><GoogleButton />
        </div>
      </section>
    </main>
  );
}
