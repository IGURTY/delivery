import React, { useState } from "react";
import { toast, Toaster } from "sonner";
import ImageCapture from "@/components/ImageCapture";
import DeliveryCard, { Delivery, DeliveryStatus } from "@/components/DeliveryCard";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
import { MapPin, Loader2, RotateCcw, Info, Zap } from "lucide-react";

const SUPABASE_PROJECT_ID = "gkjyajysblgdxujbdwxc";
const EDGE_FUNCTION_EXTRACT = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/extract_address`;

function isValidCep(cep: string) {
  return /^\d{5}-?\d{3}$/.test(cep?.trim() || "");
}

const Home: React.FC = () => {
  const [startCep, setStartCep] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCapture = async (imageBase64: string) => {
    setLoading(true);
    toast.loading("Analisando imagem com IA...");
    try {
      const res = await fetch(EDGE_FUNCTION_EXTRACT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      if (!res.ok) throw new Error("Erro");
      const data = await res.json();
      toast.dismiss();

      const newDelivery: Delivery = {
        id: Date.now().toString(),
        nome: data.nome || "",
        rua: data.rua || "",
        numero: data.numero || "",
        bairro: data.bairro || "",
        cep: data.cep || "",
        cidade: data.cidade || "",
        estado: data.estado || "",
        image: imageBase64,
        status: "pendente",
      };

      setDeliveries((prev) => [...prev, newDelivery]);
      toast.success(isValidCep(data.cep) ? "Entrega cadastrada!" : "CEP não identificado.");
    } catch {
      toast.dismiss();
      toast.error("Falha ao processar imagem.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (id: string, status: DeliveryStatus) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status } : d))
    );
  };

  const handleAttachProof = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const proofImage = ev.target.result as string;
        setDeliveries((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, status: "entregue" as DeliveryStatus, proofImage } : d
          )
        );
        toast.success("Prova anexada!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (id: string) => {
    setDeliveries((prev) => prev.filter((d) => d.id !== id));
    toast.info("Entrega removida.");
  };

  const handleReset = () => {
    setDeliveries([]);
    setStartCep("");
  };

  const stats = {
    total: deliveries.length,
    entregues: deliveries.filter((d) => d.status === "entregue").length,
    pendentes: deliveries.filter((d) => d.status === "pendente").length,
    falhas: deliveries.filter((d) => d.status === "nao-entregue").length,
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Toaster position="top-center" richColors />
      <OfflineIndicator />
      <PWAInstallPrompt />

      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">
                <span className="text-yellow-400">HBLACK</span> BOLT
              </h1>
              <p className="text-[10px] text-gray-500 -mt-1">Entregas Inteligentes</p>
            </div>
          </div>
          {deliveries.length > 0 && (
            <button onClick={handleReset} className="p-2 text-gray-400 hover:text-yellow-400">
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-32">
        {deliveries.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-400 shrink-0" />
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-white mb-2">Como usar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Informe seu CEP de partida</li>
                  <li>Fotografe ou faça upload das etiquetas</li>
                  <li>A IA extrai automaticamente os dados</li>
                  <li>Gerencie suas entregas</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
            <MapPin className="w-4 h-4 text-yellow-400" />
            CEP de Partida
          </label>
          <input
            type="text"
            value={startCep}
            onChange={(e) => setStartCep(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
          />
        </div>

        <ImageCapture onCapture={handleCapture} disabled={loading} />

        {loading && (
          <div className="flex items-center justify-center gap-2 text-yellow-400 py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processando...</span>
          </div>
        )}

        {deliveries.length > 0 && (
          <>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-gray-900 rounded-lg p-3 text-center border border-gray-800">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 text-center border border-green-800">
                <p className="text-2xl font-bold text-green-400">{stats.entregues}</p>
                <p className="text-xs text-gray-500">Entregues</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 text-center border border-blue-800">
                <p className="text-2xl font-bold text-blue-400">{stats.pendentes}</p>
                <p className="text-xs text-gray-500">Pendentes</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 text-center border border-red-800">
                <p className="text-2xl font-bold text-red-400">{stats.falhas}</p>
                <p className="text-xs text-gray-500">Falhas</p>
              </div>
            </div>

            <div className="space-y-3">
              {deliveries.map((d, i) => (
                <DeliveryCard
                  key={d.id}
                  delivery={d}
                  index={i}
                  onStatusChange={(s) => handleStatusChange(d.id, s)}
                  onAttachProof={(f) => handleAttachProof(d.id, f)}
                  onRemove={() => handleRemove(d.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Home;