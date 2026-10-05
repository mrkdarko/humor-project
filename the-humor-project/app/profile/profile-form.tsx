"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/utils/supabase/client";

type ProfileFormProps = {
  userId: string;
  firstName: string;
  lastName: string;
  initialAvatarPath: string;
  initialAvatarPreview: string;
  needsNames: boolean;
};

export function ProfileForm({ userId, firstName, lastName, initialAvatarPath, initialAvatarPreview, needsNames }: ProfileFormProps) {
  const router = useRouter();
  const [firstname, setFirstname] = useState(firstName);
  const [lastname, setLastname] = useState(lastName);
  const [avatarPath, setAvatarPath] = useState(initialAvatarPath);
  const [avatarPreview, setAvatarPreview] = useState(initialAvatarPreview);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function uploadPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }

    setBusy(true);
    setError("");
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      setError(uploadError.message);
      setBusy(false);
      return;
    }

    const { data: image, error: imageError } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
    if (imageError) setError(imageError.message);
    else {
      setAvatarPath(path);
      setAvatarPreview(image.signedUrl);
    }
    setBusy(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firstname.trim() || !lastname.trim()) {
      setError("Enter both your first and last name.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: saveError } = await createClient().from("profiles").upsert({
      id: userId,
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      avatar_url: avatarPath || null,
    });
    if (saveError) {
      setError(saveError.message);
      setBusy(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-8" onSubmit={saveProfile}>
      {needsNames ? <div className="bg-[var(--coin-gold)] border-[4px] border-black p-4 text-black font-bold shadow-[4px_4px_0_#000] uppercase">⭐ ENTER YOUR NAME TO START PLAYING!</div> : null}

      {/* Avatar */}
      <div className="flex items-center gap-6 bg-gray-100 p-4 border-[4px] border-black rounded-xl">
        <div className="relative">
          {avatarPreview ? (
            <Image className="size-24 rounded-xl object-cover border-[4px] border-black shadow-[4px_4px_0_#000] bg-white" src={avatarPreview} alt="Profile" width={96} height={96} unoptimized />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-xl bg-[var(--bg-sky)] border-[4px] border-black shadow-[4px_4px_0_#000] text-4xl font-black text-white uppercase">
              {firstname?.[0] || "?"}
            </div>
          )}
          <div className="absolute -bottom-2 -right-2 bg-[var(--mario-red)] border-2 border-black rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold shadow-[2px_2px_0_#000]">1P</div>
        </div>
        
        <div className="space-y-2">
          <label className="btn-ghost-chunky inline-flex uppercase text-sm">
            {busy ? "UPLOADING..." : "CHANGE SPRITE"}
            <input accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={busy} onChange={(event) => void uploadPhoto(event.target.files?.[0])} type="file" />
          </label>
          <p className="font-pixel text-[8px] text-gray-500">MAX 5MB. JPG/PNG/GIF</p>
        </div>
      </div>

      {/* Name fields */}
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-bold text-black uppercase">
          PLAYER FIRST NAME
          <input autoComplete="given-name" className="community-input" onChange={(event) => setFirstname(event.target.value)} required value={firstname} />
        </label>
        <label className="space-y-2 text-sm font-bold text-black uppercase">
          PLAYER LAST NAME
          <input autoComplete="family-name" className="community-input" onChange={(event) => setLastname(event.target.value)} required value={lastname} />
        </label>
      </div>

      {error ? <p role="alert" className="text-sm font-bold text-white bg-[var(--mario-red)] p-3 border-[4px] border-black shadow-[4px_4px_0_#000] uppercase">ERR: {error}</p> : null}
      
      <div className="pt-4">
        <button className="btn-luigi btn-mario" disabled={busy} type="submit">
          {busy ? "SAVING..." : "SAVE CHARACTER"}
        </button>
      </div>
    </form>
  );
}
