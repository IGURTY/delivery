import React, { useState } from "react";
import { toast, Toaster } from "sonner";
import ImageCapture from "@/components/ImageCapture";
import DeliveryCard, { Delivery, DeliveryStatus } from "@/components/DeliveryCard";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { MapPin, Route, Loader2, Package, RotateCcw, Info, Truck } from "lucide-react";

const SUPABASE_PROJECT_ID = "gkjyajysblgdxujbdwxc";
const EDGE_FUNCTION_EXTRACT = `https://${SUPABASE_PROJECT_ID}.functions.supabase.co/extract_address`;
const EDGE_FUNCTION_ROUTE = `https://${SUPABASE_PROJECT_ID}.functions.supabase.co/generate_route`;

async function extractData(imageBase64: string) {
  const res = await fetch(EDGE_FUNCTION_EXTRACT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!res.ok) throw new Error("Erro ao extrair dados");
  return res.json();
}

async function generateRoute(addresses: string[]) {
  const res = await fetch(EDGE_FUNCTION_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses }),
  });
  if (!res.ok) throw new Error("Erro ao gerar rota");
  return res.json();
}

function isValidCep(cep: string) {
  return /^\d{5}-?\d{3}$/.test(cep?.trim() || "");
}

const Home: React.FC = () => {
  const [startCep, setStartCep] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [routeGenerated, setRouteGenerated] = useState(false);

  const handleCapture = async (imageBase64: string) => {
    setLoading(true);
    toast.loading("Analisando imagem com IA...");
    
    try {
      const data = await extractData(imageBase64);
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

      if (!isValidCep(data.cep)) {
        toast.warning("CEP não identificado. Verifique os dados.");
      } else {
        toast.success("Entrega cadastrada!");
      }
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
        setDeliveries((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, status: "entregue", proofImage: ev.target!.result as string }
              : d
          )
        );
        toast.success("Prova de entrega anexada!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (id: string) => {
    setDeliveries((prev) => prev.filter((d) => d.id !== id));
    toast.info("Entrega removida.");
  };

  const handleGenerateRoute = async () => {
    const invalidDelivery = deliveries.find((d) => !isValidCep(d.cep));
    if (invalidDelivery) {
      toast.error("Remova entregas com CEP inválido antes de gerar a rota.");
      return;
    }

    if (!isValidCep(startCep)) {
      toast.error("Informe um CEP de partida válido.");
      return;
    }

    setLoading(true);
    toast.loading("Gerando rota otimizada...");

    try {
      const addresses = [startCep, ...deliveries.map((d) => d.cep)];
      const data = await generateRoute(addresses);
      toast.dismiss();

      const waypointOrder = data.route?.waypoint_order || [];
      if (waypointOrder.length > 0) {
        const reordered = waypointOrder.map((idx: number) => deliveries[idx]);
        setDeliveries(reordered);
      }

      setRouteGenerated(true);
      toast.success("Rota gerada! Siga a ordem dos cards.");
    } catch {
      toast.dismiss();
      toast.error("Erro ao gerar rota. Verifique os CEPs.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDeliveries([]);
    setStartCep("");
    setRouteGenerated(false);
    toast.info("Sistema reiniciado.");
  };

  const validDeliveries = deliveries.filter((d) => isValidCep(d.cep));
  const stats = {
    total: deliveries.length,
    entregues: deliveries.filter((d) => d.status === "entregue").length,
    pendentes: deliveries.filter((d) => d.status === "pendente").length,
    falhas: deliveries.filter((d) => d.status === "nao-entregue").length,
  };

  return (
    <div className="min-h-screen bg-dark">
      <Toaster position="top-center" richColors />
      <PWAInstallPrompt />

      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-8 h-8 text-primary" />
              <h1 className="text-xl font-bold text-primary">DeliveryAI</h1>
            </div>
            {deliveries.length > 0 && (
              <button
                onClick={handleReset}
                className="p-2 text-gray-400 hover:text-primary transition"
                title="Reiniciar"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-32">
        {deliveries.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-white mb-2">Como usar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Informe seu CEP de partida</li>
                  <li>Fotografe cada entrega</li>
                  <li>A IA extrai automaticamente os dados</li>
                  <li>Gere a rota otimizada</li>
                  <li>Siga a ordem e marque o status</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
            <MapPin className="w-4 h-4 text-primary" />
            CEP de Partida
          </label>
          <input
            type="text"
            value={startCep}
            onChange={(e) => setStartCep(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
          />
        </div>

        <ImageCapture onCapture={handleCapture} disabled={loading} />

        {loading && (
          <div className="flex items-center justify-center gap-2 text-primary py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processando...</span>
          </div>
        )}

        {deliveries.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gray-900 rounded-lg p-3 text-center border border-gray-800">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-400">Total</p>
            </div>
            <div className="bg-blue-500/20 rounded-lg p-3 text-center border border-blue-500/50">
              <p className="text-2xl font-bold text-blue-400">{stats.pendentes}</p>
              <p className="text-xs text-blue-300">Pendentes</p>
            </div>
            <div className="bg-green-500/20 rounded-lg p-3 text-center border border-green-500/50">
              <p className="text-2xl font-bold text-green-400">{stats.entregues}</p>
              <p className="text-xs text-green-300">Entregues</p>
            </div>
            <div className="bg-red-500/20 rounded-lg p-3 text-center border border-red-500/50">
              <p className="text-2xl font-bold text-red-400">{stats.falhas}</p>
              <p className="text-xs text-red-300">Falhas</p>
            </div>
          </div>
        )}

        {deliveries.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-white">
                <Package className="w-5 h-5 text-primary" />
                Entregas ({deliveries.length})
              </h2>
              {routeGenerated && (
                <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                  ✓ Rota otimizada
                </span>
              )}
            </div>

            {deliveries.map((delivery, index) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                index={index}
                onStatusChange={(status) => handleStatusChange(delivery.id, status)}
                onAttachProof={(file) => handleAttachProof(delivery.id, file)}
                onRemove={() => handleRemove(delivery.id)}
              />
            ))}
          </div>
        )}

        {deliveries.length > 0 && !routeGenerated && (
          <button
            onClick={handleGenerateRoute}
            disabled={loading || validDeliveries.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-primary text-dark font-bold py-4 rounded-xl hover:bg-yellow-400 transition disabled:opacity-50"
          >
            <Route className="w-5 h-5" />
            Gerar Rota Otimizada
          </button>
        )}

        {routeGenerated && (
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white font-bold py-4 rounded-xl hover:bg-gray-700 transition border border-gray-700"
          >
            <RotateCcw className="w-5 h-5" />
            Nova Rota
          </button>
        )}
      </main>

      <footer className="text-center py-6 text-gray-600 text-sm">
        DeliveryAI © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Home;