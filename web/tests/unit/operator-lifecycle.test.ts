import { describe, expect, it } from "vitest";
import { accessLogoutUrl, validatedReturnTo } from "@/lib/ops/return-to";
import { activatedOpsNavigation, canAccessOpsPath } from "@/lib/ops/policy";
import { fetchEdgeVerifiedOpsContext, verifyTrustedOpsContext } from "@/lib/ops/context";
import { opsEnvironmentForHost, ungatedReleaseContextDto } from "@/lib/ops/dto";
import { maybeLocalDevOpsHeaders } from "@/lib/ops/local-dev-headers";
import { formatOpsRole, formatVerifiedTime } from "@/lib/ops/display";
import { createHmac } from "node:crypto";

describe("operator lifecycle", () => {
  it("redirect corpus accepts only canonical /ops destinations", () => {
    expect(validatedReturnTo("/ops/operators")).toBe("/ops/operators");
    for (const unsafe of ["https://evil.test", "//evil.test", "/%2f%2fevil.test", "/chat", "/ops?next=/chat", "/ops/%2e%2e/chat"]) expect(validatedReturnTo(unsafe)).toBe("/ops");
  });

  it("normalizes the confirmed Cloudflare team domain for logout", () => {
    const previous = process.env.CF_ACCESS_TEAM_DOMAIN;
    process.env.CF_ACCESS_TEAM_DOMAIN = "connect2nikhai.cloudflareaccess.com";
    expect(accessLogoutUrl("/ops")).toBe("https://connect2nikhai.cloudflareaccess.com/cdn-cgi/access/logout?returnTo=%2Fops");
    if (previous === undefined) delete process.env.CF_ACCESS_TEAM_DOMAIN;
    else process.env.CF_ACCESS_TEAM_DOMAIN = previous;
  });

  it("requires a signed unexpired edge context instead of headers or decoded JWT", () => {
    const payload = Buffer.from(JSON.stringify({ operatorId: 7, role: "admin", environment: "local", correlationId: "corr-12345678", exp: Date.now() + 30_000 })).toString("base64url");
    const proof = createHmac("sha256", "proof").update(payload).digest("base64url");
    expect(verifyTrustedOpsContext(payload, proof, "proof")?.role).toBe("admin");
    expect(verifyTrustedOpsContext(payload, "forged", "proof")).toBeNull();
  });

  it("derives the staging display environment without treating it as rollout authority", () => {
    expect(opsEnvironmentForHost("wtfmedia-web-staging.connect2nikhai.workers.dev")).toBe("staging");
    expect(ungatedReleaseContextDto("staging").role).toBe("public_link");
    expect(ungatedReleaseContextDto("staging").environment).toBe("staging");
  });

  it("asks the edge binding to verify Access for server-rendered pages", async () => {
    let forwarded: Request | null = null;
    const context = await fetchEdgeVerifiedOpsContext(
      new Headers({
        host: "wtfmedia-web-staging.connect2nikhai.workers.dev",
        "cf-access-jwt-assertion": "access-assertion",
        "x-request-id": "corr-context-1",
      }),
      async (request) => {
        forwarded = request;
        return Response.json({ operatorId: 7, role: "admin", environment: "staging", correlationId: "corr-context-1" });
      },
    );

    expect(context).toEqual({ operatorId: 7, role: "admin", environment: "staging", correlationId: "corr-context-1" });
    expect(forwarded).not.toBeNull();
    const request = forwarded as unknown as Request;
    expect(new URL(request.url).pathname).toBe("/ops/api/operator-context");
    expect(request.headers.get("cf-access-jwt-assertion")).toBe("access-assertion");
    expect(request.headers.get("x-request-id")).toBe("corr-context-1");
  });

  it("keeps editor navigation limited to the activated Control Room", () => {
    expect(activatedOpsNavigation("editor")).toEqual([
      { label: "Control Room", href: "/ops" },
      { label: "Production", href: "/ops/production" },
    ]);
    expect(canAccessOpsPath("editor", "/ops/audit")).toBe(false);
  });

  it("renders operator context in human-readable form without inventing organization", () => {
    expect(formatOpsRole("super_admin")).toBe("super admin");
    expect(formatOpsRole("editor")).toBe("editor");
    expect(formatVerifiedTime("not-a-date")).toBe("not observed");
  });

  it("signs a loopback development context that the origin verifier accepts", async () => {
    const local = await maybeLocalDevOpsHeaders({
      nodeEnv: "development",
      hostname: "localhost",
      secret: "proof",
      role: "admin",
    });
    expect(local).not.toBeNull();
    expect(verifyTrustedOpsContext(local!.payload, local!.proof, "proof")?.role).toBe("admin");
    expect(await maybeLocalDevOpsHeaders({
      nodeEnv: "production",
      hostname: "localhost",
      secret: "proof",
    })).toBeNull();
    expect(await maybeLocalDevOpsHeaders({
      nodeEnv: "development",
      hostname: "ops.example.test",
      secret: "proof",
    })).toBeNull();
  });
});
