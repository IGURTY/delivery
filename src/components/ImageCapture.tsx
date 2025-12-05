import React, { useRef } from "react";
import { Camera } from "lucide-react";

type Props = {
  onCapture: (imageBase64: string) => void;
  disabled?: boolean;
};

const ImageCapture: React.FC<Props> = ({ onCapture, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        onCapture(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <button
      onClick={() => inputRef.current?.click()}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 bg-primary text-dark font-bold py-4 px-6 rounded-xl hover:bg-yellow-400 transition disabled:opacity-50"
    >
      <Camera className="w-6 h-6" />
      Fotografar Entrega
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
    </button>
  );
};

export default ImageCapture;