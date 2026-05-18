import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { recoverFromChunkLoadError } from "./lib/routeLoader";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  recoverFromChunkLoadError();
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
