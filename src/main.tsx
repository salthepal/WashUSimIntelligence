import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { HashRouter } from "react-router-dom";
import App from "./app/App";
import "./styles/index.css";

const THEME_STORAGE_KEY = "washu-em-sim-theme";

function getCookieTheme() {
  const match = document.cookie.match(/(?:^|;\s*)washu-em-sim-theme=(dark|light)(?:;|$)/);
  return match?.[1] ?? null;
}

try {
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

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

createRoot(document.getElementById("root")!).render(
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister }}
  >
    <HashRouter>
      <App />
    </HashRouter>
  </PersistQueryClientProvider>
);
