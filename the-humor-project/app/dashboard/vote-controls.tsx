"use client";

import { useActionState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { voteCaption } from "./actions";

export function VoteControls({ id, upvotes, downvotes, ownVote }: { id: string; upvotes: number; downvotes: number; ownVote: number }) {
  const [state, action, pending] = useActionState(voteCaption, {});
  return <div>
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="caption_id" value={id} />
      {[{ value: 1, Icon: ThumbsUp, label: "Funny", count: upvotes }, { value: -1, Icon: ThumbsDown, label: "Not for me", count: downvotes }].map(({ value, Icon, label, count }) => <button key={value} name="value" value={ownVote === value ? 0 : value} disabled={pending} title={ownVote === value ? `Remove ${label.toLowerCase()} vote` : label} aria-label={`${label}, ${count} votes`} aria-pressed={ownVote === value} className={`flex h-10 min-w-16 items-center justify-center gap-2 rounded-md border px-3 disabled:opacity-50 ${ownVote === value ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}><Icon size={17} /><span className="text-sm tabular-nums">{count}</span></button>)}
    </form>
    {state.error && <p role="alert" className="mt-2 text-sm text-red-700">{state.error}</p>}
    <span role="status" className="sr-only">{pending ? "Saving vote" : state.success}</span>
  </div>;
}
