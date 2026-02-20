import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Attachment = {
  name: string;
  mimeType: string;
  base64: string;
};

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
};

// Build the multimodal content array for a user message
function buildUserContent(text: string, attachments?: Attachment[]) {
  if (!attachments || attachments.length === 0) {
    return text;
  }

  // Gemini vision format: array of content parts
  const parts: unknown[] = [];

  for (const att of attachments) {
    if (att.mimeType.startsWith("image/")) {
      parts.push({
        type: "image_url",
        image_url: { url: `data:${att.mimeType};base64,${att.base64}` },
      });
    } else if (att.mimeType === "application/pdf") {
      // Send PDF as a file part (Gemini supports inline PDF via base64)
      parts.push({
        type: "image_url",
        image_url: { url: `data:application/pdf;base64,${att.base64}` },
      });
    }
  }

  if (text) {
    parts.push({ type: "text", text });
  }

  return parts;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages }: { messages: IncomingMessage[] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Map messages to the format the AI gateway expects
    const formattedMessages = messages.map((m) => {
      if (m.role === "user") {
        return {
          role: "user",
          content: buildUserContent(m.content, m.attachments),
        };
      }
      // assistant messages are always plain text
      return { role: "assistant", content: m.content };
    });

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a friendly, easy-to-understand tutor for Indian students (Class 9-12, JEE/NEET). You specialize in Physics, Chemistry, and Mathematics.

Rules:
- Use very simple, everyday language like a friend explaining. Avoid complex or formal words.
- Write math exactly as it would appear in a notebook using Unicode symbols:
  - Fractions: write as √3/2, not "root 3 upon two" or "\\frac{\\sqrt{3}}{2}"
  - Powers: x², x³, aⁿ
  - Square roots: √2, √3, ∛x (cube root)
  - Greek letters: θ, π, α, β, Δ, λ, ω, μ
  - Operators: ×, ÷, ±, ≠, ≤, ≥, →, ∞, ∫, ∑, ∂
  - Subscripts/superscripts: use them naturally like v₀, a₁, Fₙₑₜ
- Break every problem into small numbered steps
- Show all calculation steps for numerical problems
- Highlight the final answer clearly with **bold**
- Mention the formula/concept used at each step
- Be encouraging and supportive like a friend
- If the question is unclear, ask what they mean in simple words
- Keep explanations short and to the point, no unnecessary filler
- When the user shares an image or PDF, carefully read/analyse it and solve the problem shown in it`,
            },
            ...formattedMessages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("doubt-solver error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
