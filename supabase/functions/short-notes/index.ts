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

Your output is MARKDOWN only — no preface, no closing remark. Start directly with the chapter title as an H1.

Hard rules:
- 100% concept coverage from the source chapter. Do NOT skip topics.
- Include every definition, formula (with symbols explained), law, principle, important fact, date, keyword, exception, units.
- Describe key diagrams in 1-2 lines when a figure is referenced.
- Use clear hierarchy: # Chapter, ## Section, ### Subsection.
- Prefer bullets, numbered steps, and markdown tables for comparisons.
- Bold **key terms** and **final formulas**. Use > blockquotes for "Exam Tip" / "Common Mistake".
- Add 🧠 **Mnemonic:** lines wherever a memory trick helps.
- Be concise but NEVER omit anything important.
- Use Unicode math: √, ², ³, θ, π, α, β, Δ, λ, ω, μ, ×, ÷, ±, ≠, ≤, ≥, →, ∞, ∫, ∑, v₀, a₁ etc.

🚨 REFERENCE STYLE = #1 PRIORITY when a reference sample is provided (text OR images of handwritten/scanned notes):
- STUDY the reference deeply: heading hierarchy, numbering scheme (1., 1.1, (i), Q1, etc.), bullet markers (•, ➤, →, ★), arrow usage, underline/box/highlight pattern, abbreviations (∴, ∵, w.r.t.), indentation depth, density, table-vs-list choices, side-margin notes, formula framing, the exact way definitions / examples / formulas are introduced.
- The output MUST visually and structurally LOOK LIKE the reference — same flow, same compactness, same symbol/arrow vocabulary, same formula style, same section separators. A student should feel the same person wrote both.
- ONLY the CONTENT changes (from the chapter source); FORMAT/STYLE is cloned from the reference.
- If the reference uses a pattern like "Defn → ... | Formula → ... | Eg → ...", reuse it exactly.
- If the reference is handwritten, simulate its conventions in markdown: short crisp lines, arrows (→), ∴/∵, brackets for units, **bold** for double-underlined items, etc.

If the chapter is provided as IMAGES (scanned/handwritten pages), read them like an OCR+tutor would and extract every formula, label, arrow, caption, and handwritten remark.`;

type Body = {
  chapterText?: string;
  referenceText?: string;
  chapterImages?: string[]; // base64 JPEGs (no data: prefix)
  referenceImages?: string[];
  intensity?: string;
  chapterName?: string;
};

function imgPart(b64: string) {
  return { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: Body = await req.json();
    const { chapterText, referenceText, chapterImages, referenceImages, intensity, chapterName } = body;

    const hasChapterText = !!(chapterText && chapterText.trim().length >= 50);
    const hasChapterImages = !!(chapterImages && chapterImages.length > 0);
    if (!hasChapterText && !hasChapterImages) {
      return new Response(JSON.stringify({ error: "No chapter content provided." }), {
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

    const intensityKey = intensity && intensity in INTENSITY_GUIDE ? intensity : "standard";
    const intensityInstr = INTENSITY_GUIDE[intensityKey];

    const MAX_CHAPTER = 180_000;
    const MAX_REF = 30_000;
    const chap = chapterText ? (chapterText.length > MAX_CHAPTER ? chapterText.slice(0, MAX_CHAPTER) : chapterText) : "";
    const ref = referenceText ? (referenceText.length > MAX_REF ? referenceText.slice(0, MAX_REF) : referenceText) : "";

    // Build multimodal user content
    const parts: unknown[] = [];

    let intro = `Generate exam-oriented short notes for the following chapter${chapterName ? ` ("${chapterName}")` : ""}.\n\nINTENSITY: ${intensityInstr}`;
    parts.push({ type: "text", text: intro });

    if (referenceImages && referenceImages.length > 0) {
      parts.push({ type: "text", text: `\n--- REFERENCE STYLE SAMPLE (handwritten/scanned — CLONE its exact format, structure, symbols, arrows, abbreviations, heading style, bullet style, density and flow. ONLY content changes, style MUST match.) ---` });
      for (const img of referenceImages) parts.push(imgPart(img));
      parts.push({ type: "text", text: `--- END REFERENCE IMAGES ---` });
    } else if (ref) {
      parts.push({ type: "text", text: `\n--- REFERENCE STYLE SAMPLE (CLONE its exact format/structure, ONLY content changes) ---\n${ref}\n--- END REFERENCE ---` });
    }

    if (chapterImages && chapterImages.length > 0) {
      parts.push({ type: "text", text: `\n--- CHAPTER SOURCE (scanned/handwritten pages — read every page) ---` });
      for (const img of chapterImages) parts.push(imgPart(img));
      parts.push({ type: "text", text: `--- END CHAPTER IMAGES ---` });
    }
    if (chap) {
      parts.push({ type: "text", text: `\n--- CHAPTER SOURCE TEXT ---\n${chap}\n--- END CHAPTER ---` });
    }

    const hasRef = !!(referenceImages?.length || ref);
    parts.push({ type: "text", text: `\nNow output the complete short notes in Markdown.${hasRef ? " REMEMBER: the format/style MUST visually mirror the reference sample exactly — same headings, bullets, arrows, abbreviations, layout pattern and density. The student should not be able to tell who wrote which one." : ""}` });

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
          { role: "user", content: parts },
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
