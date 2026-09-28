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
    <form className="space-y-6" onSubmit={saveProfile}>
      {needsNames ? <div className="border-l-2 border-emerald-700 pl-4 text-sm leading-6 text-stone-600">Add your first and last name to finish setting up your profile.</div> : null}
      <div className="flex items-center gap-5">
        {avatarPreview ? (
          <Image className="size-20 rounded-full border border-stone-200 object-cover" src={avatarPreview} alt="Profile" width={80} height={80} unoptimized />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full border border-stone-300 bg-stone-100 text-2xl font-semibold text-stone-500">{firstname?.[0]?.toUpperCase() || "?"}</div>
        )}
        <label className="cursor-pointer text-sm font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950">
          {busy ? "Working..." : "Upload a photo"}
          <input accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={busy} onChange={(event) => void uploadPhoto(event.target.files?.[0])} type="file" />
        </label>
        <span className="text-xs text-stone-500">Images up to 5 MB</span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-stone-700">First name<input autoComplete="given-name" className="min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base text-stone-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" onChange={(event) => setFirstname(event.target.value)} required value={firstname} /></label>
        <label className="space-y-2 text-sm font-medium text-stone-700">Last name<input autoComplete="family-name" className="min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base text-stone-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" onChange={(event) => setLastname(event.target.value)} required value={lastname} /></label>
      </div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button className="min-h-11 rounded-md bg-emerald-800 px-5 font-medium text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60" disabled={busy} type="submit">{busy ? "Saving..." : "Save profile"}</button>
    </form>
  );
}
