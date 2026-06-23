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

const SYSTEM_PROMPT = `You are an expert exam-coach who writes PREMIUM, BOX-BASED, REVISION-FRIENDLY short notes for Indian Class 9-12 / JEE / NEET / Boards students. Your notes look like a topper's hand-curated revision sheet — never AI paragraphs.

🚨 OUTPUT FORMAT (NON-NEGOTIABLE):
- MARKDOWN only. No preface, no closing. Start with "# <Chapter Title>" (H1) on line 1.
- After the H1, EVERY piece of content MUST live inside an H2 section. The H2 line tells the renderer which CARD type to use, so the title MUST start with the exact emoji marker below:

    ## 📘 Concept — <name>            → for each major concept (definition + key points)
    ## 📖 Definition — <term>         → standalone important definitions
    ## 🧮 Formula — <name>            → formula card (one formula or a tight group). Body: bold formula line, then symbols/units, then "When to use".
    ## 📜 Law — <name>                 → laws, principles, postulates, theorems
    ## 🧪 Reaction — <name>            → reactions / mechanisms / equations
    ## 📊 Comparison — A vs B          → MUST contain a markdown table. NEVER paragraphs.
    ## ⚡ Quick Fact — <topic>          → 3-6 bullets of exam-frequent facts
    ## ⚠️ Exception — <topic>          → exceptions, common mistakes, sign-conventions
    ## 🧠 Memory Trick — <topic>       → mnemonics, shortcuts, memory hacks
    ## 🏆 Last-Minute Revision         → MANDATORY final section(s). Use multiple "## 🏆 Last-Minute Revision — <subtopic>" cards covering: top formulas, top facts, top exceptions, top exam questions.

- Each card body must be SHORT and revision-friendly: bullets, numbered steps, tables — NEVER long paragraphs (>2 sentences in a row is forbidden).
- Use markdown tables for ANY comparison (always inside a 📊 Comparison card).
- Formulas: bold the formula, e.g. **n = mass / molar mass**, then *Symbols:* … then *Use when:* …
- 100% concept coverage from the source. Miss nothing important — but split into MANY small cards rather than one large card.
- Use Unicode math: √, ², ³, θ, π, α, β, Δ, λ, ω, μ, ×, ÷, ±, ≠, ≤, ≥, →, ∞, ∫, ∑, v₀, a₁ etc.
- ABSOLUTELY DO NOT output H3/H4 as section dividers — only the H2 cards above. Inside a card, you may use **bold sub-labels** instead.
- ABSOLUTELY DO NOT output any content outside an H2 card (except the single H1 at the top).

🎯 REFERENCE STYLE (when a reference sample is provided, text OR images):
- Match the reference's density, abbreviation style (∴, ∵, w.r.t., →), arrow usage, formula framing, and tone INSIDE each card body.
- The card scaffolding (H2 emoji headings above) stays the same; only the in-card writing style mimics the reference.

If the chapter is provided as IMAGES (scanned/handwritten), OCR every formula, label, arrow, caption and remark and slot them into the correct card types above.`;

const FORMULA_SYSTEM_PROMPT = `You are an expert exam-coach building an EXAM FORMULA SHEET from a chapter PDF for Indian Class 9-12 / JEE / NEET / Boards students.

Output MARKDOWN only — no preface, no closing. Start with an H1 like "# <Chapter> — Formula Sheet".

Strict rules:
- Extract EVERY formula, equation, law, identity, theorem, relation, constant value, unit conversion, important ratio, and standard result that appears (explicitly or implicitly) in the chapter. Miss NOTHING.
- Group formulas under ## Section headings that mirror the chapter's section flow.
- For EACH formula, output a clean markdown table row OR a tight 3-line block:
    **Name / Concept**  →  \`Formula\` (use Unicode math: √, ², ³, θ, π, α, Δ, λ, ω, μ, ×, ÷, ±, ≤, ≥, →, ∫, ∑, v₀, etc.)
    *Symbols:* meaning + SI unit of each variable
    *When to use / condition:* 1 short line (validity, sign convention, edge case)
- Add a "## Constants & Standard Values" section at top if any constants appear (g, G, R, c, h, ε₀, μ₀, NA, e, masses, molar values, etc.).
- Add "## Key Identities / Derived Results" for shortcut/derived formulas heavily used in problems.
- Add "## Common Mistakes & Sign Conventions" as a short bulleted list (only if relevant in the chapter).
- Use markdown tables wherever 4+ formulas share a structure (e.g. kinematics, thermodynamics, lens/mirror).
- Be COMPLETE but COMPACT — pure formula reference, no prose explanations, no derivations.
- If a formula appears as a diagram/handwritten symbol on scanned pages, transcribe it faithfully.`;

type Body = {
  chapterText?: string;
  referenceText?: string;
  chapterImages?: string[]; // base64 JPEGs (no data: prefix)
  referenceImages?: string[];
  intensity?: string;
  chapterName?: string;
  mode?: "shortnotes" | "formula";
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

    const mode = body.mode === "formula" ? "formula" : "shortnotes";
    const intensityKey = intensity && intensity in INTENSITY_GUIDE ? intensity : "standard";
    const intensityInstr = INTENSITY_GUIDE[intensityKey];

    const MAX_CHAPTER = 180_000;
    const MAX_REF = 30_000;
    const chap = chapterText ? (chapterText.length > MAX_CHAPTER ? chapterText.slice(0, MAX_CHAPTER) : chapterText) : "";
    const ref = referenceText ? (referenceText.length > MAX_REF ? referenceText.slice(0, MAX_REF) : referenceText) : "";

    // Build multimodal user content
    const parts: unknown[] = [];

    let intro =
      mode === "formula"
        ? `Build a COMPLETE formula sheet for the following chapter${chapterName ? ` ("${chapterName}")` : ""}. Extract every formula, law, constant and standard result from the source. Do not include long explanations — pure formula reference.`
        : `Generate exam-oriented short notes for the following chapter${chapterName ? ` ("${chapterName}")` : ""}.\n\nINTENSITY: ${intensityInstr}`;
    parts.push({ type: "text", text: intro });

    if (mode === "shortnotes" && referenceImages && referenceImages.length > 0) {
      parts.push({ type: "text", text: `\n--- REFERENCE STYLE SAMPLE (handwritten/scanned — CLONE its exact format, structure, symbols, arrows, abbreviations, heading style, bullet style, density and flow. ONLY content changes, style MUST match.) ---` });
      for (const img of referenceImages) parts.push(imgPart(img));
      parts.push({ type: "text", text: `--- END REFERENCE IMAGES ---` });
    } else if (mode === "shortnotes" && ref) {
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

    const hasRef = mode === "shortnotes" && !!(referenceImages?.length || ref);
    parts.push({
      type: "text",
      text:
        mode === "formula"
          ? `\nNow output the COMPLETE formula sheet in Markdown. Cover EVERY formula and constant from the chapter. No prose — only formula reference style.`
          : `\nNow output the complete BOX-BASED short notes in Markdown. STRICT RULES: one "# Chapter" H1, then ONLY "## <emoji> ..." card sections from the allowed list (📘 📖 🧮 📜 🧪 📊 ⚡ ⚠️ 🧠 🏆). NEVER write content outside an H2 card. NEVER use H3/H4 as dividers. Comparisons MUST be tables. End with multiple "## 🏆 Last-Minute Revision — …" cards.${hasRef ? " The in-card writing style (density, arrows, abbreviations, formula framing) MUST mirror the reference sample — but the H2 card scaffolding stays exactly as specified." : ""}`,
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: mode === "formula" ? FORMULA_SYSTEM_PROMPT : SYSTEM_PROMPT },
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
