import { useState, useEffect } from "react";
import { useDrive } from "../context/DriveContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  HardDrive, MousePointer2, Shield,
  Bell, Database, User, LogOut, Save, Check, Sun,
  RefreshCw, CheckCircle2, Info,
  Sparkles, Globe, Lock, Palette
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function Toggle({ value, onChange, label, description }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-primary)" }}>{label}</div>
        {description && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 3 }}>{description}</div>}
      </div>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => onChange(!value)}
        style={{
          width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
          background: value ? "var(--primary)" : "var(--border)",
          position: "relative", flexShrink: 0, transition: "background 0.3s ease"
        }}
      >
        <motion.div
          animate={{ x: value ? 24 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{ width: 20, height: 20, borderRadius: "50%", background: "white", position: "absolute", top: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
        />
      </motion.button>
    </div>
  );
}

function SettingsSection({ title, icon: Icon, delay = 0, children }) {
  return (
    <motion.div
      className="glass"
      style={{ padding: 28 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 800, margin: "0 0 20px 0" }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: "var(--badge-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} color="var(--primary)" />
        </div>
        {title}
      </h2>
      {children}
    </motion.div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)",
  borderRadius: 10, fontSize: "0.9rem", background: "rgba(255,255,255,0.95)",
  boxSizing: "border-box", fontFamily: "inherit", outline: "none",
  transition: "border-color 0.3s ease"
};

export default function Settings() {
  const { user, signOut } = useAuth();
  const { themeIndex, activeTheme, selectTheme, themes } = useTheme();
  const drive = useDrive();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [folderName, setFolderName] = useState("PersonalSite_Data");
  const [prefs, setPrefs] = useState({
    studioCustomCursor: false,
    showSensitiveIds: false,
    publicPortfolioVisible: true,
    notifyMilestones: true,
    notifyTodos: true,
    notifySync: false,
    autoSync: true,
    compactSidebar: false,
  });

  useEffect(() => {
    drive.readFile("settings.json").then(res => {
      if (res) setPrefs(p => ({ ...p, ...res.prefs }));
      if (res?.folderName) setFolderName(res.folderName);
      if (res?.lastSync) setLastSync(new Date(res.lastSync));
    });
    setFolderName(drive.rootFolderName || "PersonalSite_Data");
  }, [drive]);

  const setPref = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = { prefs, folderName, lastSync: new Date().toISOString() };
      await drive.saveFile("settings.json", payload);
      setMessage("Settings saved successfully!");
      setLastSync(new Date());
      setTimeout(() => setMessage(""), 3500);
    } catch {
      setMessage("Saved locally.");
      setTimeout(() => setMessage(""), 3500);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await drive.initDrive();
      setLastSync(new Date());
      setMessage("Sync complete!");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("Sync failed. Check Drive permissions.");
      setTimeout(() => setMessage(""), 3500);
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate("/");
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main className="main-content">
        <div style={{ maxWidth: 960, margin: "0 auto", width: "100%" }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.5px", margin: 0 }}>Settings & Configuration</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: "0.95rem" }}>
              Personalize your Hub, themes, and cloud storage preferences.
            </p>
          </motion.div>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                style={{
                  padding: "12px 18px", borderRadius: 12, marginBottom: 24,
                  background: message.includes("failed") ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                  border: message.includes("failed") ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(16,185,129,0.3)",
                  color: message.includes("failed") ? "#dc2626" : "#059669",
                  fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 8
                }}
              >
                <CheckCircle2 size={18} /> {message}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* ── Theme Selection Section ──────────────────────────────── */}
            <SettingsSection title="Appearance & Themes" icon={Palette} delay={0}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-primary)", marginBottom: 4 }}>
                  Color Theme (8 curated styles)
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 16 }}>
                  Applies instantly across all pages and persists in your account.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {themes.map((t, idx) => {
                    const isSelected = themeIndex === idx;
                    return (
                      <motion.div
                        key={t.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectTheme(idx)}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 14,
                          border: isSelected ? "2px solid " + t.primary : "1.5px solid var(--border)",
                          background: isSelected ? "var(--bg-secondary)" : "var(--glass-bg)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          transition: "all 0.2s ease",
                          boxShadow: isSelected ? "0 4px 14px var(--border)" : "none"
                        }}
                      >
                        {/* Swatch circle */}
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${t.primary} 0%, ${t.primaryDark} 100%)`,
                            flexShrink: 0,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white"
                          }}
                        >
                          {isSelected && <Check size={16} strokeWidth={3} />}
                        </div>
                        <div style={{ overflow: "hidden" }}>
                          <div style={{ fontWeight: 700, fontSize: "0.86rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {t.name}
                          </div>
                          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
                            {t.bgStyle} mode
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <Toggle
                value={prefs.compactSidebar}
                onChange={v => setPref("compactSidebar", v)}
                label="Compact Sidebar"
                description="Use a slimmer sidebar (icon rail only) — drawer still opens on click"
              />
            </SettingsSection>

            <SettingsSection title="Google Drive Configuration" icon={HardDrive} delay={0.05}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Root Folder Name in Google Drive
                </label>
                <input value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="PersonalSite_Data" style={inputStyle} />
                <div style={{ marginTop: 6, fontSize: "0.76rem", color: "var(--text-muted)" }}>
                  All your hub data is stored inside this Google Drive folder.
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["Pictures", "Videos", "Documents", "Audio", "Others"].map(f => (
                  <div key={f} style={{ padding: "8px 14px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <HardDrive size={13} color="var(--primary)" /> {folderName}/{f}
                  </div>
                ))}
              </div>
            </SettingsSection>

            <SettingsSection title="Cursor Settings" icon={MousePointer2} delay={0.1}>
              <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)", marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Info size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: "0.83rem", color: "#1d4ed8", lineHeight: 1.6 }}>
                  <strong>Published Portfolio:</strong> The custom cursor (ring + dot + trail) is <strong>always ON</strong> on your published/public portfolio. It's a key part of the visitor experience and cannot be disabled here.<br /><br />
                  <strong>Portfolio Studio (this app):</strong> Optionally enable the cursor below while building your portfolio.
                </div>
              </div>
              <Toggle
                value={prefs.studioCustomCursor}
                onChange={v => setPref("studioCustomCursor", v)}
                label="Enable Custom Cursor in Portfolio Studio"
                description="Show the animated ring cursor while editing your portfolio (off by default to avoid distraction)"
              />
            </SettingsSection>

            <SettingsSection title="Privacy & Security" icon={Shield} delay={0.15}>
              <Toggle
                value={prefs.showSensitiveIds}
                onChange={v => setPref("showSensitiveIds", v)}
                label="Show Full Government ID Numbers"
                description="Aadhaar and other IDs are masked by default. Enable to show full numbers on screen."
              />
              <Toggle
                value={prefs.publicPortfolioVisible}
                onChange={v => setPref("publicPortfolioVisible", v)}
                label="Public Portfolio Visible"
                description="Allow anyone with your portfolio link to view it"
              />
              <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)", marginTop: 4 }}>
                <div style={{ padding: "12px 16px", borderRadius: 12, background: prefs.publicPortfolioVisible ? "#d1fae5" : "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center", fontSize: "0.84rem", fontWeight: 600 }}>
                  {prefs.publicPortfolioVisible
                    ? <><Globe size={15} color="#059669" /> Public — anyone can view your portfolio</>
                    : <><Lock size={15} color="var(--text-muted)" /> Private — hidden from public</>}
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Notification Preferences" icon={Bell} delay={0.2}>
              <Toggle value={prefs.notifyMilestones} onChange={v => setPref("notifyMilestones", v)} label="Roadmap Milestone Reminders" description="Get reminded when a roadmap milestone deadline is approaching" />
              <Toggle value={prefs.notifyTodos} onChange={v => setPref("notifyTodos", v)} label="Todo Due Date Alerts" description="Alerts when a task is due today or overdue" />
              <Toggle value={prefs.notifySync} onChange={v => setPref("notifySync", v)} label="Drive Sync Notifications" description="Show a notification after each successful Drive sync" />
            </SettingsSection>

            <SettingsSection title="Data & Sync" icon={Database} delay={0.25}>
              <Toggle value={prefs.autoSync} onChange={v => setPref("autoSync", v)} label="Auto-Sync on Changes" description="Automatically sync data to Google Drive when you make changes" />
              <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Manual Sync</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {lastSync ? `Last synced: ${lastSync.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : "Never synced"}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={handleSync} disabled={syncing}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                    borderRadius: 10, border: "1.5px solid var(--border)", cursor: "pointer",
                    background: "var(--bg-secondary)", fontWeight: 700, fontSize: "0.86rem", color: "var(--primary)"
                  }}
                >
                  <RefreshCw size={15} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
                  {syncing ? "Syncing..." : "Sync Now"}
                </motion.button>
              </div>
              <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>Stored in Drive</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["profile.json", "roadmap.json", "todos.json", "gallery.json", "portfolio.json", "settings.json"].map(f => (
                    <span key={f} style={{ padding: "4px 10px", borderRadius: 8, background: "var(--badge-bg)", fontSize: "0.76rem", fontWeight: 600, color: "var(--primary-dark)" }}>{f}</span>
                  ))}
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Account Information" icon={User} delay={0.3}>
              {user && (
                <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "16px 20px", borderRadius: 16, background: "var(--bg-secondary)", border: "1.5px solid var(--border)", marginBottom: 20 }}>
                  {user.picture
                    ? <img src={user.picture} alt="avatar" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary)" }} />
                    : <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--theme-gradient)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "1.4rem" }}>{(user.name || "U")[0]}</div>
                  }
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{user.name || user.displayName}</div>
                    <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginTop: 3 }}>{user.email}</div>
                    {user.isGuest && (
                      <span style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "rgba(245,158,11,0.15)", color: "#d97706", fontSize: "0.72rem", fontWeight: 700 }}>
                        <Lock size={11} /> Guest Mode (Local Storage)
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.84rem", fontWeight: 600 }}>Auth Provider</span>
                  <span style={{ fontSize: "0.84rem", color: user?.isGuest ? "#d97706" : "var(--primary)", fontWeight: 700 }}>
                    {user?.isGuest ? "Local Guest Session" : "Google OAuth 2.0"}
                  </span>
                </div>
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.84rem", fontWeight: 600 }}>Cloud Drive Sync</span>
                  <span style={{ fontSize: "0.84rem", color: user?.isGuest ? "#dc2626" : "#059669", fontWeight: 700 }}>
                    {user?.isGuest ? "Locked (Sign-in required)" : "Active"}
                  </span>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleSignOut}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "13px 20px",
                  borderRadius: 12, border: "1.5px solid rgba(239,68,68,0.3)", cursor: "pointer",
                  background: "rgba(239,68,68,0.05)", color: "#dc2626", fontWeight: 700,
                  fontSize: "0.9rem", width: "100%", justifyContent: "center"
                }}
              >
                <LogOut size={18} /> Sign Out of My Hub
              </motion.button>
            </SettingsSection>

          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ textAlign: "center", padding: "32px 0 20px" }}>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
              onClick={handleSave} disabled={saving}
              style={{
                padding: "16px 56px", borderRadius: 16, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                color: "white", fontSize: "1.05rem", fontWeight: 900,
                boxShadow: "0 6px 24px var(--border)",
                display: "inline-flex", alignItems: "center", gap: 10
              }}
            >
              {saving ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <Save size={20} />}
              {saving ? "Saving..." : "Save All Settings"}
            </motion.button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
