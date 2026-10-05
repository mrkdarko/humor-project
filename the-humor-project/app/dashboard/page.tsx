import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { dailyPrompt, topics } from "@/utils/community";
import { SignOutButton } from "../sign-out-button";
import { Composer } from "./composer";
import { VoteControls } from "./vote-controls";

type FeedRow = { id: string; content: string; prompt: string; topic: string; provider: string; user_id: string; created_at: string; upvotes: number; downvotes: number; own_vote: number };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ view?: string; topic?: string; page?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("firstname, lastname").eq("id", user.id).maybeSingle();
  if (!profile?.firstname?.trim() || !profile?.lastname?.trim()) redirect("/profile");

  const params = await searchParams;
  const view = ["newest", "top", "mine"].includes(params.view || "") ? params.view! : "newest";
  const topic = topics.includes(params.topic as (typeof topics)[number]) ? params.topic : undefined;
  const page = Math.min(1000, Math.max(1, Number.parseInt(params.page || "1", 10) || 1));
  const href = (nextView: string, nextTopic = topic, nextPage = 1) => `/dashboard?${new URLSearchParams({ view: nextView, ...(nextTopic ? { topic: nextTopic } : {}), ...(nextPage > 1 ? { page: String(nextPage) } : {}) })}`;
  const prompt = dailyPrompt();

  // Rank before pagination so "top" covers the whole feed rather than one page.
  const { data: feed, error: feedError } = await supabase.rpc("get_caption_feed", { p_view: view, p_topic: topic || null, p_offset: (page - 1) * 20 });
  const rows = (feed || []) as FeedRow[];
  const { data: drafts, error: draftError } = await supabase.from("generations").select("id, prompt, topic, created_at").eq("user_id", user.id).eq("status", "queued").order("created_at", { ascending: false }).limit(10);
  const unavailable = !!feedError || !!draftError;

  return <main className="relative min-h-screen px-4 py-6 sm:px-8 overflow-hidden z-0">
    <div className="cloud cloud-1" style={{ top: '5%', zIndex: -1 }}></div>
    <div className="cloud cloud-2" style={{ top: '80%', zIndex: -1, animationDuration: '80s' }}></div>
    
    <div className="mx-auto max-w-6xl relative z-10">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b-[4px] border-black mb-8 bg-white/80 p-4 rounded-xl shadow-[4px_4px_0_#000]">
        <Link href="/dashboard" className="font-pixel text-lg font-extrabold tracking-tight text-black flex items-center gap-2">
          🍄 HUMOR PROJECT
        </Link>
        <nav aria-label="Account" className="flex items-center gap-4 text-sm">
          <Link href="/profile" className="font-bold text-black hover:text-[var(--mario-red)] hover:underline decoration-[3px] underline-offset-4">PROFILE</Link>
          <SignOutButton />
        </nav>
      </header>

      {/* Welcome */}
      <div className="flex flex-wrap items-end justify-between gap-3 py-4 mb-6">
        <div className="bg-white p-4 border-[4px] border-black shadow-[6px_6px_0_#000] rotate-[-1deg]">
          <p className="font-pixel text-xs text-[var(--mario-red)] mb-2">HELLO, PLAYER {profile.firstname.toUpperCase()}!</p>
          <h1 className="font-sans text-4xl font-extrabold tracking-tight uppercase">WORLD 1-1: COMEDY STAGE</h1>
        </div>
      </div>

      {/* Daily Prompt */}
      <section className="flex items-start gap-5 chunky-card bg-[#FBD000] p-6 mb-8" aria-labelledby="daily-prompt">
        <div className="hidden sm:flex size-24 shrink-0 rounded-xl border-[4px] border-black bg-white items-center justify-center text-4xl shadow-[4px_4px_0_#000] rotate-3">
          ⭐
        </div>
        <div>
          <h2 id="daily-prompt" className="flex items-center gap-2 font-pixel text-sm text-black mb-3">
            TODAY'S QUEST
          </h2>
          <p className="max-w-2xl text-xl font-bold leading-relaxed">{prompt}</p>
        </div>
      </section>

      {unavailable && <div role="alert" className="mt-5 chunky-card bg-red-100 border-[4px] border-red-600 p-4 font-bold text-red-900 shadow-[4px_4px_0_#DC2626]">CONNECTION ERROR. TRY RESTARTING THE CONSOLE.</div>}

      {/* Main Grid */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Feed */}
        <section aria-label="Caption feed" className="min-w-0">
          {/* Tabs */}
          <nav aria-label="Feed views" className="flex flex-wrap gap-3 mb-6">
            {[["newest", "NEWEST"], ["top", "HIGH SCORES"], ["mine", "MY INVENTORY"]].map(([value, label]) =>
              <Link key={value} href={href(value)} aria-current={view === value ? "page" : undefined} className={`topic-pill-chunky ${view === value ? "topic-pill-chunky-active" : ""}`}>{label}</Link>
            )}
          </nav>

          {/* Topic pills */}
          <div className="bg-white p-3 border-[4px] border-black rounded-xl shadow-[4px_4px_0_#000] mb-8">
            <p className="font-pixel text-[10px] text-gray-500 mb-2">SELECT LEVEL:</p>
            <nav aria-label="Topics" className="flex flex-wrap gap-2">
              {["All topics", ...topics].map(label =>
                <Link key={label} href={href(view, label === "All topics" ? "" : label)} aria-current={(topic || "All topics") === label ? "page" : undefined} className={`px-3 py-1 text-sm font-bold border-2 border-black rounded shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#000] active:translate-y-[2px] active:shadow-[0_0_0_#000] ${(topic || "All topics") === label ? "bg-[var(--pipe-green)] text-white" : "bg-[#F0F0F0] text-black"}`}>{label.toUpperCase()}</Link>
              )}
            </nav>
          </div>

          {/* Empty */}
          {!unavailable && !rows.length && <div className="chunky-card p-12 text-center bg-white">
            <p className="text-5xl mb-4" aria-hidden="true">{view === "mine" ? "✏️" : "👻"}</p>
            <h2 className="font-sans text-2xl font-bold uppercase">{view === "mine" ? "INVENTORY EMPTY" : "NO PLAYERS FOUND"}</h2>
            <p className="mt-2 text-lg font-bold text-gray-500">{view === "top" ? "No high scores this week." : "Be the first to drop a caption here."}</p>
          </div>}

          {/* Cards */}
          <div className="space-y-6">
            {rows.map((row) => <article key={row.id} className="chunky-card p-5 bg-white chunky-card-interactive">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b-[4px] border-black pb-3 mb-4">
                <span className="px-2 py-1 font-bold border-2 border-black bg-[var(--coin-gold)] text-black uppercase">{row.topic}</span>
                <span className="font-bold text-gray-600 uppercase">{row.user_id === user.id ? "PLAYER 1" : "CPU"} · {new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}</span>
              </div>
              <p className="my-5 whitespace-pre-wrap break-words text-2xl font-bold leading-relaxed">{row.content}</p>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                {row.user_id === user.id
                  ? <p className="text-sm font-bold text-gray-600 bg-gray-100 p-2 border-2 border-gray-300 rounded">YOUR CAPTION · {Number(row.upvotes)} HP / {Number(row.downvotes)} DMG</p>
                  : <VoteControls id={row.id} upvotes={Number(row.upvotes)} downvotes={Number(row.downvotes)} ownVote={row.own_vote || 0} />
                }
                <span className="max-w-full break-words text-[10px] font-pixel text-gray-400">ENGINE: {row.provider.toUpperCase()}</span>
              </div>
              <details className="mt-4 pt-3 border-t-[4px] border-black border-dashed">
                <summary className="cursor-pointer font-bold text-gray-500 hover:text-black uppercase">VIEW SOURCE CODE (PROMPT)</summary>
                <p className="mt-3 whitespace-pre-wrap break-words font-bold text-black bg-gray-100 p-3 border-2 border-black rounded">{row.prompt}</p>
              </details>
            </article>)}
          </div>

          {/* Pagination */}
          {!unavailable && <nav aria-label="Pagination" className="mt-8 flex justify-between text-sm">
            {page > 1 ? <Link href={href(view, topic, page - 1)} className="btn-ghost-chunky uppercase">&lt;&lt; PREV STAGE</Link> : <span />}
            {rows.length === 20 && <Link href={href(view, topic, page + 1)} className="btn-ghost-chunky uppercase">NEXT STAGE &gt;&gt;</Link>}
          </nav>}
        </section>

        {/* Sidebar */}
        <aside className="min-w-0">
          <div className="chunky-card bg-[var(--bg-sky)] p-6 mb-8 border-[4px] border-black shadow-[6px_6px_0_#000]">
             <h2 className="mb-5 font-pixel text-sm text-black flex items-center gap-2 bg-white inline-block p-2 border-2 border-black rounded">
              <span className="text-lg">🔨</span> CRAFT ITEM
            </h2>
            <Composer prompt={prompt} />
          </div>

          {!!drafts?.length && <section className="chunky-card p-5 bg-white">
            <h2 className="font-sans text-xl font-bold uppercase border-b-[4px] border-black pb-2 mb-4">SAVE FILES ({drafts.length})</h2>
            <ul className="space-y-4">
              {drafts.map(draft => <li key={draft.id} className="p-3 border-2 border-black rounded shadow-[2px_2px_0_#000] bg-[#F0F0F0] hover:bg-white transition-colors cursor-pointer">
                <p className="text-[10px] font-pixel text-[var(--mario-red)] mb-2">{draft.topic.toUpperCase()} · PENDING</p>
                <p className="whitespace-pre-wrap break-words text-sm font-bold text-gray-800 line-clamp-3">{draft.prompt}</p>
              </li>)}
            </ul>
          </section>}
        </aside>
      </div>
    </div>
  </main>;
}
