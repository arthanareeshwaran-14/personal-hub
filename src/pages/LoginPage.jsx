import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogIn, Shield, HardDrive, Lock, FolderSync, Layers } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { user, signIn, authError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const features = [
    {
      icon: Shield,
      title: "Secure Google OAuth",
      desc: "Your identity is verified directly by Google — no passwords stored here.",
    },
    {
      icon: HardDrive,
      title: "Personal Google Drive Storage",
      desc: "All your data lives in your own Google Drive inside a PersonalSite_Data folder.",
    },
    {
      icon: FolderSync,
      title: "Auto-Organized Vault",
      desc: "Uploads are automatically sorted into Pictures, Videos, Documents, Audio & Others.",
    },
    {
      icon: Lock,
      title: "Private by Default",
      desc: "Only your account can access your portfolio, vault, todos, and roadmap.",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "linear-gradient(135deg, #ffffff 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1000, display: "flex", gap: 56, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>

        {/* Left: Branding */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ flex: 1, minWidth: 300 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "var(--theme-gradient)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px var(--border)"
              }}
            >
              <Layers size={26} color="white" />
            </div>
            <span
              style={{
                fontSize: "1.55rem",
                fontWeight: 900,
                background: "var(--theme-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              Personal Hub
            </span>
          </div>

          <h1
            style={{
              fontSize: "2.8rem",
              fontWeight: 900,
              letterSpacing: "-1px",
              lineHeight: 1.15,
              marginBottom: 16,
              color: "var(--text-primary)"
            }}
          >
            Your private<br />
            <span
              style={{
                background: "var(--theme-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              command center
            </span>
          </h1>

          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.65, marginBottom: 36, maxWidth: 420 }}>
            A personal workspace for your portfolio, cloud vault, todos, and future roadmap — backed entirely by your own Google Drive.
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                style={{ display: "flex", alignItems: "flex-start", gap: 14 }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: "var(--badge-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary-dark)",
                    flexShrink: 0,
                    marginTop: 1
                  }}
                >
                  <f.icon size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text-primary)", marginBottom: 2 }}>
                    {f.title}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {f.desc}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right: Sign-in Card */}
        <motion.div
          className="glass"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          style={{
            padding: "44px 40px",
            width: "100%",
            maxWidth: 400,
            textAlign: "center",
            borderRadius: 24,
            border: "1.5px solid var(--border)",
            boxShadow: "0 20px 60px var(--glass-shadow)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: 14 }}>🔐</div>
          <h2
            style={{
              fontSize: "1.6rem",
              fontWeight: 900,
              marginBottom: 8,
              letterSpacing: "-0.5px",
              color: "var(--text-primary)"
            }}
          >
            Sign in to access
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 26, fontSize: "0.9rem", lineHeight: 1.6 }}>
            Use your Google account to securely sign in and get started. Your data stays in your own Drive.
          </p>

          {authError && (
            <div
              style={{
                marginBottom: 20,
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#b91c1c",
                fontSize: "0.84rem",
                fontWeight: 700,
                textAlign: "left",
                lineHeight: 1.4
              }}
            >
              ⚠️ {authError}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 10px 28px var(--border)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => signIn("drive")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "15px",
              fontSize: "1.02rem",
              fontWeight: 800,
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
              color: "white",
              boxShadow: "0 4px 16px var(--border)",
              transition: "all 0.3s ease",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="rgba(255,255,255,0.9)" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="rgba(255,255,255,0.9)" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="rgba(255,255,255,0.9)" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="rgba(255,255,255,0.9)" />
            </svg>
            Continue with Google (Cloud Sync)
          </motion.button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => signIn("basic")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "13px",
              fontSize: "0.92rem",
              fontWeight: 700,
              borderRadius: 14,
              border: "1.5px solid var(--border)",
              cursor: "pointer",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              boxShadow: "0 2px 8px var(--border)",
              transition: "all 0.2s ease",
            }}
          >
            🎓 Sign in with College / Work Account
          </motion.button>

          <div
            style={{
              marginTop: 20,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)"
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
              💡 <strong>College/Work emails (e.g. @kongu.edu):</strong> Use the <em>College / Work Account</em> option to sign in without organization Drive policy restrictions.
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
