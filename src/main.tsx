import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App.tsx";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "https://adjoining-iguana-615.convex.cloud";

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById("root")!).render(
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
);
