import React, { useRef } from "react";
import { Check, X, Clock, Navigation, Trash2, ImagePlus } from "lucide-react";

export type DeliveryStatus = "pendente" | "entregue" | "nao-entregue";

export type Delivery = {
  id: string;
  nome: string;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  image: string;
  status: DeliveryStatus;
  proofImage?: string;
};

type Props = {
  delivery: Delivery;
  index: number;
  onStatusChange: (status: DeliveryStatus) => void;
  onAttachProof: (file: File) => void;
  onRemove: () => void;
};

const statusConfig = {
  pendente: {
    bg: "bg-blue-500/20 border-blue-500",
    label: "Pendente",
    icon: <Clock className="w-4 h-4" />,
  },
  entregue: {
    bg: "bg-green-500/20 border-green-500",
    label: "Entregue",
    icon: <Check className="w-4 h-4" />,
  },
  "nao-entregue": {
    bg: "bg-red-500/20 border-red-500",
    label: "Não Entregue",
    icon: <X className="w-4 h-4" />,
  },
};

const DeliveryCard: React.FC<Props> = ({
  delivery,
  index,
  onStatusChange,
  onAttachProof,
  onRemove,
}) => {
  const proofInputRef = useRef<HTMLInputElement>(null);
  const config = statusConfig[delivery.status];

  // Link do Waze
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(
    `${delivery.rua}, ${delivery.numero}, ${delivery.bairro}, ${delivery.cep}`
  )}`;

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAttachProof(file);
  };

  return (
    <div className={`rounded-xl border-2 p-4 ${config.bg} transition-all`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Número da ordem */}
        <div className="w-10 h-10 bg-primary text-dark rounded-full flex items-center justify-center font-bold text-lg shrink-0">
          {index + 1}
        </div>

        {/* Foto */}
        <img
          src={delivery.image}
          alt="Foto"
          className="w-16 h-16 object-cover rounded-lg border-2 border-gray-700"
        />

        {/* Dados */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-primary truncate">
            {delivery.nome || "Destinatário não identificado"}
          </p>
          <p className="text-sm text-gray-300 truncate">
            {delivery.rua}, {delivery.numero}
          </p>
          <p className="text-sm text-gray-400 truncate">
            {delivery.bairro} • {delivery.cep}
          </p>
        </div>

        {/* Remover */}
        <button
          onClick={onRemove}
          className="p-2 text-gray-500 hover:text-red-500 transition"
          title="Remover"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${config.bg}`}>
          {config.icon} {config.label}
        </span>
        {delivery.proofImage && (
          <span className="text-xs text-green-400">✓ Prova anexada</span>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => {
            if (delivery.status !== "entregue") {
              proofInputRef.current?.click();
            }
          }}
          className={`py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 ${
            delivery.status === "entregue"
              ? "bg-green-500 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-green-500 hover:text-white"
          }`}
        >
          <Check className="w-4 h-4" />
          <span className="hidden sm:inline">Entregue</span>
        </button>

        <button
          onClick={() => onStatusChange("nao-entregue")}
          className={`py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 ${
            delivery.status === "nao-entregue"
              ? "bg-red-500 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-red-500 hover:text-white"
          }`}
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Falhou</span>
        </button>

        <button
          onClick={() => onStatusChange("pendente")}
          className={`py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 ${
            delivery.status === "pendente"
              ? "bg-blue-500 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-blue-500 hover:text-white"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">Pendente</span>
        </button>

        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 rounded-lg text-xs font-semibold bg-primary text-dark hover:bg-yellow-400 transition flex items-center justify-center gap-1"
        >
          <Navigation className="w-4 h-4" />
          <span className="hidden sm:inline">Waze</span>
        </a>
      </div>

      {/* Input oculto para prova */}
      <input
        ref={proofInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleProofChange}
        className="hidden"
      />

      {/* Preview da prova */}
      {delivery.proofImage && (
        <div className="mt-3 flex items-center gap-2">
          <ImagePlus className="w-4 h-4 text-green-400" />
          <img
            src={delivery.proofImage}
            alt="Prova"
            className="w-12 h-12 object-cover rounded border border-green-500"
          />
        </div>
      )}
    </div>
  );
};

export default DeliveryCard;