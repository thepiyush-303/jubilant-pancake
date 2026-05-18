import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Mounts the React application into the HTML root element.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
