import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App as CapApp } from "@capacitor/app";

const AuthContext = createContext(null);

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "808201271108-8k5tljs3ocmui1vu3vok9sveevm09fov.apps.googleusercontent.com";

// Detect Electron runtime
const IS_ELECTRON = typeof window !== "undefined" && !!window.electronAPI?.isElectron;

// Detect Capacitor Mobile runtime (Android / iOS)
const IS_CAPACITOR = typeof window !== "undefined" && Capacitor.isNativePlatform();

// OAuth loopback server port (must match electron/main.js OAUTH_PORT)
const ELECTRON_OAUTH_PORT = 45678;

// ── Redirect URIs ─────────────────────────────────────────────────────────────
const MOBILE_REDIRECT_URI = "https://arthanareeshwaran-14.github.io/personal-hub/";

function getRedirectUri() {
  if (IS_ELECTRON) return `http://127.0.0.1:${ELECTRON_OAUTH_PORT}/callback`;
  if (IS_CAPACITOR) return MOBILE_REDIRECT_URI;
  const origin = window.location.origin;
  const isGHPages = window.location.pathname.includes("/personal-hub");
  return isGHPages ? `${origin}/personal-hub/` : origin;
}

function buildAuthUrl(redirectUri, type = "drive") {
  const scope = type === "basic"
    ? "openid profile email"
    : "openid profile email https://www.googleapis.com/auth/drive.file";

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: scope,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function fetchGoogleProfile(token) {
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error("Failed to fetch Google profile");
  return r.json();
}

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [authError, setAuthError]     = useState(null);

  // ── Persist / restore session ─────────────────────────────────────────────
  useEffect(() => {
    const storedUser  = localStorage.getItem("personalsite_user");
    const storedToken = localStorage.getItem("personalsite_token");

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);

        // Guest user session restore
        if (parsed.isGuest) {
          setUser(parsed);
          setAccessToken(null);
          setLoading(false);
          return;
        }

        // Google authenticated user session restore
        if (storedToken && !parsed.isDemo) {
          setUser(parsed);
          setAccessToken(storedToken);

          // Silently validate stored token with Google
          fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${storedToken}` },
          })
            .then((r) => {
              if (r.status === 401) {
                console.warn("[Auth] Stored Google token has expired.");
                setAuthError("Your Google session expired. Please sign in again.");
                performSignOut();
              }
            })
            .catch(() => {/* network errors — stay signed in */});
        } else {
          performSignOut();
        }
      } catch {
        performSignOut();
      }
    }
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Shared: process a token fragment string "access_token=...&..." ────────
  const handleTokenFragment = useCallback(async (fragment) => {
    const params = new URLSearchParams(fragment);
    const token  = params.get("access_token");
    const scope  = params.get("scope") || "";
    const isBasicScope = !scope.includes("drive");

    if (!token) {
      setAuthError("Authentication failed — no token received.");
      return;
    }

    setAccessToken(token);
    localStorage.setItem("personalsite_token", token);
    setAuthError(null);

    try {
      const data = await fetchGoogleProfile(token);
      const u = {
        name:        data.name  || data.email,
        displayName: data.name  || data.email?.split("@")[0],
        email:       data.email,
        picture:     data.picture || "",
        sub:         data.sub,
        isGuest:     false,
        isBasic:     isBasicScope,
        isDemo:      false,
      };

      // Clear stale cache if a DIFFERENT user is logging in
      const prevRaw = localStorage.getItem("personalsite_user");
      if (prevRaw) {
        try {
          const prev = JSON.parse(prevRaw);
          if (prev.sub && prev.sub !== data.sub) {
            console.log("[Auth] Different user detected — clearing cached app data.");
            Object.keys(localStorage)
              .filter(k =>
                k.startsWith("personalsite_file_") ||
                k.startsWith("personalsite_media_") ||
                k === "personalsite_root_folder" ||
                k === "personalsite_vault_files"
              )
              .forEach(k => localStorage.removeItem(k));
          }
        } catch (_) {}
      }

      setUser(u);
      localStorage.setItem("personalsite_user", JSON.stringify(u));
    } catch (err) {
      console.error("[Auth] Google profile fetch error:", err);
      setAuthError("Failed to load your Google profile. Please try signing in again.");
      performSignOut();
    }
  }, []);

  // ── Capacitor Deep Link Listener for Mobile APK ───────────────────────────
  useEffect(() => {
    if (!IS_CAPACITOR) return;

    let appUrlListener = null;

    const setupListener = async () => {
      appUrlListener = await CapApp.addListener("appUrlOpen", async (data) => {
        if (!data?.url) return;
        const urlStr = data.url;

        if (urlStr.includes("access_token")) {
          const fragment = urlStr.includes("#")
            ? urlStr.split("#")[1]
            : urlStr.split("?")[1];
          if (fragment) {
            try { await Browser.close(); } catch (_) {}
            handleTokenFragment(fragment);
          }
        }
      });
    };

    setupListener();

    return () => {
      if (appUrlListener && typeof appUrlListener.remove === "function") {
        appUrlListener.remove();
      }
    };
  }, [handleTokenFragment]);

  // ── Sign-in with Google (Drive scope or Basic scope) ───────────────────────
  const signIn = useCallback(async (type = "drive") => {
    if (!GOOGLE_CLIENT_ID) {
      alert("Google Client ID is not configured.");
      return;
    }
    setAuthError(null);

    const redirectUri = getRedirectUri();
    const authUrl     = buildAuthUrl(redirectUri, type);

    if (IS_ELECTRON) {
      try {
        const fragment = await window.electronAPI.openGoogleAuth(authUrl);
        if (!fragment) throw new Error("No token fragment returned");
        await handleTokenFragment(fragment);
      } catch (err) {
        if (err.message !== "cancelled") {
          console.error("[Auth] Electron OAuth error:", err);
          setAuthError("Sign-in failed. Please try again.");
        }
      }
    } else if (IS_CAPACITOR) {
      try {
        await Browser.open({
          url: authUrl,
          presentationStyle: "popover",
          toolbarColor: "#0b0c10",
        });
      } catch (err) {
        console.error("[Auth] Capacitor browser open error:", err);
        setAuthError("Could not open sign-in page. Please try again.");
      }
    } else {
      window.location.href = authUrl;
    }
  }, [handleTokenFragment]);

  // ── Guest Mode Sign-in (Instant Access) ───────────────────────────────────
  const signInAsGuest = useCallback(() => {
    setAuthError(null);
    const guestUser = {
      name: "Guest Explorer",
      displayName: "Guest",
      email: "guest@personalhub.local",
      picture: "",
      sub: "guest_" + Date.now(),
      isGuest: true,
      isBasic: false,
      isDemo: false,
    };
    setUser(guestUser);
    setAccessToken(null);
    localStorage.setItem("personalsite_user", JSON.stringify(guestUser));
    localStorage.removeItem("personalsite_token");
  }, []);

  // ── Handle token extracted from URL fragment (web redirect) ──────────────
  useEffect(() => {
    if (IS_ELECTRON || IS_CAPACITOR) return;
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;

    const rawFragment = hash.startsWith("#") ? hash.slice(1) : hash;
    const params = new URLSearchParams(rawFragment);
    const token  = params.get("access_token");

    // Clean hash from URL and set route to /#/dashboard
    window.location.hash = "#/dashboard";

    if (token) {
      handleTokenFragment(rawFragment);
    }
  }, [handleTokenFragment]);

  // ── Token expiry during API calls ─────────────────────────────────────────
  const handleTokenExpired = useCallback(() => {
    console.warn("[Auth] Token expired during API call.");
    setAuthError("Your Google session expired. Please sign in again.");
    performSignOut();
  }, []);

  // ── Sign-out ──────────────────────────────────────────────────────────────
  function performSignOut() {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem("personalsite_user");
    localStorage.removeItem("personalsite_token");
  }

  const signOut = useCallback(() => {
    performSignOut();
  }, []);

  const isGuest = useMemo(() => !!user?.isGuest, [user]);
  const isBasic = useMemo(() => !!user?.isBasic, [user]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      authError,
      isGuest,
      isBasic,
      signIn,
      signInAsGuest,
      signOut,
      handleTokenExpired,
      isElectron: IS_ELECTRON,
      isCapacitor: IS_CAPACITOR,
    }),
    [user, accessToken, loading, authError, isGuest, isBasic, signIn, signInAsGuest, signOut, handleTokenExpired]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
