# Humor Project

## Local setup

Create `.env.local` with the public Supabase project settings shown in `.env.example`, then run `npm install` and `npm run dev`.

Google sign-in redirects back to `http://localhost:3000/auth/callback`. Add that URL to Supabase Auth's allowed redirect URLs. In Google Cloud, add `http://localhost:3000` as an authorized JavaScript origin and add your Supabase Auth callback (`https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI. Enter the Google client ID and secret in Supabase under **Authentication > Sign In / Providers > Google**.

The app creates a profile on signup, asks users to complete missing first and last names, and provides a protected dashboard and profile editor. Profile photos are stored in a private Supabase Storage bucket.

For Vercel, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the project environment settings. Add the deployed app origin as a Google authorized JavaScript origin, and add `https://<your-domain>/auth/callback` to Supabase Auth's allowed redirect URLs. The Google authorized redirect URI remains the Supabase `/auth/v1/callback` URL.
