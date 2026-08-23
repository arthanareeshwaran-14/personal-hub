import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useDrive } from "../context/DriveContext";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { CheckSquare, Map, Folder, UserCheck, Layers, ArrowRight, Palette, Settings, Cloud, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user } = useAuth();
  const { activeTheme } = useTheme();
  const { isReady, error: driveError } = useDrive();
  const navigate = useNavigate();

  const cards = [
    { icon: Layers, label: "Portfolio Studio", desc: "Customizable sections, editor & live preview", path: "/portfolio-hub", color: "var(--primary)", badge: "Studio" },
    { icon: UserCheck, label: "Personal Info", desc: "Unique handle, music, banner & digital ID", path: "/profile", color: "#6366f1", badge: "Profile" },
    { icon: Folder, label: "Drive Vault", desc: "Cloud files, pictures, videos, audio & docs", path: "/documents", color: "#10b981", badge: "Storage" },
    { icon: Map, label: "Future Roadmap", desc: "Milestones, progress tracker & vision goals", path: "/roadmap", color: "#8b5cf6", badge: "Planning" },
    { icon: CheckSquare, label: "Todo Manager", desc: "Daily task prioritization & tracking", path: "/todos", color: "#f59e0b", badge: "Productivity" },
    { icon: Settings, label: "Settings & Cloud", desc: "Themes, palette swatches & Drive backups", path: "/settings", color: "#ec4899", badge: "Config" },
  ];

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const name = user?.displayName || user?.name || "Friend";

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main className="main-content" style={{ marginLeft: 64 }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", width: "100%" }}>
          
          {/* Header */}
          <motion.div 
            className="dashboard-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ marginBottom: 36, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}
          >
            <div>
              <h1 style={{ fontSize: "2.3rem", fontWeight: 900, letterSpacing: "-0.5px", margin: 0 }}>
                {getGreeting()}, <span style={{ color: "var(--primary-dark)" }}>{name.split(" ")[0]}</span>
              </h1>
              <p style={{ color: "var(--text-secondary)", marginTop: 8, fontSize: "1rem" }}>
                Welcome back to your unified personal command center.
              </p>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 14, background: "var(--badge-bg)", color: "var(--primary-dark)", fontSize: "0.86rem", fontWeight: 700, border: "1px solid var(--border)", transition: "all 0.3s ease" }}>
                <Palette size={15} /> {activeTheme.name}
              </div>
              {driveError ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 14, background: "rgba(239,68,68,0.08)", color: "#dc2626", fontSize: "0.86rem", fontWeight: 700 }}>
                  <AlertCircle size={15} /> Drive Error
                </div>
              ) : isReady ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 14, background: "rgba(16,185,129,0.08)", color: "#065f46", fontSize: "0.86rem", fontWeight: 700 }}>
                  <Cloud size={15} /> Drive Ready
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 14, background: "var(--bg-secondary)", color: "var(--text-muted)", fontSize: "0.86rem", fontWeight: 700 }}>
                  <Cloud size={15} /> Connecting Drive...
                </div>
              )}
            </div>
          </motion.div>

          {/* Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22 }}>
            {cards.map((c, i) => (
              <motion.div
                key={c.label}
                className="glass hover-target"
                style={{
                  padding: 26, cursor: "pointer", display: "flex", flexDirection: "column",
                  justifyContent: "space-between", borderRadius: 20, minHeight: 160,
                  position: "relative", overflow: "hidden", border: "1.5px solid var(--border)",
                  transition: "all 0.3s ease"
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                whileHover={{ y: -4, boxShadow: "0 16px 36px var(--glass-shadow)" }}
                onClick={() => navigate(c.path)}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: "var(--badge-bg)", color: "var(--primary-dark)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1px solid var(--border)", transition: "all 0.3s ease"
                    }}>
                      <c.icon size={24} />
                    </div>
                    <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 20, background: "var(--bg-secondary)", color: "var(--text-muted)", fontWeight: 700, border: "1px solid var(--border)" }}>
                      {c.badge}
                    </span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 6, color: "var(--text-primary)" }}>{c.label}</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: 0, lineHeight: 1.5 }}>{c.desc}</p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 18, color: "var(--primary-dark)", fontSize: "0.82rem", fontWeight: 800 }}>
                  Open {c.label} <ArrowRight size={14} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
