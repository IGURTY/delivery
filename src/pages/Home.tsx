import React, { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "sonner";
import { MapPin, Loader2, RotateCcw, Info, Zap, Camera, Upload, Navigation, Trash2, CheckCircle2, XCircle, Clock, Route, Images, X, History } from "lucide-react";
import * as db from "@/services/database";
import type { Delivery as DeliveryCardType } from "@/components/DeliveryCard";

interface Coordinates { latitude: number; longitude: number; }
interface Address { cep: string; street: string; neighborhood: string; city: string; state: string; coordinates?: Coordinates; }
interface PendingImage { id: string; base64: string; }
type DeliveryWithCalc = DeliveryCardType & { coordinates?: Coordinates; distance?: number };

const EDGE_URL = "https://gkjyajysblgdxujbdwxc.supabase.co/functions/v1/extract_address";

const calcDist = (c1: Coordinates, c2: Coordinates) => {
  const R = 6371, dLat = (c2.latitude - c1.latitude) * Math.PI / 180, dLon = (c2.longitude - c1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(c1.latitude*Math.PI/180) * Math.cos(c2.latitude*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const fetchCep = async (cep: string): Promise<Address | null> => {
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep.replace(/\D/g,"")}`);
    if (!r.ok) return null;
    const d = await r.json();
    return { cep: d.cep, street: d.street||"", neighborhood: d.neighborhood||"", city: d.city||"", state: d.state||"", coordinates: d.location?.coordinates ? { latitude: parseFloat(d.location.coordinates.latitude), longitude: parseFloat(d.location.coordinates.longitude) } : undefined };
  } catch { return null; }
};

const extractImg = async (img: string) => {
  try { const r = await fetch(EDGE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: img }) }); return r.ok ? r.json() : null; } catch { return null; }
};

const openWaze = (c: Coordinates) => window.open(`https://waze.com/ul?ll=${c.latitude},${c.longitude}&navigate=yes`, "_blank");
const fmtCep = (v: string) => { const d = v.replace(/\D/g,"").slice(0,8); return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d; };

// Helper para saber se a rota é do dia atual
function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const Home: React.FC = () => {
  // ... (restante do código igual)
  // (todo o código do componente permanece igual, só muda o container principal abaixo)

  // ... (todas as variáveis e funções do componente)

  return (
    <div className="min-h-screen bg-gray-950 hide-scrollbar">
      {/* ...restante do JSX igual */}
      {/* ... */}
    </div>
  );
};

export default Home;