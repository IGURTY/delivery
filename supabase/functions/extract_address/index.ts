/* eslint-disable */
// @ts-expect-error Deno import
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-expect-error Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Imagem não enviada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Chamada à OpenAI GPT-4o para extrair nome, CEP e número
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia da imagem: 1) Nome do destinatário, 2) CEP (formato 00000-000), 3) Número da casa. Responda em JSON: { \"nome\": \"...\", \"cep\": \"...\", \"numero\": \"...\" }" },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        max_tokens: 100,
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.text()
      return new Response(JSON.stringify({ error: "Erro na OpenAI", details: err }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const openaiData = await openaiRes.json()
    // Tenta extrair JSON da resposta
    let nome = "", cep = "", numero = "";
    try {
      const content = openaiData.choices?.[0]?.message?.content?.trim() || "";
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        nome = parsed.nome || "";
        cep = parsed.cep || "";
        numero = parsed.numero || "";
      }
    } catch {}

    return new Response(JSON.stringify({ nome, cep, numero }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})