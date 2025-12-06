import React, { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "sonner";
import { 
  MapPin, 
  Loader2, 
  RotateCcw, 
  Info, 
  Zap, 
  Camera, 
  Upload, 
  Navigation, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Route,
  Images
} from "lucide-react";

// Types
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Address {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  coordinates?: Coordinates;
}

interface PendingImage {
  id: string;
  base64: string;
  thumbnail: string;
}

interface Delivery {
  id: string;
  nome: string;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  coordinates?: Coordinates;
  distance?: number;
  status: "pendente" | "entregue" | "nao-entregue";
  image?: string;
}

// API Constants
const SUPABASE_PROJECT_ID = "gkjyajysblgdxujbdwxc";
const EDGE_FUNCTION_EXTRACT = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/extract_address`;

// Haversine formula to calculate distance between two coordinates
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fetch address from CEP using BrasilAPI v2 (includes coordinates)
async function fetchAddressFromCep(cep: string): Promise<Address | null> {
  try {
    const cleanCep = cep.replace(/\D/g, "");
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      cep: data.cep,
      street: data.street || "",
      neighborhood: data.neighborhood || "",
      city: data.city || "",
      state: data.state || "",
      coordinates: data.location?.coordinates ? {
        latitude: parseFloat(data.location.coordinates.latitude),
        longitude: parseFloat(data.location.coordinates.longitude)
      } : undefined
    };
  } catch {
    return null;
  }
}

// Extract address data from image using AI
async function extractAddressFromImage(imageBase64: string): Promise<Partial<Delivery> | null> {
  try {
    const res = await fetch(EDGE_FUNCTION_EXTRACT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
    });
    if (!res.ok) throw new Error("Erro ao extrair dados");
    return res.json();
  } catch {
    return null;
  }
}

// Open Waze with navigation
function openWaze(coordinates: Coordinates) {
  const url = `https://waze.com/ul?ll=${coordinates.latitude},${coordinates.longitude}&navigate=yes`;
  window.open(url, "_blank");
}

// Format CEP
function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

function isValidCep(cep: string): boolean {
  return /^\d{5}-?\d{3}$/.test(cep?.trim() || "");
}

const Home: React.FC = () => {
  const [startCep, setStartCep] = useState("");
  const [startAddress, setStartAddress] = useState<Address | null>(null);
  const [loadingStartAddress, setLoadingStartAddress] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch start address when CEP is complete
  useEffect(() => {
    const cleanCep = startCep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setLoadingStartAddress(true);
      fetchAddressFromCep(cleanCep)
        .then((address) => {
          if (address) {
            setStartAddress(address);
            toast.success("Endereço de partida encontrado!");
          } else {
            setStartAddress(null);
            toast.error("CEP não encontrado");
          }
        })
        .finally(() => setLoadingStartAddress(false));
    } else {
      setStartAddress(null);
    }
  }, [startCep]);

  // Handle image capture/upload
  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const base64 = ev.target.result as string;
          const newImage: PendingImage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            base64,
            thumbnail: base64
          };
          setPendingImages((prev) => [...prev, newImage]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = "";
  };

  // Remove pending image
  const removePendingImage = (id: string) => {
    setPendingImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Process all images and calculate route
  const processAllImages = async () => {
    if (!startAddress?.coordinates) {
      toast.error("Endereço de partida sem coordenadas. Tente outro CEP.");
      return;
    }

    if (pendingImages.length === 0) {
      toast.error("Adicione pelo menos uma imagem.");
      return;
    }

    setProcessing(true);
    setProcessingProgress({ current: 0, total: pendingImages.length });

    const newDeliveries: Delivery[] = [];

    for (let i = 0; i < pendingImages.length; i++) {
      setProcessingProgress({ current: i + 1, total: pendingImages.length });
      
      const img = pendingImages[i];
      const extracted = await extractAddressFromImage(img.base64);
      
      if (extracted && extracted.cep) {
        // Fetch coordinates for this CEP
        const addressData = await fetchAddressFromCep(extracted.cep);
        
        const delivery: Delivery = {
          id: img.id,
          nome: extracted.nome || "",
          rua: extracted.rua || addressData?.street || "",
          numero: extracted.numero || "",
          bairro: extracted.bairro || addressData?.neighborhood || "",
          cep: extracted.cep,
          cidade: extracted.cidade || addressData?.city || "",
          estado: extracted.estado || addressData?.state || "",
          coordinates: addressData?.coordinates,
          status: "pendente",
          image: img.base64
        };

        // Calculate distance from start
        if (delivery.coordinates && startAddress.coordinates) {
          delivery.distance = calculateDistance(startAddress.coordinates, delivery.coordinates);
        }

        newDeliveries.push(delivery);
      } else {
        toast.error(`Imagem ${i + 1}: Não foi possível extrair endereço`);
      }
    }

    // Sort by distance (nearest first)
    newDeliveries.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

    setDeliveries(newDeliveries);
    setPendingImages([]);
    setProcessing(false);

    if (newDeliveries.length > 0) {
      toast.success(`${newDeliveries.length} entregas processadas e ordenadas por distância!`);
    }
  };

  // Update delivery status
  const updateStatus = (id: string, status: Delivery["status"]) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status } : d))
    );
  };

  // Remove delivery
  const removeDelivery = (id: string) => {
    setDeliveries((prev) => prev.filter((d) => d.id !== id));
    toast.info("Entrega removida");
  };

  // Reset everything
  const handleReset = () => {
    setDeliveries([]);
    setPendingImages([]);
    setStartCep("");
    setStartAddress(null);
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

      {/* Header */}
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
          {(deliveries.length > 0 || pendingImages.length > 0) && (
            <button onClick={handleReset} className="p-2 text-gray-400 hover:text-yellow-400">
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-32">
        {/* Instructions */}
        {deliveries.length === 0 && pendingImages.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-white mb-2">Como usar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Informe seu CEP de partida</li>
                  <li>Tire fotos de todas as etiquetas</li>
                  <li>Clique em "Calcular Rota"</li>
                  <li>Entregas ordenadas do mais perto ao mais longe</li>
                  <li>Clique no botão Waze para navegar</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Start CEP Input */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
            <MapPin className="w-4 h-4 text-yellow-400" />
            CEP de Partida
          </label>
          <input
            type="text"
            value={startCep}
            onChange={(e) => setStartCep(formatCep(e.target.value))}
            placeholder="00000-000"
            maxLength={9}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
            disabled={deliveries.length > 0}
          />
          
          {loadingStartAddress && (
            <div className="flex items-center gap-2 mt-3 text-yellow-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Buscando endereço...</span>
            </div>
          )}

          {startAddress && (
            <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-green-800">
              <p className="text-sm text-green-400 font-semibold mb-1">✓ Endereço de Partida</p>
              <p className="text-sm text-gray-300">
                {startAddress.street}, {startAddress.neighborhood}
              </p>
              <p className="text-sm text-gray-400">
                {startAddress.city} - {startAddress.state}
              </p>
              {startAddress.coordinates && (
                <p className="text-xs text-gray-500 mt-1">
                  📍 {startAddress.coordinates.latitude.toFixed(6)}, {startAddress.coordinates.longitude.toFixed(6)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Image Capture Section - Only show if start address is set */}
        {startAddress && deliveries.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3">
              <Images className="w-4 h-4 text-yellow-400" />
              Fotos das Etiquetas ({pendingImages.length})
            </label>

            <div className="flex gap-2 mb-4">
              <buttonVou continuar o arquivo Home.tsx que foi cortado:

<dyad-write path="src/pages/Home.tsx" description="Complete Home.tsx with CEP lookup, batch image processing, distance calculation, and Waze integration">
import React, { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "sonner";
import { 
  MapPin, 
  Loader2, 
  RotateCcw, 
  Info, 
  Zap, 
  Camera, 
  Upload, 
  Navigation, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Route,
  Images,
  X
} from "lucide-react";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Address {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  coordinates?: Coordinates;
}

interface PendingImage {
  id: string;
  base64: string;
}

interface Delivery {
  id: string;
  nome: string;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  coordinates?: Coordinates;
  distance?: number;
  status: "pendente" | "entregue" | "nao-entregue";
  image?: string;
}

const SUPABASE_PROJECT_ID = "gkjyajysblgdxujbdwxc";
const EDGE_FUNCTION_EXTRACT = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/extract_address`;

function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371;
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function fetchAddressFromCep(cep: string): Promise<Address | null> {
  try {
    const cleanCep = cep.replace(/\D/g, "");
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      cep: data.cep,
      street: data.street || "",
      neighborhood: data.neighborhood || "",
      city: data.city || "",
      state: data.state || "",
      coordinates: data.location?.coordinates ? {
        latitude: parseFloat(data.location.coordinates.latitude),
        longitude: parseFloat(data.location.coordinates.longitude)
      } : undefined
    };
  } catch {
    return null;
  }
}

async function extractAddressFromImage(imageBase64: string): Promise<any> {
  try {
    const res = await fetch(EDGE_FUNCTION_EXTRACT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
    });
    if (!res.ok) throw new Error("Erro");
    return res.json();
  } catch {
    return null;
  }
}

function openWaze(coordinates: Coordinates) {
  window.open(`https://waze.com/ul?ll=${coordinates.latitude},${coordinates.longitude}&navigate=yes`, "_blank");
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

const Home: React.FC = () => {
  const [startCep, setStartCep] = useState("");
  const [startAddress, setStartAddress] = useState<Address | null>(null);
  const [loadingStart, setLoadingStart] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const clean = startCep.replace(/\D/g, "");
    if (clean.length === 8) {
      setLoadingStart(true);
      fetchAddressFromCep(clean).then((addr) => {
        setStartAddress(addr);
        if (addr) toast.success("Endereço encontrado!");
        else toast.error("CEP não encontrado");
      }).finally(() => setLoadingStart(false));
    } else {
      setStartAddress(null);
    }
  }, [startCep]);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPendingImages((prev) => [...prev, {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            base64: ev.target!.result as string
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const processImages = async () => {
    if (!startAddress?.coordinates) {
      toast.error("CEP de partida sem coordenadas");
      return;
    }
    if (pendingImages.length === 0) {
      toast.error("Adicione imagens primeiro");
      return;
    }

    setProcessing(true);
    setProgress({ current: 0, total: pendingImages.length });
    const results: Delivery[] = [];

    for (let i = 0; i < pendingImages.length; i++) {
      setProgress({ current: i + 1, total: pendingImages.length });
      const img = pendingImages[i];
      const data = await extractAddressFromImage(img.base64);
      
      if (data?.cep) {
        const addr = await fetchAddressFromCep(data.cep);
        const delivery: Delivery = {
          id: img.id,
          nome: data.nome || "",
          rua: data.rua || addr?.street || "",
          numero: data.numero || "",
          bairro: data.bairro || addr?.neighborhood || "",
          cep: data.cep,
          cidade: data.cidade || addr?.city || "",
          estado: data.estado || addr?.state || "",
          coordinates: addr?.coordinates,
          status: "pendente",
          image: img.base64
        };
        if (delivery.coordinates && startAddress.coordinates) {
          delivery.distance = calculateDistance(startAddress.coordinates, delivery.coordinates);
        }
        results.push(delivery);
      } else {
        toast.error(`Imagem ${i + 1}: falha na extração`);
      }
    }

    results.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    setDeliveries(results);
    setPendingImages([]);
    setProcessing(false);
    if (results.length > 0) toast.success(`${results.length} entregas ordenadas!`);
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
          {(deliveries.length > 0 || pendingImages.length > 0) && (
            <button onClick={() => { setDeliveries([]); setPendingImages([]); setStartCep(""); setStartAddress(null); }} className="p-2 text-gray-400 hover:text-yellow-400">
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-32">
        {deliveries.length === 0 && pendingImages.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-400 shrink-0" />
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-white mb-2">Como usar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Informe seu CEP de partida</li>
                  <li>Tire fotos de todas as etiquetas</li>
                  <li>Clique em "Calcular Rota"</li>
                  <li>Entregas ordenadas por distância</li>
                  <li>Clique em Waze para navegar</li>
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
            onChange={(e) => setStartCep(formatCep(e.target.value))}
            placeholder="00000-000"
            maxLength={9}
            disabled={deliveries.length > 0}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 disabled:opacity-50"
          />
          {loadingStart && (
            <div className="flex items-center gap-2 mt-3 text-yellow-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Buscando...</span>
            </div>
          )}
          {startAddress && (
            <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-green-800">
              <p className="text-sm text-green-400 font-semibold">✓ Endereço de Partida</p>
              <p className="text-sm text-gray-300">{startAddress.street}, {startAddress.neighborhood}</p>
              <p className="text-sm text-gray-400">{startAddress.city} - {startAddress.state}</p>
              {startAddress.coordinates && (
                <p className="text-xs text-gray-500 mt-1">📍 {startAddress.coordinates.latitude.toFixed(4)}, {startAddress.coordinates.longitude.toFixed(4)}</p>
              )}
            </div>
          )}
        </div>

        {startAddress && deliveries.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3">
              <Images className="w-4 h-4 text-yellow-400" />
              Fotos das Etiquetas ({pendingImages.length})
            </label>

            <div className="flex gap-2 mb-4">
              <button onClick={() => cameraRef.current?.click()} disabled={processing} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <Camera className="w-5 h-5" />
                Câmera
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={processing} className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50">
                <Upload className="w-5 h-5" />
                Galeria
              </button>
            </div>

            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleImage} className="hidden" />
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImage} className="hidden" />

            {pendingImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {pendingImages.map((img) => (
                  <div key={img.id} className="relative">
                    <img src={img.base64} alt="" className="w-full h-16 object-cover rounded-lg" />
                    <button onClick={() => setPendingImages((p) => p.filter((i) => i.id !== img.id))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pendingImages.length > 0 && (
              <button onClick={processImages} disabled={processing} className="w-full bg-yellow-400 text-gray-900 font-bold py-4 rounded-xl hover:bg-yellow-300 disabled:opacity-50 flex items-center justify-center gap-2">
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando {progress.current}/{progress.total}...
                  </>
                ) : (
                  <>
                    <Route className="w-5 h-5" />
                    Calcular Rota ({pendingImages.length} imagens)
                  </>
                )}
              </button>
            )}
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
                <div key={d.id} className={`rounded-xl border-2 p-4 transition-all ${
                  d.status === "entregue" ? "bg-green-500/10 border-green-500" :
                  d.status === "nao-entregue" ? "bg-red-500/10 border-red-500" :
                  "bg-blue-500/10 border-blue-500"
                }`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                      {i + 1}
                    </div>
                    {d.image && <img src={d.image} alt="" className="w-14 h-14 object-cover rounded-lg border-2 border-gray-700" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-yellow-400 truncate">{d.nome || "Destinatário"}</p>
                      <p className="text-sm text-gray-300 truncate">{d.rua}{d.numero ? `, ${d.numero}` : ""}</p>
                      <p className="text-sm text-gray-400 truncate">{d.bairro} • {d.cep}</p>
                      {d.distance && <p className="text-xs text-gray-500 mt-1">📍 {d.distance.toFixed(1)} km</p>}
                    </div>
                    <button onClick={() => setDeliveries((p) => p.filter((x) => x.id !== d.id))} className="p-2 text-gray-500 hover:text-red-500">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => setDeliveries((p) => p.map((x) => x.id === d.id ? { ...x, status: "entregue" } : x))} className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${d.status === "entregue" ? "bg-green-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-green-500 hover:text-white"}`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeliveries((p) => p.map((x) => x.id === d.id ? { ...x, status: "nao-entregue" } : x))} className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${d.status === "nao-entregue" ? "bg-red-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-red-500 hover:text-white"}`}>
                      <XCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeliveries((p) => p.map((x) => x.id === d.id ? { ...x, status: "pendente" } : x))} className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${d.status === "pendente" ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-blue-500 hover:text-white"}`}>
                      <Clock className="w-4 h-4" />
                    </button>
                    <button onClick={() => d.coordinates && openWaze(d.coordinates)} disabled={!d.coordinates} className="py-2 rounded-lg text-xs font-semibold bg-yellow-400 text-gray-900 hover:bg-yellow-300 disabled:opacity-50 flex items-center justify-center gap-1">
                      <Navigation className="w-4 h-4" />
                    </button>
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