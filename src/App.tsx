import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import RotasDoDia from "./pages/RotasDoDia";
import Dias from "./pages/Dias";
import FooterNavBar from "./components/FooterNavBar";

const App = () => (
  <BrowserRouter>
    <div className="pb-20 min-h-screen bg-gray-950">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rotas" element={<RotasDoDia />} />
        <Route path="/dias" element={<Dias />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <FooterNavBar />
    </div>
  </BrowserRouter>
);

export default App;