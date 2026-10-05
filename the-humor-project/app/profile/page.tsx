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
    <main className="relative min-h-screen px-5 py-8 sm:px-8 overflow-hidden z-0 bg-[var(--bg-ground)]">
      <div className="mx-auto max-w-3xl relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between border-b-[4px] border-black pb-5 bg-white/90 p-4 rounded-xl shadow-[4px_4px_0_#000] mb-8">
          <Link className="font-pixel text-lg font-bold tracking-tight text-black flex items-center gap-2" href="/dashboard">
            🍄 HUMOR PROJECT
          </Link>
          <SignOutButton />
        </header>

        <section className="py-10">
          <div className="inline-block bg-[var(--coin-gold)] px-4 py-2 border-[4px] border-black shadow-[4px_4px_0_#000] rotate-[-2deg] mb-6">
            <span className="font-pixel text-xs text-black">PLAYER SETTINGS</span>
          </div>
          
          <h1 className="font-sans text-5xl font-extrabold text-black uppercase drop-shadow-[4px_4px_0_#FFF] mb-2">CHARACTER SELECT</h1>
          <p className="mb-8 font-bold text-black bg-white inline-block px-3 py-1 border-2 border-black">Update your player card.</p>

          <div className="chunky-card bg-white p-8">
            <ProfileForm userId={user.id} firstName={firstName} lastName={lastName} initialAvatarPath={avatarPath} initialAvatarPreview={signedAvatar?.signedUrl || providerAvatar} needsNames={needsNames} />
          </div>
        </section>
      </div>
      
      {/* Decorative blocks */}
      <div className="absolute top-[20%] -left-10 w-32 h-32 bg-[#CC4B14] border-[4px] border-black shadow-[6px_6px_0_#000] rotate-12 z-[-1]" style={{backgroundImage: 'linear-gradient(45deg, transparent 48%, black 48%, black 52%, transparent 52%), linear-gradient(-45deg, transparent 48%, black 48%, black 52%, transparent 52%)', backgroundSize: '20px 20px'}}></div>
      <div className="absolute bottom-[10%] -right-10 w-40 h-40 bg-[#00A800] border-[4px] border-black shadow-[6px_6px_0_#000] -rotate-6 z-[-1]"></div>
    </main>
  );
}
