export const topics = ["Campus", "Dorm life", "NYC"] as const;
export type Topic = (typeof topics)[number];
export type ActionState = { error?: string; success?: string };

export function validateSubmission(form: FormData) {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const prompt = text("prompt");
  const topic = text("topic");
  const mode = text("mode");
  const content = text("content");
  const provider = text("provider");
  if (!topics.includes(topic as Topic)) return { error: "Choose a topic." } as const;
  if (prompt.length < 10 || prompt.length > 2000) return { error: "Your prompt needs 10 to 2,000 characters." } as const;
  if (mode !== "draft" && mode !== "publish") return { error: "Choose a submission type." } as const;
  if (mode === "publish" && (!content || content.length > 500)) return { error: "Add an AI caption of up to 500 characters." } as const;
  if (mode === "publish" && (!provider || provider.length > 80)) return { error: "Add the AI tool or model you used (up to 80 characters)." } as const;
  if (mode === "publish" && text("consent") !== "yes") return { error: "Confirm that you want to share this AI caption and its prompt." } as const;
  return { data: { prompt, topic: topic as Topic, mode, content, provider } } as const;
}

const dailyPrompts = [
  "Write a short, dry caption about treating the 1 train like a campus shuttle.",
  "Write a funny caption about a dorm kitchen becoming a midnight social club.",
  "Write a short caption about a Columbia student discovering NYC grocery prices.",
  "Write a playful caption about a weekend adventure ending at the same bagel shop.",
  "Write a dry caption about finding a seat in Butler during midterms.",
  "Write a funny caption about calling a 40-minute subway ride a quick trip.",
  "Write a short caption about a dorm room that is also an office, gym, and restaurant.",
];

export function dailyPrompt(date = new Date()) {
  return dailyPrompts[Math.floor(date.getTime() / 86_400_000) % dailyPrompts.length];
}
