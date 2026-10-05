"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { validateSubmission, type ActionState } from "@/utils/community";

export async function submitGeneration(_previous: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again to save your post." };
  const result = validateSubmission(form);
  if (result.error) return { error: result.error };
  const { prompt, topic, mode, content, provider } = result.data;
  const { error } = mode === "publish"
    ? await supabase.rpc("publish_external_caption", { p_prompt: prompt, p_topic: topic, p_content: content, p_provider: provider })
    : await supabase.from("generations").insert({ user_id: user.id, prompt, topic, source: "pending", status: "queued" });
  if (error) {
    console.error("Generation save failed:", error.code);
    return { error: "Could not save this post. Please try again." };
  }
  revalidatePath("/dashboard");
  return { success: mode === "publish" ? "Caption published." : "Prompt saved as a private draft. AI generation is not connected yet." };
}

export async function voteCaption(_previous: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again to vote." };
  const captionId = form.get("caption_id");
  const value = form.get("value");
  if (typeof captionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(captionId) || !["1", "-1", "0"].includes(String(value))) {
    return { error: "Invalid vote." };
  }
  const { error } = await supabase.rpc("submit_caption_vote", { p_caption_id: captionId, p_value: Number(value) });
  if (error) {
    console.error("Vote failed:", error.code);
    return { error: "Your vote wasn't saved. Please try again." };
  }
  revalidatePath("/dashboard");
  return { success: value === "0" ? "Vote removed." : "Vote saved." };
}
