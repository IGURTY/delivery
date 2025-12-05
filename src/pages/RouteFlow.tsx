import React, { useState } from "react";
import ImageCapture from "@/components/ImageCapture";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import RouteMap from "@/components/RouteMap";
import DeliveryCard, { Delivery, DeliveryStatus } from "@/components/DeliveryCard";
import { Loader2, MapPin, ArrowRight, CheckCircle2, Camera } from "lucide-react";

const SUPABASE_PROJECT_ID = "gkjyajysblgdxujbdwxc";
const EDGE_FUNCTION_EXTRACT = `https://${SUPABASE_PROJECT_ID}.functions.supabase.co/extract_address`;
const EDGE_FUNCTION_ROUTE = `https://${SUPABASE_PROJECT_ID}.functions.supabase.co/generate_route`;

async function extractDeliveryData(image: string) {
  const res = await fetch(EDGE_FUNCTION_EXTRACT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: image }),
  });
  if (!res.ok) throw new Error("Erro ao extrair dados");
  return res.json();
}

async function generateRoute(ceps: string[]) {
  const res = await fetch(EDGE_FUNCTION_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses: ceps }),
  });
  if (!res.ok) throw new Error("Erro ao gerar rota");
  return res.json();
}

function isValidCep(cep: string) {
  return /^\d{5}-?\d{3}$/.test(cep?.trim() || "");
}

const steps = [
  { label: "CEP", icon: <MapPin className="w-5 h-5" /> },
  { label: "Cadastrar", icon: <Camera className="w-5 h-5" /> },
  { label: "Rota", icon: <ArrowRight className="w-5 h-5" /> },
  { label: "Seguir", icon: <CheckCircle2 className="w-5 h-5" /> },
];

const RouteFlow: React.FC = () => {
  const [startCep, setStartCep] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [orderedDeliveries, setOrderedDeliveries] = useState<Delivery[]>([]);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (directions) setStep(3);
    else if (deliveries.length >= 1 && isValidCep(startCep)) setStep(2);
    else if (isValidCep(startCep)) setStep(1);
    else setStep(0);
  }, [deliveries, directions, startCep]);

  const handleAddImage = async (img: string) => {
    setLoading(true);
    toast.loading("Analisando imagem...");
    try {
      const data = await extractDeliveryData(img);
      toast.dismiss();
      const newDelivery: Delivery = {
        id: Date.now().toString(),
        nome: data.nome || "",
        cep: data.cep || "",
        numero: data.numero || "",
        rua: data.rua || "",
        bairro: data.bairro || "",
        cidade: data.cidade || "",
        estado: data.estado || "",
        image: img,
        status: "pendente",
      };
      setDeliveries((prev) => [...prev, newDelivery]);
      if (!isValidCep(data.cep)) {
        toast.warning("CEP não identificado.");
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
    setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
    setOrderedDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  const handleAttachProof = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const proofImage = ev.target.result as string;
        setDeliveries((prev) => prev.map((d) => d.id === id ? { ...d, status: "entregue" as DeliveryStatus, proofImage } : d));
        setOrderedDeliveries((prev) => prev.map((d) => d.id === id ? { ...d, status: "entregue" as DeliveryStatus, proofImage } : d));
        toast.success("Prova anexada!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (id: string) => {
    setDeliveries((prev) => prev.filter((d) => d.id !== id));
    setOrderedDeliveries((prev) => prev.filter((d) => d.id !== id));
  };

  const handleGenerateRoute = async () => {
    const invalid = deliveries.find((d) => !isValidCep(d.cep));
    if (invalid) {
      toast.error("Remova entregas com CEP inválido.");
      return;
    }
    setLoading(true);
    toast.loading("Gerando rota...");
    try {
      const data = await generateRoute([startCep, ...deliveries.map((d) => d.cep)]);
      toast.dismiss();
      setDirections(data.route);
      const order = data.route?.waypoint_order || [];
      setOrderedDeliveries(order.length > 0 ? order.map((i: number) => deliveries[i]) : deliveries);
      toast.success("Rota gerada!");
    } catch {
      toast.dismiss();
      toast.error("Erro ao gerar rota.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDeliveries([]);
    setOrderedDeliveries([]);
    setDirections(null);
    setStartCep("");
  };

  return (
    <div className="min-h-screen bg-dark px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Steps */}
        <div className="flex justify-between mb-6">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= i ? "bg-primary text-dark" : "bg-gray-700 text-gray-400"}`}>
                {s.icon}
              </div>
              <span className={`text-xs mt-1 ${step >= i ? "text-primary" : "text-gray-500"}`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Step 0: CEP */}
        {!directions && step === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); if (isValidCep(startCep)) setStep(1); }} className="space-y-4">
            <input
              type="text"
              value={startCep}
              onChange={(e) => setStartCep(e.target.value)}
              placeholder="CEP de partida (00000-000)"
              maxLength={9}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
            />
            <button type="submit" disabled={!isValidCep(startCep)} className="w-full bg-primary text-dark font-bold py-3 rounded-lg disabled:opacity-50">
              Confirmar
            </button>
          </form>
        )}

        {/* Step 1-2: Cadastro */}
        {!directions && step > 0 && (
          <>
            <ImageCapture onCapture={handleAddImage} disabled={loading} />
            {loading && <div className="flex justify-center text-primary"><Loader2 className="w-6 h-6 animate-spin" /></div>}
            
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

            {deliveries.length > 0 && (
              <button onClick={handleGenerateRoute} disabled={loading} className="w-full bg-primary text-dark font-bold py-3 rounded-lg disabled:opacity-50">
                Gerar Rota
              </button>
            )}
          </>
        )}

        {/* Step 3: Rota */}
        {directions && (
          <>
            <RouteMap directions={directions} />
            <div className="space-y-3">
              {orderedDeliveries.map((d, i) => (
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
            <button onClick={handleReset} className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg border border-gray-700">
              Nova Rota
            </button>
          </>
        )}

        <button onClick={() => navigate("/")} className="w-full text-gray-400 underline text-sm">
          Voltar ao início
        </button>
      </div>
    </div>
  );
};

export default RouteFlow;