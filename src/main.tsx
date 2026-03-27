import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handlers for uncaught errors
window.addEventListener("error", (event) => {
  console.error("[Global Error]", event.error?.message || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[Unhandled Promise Rejection]", event.reason);
  // Prevent noisy browser default for handled-ish rejections
  if (event.reason?.message?.includes?.("AbortError")) {
    event.preventDefault();
  }
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><p>Failed to initialize app. Please refresh the page.</p></div>';
} else {
  createRoot(rootEl).render(<App />);
}
