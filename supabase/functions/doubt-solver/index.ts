import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a friendly, easy-to-understand tutor for Indian students (Class 9-12, JEE/NEET). You specialize in Physics, Chemistry, and Mathematics.

Rules:
- Use very simple, everyday language like a friend explaining
- Write math using Unicode: √, ², ³, θ, π, α, β, Δ, λ, ω, μ, ×, ÷, ±, ≠, ≤, ≥, →, ∞, ∫, ∑, ∂
- Use subscripts/superscripts naturally: v₀, a₁, Fₙₑₜ
- Break every problem into small numbered steps
- Show all calculation steps
- Highlight the final answer with **bold**
- Mention the formula/concept used at each step
- Be encouraging and supportive
- Keep explanations short and to the point
- When the user shares an image or PDF, carefully analyse and solve the problem shown`;

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

function buildUserContent(text: string, attachments?: Attachment[]) {
  if (!attachments || attachments.length === 0) return text;

  const parts: unknown[] = [];
  for (const att of attachments) {
    parts.push({
      type: "image_url",
      image_url: { url: `data:${att.mimeType};base64,${att.base64}` },
    });
  }
  if (text) parts.push({ type: "text", text });
  return parts;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages }: { messages: IncomingMessage[] } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedMessages = messages.map((m) => {
      if (m.role === "user") {
        return { role: "user", content: buildUserContent(m.content, m.attachments) };
      }
      return { role: "assistant", content: m.content };
    });

    console.log("Calling AI gateway with", formattedMessages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...formattedMessages],
        stream: true,
      }),
    });

    console.log("AI gateway response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
