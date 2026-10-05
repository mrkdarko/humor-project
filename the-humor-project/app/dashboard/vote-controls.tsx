"use client";

import { useActionState } from "react";
import { voteCaption } from "./actions";

export function VoteControls({ id, upvotes, downvotes, ownVote }: { id: string; upvotes: number; downvotes: number; ownVote: number }) {
  const [state, action, pending] = useActionState(voteCaption, {});
  return <div>
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="caption_id" value={id} />
      {[
        { value: 1, icon: "🍄", label: "1UP", count: upvotes },
        { value: -1, icon: "🐢", label: "DAMAGE", count: downvotes },
      ].map(({ value, icon, label, count }) =>
        <button
          key={value}
          name="value"
          value={ownVote === value ? 0 : value}
          disabled={pending}
          title={ownVote === value ? `Remove ${label.toLowerCase()}` : label}
          aria-label={`${label}, ${count}`}
          aria-pressed={ownVote === value}
          className="vote-btn-chunky"
        >
          <span className="text-lg">{icon}</span>
          <span className="font-sans text-base font-black">{count}</span>
        </button>
      )}
    </form>
    {state.error && <p role="alert" className="mt-2 text-[10px] font-pixel text-red-600 uppercase">ERR: {state.error}</p>}
    <span role="status" className="sr-only">{pending ? "PROCESSING..." : state.success}</span>
  </div>;
}
