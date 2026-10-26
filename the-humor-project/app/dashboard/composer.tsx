"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Link2, Type, Upload, X } from "lucide-react";
import { submitGeneration } from "./actions";
import { topics } from "@/utils/community";
import { imageTypes, MAX_IMAGE_BYTES } from "@/utils/meme-media";

function PhotoInput() {
  const [source, setSource] = useState("upload");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function selectFile(file?: File) {
    setError("");
    setPreview("");
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES || !imageTypes.includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP under 3 MB.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  return <div className="space-y-3">
    <div role="group" aria-label="Photo source" className="grid grid-cols-2 gap-2">
      {[["upload", "Upload", Upload], ["link", "Image link", Link2]].map(([value, label, Icon]) => {
        const SourceIcon = Icon as typeof Upload;
        return <button key={String(value)} type="button" aria-pressed={source === value} onClick={() => {
          if (source !== value) { setSource(String(value)); setPreview(""); setError(""); }
        }}
          className={`flex min-h-10 items-center justify-center gap-2 border-2 border-black px-2 text-sm font-bold ${source === value ? "bg-[var(--coin-gold)]" : "bg-white"}`}>
          <SourceIcon size={16} aria-hidden="true" />{String(label)}
        </button>;
      })}
    </div>
    <input type="hidden" name="image_source" value={source} />
    {source === "upload" ? <>
      <label className="block text-sm font-bold">
        PHOTO
        <input ref={fileInput} name="image_file" type="file" accept={imageTypes.join(",")} required
          onChange={event => selectFile(event.target.files?.[0])}
          className="mt-2 block w-full min-w-0 text-sm file:mr-2 file:border-2 file:border-black file:bg-white file:px-2 file:py-2 file:font-bold" />
      </label>
      {preview && <div className="relative aspect-[4/3] overflow-hidden border-2 border-black bg-white">
        <Image src={preview} alt="Selected photo preview" fill unoptimized sizes="320px" className="object-contain" />
        <button type="button" title="Remove photo" aria-label="Remove photo" className="absolute right-2 top-2 flex size-8 items-center justify-center border-2 border-black bg-white"
          onClick={() => { if (fileInput.current) fileInput.current.value = ""; selectFile(); }}><X size={18} aria-hidden="true" /></button>
      </div>}
    </> : <label className="block text-sm font-bold">
      IMAGE LINK
      <input name="image_url" type="url" required maxLength={2048} placeholder="https://example.com/photo.jpg" className="community-input mt-2" />
    </label>}
    {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
  </div>;
}

export function Composer({ prompt }: { prompt: string }) {
  const [mode, setMode] = useState("draft");
  const [postType, setPostType] = useState("text");
  const [state, action, pending] = useActionState(submitGeneration, {});
  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        <legend className="sr-only">CREATE A CAPTION</legend>

        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Post format">
          {[{ value: "text", label: "Text", Icon: Type }, { value: "photo", label: "Photo meme", Icon: ImagePlus }].map(({ value, label, Icon }) =>
            <button key={value} type="button" aria-pressed={postType === value} onClick={() => { setPostType(value); if (value === "photo") setMode("publish"); }}
              className={`flex min-h-12 items-center justify-center gap-2 border-2 border-black px-2 text-sm font-bold ${postType === value ? "bg-[var(--mario-red)] text-white" : "bg-white"}`}>
              <Icon size={18} aria-hidden="true" />{label}
            </button>)}
        </div>
        <input type="hidden" name="post_type" value={postType} />
        {postType === "photo" && <PhotoInput key={state.resetKey || "initial"} />}

        {/* Mode toggle */}
        {postType === "text" &&
        <div className="flex gap-2" role="group" aria-label="Submission type">
          {[["draft", "💾 SAVE DRAFT"], ["publish", "⚡ ASK AI & PUBLISH"]].map(([value, label]) =>
            <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-12 flex-1 rounded-sm px-2 text-sm font-bold border-2 border-black transition-all duration-100 ${mode === value ? "bg-[var(--mario-red)] text-white shadow-[2px_2px_0_#000] translate-y-[2px]" : "bg-white text-black shadow-[4px_4px_0_#000] hover:translate-y-[-1px] hover:shadow-[5px_5px_0_#000]"}`}>{label}</button>
          )}
        </div>}

        <input type="hidden" name="mode" value={mode} />

        <label className="block text-sm font-bold text-black uppercase">
          SELECT STAGE (TOPIC)
          <select name="topic" className="community-input mt-2 border-[4px]">{topics.map(topic => <option key={topic}>{topic}</option>)}</select>
        </label>

        <label className="block text-sm font-bold text-black uppercase">
          {postType === "photo" ? "CAPTION IDEA" : "PROMPT"}
          <textarea name="prompt" defaultValue={prompt} required minLength={10} maxLength={2000} rows={4} className="community-input mt-2 resize-y border-[4px]" placeholder="E.g., Write a funny caption about living in a tiny dorm." />
        </label>

        {mode === "publish" && <>
          <div className="bg-[#FFFDE7] p-3 border-[4px] border-black rounded shadow-[4px_4px_0_#000]">
            <label className="flex items-start gap-3 text-sm font-bold text-black cursor-pointer">
              <input type="checkbox" name="consent" value="yes" required className="mt-1 w-5 h-5 accent-[var(--mario-red)] border-2 border-black" />
              {postType === "photo" ? "I agree to send this photo to Google AI and share it, my prompt, and the generated caption with the community. I have permission to use this photo." : "I agree to share my prompt and the AI-generated caption with the community."}
            </label>
          </div>
        </>}

        <button disabled={pending} className={mode === "draft" ? "btn-luigi btn-mario" : "btn-mario"}>
          {pending ? "PROCESSING..." : mode === "draft" ? "SAVE TO MEMORY CARD" : postType === "photo" ? "GENERATE PHOTO MEME" : "GENERATE & PUBLISH"}
        </button>
      </fieldset>
      {state.error && <p role="alert" className="text-sm font-bold text-white bg-[var(--mario-red)] p-3 border-[4px] border-black shadow-[4px_4px_0_#000] uppercase">ERROR: {state.error}</p>}
      {state.success && <p role="status" className="text-sm font-bold text-white bg-[var(--luigi-green)] p-3 border-[4px] border-black shadow-[4px_4px_0_#000] uppercase">SUCCESS: {state.success}</p>}
    </form>
  );
}
