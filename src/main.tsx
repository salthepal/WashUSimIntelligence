import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import App from "./app/App";
import "./styles/index.css";

const THEME_STORAGE_KEY = "washu-em-sim-theme";
const LEGACY_QUERY_CACHE_STORAGE_KEY = "REACT_QUERY_OFFLINE_CACHE";

function getCookieTheme() {
  const match = document.cookie.match(/(?:^|;\s*)washu-em-sim-theme=(dark|light)(?:;|$)/);
  return match?.[1] ?? null;
}

try {
  window.localStorage.removeItem(LEGACY_QUERY_CACHE_STORAGE_KEY);
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  const legacyDarkMode = window.localStorage.getItem("darkMode");
  const cookieTheme = getCookieTheme();

  if (!savedTheme && legacyDarkMode === "true") {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.toggle("dark", (savedTheme ?? cookieTheme) === "dark");
  }
} catch {
  document.documentElement.classList.toggle("dark", getCookieTheme() === "dark");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <HashRouter>
      <App />
    </HashRouter>
  </QueryClientProvider>
);
