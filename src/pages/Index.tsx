import { MadeWithDyad } from "@/components/made-with-dyad";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">App de Rotas para Entregadores</h1>
        <p className="text-xl text-gray-600 mb-6">
          Automatize suas entregas: tire fotos dos endereços e gere a rota ideal!
        </p>
        <button
          className="bg-blue-600 text-white px-8 py-4 rounded shadow text-lg font-semibold hover:bg-blue-700"
          onClick={() => navigate("/rota")}
        >
          Criar Rota
        </button>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;