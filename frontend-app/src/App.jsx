import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/register/:role" element={<Register />} />

      <Route path="/login/:role" element={<Login />} />
    </Routes>
  );
}

export default App;