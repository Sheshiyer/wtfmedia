import type { ResearchFigure } from "../../lib/research-figures";
import type { ResearchSource } from "../../lib/research";

// Synthetic examples only. No reference-document or saved-report content.
export const figureSource: ResearchSource = {
  id: "src_diagram", title: "Illustrative payment process", url: "https://example.org/process", retrievedAt: "2026-10-29",
  platform: "web", evidenceType: "page_extract",
  excerpt: "The customer submits a request to the merchant. The merchant routes payment through the payment network. The payment network requests authorization from the issuing bank. This example illustrates authorization only; settlement is outside its scope.",
};
export const processFigure: ResearchFigure = {
  version: 2, kind: "flow", title: "How a payment request reaches the bank",
  takeaway: "The network connects the merchant to the bank that authorizes the request.",
  caveat: "Illustrative example. Authorization only; settlement is outside this diagram.",
  evidence: [{ sourceId: figureSource.id, quote: figureSource.excerpt }],
  items: [
    ["customer", "Customer", "Submits a request to the merchant."],
    ["merchant", "Merchant", "Routes payment through the network."],
    ["network", "Payment network", "Requests authorization from the bank."],
    ["bank", "Issuing bank", "Receives the authorization request."],
  ].map(([id, label, detail]) => ({ id, label, detail, evidence: [0], group: "", value: null, displayValue: "", date: "", cells: [] })),
  edges: [
    { from: "customer", to: "merchant", label: "submits request", evidence: [0] },
    { from: "merchant", to: "network", label: "routes payment", evidence: [0] },
    { from: "network", to: "bank", label: "requests authorization", evidence: [0] },
  ], columns: [], metric: { unit: "", period: "", geography: "", definition: "" },
};
