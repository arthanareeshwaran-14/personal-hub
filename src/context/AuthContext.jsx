import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const AuthContext = createContext(null);

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "808201271108-8k5tljs3ocmui1vu3vok9sveevm09fov.apps.googleusercontent.com";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // On mount: restore session from localStorage and validate
  useEffect(() => {
    const storedUser = localStorage.getItem("personalsite_user");
    const storedToken = localStorage.getItem("personalsite_token");

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser.isDemo) {
          setUser(parsedUser);
          setAccessToken(storedToken);

          // Background validation check with Google
          fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${storedToken}` },
          })
            .then((r) => {
              if (r.status === 401) {
                console.warn("[Auth] Stored Google token has expired.");
                setAuthError("Google session expired. Please sign in again.");
                signOut();
              }
            })
            .catch(() => {});
        } else {
          signOut();
        }
      } catch {
        signOut();
      }
    }
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect user to Google OAuth 2.0 endpoint
  const signIn = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      alert("Google Client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID in your .env file.");
      return;
    }
    setAuthError(null);
    const redirectUri = window.location.origin + (window.location.pathname.includes("/personal-hub") ? "/personal-hub/" : "/");
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri.endsWith("/") ? redirectUri.slice(0, -1) : redirectUri,
      response_type: "token",
      scope: [
        "openid",
        "profile",
        "email",
        "https://www.googleapis.com/auth/drive",
      ].join(" "),
      include_granted_scopes: "true",
      prompt: "consent select_account",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }, []);

  // Handle OAuth callback (token in URL hash)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.slice(1));
    const token = params.get("access_token");
    if (!token) return;

    // Clean hash from URL immediately
    window.history.replaceState({}, document.title, window.location.pathname);

    setAccessToken(token);
    localStorage.setItem("personalsite_token", token);
    setAuthError(null);

    fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Userinfo failed");
        return r.json();
      })
      .then((data) => {
        const u = {
          name: data.name || data.email,
          displayName: data.name || data.email?.split("@")[0],
          email: data.email,
          picture: data.picture || "",
          sub: data.sub,
          isDemo: false,
        };
        setUser(u);
        localStorage.setItem("personalsite_user", JSON.stringify(u));
      })
      .catch((err) => {
        console.error("Google userinfo error:", err);
        setAuthError("Failed to fetch Google profile. Please try signing in again.");
        signOut();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTokenExpired = useCallback(() => {
    console.warn("[Auth] Token expired during API call.");
    setAuthError("Google session expired. Please sign in again.");
    signOut();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem("personalsite_user");
    localStorage.removeItem("personalsite_token");
  }, []);

  const value = useMemo(() => ({
    user,
    accessToken,
    loading,
    authError,
    signIn,
    signOut,
    handleTokenExpired,
  }), [user, accessToken, loading, authError, signIn, signOut, handleTokenExpired]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
