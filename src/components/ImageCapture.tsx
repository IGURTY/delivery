import React, { useRef } from "react";

type Props = {
  onImage: (img: string) => void;
};

const ImageCapture: React.FC<Props> = ({ onImage }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        onImage(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        Tirar Foto / Selecionar Imagem
      </button>
    </div>
  );
};

export default ImageCapture;