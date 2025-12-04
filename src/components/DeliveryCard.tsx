import React from "react";
import { CheckCircle2, XCircle, Camera, Image as ImageIcon, Package } from "lucide-react";

type Status = "pendente" | "entregue" | "nao-entregue";

export type Delivery = {
  id: string;
  nome: string;
  cep: string;
  numero: string;
  image: string;
  status: Status;
  proofImage?: string;
};

type Props = {
  delivery: Delivery;
  onStatusChange: (status: Status) => void;
  onAttachProof: (file: File) => void;
  showWaze?: boolean;
};

const statusColors = {
  "pendente": "border-blue-400 bg-blue-50",
  "entregue": "border-green-500 bg-green-50",
  "nao-entregue": "border-red-500 bg-red-50",
};

const statusLabel = {
  "pendente": "Precisa ser entregue",
  "entregue": "Entregue",
  "nao-entregue": "Não entregue",
};

const DeliveryCard: React.FC<Props> = ({ delivery, onStatusChange, onAttachProof, showWaze }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Monta o link do Waze usando o CEP e número
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(
    `${delivery.cep}${delivery.numero ? ', ' + delivery.numero : ''}`
  )}`;

  return (
    <div className={`rounded-2xl shadow-lg p-4 border-2 flex flex-col gap-2 ${statusColors[delivery.status]}`}>
      <div className="flex items-center gap-3">
        <img
          src={delivery.image}
          alt="Foto endereço"
          className="w-16 h-16 object-cover rounded-xl border"
        />
        <div className="flex-1">
          <div className="font-bold text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-500" />
            {delivery.nome || <span className="italic text-gray-400">Nome não detectado</span>}
          </div>
          <div className="text-gray-700 text-sm">CEP: <span className="font-mono">{delivery.cep}</span></div>
          <div className="text-gray-700 text-sm">Nº: <span className="font-mono">{delivery.numero}</span></div>
        </div>
        {showWaze && (
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir no Waze"
            className="ml-2 flex items-center justify-center bg-blue-100 hover:bg-blue-200 rounded-full p-2 transition"
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/0/09/Waze_new_logo.png" alt="Waze" className="w-7 h-7" />
          </a>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button
          className={`flex-1 py-2 rounded-xl font-semibold transition ${
            delivery.status === "entregue"
              ? "bg-green-500 text-white"
              : "bg-green-100 text-green-700 hover:bg-green-200"
          }`}
          onClick={() => {
            if (delivery.status !== "entregue") fileInputRef.current?.click();
          }}
          disabled={delivery.status === "entregue"}
        >
          <CheckCircle2 className="inline w-5 h-5 mr-1" />
          Entregue
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onAttachProof(file);
          }}
        />
        <button
          className={`flex-1 py-2 rounded-xl font-semibold transition ${
            delivery.status === "nao-entregue"
              ? "bg-red-500 text-white"
              : "bg-red-100 text-red-700 hover:bg-red-200"
          }`}
          onClick={() => onStatusChange("nao-entregue")}
          disabled={delivery.status === "nao-entregue"}
        >
          <XCircle className="inline w-5 h-5 mr-1" />
          Não entregue
        </button>
        <button
          className={`flex-1 py-2 rounded-xl font-semibold transition ${
            delivery.status === "pendente"
              ? "bg-blue-500 text-white"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
          }`}
          onClick={() => onStatusChange("pendente")}
          disabled={delivery.status === "pendente"}
        >
          <Camera className="inline w-5 h-5 mr-1" />
          Pendente
        </button>
      </div>
      {delivery.status === "entregue" && delivery.proofImage && (
        <div className="flex items-center gap-2 mt-2">
          <img src="https://upload.wikimedia.org/wikipedia/commons/0/09/Waze_new_logo.png" alt="Waze" className="w-5 h-5" />
          <span className="text-green-700 text-sm">Prova de entrega anexada</span>
          <img src={delivery.proofImage} alt="Prova de entrega" className="w-12 h-12 rounded border ml-2" />
        </div>
      )}
    </div>
  );
};

export default DeliveryCard;