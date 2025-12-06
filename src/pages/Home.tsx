import React, { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "sonner";
import { MapPin, Loader2, RotateCcw, Info, Zap, Camera, Upload, Navigation, Trash2, CheckCircle2, XCircle, Clock, Route, Images, X } from "lucide-react";

interface Coordinates { latitude: number; longitude: number; }
interface Address { cep: string; street: string; neighborhood: string; city: string; state: string; coordinates?: Coordinates; }
interface PendingImage { id: string; base64: string; }
interface Delivery { id: string; nome: string; rua: string; numero: string; bairro: string; cep: string; cidade: string; estado: string; coordinates?: Coordinates; distance?: number; status: "pendente" | "entregue" | "nao-entregue"; image?: string; }

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

const Home: React.FC = () => {
  const [cep, setCep] = useState("");
  const [addr, setAddr] = useState<Address|null>(null);
  const [loading, setLoading] = useState(false);
  const [imgs, setImgs] = useState<PendingImage[]>([]);
  const [dels, setDels] = useState<Delivery[]>([]);
  const [proc, setProc] = useState(false);
  const [prog, setProg] = useState({c:0,t:0});
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const c = cep.replace(/\D/g,"");
    if (c.length === 8) { setLoading(true); fetchCep(c).then(a => { setAddr(a); if(a) toast.success("Endereço encontrado!"); else toast.error("CEP não encontrado"); }).finally(() => setLoading(false)); }
    else setAddr(null);
  }, [cep]);

  const onImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach(f => { const r = new FileReader(); r.onload = ev => { if (ev.target?.result) setImgs(p => [...p, { id: Date.now()+Math.random().toString(36), base64: ev.target!.result as string }]); }; r.readAsDataURL(f); });
    e.target.value = "";
  };

  const process = async () => {
    if (!addr?.coordinates) { toast.error("CEP sem coordenadas"); return; }
    if (!imgs.length) { toast.error("Adicione imagens"); return; }
    setProc(true); setProg({c:0,t:imgs.length});
    const res: Delivery[] = [];
    for (let i = 0; i < imgs.length; i++) {
      setProg({c:i+1,t:imgs.length});
      const d = await extractImg(imgs[i].base64);
      if (d?.cep) {
        const a = await fetchCep(d.cep);
        const del: Delivery = { id: imgs[i].id, nome: d.nome||"", rua: d.rua||a?.street||"", numero: d.numero||"", bairro: d.bairro||a?.neighborhood||"", cep: d.cep, cidade: d.cidade||a?.city||"", estado: d.estado||a?.state||"", coordinates: a?.coordinates, status: "pendente", image: imgs[i].base64 };
        if (del.coordinates && addr.coordinates) del.distance = calcDist(addr.coordinates, del.coordinates);
        res.push(del);
      } else toast.error(`Imagem ${i+1}: falha`);
    }
    res.sort((a,b) => (a.distance||Infinity) - (b.distance||Infinity));
    setDels(res); setImgs([]); setProc(false);
    if (res.length) toast.success(`${res.length} entregas ordenadas!`);
  };

  const reset = () => { setDels([]); setImgs([]); setCep(""); setAddr(null); };
  const stats = { t: dels.length, e: dels.filter(d=>d.status==="entregue").length, p: dels.filter(d=>d.status==="pendente").length, f: dels.filter(d=>d.status==="nao-entregue").length };

  return (
    <div className="min-h-screen bg-gray-950">
      <Toaster position="top-center" richColors />
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center"><Zap className="w-6 h-6 text-gray-900" /></div>
            <div><h1 className="text-lg font-black text-white"><span className="text-yellow-400">HBLACK</span> BOLT</h1><p className="text-[10px] text-gray-500 -mt-1">Entregas Inteligentes</p></div>
          </div>
          {(dels.length > 0 || imgs.length > 0) && <button onClick={reset} className="p-2 text-gray-400 hover:text-yellow-400"><RotateCcw className="w-5 h-5" /></button>}
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-32">
        {dels.length === 0 && imgs.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-start gap-3"><Info className="w-5 h-5 text-yellow-400 shrink-0" /><div className="text-sm text-gray-300"><p className="font-semibold text-white mb-2">Como usar:</p><ol className="list-decimal list-inside space-y-1"><li>Informe seu CEP de partida</li><li>Tire fotos das etiquetas</li><li>Clique em Calcular Rota</li><li>Entregas ordenadas por distância</li><li>Clique em Waze para navegar</li></ol></div></div>
          </div>
        )}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2"><MapPin className="w-4 h-4 text-yellow-400" />CEP de Partida</label>
          <input type="text" value={cep} onChange={e => setCep(fmtCep(e.target.value))} placeholder="00000-000" maxLength={9} disabled={dels.length > 0} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 disabled:opacity-50" />
          {loading && <div className="flex items-center gap-2 mt-3 text-yellow-400"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Buscando...</span></div>}
          {addr && <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-green-800"><p className="text-sm text-green-400 font-semibold">✓ Endereço de Partida</p><p className="text-sm text-gray-300">{addr.street}, {addr.neighborhood}</p><p className="text-sm text-gray-400">{addr.city} - {addr.state}</p></div>}
        </div>
        {addr && dels.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><Images className="w-4 h-4 text-yellow-400" />Fotos ({imgs.length})</label>
            <div className="flex gap-2 mb-4">
              <button onClick={() => camRef.current?.click()} disabled={proc} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"><Camera className="w-5 h-5" />Câmera</button>
              <button onClick={() => fileRef.current?.click()} disabled={proc} className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"><Upload className="w-5 h-5" />Galeria</button>
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onImg} className="hidden" />
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onImg} className="hidden" />
            {imgs.length > 0 && (
              <>
                <div className="grid grid-cols-4 gap-2 mb-4">{imgs.map(i => <div key={i.id} className="relative"><img src={i.base64} className="w-full h-16 object-cover rounded-lg" /><button onClick={() => setImgs(p => p.filter(x => x.id !== i.id))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button></div>)}</div>
                <button onClick={process} disabled={proc} className="w-full bg-yellow-400 text-gray-900 font-bold py-4 rounded-xl hover:bg-yellow-300 disabled:opacity-50 flex items-center justify-center gap-2">{proc ? <><Loader2 className="w-5 h-5 animate-spin" />Processando {prog.c}/{prog.t}...</> : <><Route className="w-5 h-5" />Calcular Rota ({imgs.length})</>}</button>
              </>
            )}
          </div>
        )}
        {dels.length > 0 && (
          <>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-gray-900 rounded-lg p-3 text-center border border-gray-800"><p className="text-2xl font-bold text-white">{stats.t}</p><p className="text-xs text-gray-500">Total</p></div>
              <div className="bg-gray-900 rounded-lg p-3 text-center border border-green-800"><p className="text-2xl font-bold text-green-400">{stats.e}</p><p className="text-xs text-gray-500">Entregues</p></div>
              <div className="bg-gray-900 rounded-lg p-3 text-center border border-blue-800"><p className="text-2xl font-bold text-blue-400">{stats.p}</p><p className="text-xs text-gray-500">Pendentes</p></div>
              <div className="bg-gray-900 rounded-lg p-3 text-center border border-red-800"><p className="text-2xl font-bold text-red-400">{stats.f}</p><p className="text-xs text-gray-500">Falhas</p></div>
            </div>
            <div className="space-y-3">
              {dels.map((d, i) => (
                <div key={d.id} className={`rounded-xl border-2 p-4 ${d.status === "entregue" ? "bg-green-500/10 border-green-500" : d.status === "nao-entregue" ? "bg-red-500/10 border-red-500" : "bg-blue-500/10 border-blue-500"}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center font-bold text-lg shrink-0">{i + 1}</div>
                    {d.image && <img src={d.image} className="w-14 h-14 object-cover rounded-lg border-2 border-gray-700" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-yellow-400 truncate">{d.nome || "Destinatário"}</p>
                      <p className="text-sm text-gray-300 truncate">{d.rua}{d.numero ? `, ${d.numero}` : ""}</p>
                      <p className="text-sm text-gray-400 truncate">{d.bairro} - {d.cep}</p>
                      {d.distance && <p className="text-xs text-gray-500 mt-1">{d.distance.toFixed(1)} km</p>}
                    </div>
                    <button onClick={() => setDels(p => p.filter(x => x.id !== d.id))} className="p-2 text-gray-500 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => setDels(p => p.map(x => x.id === d.id ? {...x, status: "entregue"} : x))} className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${d.status === "entregue" ? "bg-green-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-green-500 hover:text-white"}`}><CheckCircle2 className="w-4 h-4" /></button>
                    <button onClick={() => setDels(p => p.map(x => x.id === d.id ? {...x, status: "nao-entregue"} : x))} className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${d.status === "nao-entregue" ? "bg-red-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-red-500 hover:text-white"}`}><XCircle className="w-4 h-4" /></button>
                    <button onClick={() => setDels(p => p.map(x => x.id === d.id ? {...x, status: "pendente"} : x))} className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${d.status === "pendente" ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-blue-500 hover:text-white"}`}><Clock className="w-4 h-4" /></button>
                    <button onClick={() => d.coordinates && openWaze(d.coordinates)} disabled={!d.coordinates} className="py-2 rounded-lg text-xs font-semibold bg-yellow-400 text-gray-900 hover:bg-yellow-300 disabled:opacity-50 flex items-center justify-center gap-1"><Navigation className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Home;