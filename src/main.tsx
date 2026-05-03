import { createRoot } from "react-dom/client";
import App from "./App-debug.tsx";
import "./index.css";

console.log("main.tsx loading...");

try {
  const rootElement = document.getElementById("root");
  console.log("Root element:", rootElement);

  if (!rootElement) {
    throw new Error("Root element not found");
  }

  const root = createRoot(rootElement);
  console.log("React root created");

  root.render(<App />);
  console.log("App rendered");
} catch (error) {
  console.error("Error in main.tsx:", error);

  // Fallback rendering
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial; background: #fee; color: #d00;">
      <h1>🚨 Critical Error</h1>
      <p>Failed to initialize React application.</p>
      <pre>${String(error)}</pre>
    </div>
  `;
}
