/* eslint-disable */
// @ts-expect-error Deno import
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function geocodeAddress(address: string, apiKey: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" || !data.results[0]) throw new Error("Endereço não encontrado");
  return data.results[0].geometry.location; // { lat, lng }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { addresses } = await req.json();
    if (!addresses || !Array.isArray(addresses) || addresses.length < 2) {
      return new Response(JSON.stringify({ error: "Envie pelo menos dois endereços" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Chave da API do Google não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Geocodifica todos os endereços
    const coords = [];
    for (const addr of addresses) {
      coords.push(await geocodeAddress(addr, apiKey));
    }

    // Monta a URL da Directions API
    const origin = `${coords[0].lat},${coords[0].lng}`;
    const destination = `${coords[coords.length - 1].lat},${coords[coords.length - 1].lng}`;
    const waypoints = coords.slice(1, -1).map(c => `${c.lat},${c.lng}`).join("|");
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${waypoints}&key=${apiKey}`;

    const dirRes = await fetch(directionsUrl);
    const dirData = await dirRes.json();
    if (dirData.status !== "OK") {
      return new Response(JSON.stringify({ error: "Erro ao gerar rota", details: dirData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retorna a rota otimizada e as coordenadas
    return new Response(JSON.stringify({
      route: dirData.routes[0],
      coords,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});