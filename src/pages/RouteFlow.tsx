import React, { useState } from "react";
import ImageCapture from "@/components/ImageCapture";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import RouteMap from "@/components/RouteMap";

type AddressItem = {
  id: string;
  image: string;
  address: string;
};

const SUPABASE_PROJECT_ID = "gkjyajysblgdxujbdwxc";
const EDGE_FUNCTION_EXTRACT = `https://${SUPABASE_PROJECT_ID}.functions.supabase.co/extract_address`;
const EDGE_FUNCTION_ROUTE = `https://${SUPABASE_PROJECT_ID}.functions.supabase.co/generate_route`;

async function extractAddressFromImage(image: string): Promise<string> {
  const res = await fetch(EDGE_FUNCTION_EXTRACT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: image }),
  });
  if (!res.ok) throw new Error("Erro ao extrair endereço");
  const data = await res.json();
  return data.address;
}

async function generateRoute(addresses: string[]): Promise<any> {
  const res = await fetch(EDGE_FUNCTION_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses }),
  });
  if (!res.ok) throw new Error("Erro ao gerar rota");
  const data = await res.json();
  return data.route;
}

const RouteFlow: React.FC = () => {
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [directions, setDirections] = useState<any>(null);
  const navigate = useNavigate();

  const handleAddImage = async (img: string) => {
    setLoading(true);
    toast("Analisando imagem e extraindo endereço...");
    try {
      const address = await extractAddressFromImage(img);
      setAddresses((prev) => [
        ...prev,
        { id: Date.now().toString(), image: img, address },
      ]);
      toast.success("Endereço extraído com sucesso!");
    } catch {
      toast.error("Falha ao extrair endereço da imagem.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRoute = async () => {
    setLoading(true);
    toast("Gerando rota otimizada...");
    try {
      const addrList = addresses.map((a) => a.address);
      const route = await generateRoute(addrList);
      setDirections(route);
      toast.success("Rota gerada com sucesso!");
    } catch {
      toast.error("Falha ao gerar rota.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold mb-4 text-center">Adicionar Endereços</h2>
      <div className="mb-6">
        <ImageCapture onImage={handleAddImage} />
      </div>
      {loading && (
        <div className="text-blue-600 text-center mb-2">Processando...</div>
      )}
      <ul className="space-y-4 mb-6">
        {addresses.map((item, idx) => (
          <li key={item.id} className="flex items-center gap-3 bg-white rounded shadow p-2">
            <img src={item.image} alt="Endereço" className="w-16 h-16 object-cover rounded" />
            <div>
              <div className="font-semibold">Endereço {idx + 1}</div>
              <div className="text-gray-700 text-sm">{item.address}</div>
            </div>
          </li>
        ))}
      </ul>
      <button
        className="w-full bg-green-600 text-white py-3 rounded font-bold text-lg shadow hover:bg-green-700 disabled:opacity-50"
        onClick={handleGenerateRoute}
        disabled={addresses.length < 2 || loading}
      >
        Gerar Rota
      </button>
      <button
        className="w-full mt-4 text-gray-500 underline"
        onClick={() => navigate("/")}
        type="button"
      >
        Voltar
      </button>
      {directions && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-2 text-center">Rota no Mapa</h3>
          <RouteMap directions={directions} />
        </div>
      )}
    </div>
  );
};

export default RouteFlow;