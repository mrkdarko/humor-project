# Humor Project

## Local setup

Create `.env.local` with the public Supabase project settings shown in `.env.example`, then run `npm install` and `npm run dev`.

Google sign-in redirects back to `http://localhost:3000/auth/callback`. Add that URL to Supabase Auth's allowed redirect URLs. In Google Cloud, add `http://localhost:3000` as an authorized JavaScript origin and add your Supabase Auth callback (`https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI. Enter the Google client ID and secret in Supabase under **Authentication > Sign In / Providers > Google**.

The app creates a profile on signup, asks users to complete missing first and last names, and provides a protected dashboard and profile editor. Profile photos are stored in a private Supabase Storage bucket.

For Vercel, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the project environment settings. Add the deployed app origin as a Google authorized JavaScript origin, and add `https://<your-domain>/auth/callback` to Supabase Auth's allowed redirect URLs. The Google authorized redirect URI remains the Supabase `/auth/v1/callback` URL.

## Community captions

The dashboard provides Campus / Dorm life / NYC filters, Newest / Top this week / My posts views, a daily prompt, private prompt drafts, and authenticated voting. Daily prompts rotate on UTC dates; Top this week uses a rolling seven-day publication window. Ranking runs in the database before pagination.

LLM integration is deliberately deferred. Drafts save prompts without calling a model. Users can publish captions generated in an external AI tool, recording both the prompt and tool/model. The community feed starts empty: no example text is presented as genuine AI output.

The migration in `supabase/migrations/20261005164356_community_captions.sql` creates `generations`, `captions`, and `caption_votes`, enables RLS, and grants minimal permissions. It was applied to the connected humor-project Supabase project. Existing profiles policies and the private avatar bucket are preserved. The signup trigger still creates profiles automatically; its function is no longer directly callable by clients. Earlier signup/profile migrations predate local migration tracking; a fresh database must have those prerequisites before this migration is applied.

Published captions and their prompts are shared with signed-in users. Drafts and profiles are owner-only. First votes insert a new row; changing a vote updates that row, and clicking the selected vote removes it. The database prevents duplicate votes, self-votes, voter impersonation, editing published captions/prompts, and reading other users' individual vote records. The feed exposes only aggregate counts and the caller's own vote. A private-schema function performs aggregation behind a security-invoker API wrapper; neither API function accepts an arbitrary viewer ID.

Future LLM integration should run server-side: read queued generations, call the model with the stored prompt, then atomically save a caption and mark the generation `ready`, with `source = 'app_ai'` and the actual provider/model. Never expose a service-role or LLM key in `NEXT_PUBLIC_*`, browser code, or Git. The current app requires no LLM or service-role key. Image generation/uploads are deferred; profile photos remain in private Supabase Storage, not binary database columns.

## Verification

Run `npm test` (Node 22.6+) for form validation and daily-prompt tests, `npm run lint`, and `npm run build`. `supabase/tests/community_rls.sql` tests publication atomicity, the signup trigger, private drafts/profiles, voting, duplicate prevention, self-vote prevention, vote identity protection, filters, totals, and anonymous access. Run it in the Supabase SQL Editor or through MCP with an administrative connection: all temporary users and rows roll back.

Before submitting, check with two signed-in browser accounts: one publishes an AI caption and saves a prompt draft; the other sees only the caption, can vote, change its vote, and remove it. Confirm profile editing and avatar upload still work. Deploy the committed app to Vercel with the existing public Supabase environment settings. Automatic LLM generation is still outstanding, so this preparation alone does not complete the full assignment.
