import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, Sparkles } from "lucide-react";
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

  return <main className="min-h-screen bg-[#f8faf9] px-4 py-6 text-stone-950 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <Link href="/dashboard" className="font-semibold">HUMOR PROJECT</Link>
        <nav aria-label="Account" className="flex items-center gap-4 text-sm"><Link href="/profile" className="hover:text-emerald-800">Profile</Link><SignOutButton /></nav>
      </header>
      <div className="flex flex-wrap items-end justify-between gap-3 py-7"><div><p className="text-sm text-emerald-800">Hey, {profile.firstname}</p><h1 className="mt-1 text-3xl font-semibold">Campus. City. Comedy.</h1></div><span className="text-sm text-stone-500">The community caption feed</span></div>
      <section className="flex items-center gap-4 border-y border-stone-200 py-5" aria-labelledby="daily-prompt">
        <Image src="https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=240&q=80" alt="New York City skyline" width={96} height={96} unoptimized className="hidden size-24 shrink-0 rounded-md object-cover sm:block" />
        <div><h2 id="daily-prompt" className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Sparkles size={16} />Today&apos;s prompt</h2><p className="mt-2 max-w-2xl text-base">{prompt}</p></div>
      </section>
      {unavailable && <div role="alert" className="mt-5 border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950">The community feed is temporarily unavailable. Please reload or try again later.</div>}
      <div className="grid gap-10 py-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Caption feed" className="min-w-0">
          <nav aria-label="Feed views" className="flex gap-6 border-b border-stone-200">{[['newest','Newest'],['top','Top this week'],['mine','My posts']].map(([value,label]) => <Link key={value} href={href(value)} aria-current={view === value ? 'page' : undefined} className={`border-b-2 pb-3 text-sm font-semibold ${view === value ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-stone-500'}`}>{label}</Link>)}</nav>
          <nav aria-label="Topics" className="flex flex-wrap gap-2 py-4">{['All topics', ...topics].map(label => <Link key={label} href={href(view, label === 'All topics' ? '' : label)} aria-current={(topic || 'All topics') === label ? 'page' : undefined} className={`rounded-md px-3 py-2 text-sm ${(topic || 'All topics') === label ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>{label}</Link>)}</nav>
          {!unavailable && !rows.length && <div className="border-y border-dashed border-stone-300 py-12"><h2 className="text-lg font-semibold">{view === 'mine' ? 'Your first caption starts here.' : 'No captions here yet.'}</h2><p className="mt-2 text-sm text-stone-500">{view === 'top' ? 'No captions have been published this week.' : 'Be the first to share a caption for this topic.'}</p></div>}
          <div className="space-y-4">{rows.map(row => <article key={row.id} className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500"><span className="font-semibold text-emerald-800">{row.topic}</span><span>{row.user_id === user.id ? 'You' : 'Community'} · {new Date(row.created_at).toLocaleDateString('en-US', {month:'short',day:'numeric',timeZone:'America/New_York'})}</span></div>
            <p className="my-5 whitespace-pre-wrap break-words text-xl leading-relaxed">{row.content}</p>
            <div className="flex flex-wrap items-center justify-between gap-3">{row.user_id === user.id ? <p className="text-sm text-stone-500">Your caption · {Number(row.upvotes)} funny / {Number(row.downvotes)} not for me</p> : <VoteControls id={row.id} upvotes={Number(row.upvotes)} downvotes={Number(row.downvotes)} ownVote={row.own_vote || 0} />}<span className="max-w-full break-words text-xs text-stone-500">AI · {row.provider}</span></div>
            <details className="mt-4 border-t border-stone-100 pt-3 text-sm"><summary className="cursor-pointer text-stone-500">Original prompt</summary><p className="mt-3 whitespace-pre-wrap break-words text-stone-700">{row.prompt}</p></details>
          </article>)}</div>
          {!unavailable && <nav aria-label="Pagination" className="mt-6 flex justify-between text-sm">{page > 1 ? <Link href={href(view,topic,page-1)} className="underline">Previous</Link> : <span />}{rows.length === 20 && <Link href={href(view,topic,page+1)} className="underline">Next</Link>}</nav>}
        </section>
        <aside className="min-w-0 border-t border-stone-200 pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <h2 className="mb-4 text-lg font-semibold">Make something funny</h2><Composer prompt={prompt} />
          {!!drafts?.length && <section className="mt-8 border-t border-stone-200 pt-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><Clock3 size={16} />Your prompt drafts</h2><ul className="mt-3 divide-y divide-stone-200">{drafts.map(draft => <li key={draft.id} className="py-3"><p className="text-xs font-medium text-emerald-800">{draft.topic} · Awaiting AI connection</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-600">{draft.prompt}</p></li>)}</ul></section>}
        </aside>
      </div>
    </div>
  </main>;
}
