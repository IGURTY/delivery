import React, { useRef, useState } from "react";
import { Camera, Upload, Image, X } from "lucide-react";

type Props = {
  onCapture: (imageBase64: string) => void;
  disabled?: boolean;
};

const ImageCapture: React.FC<Props> = ({ onCapture, disabled }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const processFile = (file: File) => {
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione uma imagem válida.");
      return;
    }

    // Validar tamanho (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Imagem muito grande. Máximo 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const base64 = ev.target.result as string;
        setPreview(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
    setShowOptions(false);
  };

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
    setShowOptions(false);
  };

  const handleConfirm = () => {
    if (preview) {
      onCapture(preview);
      setPreview(null);
    }
  };

  const handleCancel = () => {
    setPreview(null);
  };

  // Preview da imagem antes de enviar
  if (preview) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-contain rounded-lg bg-gray-800"
          />
          <button
            onClick={handleCancel}
            className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 px-4 rounded-lg border border-gray-700 text-gray-300 font-semibold hover:bg-gray-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={disabled}
            className="flex-1 py-3 px-4 rounded-lg bg-primary text-dark font-bold hover:bg-yellow-400 transition disabled:opacity-50"
          >
            Analisar com IA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Botão principal */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-3 bg-primary text-dark font-bold py-4 px-6 rounded-xl hover:bg-yellow-400 transition disabled:opacity-50"
      >
        <Image className="w-6 h-6" />
        Adicionar Etiqueta
      </button>

      {/* Opções de captura */}
      {showOptions && (
        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Opção: Câmera */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
            className="flex flex-col items-center gap-2 p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-primary hover:bg-gray-800 transition"
          >
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Camera className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-sm font-medium text-white">Fotografar</span>
            <span className="text-xs text-gray-500">Usar câmera</span>
          </button>

          {/* Opção: Upload */}
          <button
            onClick={() => uploadInputRef.current?.click()}
            disabled={disabled}
            className="flex flex-col items-center gap-2 p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-primary hover:bg-gray-800 transition"
          >
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-sm font-medium text-white">Upload</span>
            <span className="text-xs text-gray-500">Da galeria</span>
          </button>
        </div>
      )}

      {/* Dica */}
      {showOptions && (
        <p className="text-xs text-gray-500 text-center">
          📸 Fotografe ou faça upload da etiqueta, fachada ou correspondência
        </p>
      )}

      {/* Input oculto para câmera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        className="hidden"
      />

      {/* Input oculto para upload */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadChange}
        className="hidden"
      />
    </div>
  );
};

export default ImageCapture;