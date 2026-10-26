"use client";

import { useActionState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { voteCaption } from "./actions";

export function VoteControls({ id, upvotes, downvotes, ownVote, isOwnCaption = false }: { id: string; upvotes: number; downvotes: number; ownVote: number; isOwnCaption?: boolean }) {
  const [state, action, pending] = useActionState(voteCaption, {});
  return <div>
    <p className="mb-2 text-sm font-bold uppercase">Rate caption</p>
    <form action={action} aria-label="Caption rating" className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="caption_id" value={id} />
      {[
        { value: 1, Icon: ThumbsUp, label: "Upvote", count: upvotes },
        { value: -1, Icon: ThumbsDown, label: "Downvote", count: downvotes },
      ].map(({ value, Icon, label, count }) =>
        <button
          key={value}
          type="submit"
          name="value"
          value={ownVote === value ? 0 : value}
          disabled={pending}
          title={ownVote === value ? `Remove ${label.toLowerCase()}` : label}
          aria-label={`${label}, ${count} votes`}
          aria-pressed={ownVote === value}
          className="vote-btn-chunky disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 disabled:shadow-none"
        >
          <Icon size={20} aria-hidden="true" />
          <span className="font-sans text-base font-black tabular-nums">{count}</span>
        </button>
      )}
      {isOwnCaption && <span className="text-sm text-gray-600">Your caption</span>}
    </form>
    {pending && <p role="status" className="mt-2 text-sm font-bold">Saving vote...</p>}
    {state.error && <p role="alert" className="mt-2 text-[10px] font-pixel text-red-600 uppercase">ERR: {state.error}</p>}
    <span role="status" className="sr-only">{pending ? "" : state.success}</span>
  </div>;
}
