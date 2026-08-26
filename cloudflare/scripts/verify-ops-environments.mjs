import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schemaPath = resolve(import.meta.dirname, "../config/ops-environments.schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const environments = ["local", "staging", "production"];
const fields = ["d1_binding", "access_application_ref", "access_audience_ref", "origin_proof_secret_ref", "cache_namespace_ref"];
const values = new Set();

for (const environment of environments) {
  const properties = schema.properties?.[environment]?.properties;
  if (!properties) throw new Error(`missing ${environment} environment contract`);
  for (const field of fields) {
    const value = properties[field]?.const;
    if (typeof value !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(value)) {
      throw new Error(`${environment}.${field} must be a symbolic binding reference`);
    }
    if (values.has(value)) throw new Error(`environment resources must be distinct: ${value}`);
    values.add(value);
  }
  if (properties.protected_backend?.const !== true) throw new Error(`${environment} must explicitly bind its protected backend`);
}

if (schema.properties?.preview?.properties?.protected_backend?.const !== false) {
  throw new Error("preview must not receive a protected backend by default");
}

const source = JSON.stringify(schema);
if (/\b\d{8,}\b|https?:\/\/|(?:token|secret|key)\s*[:=]\s*["'][^"']+/i.test(source)) {
  throw new Error("environment contract may contain an identifier, hostname, or secret value");
}

console.log("Protected environment contract: 3 distinct symbolic environments; preview unbound");
