import React, { useState, useEffect } from "react";
import { toast, Toaster } from "sonner";
import ImageCapture from "@/components/ImageCapture";
import DeliveryCard, { Delivery, DeliveryStatus } from "@/components/DeliveryCard";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
import { MapPin, Route, Loader2, Package, RotateCcw, Info, Zap, History } from "lucide-react";
import * as db from "@/services/database";

const SUPABASE_PROJECT_ID = "gkjyajysblgdxujbdwxc";
const EDGE_FUNCTION_EXTRACT = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/extract_address`;
const EDGE_FUNCTION_ROUTE = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate_route`;

async function extractData(imageBase64: string) {
  const res =await fetch(EDGE_FUNCTION_EXTRACT, {
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
  const [currentRouteId, setCurrentRouteId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [routeHistory, setRouteHistory] = useState<db.DbRoute[]>([]);

  // Carregar rota ativa ao iniciar
  useEffect(() => {
    loadActiveRoute();
  }, []);

  const loadActiveRoute = async () => {
    setLoading(true);
    try {
      const activeRoute = await db.getActiveRoute();
      if (activeRoute) {
        setCurrentRouteId(activeRoute.id);
        setStartCep(activeRoute.start_cep);
        setRouteGenerated(activeRoute.status === 'completed' || activeRoute.total_deliveries > 0);
        
        const dbDeliveries = await db.getDeliveriesByRoute(activeRoute.id);
        setDeliveries(dbDeliveries.map(db.dbDeliveryToDelivery));
      }
    } catch (error) {
      console.error('Erro ao carregar rota:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRouteHistory = async () => {
    const routes = await db.getAllRoutes();
    setRouteHistory(routes);
    setShowHistory(true);
  };

  const loadRoute = async (routeId: string) => {
    setLoading(true);
    try {
      const dbDeliveries = await db.getDeliveriesByRoute(routeId);
      const route = routeHistory.find(r => r.id === routeId);
      
      if (route) {
        setCurrentRouteId(route.id);
        setStartCep(route.start_cep);
        setDeliveries(dbDeliveries.map(db.dbDeliveryToDelivery));
        setRouteGenerated(route.total_deliveries > 0);
      }
      setShowHistory(false);
    } catch (error) {
      toast.error('Erro ao carregar rota');
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async (imageBase64: string) => {
    setLoading(true);
    toast.loading("Analisando imagem com IA...");
    
    try {
      const data = await extractData(imageBase64);
      toast.dismiss();

      // Criar rota se não existir
      let routeId = currentRouteId;
      if (!routeId) {
        const newRoute = await db.createRoute(startCep || '00000-000');
        if (newRoute) {
          routeId = newRoute.id;
          setCurrentRouteId(routeId);
        }
      }

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

      // Salvar no banco
      if (routeId) {
        const dbDelivery = await db.createDelivery(routeId, newDelivery, deliveries.length);
        if (dbDelivery) {
          newDelivery.id = dbDelivery.id;
        }
      }

      setDeliveries((prev) => [...prev, newDelivery]);

      if (!isValidCep(data.cep)) {
        toast.warning("CEP não identificado.");
      } else {
        toast.success("Entrega cadastrada e salva!");
      }
    } catch {
      toast.dismiss();
      toast.error("Falha ao processar imagem.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: DeliveryStatus) => {
    setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
    
    // Atualizar no banco
    await db.updateDeliveryStatus(id, status);
  };

  const handleAttachProof = async (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      if (ev.target?.result) {
        const proofImage = ev.target.result as string;
        
        setDeliveries((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, status: "entregue" as DeliveryStatus, proofImage } : d
          )
        );
        
        // Salvar no banco com prova
        await db.updateDeliveryStatus(id, 'entregue', proofImage);
        toast.success("Prova anexada e salva!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = async (id: string) => {
    setDeliveries((prev) => prev.filter((d) => d.id !== id));
    
    // Remover do banco
    await db.deleteDelivery(id);
    toast.info("Entrega removida.");
  };

  const handleGenerateRoute = async () => {
    if (deliveries.find((d) => !isValidCep(d.cep))) {
      toast.error("Remova entregas com CEP inválido.");
      return;
    }
    if (!isValidCep(startCep)) {
      toast.error("Informe um CEP de partida válido.");
      return;
    }

    setLoading(true);
    toast.loading("Gerando rota...");

    try {
      const data = await generateRoute([startCep, ...deliveries.map((d) => d.cep)]);
      toast.dismiss();

      const order = data.route?.waypoint_order || [];
      if (order.length > 0) {
        const reordered = order.map((i: number) => deliveries[i]);
        setDeliveries(reordered);
        
        // Atualizar ordem no banco
        if (currentRouteId) {
          await db.updateDeliveryOrder(currentRouteId, reordered.map(d => d.id));
        }
      }

      setRouteGenerated(true);
      toast.success("Rota gerada e salva!");
    } catch {
      toast.dismiss();
      toast.error("Erro ao gerar rota.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    // Marcar rota atual como cancelada
    if (currentRouteId) {
      await db.updateRouteStatus(currentRouteId, 'cancelled');
    }
    
    setDeliveries([]);
    setStartCep("");
    setRouteGenerated(false);
    setCurrentRouteId(null);
  };

  const stats = {
    total: deliveries.length,
    entregues: deliveries.filter((d) => d.status === "entregue").length,
    pendentes: deliveries.filter((d) => d.status === "pendente").length,
    falhas: deliveries.filter((d) => d.status === "nao-entregue").length,
  };

  return (
    <div className="min-h-screen bg-dark">
      <Toaster position="top-center" richColors />
      <OfflineIndicator />
      <PWAInstallPrompt />

      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-dark" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">
                <span className="text-primary">HBLACK</span> BOLT
              </h1>
              <p className="text-[10px] text-gray-500 -mt-1">Entregas Inteligentes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadRouteHistory} className="p-2 text-gray-400 hover:text-primary" title="Histórico">
              <History className="w-5 h-5" />
            </button>
            {deliveries.length > 0 && (
              <button onClick={handleReset} className="p-2 text-gray-400 hover:text-primary" title="Nova Rota">
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modal de Histórico */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-white">Histórico de Rotas</h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {routeHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma rota encontrada</p>
              ) : (
                routeHistory.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => loadRoute(route.id)}
                    className="w-full p-4 bg-gray-800 rounded-lg text-left hover:bg-gray-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">CEP: {route.start_cep}</p>
                        <p className="text-sm text-gray-400">
                          {route.completed_deliveries}/{route.total_deliveries} entregas
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        route.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        route.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {route.status === 'completed' ? 'Concluída' : route.status === 'active' ? 'Ativa' : 'Cancelada'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(route.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-32">
        {deliveries.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0" />
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-white mb-2">Como usar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Informe seu CEP de partida</li>
                  <li>Fotografe ou faça upload das etiquetas</li>
                  <li>A IA extrai automaticamente os dados</li>
                  <li>Gere a rota otimizada</li>
                  <li>Tudo é salvo automaticamente! 💾</li>
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
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
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
              <p className="text-2xl font-bold text-green-400">{stats.ent regues}</p>
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
                <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">✓ Salvo</span>
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
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-dark font-bold py-4 rounded-xl hover:bg-yellow-400 disabled:opacity-50"
          >
            <Route className="w-5 h-5" />
            Gerar Rota Otimizada
          </button>
        )}

        {routeGenerated && (
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white font-bold py-4 rounded-xl border border-gray-700"
          >
            <RotateCcw className="w-5 h-5" />
            Nova Rota
          </button>
        )}
      </main>

      <footer className="text-center py-6 text-gray-600 text-sm">
        <span className="text-primary font-bold">HBLACK</span> BOLT © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Home;