import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INTENSITY_GUIDE: Record<string, string> = {
  quick:
    "QUICK REVISION (target ~1 page). Only the highest-yield points: must-know definitions, all formulas, key laws, top exam pointers. Ultra-condensed bullets. No fluff.",
  standard:
    "STANDARD SHORT NOTES (target 2-4 pages). Cover every important concept with concise bullets. Include all formulas, definitions, laws, key facts, and 1-line examples where critical.",
  detailed:
    "DETAILED EXAM NOTES (target 5-8 pages). Cover 100% of concepts with crisp explanations, all formulas with meaning of symbols, derivations summarized in steps, common traps, and exception cases.",
  ultra:
    "ULTRA-DETAILED NOTES (compress the entire chapter). Cover absolutely every point from the source: every definition, formula, law, derivation outline, table, exception, edge-case, example logic, and exam pointer. Nothing important omitted — but still in bullet/table form, not paragraphs.",
};

const SYSTEM_PROMPT = `You are an expert exam-coach who writes the BEST short notes for Indian Class 9-12 / JEE / NEET / Boards students.

Your output is MARKDOWN only — no preface, no "Here are your notes", no closing remark. Start directly with the chapter title as an H1.

Hard rules:
- 100% concept coverage from the source chapter. Do NOT skip topics.
- Include every: definition, formula (with symbols explained), law, principle, important fact, date, keyword, exception, units.
- Describe key diagrams in 1-2 lines when a figure is referenced.
- Use clear hierarchy: # Chapter, ## Section, ### Subsection.
- Prefer bullets, numbered steps, and **markdown tables** for comparisons / classifications.
- Bold **key terms** and **final formulas**. Use > blockquotes for "Exam Tip" / "Frequently Asked" / "Common Mistake".
- Add 🧠 **Mnemonic:** lines wherever a memory trick helps.
- Maintain the chapter's logical flow so a student can revise top-to-bottom in one pass.
- Be concise but NEVER omit anything important. No filler, no repetition, no generic advice.
- Use Unicode for math: √, ², ³, θ, π, α, β, Δ, λ, ω, μ, ×, ÷, ±, ≠, ≤, ≥, →, ∞, ∫, ∑, subscripts v₀, a₁, etc.

If a REFERENCE STYLE sample is provided, mirror its structure, heading style, bullet pattern, table use, highlight style, and density — while keeping the content from the chapter source.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { chapterText, referenceText, intensity, chapterName } = await req.json();

    if (!chapterText || typeof chapterText !== "string" || chapterText.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Chapter text is too short or missing." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const intensityKey = (intensity as string) in INTENSITY_GUIDE ? (intensity as string) : "standard";
    const intensityInstr = INTENSITY_GUIDE[intensityKey];

    // Truncate very large inputs to stay within model context (Gemini 2.5 Pro handles 1M, but keep safe)
    const MAX_CHAPTER = 180_000;
    const MAX_REF = 30_000;
    const chap = chapterText.length > MAX_CHAPTER ? chapterText.slice(0, MAX_CHAPTER) : chapterText;
    const ref = referenceText && typeof referenceText === "string"
      ? (referenceText.length > MAX_REF ? referenceText.slice(0, MAX_REF) : referenceText)
      : "";

    const userPrompt = [
      `Generate exam-oriented short notes for the following chapter${chapterName ? ` ("${chapterName}")` : ""}.`,
      `\nINTENSITY: ${intensityInstr}`,
      ref ? `\n--- REFERENCE STYLE SAMPLE (mirror its format/style, NOT its content) ---\n${ref}\n--- END REFERENCE ---\n` : "",
      `\n--- CHAPTER SOURCE TEXT ---\n${chap}\n--- END CHAPTER ---`,
      `\nNow output the complete short notes in Markdown.`,
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "Too many requests. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI service error." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("short-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
