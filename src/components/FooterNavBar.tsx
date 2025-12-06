import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, CalendarDays, History } from "lucide-react";

const navs = [
  { label: "Início", icon: <Home className="w-5 h-5" />, path: "/" },
  { label: "Rotas do Dia", icon: <CalendarDays className="w-5 h-5" />, path: "/rotas" },
  { label: "Dias", icon: <History className="w-5 h-5" />, path: "/dias" },
];

const FooterNavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800">
      <div className="max-w-lg mx-auto flex justify-between items-center px-4 py-2">
        {navs.map((nav) => {
          const active = location.pathname === nav.path || (nav.path === "/" && location.pathname === "");
          return (
            <button
              key={nav.path}
              onClick={() => navigate(nav.path)}
              className={`flex flex-col items-center flex-1 py-1 px-2 rounded-lg transition ${
                active ? "text-yellow-400 font-bold" : "text-gray-400 hover:text-yellow-400"
              }`}
            >
              {nav.icon}
              <span className="text-xs mt-1">{nav.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default FooterNavBar;