import { Routes, Route } from "react-router-dom";
import { Layout } from "./routes/Layout";
import { Dashboard } from "./routes/Dashboard";
import { SymbolDetail } from "./routes/SymbolDetail";
import { Status } from "./routes/Status";
import { About } from "./routes/About";
import { NotFound } from "./routes/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/symbol/:symbol" element={<SymbolDetail />} />
        <Route path="/status" element={<Status />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
