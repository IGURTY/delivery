import React, { useState } from "react";
import ImageCapture from "@/components/ImageCapture";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import RouteMap from "@/components/RouteMap";
import DeliveryCard, { Delivery } from "@/components/DeliveryCard";
import { Loader2, MapPin, ArrowRight, CheckCircle2, Camera } from "lucide-react";

const SUPABASE_PROJECT_ID = "gkjyajysblgdxujbdwxc";
const EDGE_FUNCTION_EXTRACT = `https://${SUPABASE_PROJECT_ID}.functions.supabase.co/extract_address`;
const EDGE_FUNCTION_ROUTE = `https://${SUPABASE_PROJECT_ID}.functions.supabase.co/generate_route`;

async function extractDeliveryData(image: string): Promise<{ nome: string; cep: string; numero: string }> {
  const res = await fetch(EDGE_FUNCTION_EXTRACT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: image }),
  });
  if (!res.ok) throw new Error("Erro ao extrair dados");
  const data = await res.json();
  return { nome: data.nome || "", cep: data.cep || "", numero: data.numero || "" };
}

async function generateRoute(ceps: string[]): Promise<any> {
  const res = await fetch(EDGE_FUNCTION_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses: ceps }),
  });
  if (!res.ok) throw new Error("Erro ao gerar rota");
  const data = await res.json();
  return data.route;
}

function isValidCep(cep: string) {
  return /^\d{5}-?\d{3}$/.test(cep.trim());
}

const steps = [
  {
    label: "CEP Inicial",
    icon: <MapPin className="w-6 h-6" />,
    description: "Informe o CEP de onde você vai sair para iniciar as entregas.",
  },
  {
    label: "Cadastrar Entregas",
    icon: <Camera className="w-6 h-6" />,
    description: "Fotografe a fachada, placa ou correspondência de cada entrega. A IA extrai nome, CEP e número.",
  },
  {
    label: "Gerar Rota",
    icon: <ArrowRight className="w-6 h-6" />,
    description: "Crie a rota otimizada para suas entregas.",
  },
  {
    label: "Seguir no Mapa",
    icon: <CheckCircle2 className="w-6 h-6" />,
    description: "Visualize e siga a rota no mapa interativo.",
  },
];

const RouteFlow: React.FC = () => {
  const [startCep, setStartCep] = useState("");
  const [startTouched, setStartTouched] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [directions, setDirections] = useState<any>(null);
  const [orderedDeliveries, setOrderedDeliveries] = useState<Delivery[]>([]);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (directions) setStep(3);
    else if (deliveries.length >= 1 && startCep) setStep(2);
    else if (startCep) setStep(1);
    else setStep(0);
  }, [deliveries, directions, startCep]);

  const handleAddImage = async (img: string) => {
    setLoading(true);
    toast("Analisando imagem e extraindo dados...");
    try {
      const { nome, cep, numero } = await extractDeliveryData(img);
      if (!isValidCep(cep)) {
        toast.error("Não foi possível extrair um CEP válido da imagem.");
        setLoading(false);
        return;
      }
      setDeliveries((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          nome,
          cep,
          numero,
          image: img,
          status: "pendente",
        },
      ]);
      toast.success("Dados extraídos com sucesso!");
    } catch {
      toast.error("Falha ao extrair dados da imagem.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (id: string, status: "pendente" | "entregue" | "nao-entregue") => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status } : d))
    );
    setOrderedDeliveries((prev) =>
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
        setOrderedDeliveries((prev) =>
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

  const handleGenerateRoute = async () => {
    setLoading(true);
    toast("Gerando rota otimizada...");
    try {
      const ceps = [startCep, ...deliveries.map((d) => d.cep)];
      const route = await generateRoute(ceps);
      setDirections(route);

      // Ordena os cards conforme a ordem otimizada da rota
      // Google retorna waypoint_order (índices dos waypoints na ordem ótima)
      const waypointOrder = route?.waypoint_order || [];
      // O primeiro é sempre o ponto de partida, os waypoints são os destinos
      const ordered = waypointOrder.map((idx: number) => deliveries[idx]);
      setOrderedDeliveries(ordered);
      toast.success("Rota gerada com sucesso!");
    } catch {
      toast.error("Falha ao gerar rota.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDeliveries([]);
    setOrderedDeliveries([]);
    setDirections(null);
    setStartCep("");
    setStartTouched(false);
    setStep(0);
  };

  const isStartValid = isValidCep(startCep);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 px-2 py-8">
      <div className="w-full max-w-xl bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 md:p-10 border border-white/20">
        {/* Passos do fluxo */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, idx) => (
            <div key={s.label} className="flex-1 flex flex-col items-center relative">
              <div
                className={`rounded-full border-4 ${
                  step >= idx
                    ? "border-cyan-400 bg-cyan-500 text-white"
                    : "border-gray-400 bg-gray-200 text-gray-400"
                } w-12 h-12 flex items-center justify-center shadow-lg transition-all`}
              >
                {s.icon}
              </div>
              <span
                className={`mt-2 text-xs font-semibold text-center ${
                  step >= idx ? "text-cyan-300" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
              {idx < steps.length - 1 && (
                <div
                  className={`absolute top-6 right-[-50%] w-full h-1 ${
                    step > idx ? "bg-cyan-400" : "bg-gray-300"
                  } z-0 rounded-full`}
                  style={{ left: "100%", width: 32 }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Instrução do passo atual */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-cyan-200 mb-2 drop-shadow">
            {steps[step].label}
          </h2>
          <p className="text-cyan-100 text-base md:text-lg">{steps[step].description}</p>
        </div>

        {/* Passo 1: CEP inicial */}
        {!directions && step === 0 && (
          <form
            className="flex flex-col items-center gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setStartTouched(true);
              if (isStartValid) setStep(1);
            }}
          >
            <input
              type="text"
              className="w-full rounded-2xl px-4 py-3 border-2 border-cyan-300 bg-white/80 text-gray-900 text-lg shadow focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Digite seu CEP de partida (ex: 12345-678)"
              value={startCep}
              onChange={(e) => setStartCep(e.target.value)}
              onBlur={() => setStartTouched(true)}
              autoFocus
              required
              maxLength={9}
              inputMode="numeric"
              pattern="\d{5}-?\d{3}"
            />
            {startTouched && !isStartValid && (
              <span className="text-red-400 text-sm">
                Informe um CEP válido (ex: 12345-678).
              </span>
            )}
            <button
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-2xl font-bold text-lg shadow-xl hover:from-cyan-600 hover:to-blue-600 transition disabled:opacity-50"
              type="submit"
              disabled={!isStartValid}
            >
              Confirmar CEP Inicial
            </button>
          </form>
        )}

        {/* Passo 2: Cadastro de entregas */}
        {!directions && step > 0 && (
          <>
            <div className="mb-6">
              <ImageCapture onImage={handleAddImage} />
            </div>
            {loading && (
              <div className="flex items-center justify-center gap-2 text-cyan-300 mb-4 animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando...
              </div>
            )}
            <ul className="space-y-4 mb-6">
              <li className="flex items-center gap-3 bg-cyan-100/80 rounded-2xl shadow-lg p-3 border border-cyan-200">
                <div className="w-16 h-16 flex items-center justify-center rounded-xl border-2 border-cyan-400 bg-cyan-50 text-cyan-700 font-bold text-xl">
                  INI
                </div>
                <div>
                  <div className="font-semibold text-cyan-900">
                    CEP de Partida
                  </div>
                  <div className="text-gray-700 text-sm">{startCep}</div>
                </div>
              </li>
              {deliveries.map((delivery) => (
                <li key={delivery.id}>
                  <DeliveryCard
                    delivery={delivery}
                    onStatusChange={(status) => handleStatusChange(delivery.id, status)}
                    onAttachProof={(file) => handleAttachProof(delivery.id, file)}
                  />
                </li>
              ))}
            </ul>
            <button
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-2xl font-bold text-lg shadow-xl hover:from-cyan-600 hover:to-blue-600 transition disabled:opacity-50"
              onClick={handleGenerateRoute}
              disabled={deliveries.length < 1 || loading}
            >
              Gerar Rota
            </button>
            <button
              className="w-full mt-4 text-cyan-200 underline hover:text-cyan-100 transition"
              onClick={() => navigate("/")}
              type="button"
            >
              Voltar ao início
            </button>
            {deliveries.length > 0 && (
              <button
                className="w-full mt-2 text-xs text-gray-400 hover:text-red-400 underline"
                onClick={handleReset}
                type="button"
              >
                Limpar entregas
              </button>
            )}
          </>
        )}

        {/* Exibição do mapa e cardlist na ordem da rota */}
        {directions && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-2 text-cyan-200 text-center">
              Rota no Mapa
            </h3>
            <div className="rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-xl mb-4">
              <RouteMap directions={directions} />
            </div>
            <ul className="space-y-4 mb-6">
              {orderedDeliveries.map((delivery, idx) => (
                <li key={delivery.id}>
                  <DeliveryCard
                    delivery={delivery}
                    onStatusChange={(status) => handleStatusChange(delivery.id, status)}
                    onAttachProof={(file) => handleAttachProof(delivery.id, file)}
                    showWaze
                  />
                </li>
              ))}
            </ul>
            <button
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-2xl font-bold text-lg shadow-xl hover:from-cyan-600 hover:to-blue-600 transition"
              onClick={handleReset}
            >
              Nova Rota
            </button>
            <button
              className="w-full mt-4 text-cyan-200 underline hover:text-cyan-100 transition"
              onClick={() => navigate("/")}
              type="button"
            >
              Voltar ao início
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteFlow;