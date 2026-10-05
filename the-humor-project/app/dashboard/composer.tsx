"use client";

import { useActionState, useState } from "react";
import { submitGeneration } from "./actions";
import { topics } from "@/utils/community";

export function Composer({ prompt }: { prompt: string }) {
  const [mode, setMode] = useState("draft");
  const [state, action, pending] = useActionState(submitGeneration, {});
  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        <legend className="sr-only">CREATE A CAPTION</legend>

        {/* Mode toggle */}
        <div className="flex gap-2" role="group" aria-label="Submission type">
          {[["draft", "💾 SAVE DRAFT"], ["publish", "⚡ ASK AI & PUBLISH"]].map(([value, label]) =>
            <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-12 flex-1 rounded-sm px-2 text-sm font-bold border-2 border-black transition-all duration-100 ${mode === value ? "bg-[var(--mario-red)] text-white shadow-[2px_2px_0_#000] translate-y-[2px]" : "bg-white text-black shadow-[4px_4px_0_#000] hover:translate-y-[-1px] hover:shadow-[5px_5px_0_#000]"}`}>{label}</button>
          )}
        </div>

        <input type="hidden" name="mode" value={mode} />

        <label className="block text-sm font-bold text-black uppercase">
          SELECT STAGE (TOPIC)
          <select name="topic" className="community-input mt-2 border-[4px]">{topics.map(topic => <option key={topic}>{topic}</option>)}</select>
        </label>

        <label className="block text-sm font-bold text-black uppercase">
          PROMPT
          <textarea name="prompt" defaultValue={prompt} required minLength={10} maxLength={2000} rows={4} className="community-input mt-2 resize-y border-[4px]" placeholder="E.g., Write a funny caption about living in a tiny dorm." />
        </label>

        {mode === "publish" && <>
          <div className="bg-[#FFFDE7] p-3 border-[4px] border-black rounded shadow-[4px_4px_0_#000]">
            <p className="text-sm font-bold text-black mb-2 uppercase text-center">🍄 AI WILL GENERATE YOUR CAPTION 🍄</p>
            <label className="flex items-start gap-3 text-sm font-bold text-black cursor-pointer">
              <input type="checkbox" name="consent" value="yes" required className="mt-1 w-5 h-5 accent-[var(--mario-red)] border-2 border-black" />
              I AGREE TO SHARE MY PROMPT AND THE AI-GENERATED CAPTION WITH THE COMMUNITY.
            </label>
          </div>
        </>}

        <button disabled={pending} className={mode === "draft" ? "btn-luigi btn-mario" : "btn-mario"}>
          {pending ? "PROCESSING..." : mode === "draft" ? "SAVE TO MEMORY CARD" : "GENERATE & PUBLISH"}
        </button>
      </fieldset>
      {state.error && <p role="alert" className="text-sm font-bold text-white bg-[var(--mario-red)] p-3 border-[4px] border-black shadow-[4px_4px_0_#000] uppercase">ERROR: {state.error}</p>}
      {state.success && <p role="status" className="text-sm font-bold text-white bg-[var(--luigi-green)] p-3 border-[4px] border-black shadow-[4px_4px_0_#000] uppercase">SUCCESS: {state.success}</p>}
    </form>
  );
}
