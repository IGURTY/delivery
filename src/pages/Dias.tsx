import React, { useEffect, useState } from "react";
import * as db from "@/services/database";
import { Loader2, CalendarDays } from "lucide-react";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}

const Dias: React.FC = () => {
  const [routes, setRoutes] = useState<db.DbRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const allRoutes = await db.getAllRoutes();
      setRoutes(allRoutes);
      setLoading(false);
    })();
  }, []);

  // Agrupa rotas por dia
  const days = Array.from(
    routes.reduce((map, route) => {
      const day = route.created_at.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(route);
      return map;
    }, new Map<string, db.DbRoute[]>())
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h2 className="text-xl font-bold mb-4 text-yellow-400">Histórico de Dias</h2>
      {loading ? (
        <div className="flex items-center gap-2 text-yellow-400"><Loader2 className="w-5 h-5 animate-spin" />Carregando...</div>
      ) : days.length === 0 ? (
        <p className="text-gray-400">Nenhum dia com rotas cadastradas.</p>
      ) : (
        <ul className="space-y-4">
          {days.map(([day, routes]) => (
            <li key={day} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4 text-yellow-400" />
                <span className="font-semibold text-white">{formatDate(day)}</span>
              </div>
              <ul className="ml-4 space-y-1">
                {routes.map(route => (
                  <li key={route.id} className="text-xs text-gray-400">
                    CEP: {route.start_cep} — {route.completed_deliveries}/{route.total_deliveries} entregas
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dias;