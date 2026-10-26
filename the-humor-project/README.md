# Humor Project

## Local setup

Create `.env.local` with the public Supabase project settings shown in `.env.example`, then run `npm install` and `npm run dev`.

Google sign-in redirects back to `http://localhost:3000/auth/callback`. Add that URL to Supabase Auth's allowed redirect URLs. In Google Cloud, add `http://localhost:3000` as an authorized JavaScript origin and add your Supabase Auth callback (`https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI. Enter the Google client ID and secret in Supabase under **Authentication > Sign In / Providers > Google**.

The app creates a profile on signup, asks users to complete missing first and last names, and provides a protected dashboard and profile editor. Profile photos are stored in a private Supabase Storage bucket.

For Vercel, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the server-only `GEMINI_API_KEY` in the project environment settings. Optionally set `GEMINI_MODEL` for photo captioning; it defaults to `gemini-3.5-flash-lite`. Add the deployed app origin as a Google authorized JavaScript origin, and add `https://<your-domain>/auth/callback` to Supabase Auth's allowed redirect URLs. The Google authorized redirect URI remains the Supabase `/auth/v1/callback` URL. Never commit `.env.local` or put the Gemini key in a `NEXT_PUBLIC_*` variable.

## Community captions

The dashboard provides Campus / Dorm life / NYC filters, Newest / Top this week / My posts views, a daily prompt, private prompt drafts, and authenticated voting. Daily prompts rotate on UTC dates; Top this week uses a rolling seven-day publication window. Ranking runs in the database before pagination.

Text posts use Gemini to generate captions from the user's prompt. Drafts save prompts without calling a model. Photo memes accept either a JPEG, PNG, or WebP upload under 3 MB or a direct public HTTPS image link. The server validates and resizes the image, strips metadata, and sends the actual photo to Gemini. Each photo post renders the photo above its generated caption, with the original prompt available below.

Schema changes are managed in the connected humor-project Supabase project, not SQL files in this repository. The app uses `generations`, `captions`, and `caption_votes`, with RLS and authenticated database functions for publishing and feed queries. The signup trigger creates profiles automatically. Existing profile, avatar, and administrative policies are preserved.

Photo files live in the private `meme-images` Storage bucket. Only their paths, descriptions, and dimensions are stored in `generations`; binary images and base64 data are never saved in relational columns. Uploads are restricted to the user's folder. Published photos are readable by signed-in users via short-lived signed URLs. The app imports linked photos into Storage rather than hotlinking them. Failed publication attempts clean up unused uploads, and published image files cannot be deleted by normal users.

The feed's All posts / Text / Photos filter works together with topic, ranking, ownership, and pagination. Media filtering happens in the database before page limits. Existing text posts are unchanged.

Published captions and their prompts are shared with signed-in users. Drafts and profiles are owner-only. Users can rate any published text or photo meme, including their own. First votes insert a new row; changing a vote updates that row, and clicking the selected vote removes it. The database prevents duplicate votes, voter impersonation, editing published captions/prompts, and reading other users' individual vote records. The feed exposes only aggregate counts and the caller's own vote. A private-schema function performs aggregation behind a security-invoker API wrapper; neither API function accepts an arbitrary viewer ID.

AI generation runs server-side using the signed-in user's Supabase session; no service-role key is required. Published prompts and captions are committed together. The existing publishing contract uses `source = 'external_ai'` for server-generated captions as well as external captions.

## Verification

Run `npm test` (Node 22.6+), `npm run lint`, and `npm run build`. Tests cover form validation, auth controls, vote targets, photo input validation, private-IP blocking, image decoding and metadata removal, AI response validation, publication, and failure cleanup. Database policies and media filters were also checked through Supabase using rolled-back test transactions.

Before submitting, check with two signed-in browser accounts: one publishes a text caption and a photo meme; the other sees both, filters by format, and votes on either type. Confirm private drafts, profile editing, and avatar upload still work. Deploy the committed app to Vercel with the environment settings above.
