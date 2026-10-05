"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { validateSubmission, type ActionState } from "@/utils/community";
import { GoogleGenAI } from "@google/genai";

export async function submitGeneration(_previous: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again to save your post." };
  const result = validateSubmission(form);
  if (result.error) return { error: result.error };
  const { prompt, topic, mode } = result.data;

  if (mode === "draft") {
    const { error } = await supabase.from("generations").insert({ user_id: user.id, prompt, topic, source: "pending", status: "queued" });
    if (error) {
      console.error("Generation save failed:", error.code);
      return { error: "Could not save this post. Please try again." };
    }
    revalidatePath("/dashboard");
    return { success: "Prompt saved as a private draft." };
  }

  // Generate Mode
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "GEMINI_API_KEY is not set in your environment. Add it to .env.local to enable AI generation." };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Tell Gemini to keep it short and funny
    const sysPrompt = `You are a funny, chronically online college student living in NYC. Write a caption based on the user's prompt. Keep it under 200 characters. Do not use quotes.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: sysPrompt,
        temperature: 0.8,
      }
    });

    const generatedText = response.text?.trim();
    if (!generatedText) {
      return { error: "AI failed to generate a caption. Try again!" };
    }

    const { error } = await supabase.rpc("publish_external_caption", { 
      p_prompt: prompt, 
      p_topic: topic, 
      p_content: generatedText.substring(0, 500), 
      p_provider: "Gemini 3.8 Flash" 
    });

    if (error) {
      console.error("Publish failed:", error.code, error.message);
      return { error: "Could not save this post. Please try again." };
    }
    
    revalidatePath("/dashboard");
    return { success: "AI generated and published your caption!" };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { error: "AI service is currently unavailable. Try again later." };
  }
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
