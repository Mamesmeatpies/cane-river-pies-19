import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App.tsx";
import "./index.css";

const devConvexUrl = "https://adjoining-iguana-615.convex.cloud";
const prodConvexUrl = "https://hidden-clam-282.convex.cloud";
const envConvexUrl = import.meta.env.VITE_CONVEX_URL;
const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// Guard production builds against a stale Vercel env var still pointing at the dev Convex deployment.
const convexUrl = !isLocalHost && (!envConvexUrl || envConvexUrl === devConvexUrl) ? prodConvexUrl : envConvexUrl;

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById("root")!).render(
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
);
