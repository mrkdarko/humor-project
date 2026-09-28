import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SignOutButton } from "../sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("firstname, lastname, avatar_url").eq("id", user.id).maybeSingle();
  if (!profile?.firstname?.trim() || !profile?.lastname?.trim()) redirect("/profile");

  const savedAvatar = profile.avatar_url || "";
  const avatarUrl = savedAvatar.startsWith("http")
    ? savedAvatar
    : savedAvatar
      ? (await supabase.storage.from("avatars").createSignedUrl(savedAvatar, 60 * 60)).data?.signedUrl
      : null;

  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-8 text-stone-950 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-stone-200 pb-5">
          <Link className="font-semibold tracking-wide" href="/dashboard">HUMOR PROJECT</Link>
          <nav className="flex items-center gap-4"><Link className="text-sm font-medium text-stone-700 hover:text-emerald-800" href="/profile">Profile</Link><SignOutButton /></nav>
        </header>
        <section className="flex flex-col gap-8 py-12 sm:flex-row sm:items-center">
          {avatarUrl ? <Image className="size-24 rounded-full border border-stone-200 object-cover" src={avatarUrl} alt="" width={96} height={96} unoptimized /> : <div className="flex size-24 items-center justify-center rounded-full bg-emerald-100 text-3xl font-semibold text-emerald-900">{profile.firstname[0].toUpperCase()}</div>}
          <div><p className="text-sm font-medium text-emerald-800">SIGNED IN</p><h1 className="mt-2 text-3xl font-semibold">Welcome, {profile.firstname}</h1><p className="mt-2 text-stone-600">Your account is ready.</p></div>
        </section>
        <section className="border-t border-stone-200 py-8">
          <h2 className="text-xl font-semibold">Your account</h2>
          <p className="mt-2 text-stone-600">{profile.firstname} {profile.lastname}</p>
          <p className="mt-1 text-sm text-stone-500">{user.email}</p>
          <Link className="mt-5 inline-flex min-h-10 items-center rounded-md border border-stone-300 px-4 text-sm font-medium hover:bg-white" href="/profile">Edit profile</Link>
        </section>
      </div>
    </main>
  );
}
