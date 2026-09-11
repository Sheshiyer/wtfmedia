import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Service = { binding?: string; service?: string };
type WorkerConfig = {
  name?: string;
  routes?: Array<{ pattern?: string; custom_domain?: boolean }>;
  services?: Service[];
  env?: Record<string, WorkerConfig>;
  vars?: Record<string, string>;
  vectorize?: Array<{ binding?: string; index_name?: string }>;
  kv_namespaces?: Array<{ binding?: string; id?: string }>;
  r2_buckets?: Array<{ binding?: string; bucket_name?: string }>;
  d1_databases?: Array<{ binding?: string; database_name?: string; database_id?: string }>;
  queues?: {
    producers?: Array<{ binding?: string; queue?: string }>;
    consumers?: Array<{ queue?: string; dead_letter_queue?: string }>;
  };
};

function config(path: string): WorkerConfig {
  const jsonc = readFileSync(new URL(path, import.meta.url), "utf8");
  return JSON.parse(jsonc.replace(/^\s*\/\/.*$/gmu, "")) as WorkerConfig;
}

function serviceFor(config: WorkerConfig, binding: string) {
  return config.services?.find((entry) => entry.binding === binding)?.service;
}

const web = config("../../wrangler.jsonc");
const edge = config("../../../cloudflare/wrangler.jsonc");
const memberRouter = readFileSync(new URL("../../../cloudflare/src/member-router.ts", import.meta.url), "utf8");

describe("staging web-to-edge binding contract", () => {
  it("keeps the production web worker bound only to the production edge worker", () => {
    expect(web.name).toBe("wtfmedia-web");
    expect(serviceFor(web, "WTFMEDIA_EDGE")).toBe("wtfmedia-edge");
    expect(serviceFor(web, "WORKER_SELF_REFERENCE")).toBe("wtfmedia-web");
  });

  it("binds the staging web worker to the staging edge worker rather than production", () => {
    const staging = web.env?.staging;

    expect(staging?.name).toBe("wtfmedia-web-staging");
    expect(serviceFor(staging ?? {}, "WTFMEDIA_EDGE")).toBe("wtfmedia-edge-staging");
    expect(serviceFor(staging ?? {}, "WTFMEDIA_EDGE")).not.toBe(serviceFor(web, "WTFMEDIA_EDGE"));
    expect(serviceFor(staging ?? {}, "WORKER_SELF_REFERENCE")).toBe("wtfmedia-web-staging");
    expect(staging?.routes).toEqual([
      { pattern: "beta-staging.wtfhq.in", custom_domain: true },
    ]);
  });

  it("keeps Beta identity in staging D1 and reuses Alpha chat without a second corpus", () => {
    const staging = edge.env?.staging;
    const stagingOrigin = "https://beta-staging.wtfhq.in";

    expect(edge.name).toBe("wtfmedia-edge");
    expect(staging?.name).toBe("wtfmedia-edge-staging");
    expect(serviceFor(staging ?? {}, "WTFMEDIA_ALPHA_WEB")).toBe("wtfmedia-web");
    expect(staging?.d1_databases?.[0]).toMatchObject({ binding: "DB", database_name: "wtfmedia-ops-staging" });
    expect(staging?.d1_databases?.[0]?.database_id).not.toBe(edge.d1_databases?.[0]?.database_id);
    expect(staging?.vectorize).toBeUndefined();
    expect(staging?.r2_buckets).toBeUndefined();
    expect(staging?.kv_namespaces).toBeUndefined();
    expect(staging?.queues).toBeUndefined();
    expect(staging?.vars).toMatchObject({
      ALLOWED_ORIGIN: stagingOrigin,
      DEPLOYMENT_ENVIRONMENT: "staging",
      SERVICE_NAME: "wtfmedia-edge-staging",
      OPS_HOSTNAME: "beta-staging.wtfhq.in",
      OPS_ORIGIN: stagingOrigin,
      OPS_ENVIRONMENT: "staging",
      CLERK_AUTHORIZED_PARTIES: stagingOrigin,
    });
    expect(JSON.stringify(staging)).not.toContain("wtfmedia-web-staging.connect2nikhai.workers.dev");
    expect(JSON.stringify(staging)).not.toContain("beta.wtfhq.in");
    expect(JSON.stringify(staging)).not.toContain("wtfmedia-catalogue-v1");
    expect(JSON.stringify(staging)).not.toContain("wtfmedia-catalogue\"");
    expect(JSON.stringify(staging)).not.toContain("wtfmedia-ops\"");
    expect(JSON.stringify(staging)).not.toContain("wtfmedia-ingest\"");
    expect(JSON.stringify(staging)).not.toContain("wtfmedia-ingest-staging");
  });

  it("fails closed for Beta member routes when the edge environment is production", () => {
    expect(memberRouter).toContain('env.OPS_ENVIRONMENT === "production"');
    expect(memberRouter).toContain("return denied()");
  });
});
