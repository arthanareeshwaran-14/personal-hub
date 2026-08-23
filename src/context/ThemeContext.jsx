import { createContext, useContext, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check } from "lucide-react";

const THEMES = [
  {
    id: "sky",
    name: "Sky Blue",
    cardName: "Navy Sapphire",
    color: "#0ea5e9",
    darkColor: "#0284c7",
    lightColor: "#38bdf8",
    bgSecondary: "#f0f9ff",
    bgTertiary: "#e0f2fe",
    glassShadow: "0 10px 40px rgba(14, 165, 233, 0.09)",
    border: "rgba(14, 165, 233, 0.16)",
    cardBg: "linear-gradient(135deg, #0c1445 0%, #1a237e 50%, #0d47a1 100%)",
    cardBorder: "rgba(14, 165, 233, 0.35)",
    preview: "#0ea5e9",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
    badgeBg: "rgba(14, 165, 233, 0.1)",
    badgeText: "#0284c7"
  },
  {
    id: "emerald",
    name: "Light Green / Mint",
    cardName: "Emerald Forest",
    color: "#10b981",
    darkColor: "#059669",
    lightColor: "#34d399",
    bgSecondary: "#f0fdf4",
    bgTertiary: "#dcfce7",
    glassShadow: "0 10px 40px rgba(16, 185, 129, 0.09)",
    border: "rgba(16, 185, 129, 0.16)",
    cardBg: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
    cardBorder: "rgba(16, 185, 129, 0.35)",
    preview: "#10b981",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    badgeBg: "rgba(16, 185, 129, 0.1)",
    badgeText: "#059669"
  },
  {
    id: "rose",
    name: "Light Pink / Rose",
    cardName: "Rose Quartz",
    color: "#ec4899",
    darkColor: "#db2777",
    lightColor: "#f472b6",
    bgSecondary: "#fdf2f8",
    bgTertiary: "#fce7f3",
    glassShadow: "0 10px 40px rgba(236, 72, 153, 0.09)",
    border: "rgba(236, 72, 153, 0.16)",
    cardBg: "linear-gradient(135deg, #831843 0%, #9d174d 50%, #be185d 100%)",
    cardBorder: "rgba(236, 72, 153, 0.35)",
    preview: "#ec4899",
    gradient: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
    badgeBg: "rgba(236, 72, 153, 0.1)",
    badgeText: "#db2777"
  },
  {
    id: "purple",
    name: "Light Violet / Lavender",
    cardName: "Royal Amethyst",
    color: "#8b5cf6",
    darkColor: "#7c3aed",
    lightColor: "#a78bfa",
    bgSecondary: "#f5f3ff",
    bgTertiary: "#ede9fe",
    glassShadow: "0 10px 40px rgba(139, 92, 246, 0.09)",
    border: "rgba(139, 92, 246, 0.16)",
    cardBg: "linear-gradient(135deg, #3b0764 0%, #581c87 50%, #7e22ce 100%)",
    cardBorder: "rgba(139, 92, 246, 0.35)",
    preview: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    badgeBg: "rgba(139, 92, 246, 0.1)",
    badgeText: "#7c3aed"
  },
  {
    id: "amber",
    name: "Warm Amber / Peach",
    cardName: "Sunset Ember",
    color: "#f59e0b",
    darkColor: "#d97706",
    lightColor: "#fbbf24",
    bgSecondary: "#fffbeb",
    bgTertiary: "#fef3c7",
    glassShadow: "0 10px 40px rgba(245, 158, 11, 0.09)",
    border: "rgba(245, 158, 11, 0.16)",
    cardBg: "linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)",
    cardBorder: "rgba(245, 158, 11, 0.35)",
    preview: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    badgeBg: "rgba(245, 158, 11, 0.1)",
    badgeText: "#d97706"
  },
  {
    id: "slate",
    name: "Midnight Slate",
    cardName: "Midnight Obsidian",
    color: "#475569",
    darkColor: "#334155",
    lightColor: "#64748b",
    bgSecondary: "#f8fafc",
    bgTertiary: "#f1f5f9",
    glassShadow: "0 10px 40px rgba(71, 85, 105, 0.09)",
    border: "rgba(71, 85, 105, 0.16)",
    cardBg: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
    cardBorder: "rgba(71, 85, 105, 0.35)",
    preview: "#334155",
    gradient: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    badgeBg: "rgba(71, 85, 105, 0.1)",
    badgeText: "#334155"
  }
];

const ThemeContext = createContext();

// ── Ultra-Smooth, Fine & Lightweight Theme Morph Transition Overlay ───────────
function ThemeMorphOverlay({ transitionState }) {
  if (!transitionState || !transitionState.active) return null;

  const { id, theme, origin, particles } = transitionState;
  const { x, y } = origin;

  return (
    <div
      key={`overlay-${id}`}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 999999,
        overflow: "hidden"
      }}
    >
      {/* 1. Fine, Feather-Soft Luminous Light Bloom (No harsh edges) */}
      <motion.div
        key={`bloom-${id}`}
        initial={{
          left: x,
          top: y,
          width: 0,
          height: 0,
          opacity: 0.7,
          scale: 0.2,
          borderRadius: "50%"
        }}
        animate={{
          left: x - 450,
          top: y - 450,
          width: 900,
          height: 900,
          opacity: 0,
          scale: 1.15
        }}
        transition={{
          duration: 0.75,
          ease: [0.16, 1, 0.3, 1]
        }}
        style={{
          position: "absolute",
          background: `radial-gradient(circle, ${theme.color}25 0%, ${theme.lightColor}0d 45%, transparent 70%)`,
          pointerEvents: "none",
          filter: "blur(18px)"
        }}
      />

      {/* 2. Delicate Shimmer Ripple Wave */}
      <motion.div
        key={`wave-${id}`}
        initial={{
          left: x,
          top: y,
          width: 0,
          height: 0,
          opacity: 0.55,
          borderRadius: "50%"
        }}
        animate={{
          left: x - 320,
          top: y - 320,
          width: 640,
          height: 640,
          opacity: 0
        }}
        transition={{
          duration: 0.85,
          delay: 0.04,
          ease: [0.2, 0.8, 0.4, 1]
        }}
        style={{
          position: "absolute",
          border: `1px solid ${theme.color}40`,
          boxShadow: `0 0 20px ${theme.color}20`,
          pointerEvents: "none"
        }}
      />

      {/* 3. Subtle, Fine Stardust Micro-Sparks */}
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const targetX = x + Math.cos(rad) * p.distance;
        const targetY = y + Math.sin(rad) * p.distance;

        return (
          <motion.div
            key={`p-${id}-${p.id}`}
            initial={{
              left: x,
              top: y,
              scale: 0,
              opacity: 0.9
            }}
            animate={{
              left: targetX,
              top: targetY,
              scale: [0, 1.2, 0.3, 0],
              opacity: [0.9, 0.8, 0.4, 0]
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.25, 0.1, 0.25, 1]
            }}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              boxShadow: `0 0 6px ${p.color}`,
              pointerEvents: "none"
            }}
          />
        );
      })}

      {/* 4. Top-Center Floating Notification Capsule (Strictly "Theme Morph" only) */}
      <div
        style={{
          position: "fixed",
          top: 20,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000000,
          pointerEvents: "none"
        }}
      >
        <motion.div
          key={`pill-${id}`}
          initial={{ opacity: 0, y: -24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 450,
            damping: 28
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 20px",
            borderRadius: 24,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: `1px solid ${theme.color}55`,
            boxShadow: `0 10px 30px rgba(0,0,0,0.22), 0 0 16px ${theme.color}30`,
            color: "white",
            pointerEvents: "none"
          }}
        >
          {/* Pulsing Theme Jewel Dot */}
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: theme.color,
              boxShadow: `0 0 8px ${theme.color}`,
              position: "relative",
              flexShrink: 0
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              style={{
                position: "absolute",
                inset: -2,
                borderRadius: "50%",
                border: `1.5px solid ${theme.color}`
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.85rem",
              fontWeight: 800,
              letterSpacing: "0.2px",
              color: "#f8fafc"
            }}
          >
            <Sparkles size={14} color={theme.lightColor} />
            <span>Theme Morph</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function ThemeProvider({ children }) {
  const [themeIndex, setThemeIndex] = useState(() => {
    const saved = localStorage.getItem("myhub_theme_idx");
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const [transitionState, setTransitionState] = useState({
    id: 0,
    active: false,
    theme: THEMES[0],
    origin: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    particles: []
  });

  const timeoutRef = useRef(null);

  const activeTheme = THEMES[themeIndex] || THEMES[0];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", activeTheme.color);
    root.style.setProperty("--primary-dark", activeTheme.darkColor);
    root.style.setProperty("--primary-light", activeTheme.lightColor);
    root.style.setProperty("--accent", activeTheme.darkColor);
    root.style.setProperty("--accent-light", activeTheme.lightColor);
    root.style.setProperty("--bg-secondary", activeTheme.bgSecondary);
    root.style.setProperty("--bg-tertiary", activeTheme.bgTertiary);
    root.style.setProperty("--glass-shadow", activeTheme.glassShadow);
    root.style.setProperty("--border", activeTheme.border);
    root.style.setProperty("--theme-gradient", activeTheme.gradient);
    root.style.setProperty("--badge-bg", activeTheme.badgeBg);
    root.style.setProperty("--badge-text", activeTheme.badgeText);
  }, [activeTheme]);

  const selectTheme = (idx, event) => {
    const nextTheme = THEMES[idx] || THEMES[0];
    setThemeIndex(idx);
    localStorage.setItem("myhub_theme_idx", idx.toString());

    // Calculate click coordinates
    let originX = window.innerWidth / 2;
    let originY = window.innerHeight / 2;

    if (event) {
      if (event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;
      } else if (event.clientX && event.clientY) {
        originX = event.clientX;
        originY = event.clientY;
      }
    }

    // Generate 12 delicate particles (fine, soft, subtle)
    const particles = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      angle: (i * 360) / 12 + (Math.random() * 16 - 8),
      distance: 60 + Math.random() * 85,
      size: 3 + Math.random() * 3,
      duration: 0.55 + Math.random() * 0.25,
      delay: Math.random() * 0.05,
      color: i % 2 === 0 ? nextTheme.lightColor : "#ffffff"
    }));

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const newId = Date.now() + Math.random();

    setTransitionState({
      id: newId,
      active: true,
      theme: nextTheme,
      origin: { x: originX, y: originY },
      particles
    });

    timeoutRef.current = setTimeout(() => {
      setTransitionState(prev => (prev.id === newId ? { ...prev, active: false } : prev));
    }, 1100);
  };

  return (
    <ThemeContext.Provider value={{ themeIndex, activeTheme, selectTheme, themes: THEMES }}>
      <AnimatePresence mode="wait">
        {transitionState.active && (
          <ThemeMorphOverlay key={transitionState.id} transitionState={transitionState} />
        )}
      </AnimatePresence>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
