import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDrive } from "../context/DriveContext";
import {
  LayoutDashboard, CheckSquare, Folder, User, LogOut,
  FileText, Layers, Menu, X, Settings,
  Music, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar() {
  const { signOut, user } = useAuth();
  const drive = useDrive();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [userCard, setUserCard] = useState(null);

  // Load usercard to get custom avatar / display name / username / music
  useEffect(() => {
    drive.readFile("usercard.json").then(data => {
      if (data) setUserCard(data);
    });
  }, [drive]);

  const avatarSrc =
    localStorage.getItem("personalsite_media_avatar") ||
    userCard?.avatarUrl ||
    user?.picture ||
    "";

  const displayName = userCard?.displayName || user?.name || user?.displayName || "";
  const username = userCard?.username || "";
  const musicUrl =
    localStorage.getItem("personalsite_media_music") ||
    userCard?.musicUrl ||
    "";
  const musicTitle = localStorage.getItem("personalsite_media_music_title") || userCard?.musicTitle || "";

  const nav = [
    { name: "Dashboard",        path: "/dashboard",     icon: LayoutDashboard },
    { name: "Personal Info",    path: "/profile",       icon: User },
    { name: "Portfolio Studio", path: "/portfolio-hub", icon: Layers },
    { name: "Drive Vault",      path: "/documents",     icon: Folder },
    { name: "Roadmap",        path: "/roadmap",       icon: FileText },
    { name: "Todos",          path: "/todos",         icon: CheckSquare },
    { name: "Settings",       path: "/settings",      icon: Settings },
  ];

  const handleSignOut = (e) => {
    if (e) e.stopPropagation();
    signOut();
    navigate("/");
  };

  const handleNavigateProfile = () => {
    navigate("/profile");
    setExpanded(false);
  };

  return (
    <>
      {/* ── Collapsed Rail ─────────────────────────────────────────── */}
      <aside
        style={{
          width: 64, minHeight: "100vh",
          position: "fixed", left: 0, top: 0, zIndex: 100,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          alignItems: "center",
          paddingTop: 16, paddingBottom: 20, gap: 6,
          boxShadow: "4px 0 20px var(--glass-shadow)",
          transition: "border-color 0.4s ease",
        }}
      >
        <button
          onClick={() => setExpanded(true)}
          className="hover-target"
          style={{
            width: 42, height: 42, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg-secondary)", border: "1px solid var(--border)",
            cursor: "pointer", marginBottom: 8, color: "var(--primary)",
            transition: "all 0.25s ease",
          }}
          title="Open Menu Drawer"
        >
          <Menu size={20} />
        </button>

        {nav.map(n => (
          <NavLink
            key={n.path}
            to={n.path}
            title={n.name}
            className={({ isActive }) => `hover-target ${isActive ? "active" : ""}`}
            style={({ isActive }) => ({
              width: 42, height: 42, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none",
              background: isActive ? "var(--badge-bg)" : "transparent",
              color: isActive ? "var(--primary-dark)" : "var(--text-secondary)",
              border: isActive ? "1px solid var(--border)" : "1px solid transparent",
              transition: "all 0.25s ease",
            })}
          >
            <n.icon size={20} />
          </NavLink>
        ))}

        {/* Mini avatar & profile button at bottom rail */}
        <button
          onClick={handleNavigateProfile}
          title="Personal Info & Profile"
          className="hover-target"
          style={{
            width: 40, height: 40, borderRadius: "50%", border: "2px solid var(--primary)",
            padding: 0, cursor: "pointer", overflow: "hidden", marginTop: "auto",
            background: "var(--theme-gradient)", flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {avatarSrc
            ? <img src={avatarSrc} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ color: "white", fontWeight: 900, fontSize: "0.9rem" }}>{(displayName || "U")[0].toUpperCase()}</span>
          }
        </button>

        <button
          onClick={handleSignOut}
          title="Sign Out"
          className="hover-target"
          style={{
            width: 42, height: 42, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", cursor: "pointer",
            color: "#ef4444", marginTop: 4,
          }}
        >
          <LogOut size={20} />
        </button>
      </aside>

      {/* ── Expanded Drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setExpanded(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 110,
                background: "rgba(15,23,42,0.3)", backdropFilter: "blur(4px)",
              }}
            />

            <motion.aside
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              style={{
                position: "fixed", left: 0, top: 0, bottom: 0,
                width: 295, zIndex: 120,
                background: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, var(--bg-secondary) 100%)",
                backdropFilter: "blur(24px)",
                boxShadow: "8px 0 40px var(--glass-shadow)",
                borderRight: "1px solid var(--border)",
                display: "flex", flexDirection: "column",
                padding: "22px 18px",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div style={{
                  fontFamily: "var(--font-display)", fontSize: "1.55rem", fontWeight: 900,
                  background: "var(--theme-gradient)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                  My Hub
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="hover-target"
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    border: "1px solid var(--border)", cursor: "pointer",
                    background: "rgba(255,255,255,0.9)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text-secondary)",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Nav Links */}
              <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
                {nav.map(n => (
                  <NavLink
                    key={n.path}
                    to={n.path}
                    onClick={() => setExpanded(false)}
                    className={({ isActive }) => `hover-target ${isActive ? "active" : ""}`}
                    style={({ isActive }) => ({
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 16px", borderRadius: 12,
                      textDecoration: "none", fontWeight: 600, fontSize: "0.94rem",
                      color: isActive ? "var(--primary-dark)" : "var(--text-secondary)",
                      background: isActive ? "var(--badge-bg)" : "transparent",
                      border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                      boxShadow: isActive ? "0 2px 8px var(--border)" : "none",
                      transition: "all 0.25s ease",
                    })}
                  >
                    <n.icon size={20} />
                    <span>{n.name}</span>
                  </NavLink>
                ))}
              </nav>

              {/* ── Merged User Profile & Sign Out Bottom Card ───────────────── */}
              {user && (
                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 12,
                  }}
                >
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 16,
                      background: "var(--bg-secondary)",
                      border: "1.5px solid var(--border)",
                      position: "relative", overflow: "hidden",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                    }}
                  >
                    {/* Banner mini-preview strip in card background */}
                    {(localStorage.getItem("personalsite_media_banner") || userCard?.bannerUrl) && (
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: 22,
                        background: `url(${localStorage.getItem("personalsite_media_banner") || userCard?.bannerUrl}) center/cover no-repeat`,
                        opacity: 0.35,
                        pointerEvents: "none",
                      }} />
                    )}

                    {/* Left: User Info clickable area (navigates to /profile) */}
                    <div
                      onClick={handleNavigateProfile}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        flex: 1, minWidth: 0, cursor: "pointer",
                        position: "relative", zIndex: 1,
                      }}
                      title="Click to view & edit Profile"
                    >
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        {avatarSrc
                          ? <img src={avatarSrc} alt="avatar" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }} />
                          : <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--theme-gradient)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: "0.95rem" }}>
                              {(displayName || "U")[0].toUpperCase()}
                            </div>
                        }
                      </div>

                      <div style={{ overflow: "hidden", flex: 1 }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {displayName || user?.name}
                        </div>
                        {username ? (
                          <div style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: 700, fontFamily: "monospace" }}>
                            @{username}
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {user?.email}
                          </div>
                        )}
                        {musicUrl && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                            <Music size={10} color="var(--primary)" />
                            <span style={{ fontSize: "0.65rem", color: "var(--primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{musicTitle || "Music"}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Sign Out Action Button inside the same merged card */}
                    <motion.button
                      whileHover={{ scale: 1.1, backgroundColor: "rgba(239,68,68,0.15)" }}
                      whileTap={{ scale: 0.92 }}
                      onClick={handleSignOut}
                      title="Sign Out"
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        border: "1px solid rgba(239,68,68,0.25)",
                        background: "rgba(239,68,68,0.08)",
                        color: "#ef4444", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, position: "relative", zIndex: 2,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <LogOut size={16} />
                    </motion.button>
                  </motion.div>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
