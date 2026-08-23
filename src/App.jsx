import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { DriveProvider } from "./context/DriveContext";

import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Roadmap from "./pages/Roadmap";
import TodoManager from "./pages/TodoManager";
import Documents from "./pages/Documents";
import Profile from "./pages/Profile";
import PortfolioHub from "./pages/PortfolioHub";
import PublicPortfolioView from "./pages/PublicPortfolioView";
import Settings from "./pages/Settings";

// ── Purge any stale demo session data on every page load ─────────────────────
(function purgeDemoData() {
  const token = localStorage.getItem("personalsite_token");
  const userRaw = localStorage.getItem("personalsite_user");
  let isDemo = false;
  try {
    const u = userRaw ? JSON.parse(userRaw) : null;
    if (u?.isDemo) isDemo = true;
  } catch {}
  if (isDemo || (token && token.startsWith("demo_token"))) {
    localStorage.removeItem("personalsite_user");
    localStorage.removeItem("personalsite_token");
    localStorage.removeItem("personalsite_vault_files");
  }
})();

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex-center" style={{ minHeight: "100vh" }}>
      <div className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <DriveProvider>{children}</DriveProvider>;
}

function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex-center" style={{ minHeight: "100vh" }}>
      <div className="spinner" />
    </div>
  );
  return user ? <Navigate to="/dashboard" replace /> : <LoginPage />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<RootRoute />} />

      {/* Public portfolio viewer */}
      <Route path="/p/:username" element={<PublicPortfolioView />} />
      <Route path="/p/live" element={<PublicPortfolioView />} />
      <Route path="/portfolio/view" element={<PublicPortfolioView />} />

      {/* Private workspace — requires Google sign-in */}
      <Route path="/dashboard"     element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/profile"       element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/portfolio-hub" element={<PrivateRoute><PortfolioHub /></PrivateRoute>} />
      <Route path="/portfolio"     element={<PrivateRoute><PortfolioHub /></PrivateRoute>} />
      <Route path="/documents"     element={<PrivateRoute><Documents /></PrivateRoute>} />
      <Route path="/gallery"       element={<Navigate to="/documents" replace />} />
      <Route path="/roadmap"       element={<PrivateRoute><Roadmap /></PrivateRoute>} />
      <Route path="/todos"         element={<PrivateRoute><TodoManager /></PrivateRoute>} />
      <Route path="/settings"      element={<PrivateRoute><Settings /></PrivateRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
