import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;
  if (!code) return NextResponse.redirect(new URL("/?error=oauth", origin));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/?error=oauth", origin));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/", origin));

  const { data: profile } = await supabase
    .from("profiles")
    .select("firstname, lastname")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.firstname?.trim() || !profile?.lastname?.trim()) {
    return NextResponse.redirect(new URL("/profile", origin));
  }
  return NextResponse.redirect(new URL("/dashboard", origin));
}
