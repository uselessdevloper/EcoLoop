import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CaseProvider } from "./context/CaseContext.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CaseProvider>
          <AppRoutes />
        </CaseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
