import { createRoot } from "react-dom/client";
import { ResearchWorkspace } from "@/components/domain/beta/ResearchWorkspace";
import "@/app/globals.css";
createRoot(document.getElementById("root")!).render(<main className="mx-auto max-w-7xl p-4"><ResearchWorkspace /></main>);
