import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Provider } from "react-redux";
import { store, persister } from "./App/store.ts";
import { PersistGate } from "redux-persist/integration/react";
import { registerSW } from "virtual:pwa-register";
import { HelmetProvider } from "react-helmet-async"; // 👈 Added for SEO

// ✅ Register PWA Service Worker
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log("New content available, refresh to update.");
  },
  onOfflineReady() {
    console.log("App is ready to work offline.");
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* 👇 Wrapped in HelmetProvider so pages can set titles/descriptions */}
    <HelmetProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persister}>
          <App />
        </PersistGate>
      </Provider>
    </HelmetProvider>
  </StrictMode>
);