import React, { useEffect, useState } from "react";
import * as db from "@/services/database";
import { Loader2 } from "lucide-react";

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const RotasDoDia: React.FC = () => {
  const [routes, setRoutes] = useState<db.DbRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const allRoutes = await db.getAllRoutes();
      setRoutes(allRoutes.filter(r => isToday(r.created_at)));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h2 className="text-xl font-bold mb-4 text-yellow-400">Rotas do Dia</h2>
      {loading ? (
        <div className="flex items-center gap-2 text-yellow-400"><Loader2 className="w-5 h-5 animate-spin" />Carregando...</div>
      ) : routes.length === 0 ? (
        <p className="text-gray-400">Nenhuma rota criada hoje.</p>
      ) : (
        <ul className="space-y-3">
          {routes.map(route => (
            <li key={route.id} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-white">CEP: {route.start_cep}</p>
                  <p className="text-xs text-gray-400">{route.completed_deliveries}/{route.total_deliveries} entregas</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  route.status === "completed" ? "bg-green-500/20 text-green-400" :
                  route.status === "active" ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"
                }`}>
                  {route.status === "completed" ? "Concluída" : route.status === "active" ? "Ativa" : "Cancelada"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">{new Date(route.created_at).toLocaleTimeString("pt-BR")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RotasDoDia;