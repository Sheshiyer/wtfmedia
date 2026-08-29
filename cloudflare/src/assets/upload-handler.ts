/**
 * Ephemeral HMAC-SHA256 Upload Coordinator & Streaming Direct Vault Handlers.
 * Implements signed 15-minute TTL upload tickets, streaming hash & size validation,
 * Zero Trust RBAC integration, and automated D1 source_asset provenance registration.
 *
 * Requirements: PROV-03, PROV-11, QUAL-05, QUAL-12
 */

import { appendAudit } from "../audit.ts";
import type { OperatorContext } from "../auth/operator-context.ts";
import { decide } from "../auth/policy.ts";
import { createSourceAsset, getEpisodeById } from "../db/provenance.ts";
import { protectedResponseHeaders, safeOpsError, sourceAssetDto, type AssetAuthority, type SourceAssetType } from "../dto.ts";
import type { OpsEnv } from "../ops-router.ts";
import { assetUlid } from "../utils/ulid.ts";
import {
  computeSha256,
  getAssetR2Key,
  getMaxAssetSizeBytes,
  isByteSizeAllowed,
  isValidMimeType,
} from "./storage-layout.ts";

/**
 * 15-minute default TTL in milliseconds.
 */
export const TICKET_TTL_MS = 15 * 60 * 1000;

export interface UploadTicketPayload {
  ticketId: string;
  episodeId: string;
  assetType: SourceAssetType;
  targetKey: string;
  expectedSha256: string;
  byteSize: number;
  mimeType: string;
  operatorId: number;
  expiresAt: number; // Unix timestamp ms
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replaceAll("-", "+").replaceAll("_", "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signHmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64UrlEncode(new Uint8Array(sig));
}

async function verifyHmac(secret: string, data: string, signatureB64Url: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = base64UrlDecode(signatureB64Url);
    return await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
  } catch {
    return false;
  }
}

/**
 * Creates and cryptographically signs an HMAC-SHA256 upload ticket with 15-minute TTL.
 */
export async function createUploadTicket(
  secret: string,
  data: Omit<UploadTicketPayload, "expiresAt">,
  options?: { ttlMs?: number }
): Promise<{ uploadTicket: string; ticket: UploadTicketPayload }> {
  if (!secret || typeof secret !== "string") {
    throw new Error("missing_edge_secret");
  }

  const ttl = options?.ttlMs ?? TICKET_TTL_MS;
  const expiresAt = Date.now() + ttl;

  const ticket: UploadTicketPayload = {
    ...data,
    expectedSha256: data.expectedSha256.toLowerCase(),
    expiresAt,
  };

  const payloadString = JSON.stringify(ticket);
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payloadString));
  const signatureB64 = await signHmac(secret, payloadB64);
  const uploadTicket = `${payloadB64}.${signatureB64}`;

  return { uploadTicket, ticket };
}

/**
 * Validates the HMAC-SHA256 signature and expiration of an upload ticket.
 */
export async function verifyUploadTicket(
  secret: string,
  token: string,
  now = Date.now()
): Promise<UploadTicketPayload> {
  if (!secret || typeof secret !== "string") {
    throw new Error("missing_edge_secret");
  }
  if (!token || typeof token !== "string") {
    throw new Error("invalid_upload_ticket");
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new Error("invalid_upload_ticket_format");
  }

  const [payloadB64, signatureB64] = parts;
  const isValid = await verifyHmac(secret, payloadB64, signatureB64);
  if (!isValid) {
    throw new Error("tampered_upload_ticket");
  }

  let payload: UploadTicketPayload;
  try {
    const jsonString = new TextDecoder().decode(base64UrlDecode(payloadB64));
    payload = JSON.parse(jsonString);
  } catch {
    throw new Error("malformed_upload_ticket_payload");
  }

  if (typeof payload.expiresAt !== "number" || payload.expiresAt < now) {
    throw new Error("expired_upload_ticket");
  }

  return payload;
}

function denied(status = 403, error = "unauthorized"): Response {
  return Response.json(safeOpsError(error as any), { status, headers: protectedResponseHeaders });
}

export interface UploadIntentInput {
  episodeId: string;
  assetType: SourceAssetType;
  byteSize: number;
  mimeType: string;
  expectedSha256: string;
  ext?: string;
}

/**
 * Handles POST /ops/api/assets/upload-intent.
 * Validates episode existence in D1, MIME type, byte size limit, and issues HMAC signed ticket.
 */
export async function handleAssetUploadIntent(
  request: Request,
  env: OpsEnv,
  context: OperatorContext
): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(safeOpsError("bad_request"), { status: 405, headers: protectedResponseHeaders });
  }

  if (!decide(context.role, "assets", "create")) {
    return denied(403, "unauthorized");
  }

  let body: UploadIntentInput;
  try {
    body = (await request.json()) as UploadIntentInput;
  } catch {
    return Response.json(safeOpsError("bad_request"), { status: 400, headers: protectedResponseHeaders });
  }

  const { episodeId, assetType, byteSize, mimeType, expectedSha256, ext } = body;

  if (!episodeId || typeof episodeId !== "string") {
    return Response.json({ error: "missing_episode_id" }, { status: 400, headers: protectedResponseHeaders });
  }
  if (!assetType || typeof assetType !== "string") {
    return Response.json({ error: "missing_asset_type" }, { status: 400, headers: protectedResponseHeaders });
  }
  if (!isValidMimeType(mimeType)) {
    return Response.json({ error: "unsupported_mime_type" }, { status: 400, headers: protectedResponseHeaders });
  }
  if (!isByteSizeAllowed(byteSize, assetType)) {
    return Response.json({ error: "byte_size_exceeded" }, { status: 400, headers: protectedResponseHeaders });
  }
  if (!expectedSha256 || !/^[a-fA-F0-9]{64}$/.test(expectedSha256)) {
    return Response.json({ error: "invalid_sha256" }, { status: 400, headers: protectedResponseHeaders });
  }

  // Verify episode exists in D1
  const episode = await getEpisodeById(env.DB, episodeId);
  if (!episode) {
    return Response.json({ error: "episode_not_found" }, { status: 404, headers: protectedResponseHeaders });
  }

  const secret = env.EDGE_SHARED_SECRET || env.OPS_ORIGIN_PROOF;
  if (!secret) {
    return Response.json({ error: "server_misconfigured_secret" }, { status: 500, headers: protectedResponseHeaders });
  }

  const targetKey = getAssetR2Key(episodeId, assetType, expectedSha256, ext);
  const assetId = assetUlid();

  const { uploadTicket, ticket } = await createUploadTicket(secret, {
    ticketId: assetId,
    episodeId,
    assetType,
    targetKey,
    expectedSha256,
    byteSize,
    mimeType,
    operatorId: context.operatorId,
  });

  // Privacy protection: do not leak raw R2 bucket names or filesystem paths in response
  return Response.json(
    {
      uploadTicket,
      assetId,
      expiresAt: ticket.expiresAt,
    },
    { status: 200, headers: protectedResponseHeaders }
  );
}

/**
 * Handles PUT (or POST) /ops/api/assets/upload-stream.
 * Accepts direct binary upload, verifies HMAC ticket, checks running SHA-256 and byte limit,
 * and stages binary into env.CATALOGUE.
 */
export async function handleAssetUploadStream(
  request: Request,
  env: OpsEnv,
  context?: OperatorContext
): Promise<Response> {
  if (request.method !== "PUT" && request.method !== "POST") {
    return Response.json(safeOpsError("bad_request"), { status: 405, headers: protectedResponseHeaders });
  }

  const secret = env.EDGE_SHARED_SECRET || env.OPS_ORIGIN_PROOF;
  if (!secret) {
    return Response.json({ error: "server_misconfigured_secret" }, { status: 500, headers: protectedResponseHeaders });
  }

  // Extract ticket from header or query param
  const url = new URL(request.url);
  const ticketHeader =
    request.headers.get("x-upload-ticket") ||
    request.headers.get("X-Upload-Ticket") ||
    request.headers.get("authorization")?.replace(/^Bearer /i, "") ||
    url.searchParams.get("ticket");

  if (!ticketHeader) {
    return Response.json({ error: "missing_upload_ticket" }, { status: 401, headers: protectedResponseHeaders });
  }

  let ticket: UploadTicketPayload;
  try {
    ticket = await verifyUploadTicket(secret, ticketHeader);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid_upload_ticket";
    return Response.json({ error: message }, { status: 401, headers: protectedResponseHeaders });
  }

  if (context && !decide(context.role, "assets", "upload")) {
    return denied(403, "unauthorized");
  }

  if (!request.body) {
    return Response.json({ error: "missing_upload_body" }, { status: 400, headers: protectedResponseHeaders });
  }

  // Stream bytes and compute running SHA-256 and size
  const maxLimit = getMaxAssetSizeBytes(ticket.assetType);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxLimit) {
          if (env.CATALOGUE?.delete) {
            await env.CATALOGUE.delete(ticket.targetKey).catch(() => {});
          }
          return Response.json(
            { error: "size_limit_exceeded", maxAllowed: maxLimit, received: totalBytes },
            { status: 400, headers: protectedResponseHeaders }
          );
        }
        chunks.push(value);
      }
    }
  } catch (err) {
    return Response.json({ error: "stream_read_error" }, { status: 400, headers: protectedResponseHeaders });
  }

  // Combine chunks
  const combinedBuffer = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combinedBuffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  // Check SHA-256
  const computedSha256 = await computeSha256(combinedBuffer);
  if (computedSha256.toLowerCase() !== ticket.expectedSha256.toLowerCase()) {
    if (env.CATALOGUE?.delete) {
      await env.CATALOGUE.delete(ticket.targetKey).catch(() => {});
    }
    return Response.json(
      {
        error: "hash_mismatch",
        expected: ticket.expectedSha256,
        computed: computedSha256,
      },
      { status: 400, headers: protectedResponseHeaders }
    );
  }

  // Store into R2 CATALOGUE
  if (env.CATALOGUE?.put) {
    await env.CATALOGUE.put(ticket.targetKey, combinedBuffer, {
      httpMetadata: { contentType: ticket.mimeType },
      customMetadata: {
        sha256: computedSha256,
        episodeId: ticket.episodeId,
        assetType: ticket.assetType,
      },
    });
  }

  return Response.json(
    {
      success: true,
      assetId: ticket.ticketId,
      byteSize: totalBytes,
      sha256: computedSha256,
    },
    { status: 200, headers: protectedResponseHeaders }
  );
}

export interface ConfirmUploadInput {
  uploadTicket: string;
  assetId?: string;
  durationSeconds?: number;
  authority?: AssetAuthority;
}

/**
 * Handles POST /ops/api/assets/confirm-upload.
 * Validates ticket, verifies object presence in R2, records source_assets in D1,
 * and logs asset_upload audit event.
 */
export async function handleAssetConfirmUpload(
  request: Request,
  env: OpsEnv,
  context: OperatorContext
): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(safeOpsError("bad_request"), { status: 405, headers: protectedResponseHeaders });
  }

  if (!decide(context.role, "assets", "confirm")) {
    return denied(403, "unauthorized");
  }

  let body: ConfirmUploadInput;
  try {
    body = (await request.json()) as ConfirmUploadInput;
  } catch {
    return Response.json(safeOpsError("bad_request"), { status: 400, headers: protectedResponseHeaders });
  }

  const { uploadTicket, assetId, durationSeconds, authority } = body;
  if (!uploadTicket || typeof uploadTicket !== "string") {
    return Response.json({ error: "missing_upload_ticket" }, { status: 400, headers: protectedResponseHeaders });
  }

  const secret = env.EDGE_SHARED_SECRET || env.OPS_ORIGIN_PROOF;
  if (!secret) {
    return Response.json({ error: "server_misconfigured_secret" }, { status: 500, headers: protectedResponseHeaders });
  }

  let ticket: UploadTicketPayload;
  try {
    ticket = await verifyUploadTicket(secret, uploadTicket);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid_upload_ticket";
    return Response.json({ error: message }, { status: 401, headers: protectedResponseHeaders });
  }

  // Verify object existence in R2
  let objectHead: { size?: number } | null = null;
  if (env.CATALOGUE?.head) {
    objectHead = await env.CATALOGUE.head(ticket.targetKey);
    if (!objectHead) {
      return Response.json(
        { error: "asset_not_found_in_storage" },
        { status: 400, headers: protectedResponseHeaders }
      );
    }
  }

  const finalAssetId = assetId || ticket.ticketId || assetUlid();
  const byteSize = objectHead?.size ?? ticket.byteSize;

  // Insert into D1 source_assets
  const assetRecord = await createSourceAsset(env.DB, {
    id: finalAssetId,
    episodeId: ticket.episodeId,
    assetType: ticket.assetType,
    storageDriver: "r2",
    storageKey: ticket.targetKey,
    contentSha256: ticket.expectedSha256,
    byteSize,
    durationSeconds: typeof durationSeconds === "number" ? durationSeconds : null,
    mimeType: ticket.mimeType,
    authority: authority ?? "owner_supplied",
    availability: "available",
  });

  // Write audit event to D1
  await appendAudit(env.DB, {
    action: "asset_upload",
    entityType: "source_asset",
    entityId: assetRecord.id,
    outcome: "succeeded",
    environment: context.environment,
    correlationId: context.correlationId,
    actorId: context.operatorId,
    role: context.role,
    metadata: {
      scope: "/ops/api/assets/confirm-upload",
      byteSize: assetRecord.byte_size ?? ticket.byteSize,
      mimeType: assetRecord.mime_type,
      assetType: assetRecord.asset_type,
      episodeId: assetRecord.episode_id,
    },
  });

  // Return clean, privacy-safe DTO without leaking bucket names or raw filesystem paths
  return Response.json(
    {
      asset: sourceAssetDto(assetRecord),
    },
    { status: 201, headers: protectedResponseHeaders }
  );
}
