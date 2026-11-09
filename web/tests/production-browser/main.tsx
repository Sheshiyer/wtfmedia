import { createRoot } from "react-dom/client";
import { ProductionWorkspaceView } from "@/components/domain/ops/ProductionWorkspaceView";
import "@/app/globals.css";

// Isolated browser fixture. No authentication or shared database calls.
createRoot(document.getElementById("root")!).render(<main style={{ padding: 16 }}><ProductionWorkspaceView fetcher={fetch} /></main>);
