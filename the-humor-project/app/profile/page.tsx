import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ProfileForm } from "./profile-form";
import { SignOutButton } from "../sign-out-button";

function metadataText(metadata: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("firstname, lastname, avatar_url").eq("id", user.id).maybeSingle();
  const metadata = user.user_metadata as Record<string, unknown>;
  const firstName = profile?.firstname?.trim() || metadataText(metadata, "given_name", "first_name", "firstname");
  const lastName = profile?.lastname?.trim() || metadataText(metadata, "family_name", "last_name", "lastname");
  const savedAvatar = profile?.avatar_url || "";
  const avatarPath = savedAvatar && !savedAvatar.startsWith("http") ? savedAvatar : "";
  const providerAvatar = savedAvatar.startsWith("http") ? savedAvatar : metadataText(metadata, "avatar_url", "picture");
  const { data: signedAvatar } = avatarPath ? await supabase.storage.from("avatars").createSignedUrl(avatarPath, 60 * 60) : { data: null };
  const needsNames = !profile?.firstname?.trim() || !profile?.lastname?.trim();

  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-8 text-stone-950 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between border-b border-stone-200 pb-5"><Link className="font-semibold tracking-wide" href="/dashboard">HUMOR PROJECT</Link><SignOutButton /></header>
        <section className="py-10">
          <p className="text-sm font-medium text-emerald-800">YOUR ACCOUNT</p>
          <h1 className="mt-2 text-3xl font-semibold">Profile</h1>
          <p className="mb-8 mt-2 text-stone-600">Manage the name and photo shown on your account.</p>
          <ProfileForm userId={user.id} firstName={firstName} lastName={lastName} initialAvatarPath={avatarPath} initialAvatarPreview={signedAvatar?.signedUrl || providerAvatar} needsNames={needsNames} />
        </section>
      </div>
    </main>
  );
}
