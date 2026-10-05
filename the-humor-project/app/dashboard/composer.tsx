"use client";

import { useActionState, useState } from "react";
import { BookmarkPlus, Send } from "lucide-react";
import { submitGeneration } from "./actions";
import { topics } from "@/utils/community";

export function Composer({ prompt }: { prompt: string }) {
  const [mode, setMode] = useState("draft");
  const [state, action, pending] = useActionState(submitGeneration, {});
  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        <legend className="sr-only">Create a caption post</legend>
        <div className="flex gap-1 border-b border-stone-200 pb-3" role="group" aria-label="Submission type">
          {[['draft', 'Prompt draft'], ['publish', 'AI caption']].map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-10 flex-1 rounded-md px-2 text-sm font-medium ${mode === value ? 'bg-emerald-100 text-emerald-950' : 'text-stone-600 hover:bg-stone-100'}`}>{label}</button>)}
        </div>
        <input type="hidden" name="mode" value={mode} />
        <label className="block text-sm font-medium">Topic<select name="topic" className="community-input mt-1">{topics.map(topic => <option key={topic}>{topic}</option>)}</select></label>
        <label className="block text-sm font-medium">Prompt<textarea name="prompt" defaultValue={prompt} required minLength={10} maxLength={2000} rows={4} className="community-input mt-1 resize-y" /></label>
        {mode === "publish" && <>
          <label className="block text-sm font-medium">AI tool / model<input name="provider" required maxLength={80} placeholder="e.g. Gemini" className="community-input mt-1" /></label>
          <label className="block text-sm font-medium">AI caption<textarea name="content" required maxLength={500} rows={4} className="community-input mt-1 resize-y" /></label>
          <label className="flex items-start gap-2 text-sm text-stone-600"><input type="checkbox" name="consent" value="yes" required className="mt-1 accent-emerald-700" />I generated this caption with AI and want to share it and its prompt with the community.</label>
        </>}
        <button disabled={pending} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-800 px-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50">{mode === 'draft' ? <BookmarkPlus size={17} /> : <Send size={17} />}{pending ? "Saving..." : mode === "draft" ? "Save draft" : "Publish caption"}</button>
      </fieldset>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-emerald-800">{state.success}</p>}
    </form>
  );
}
