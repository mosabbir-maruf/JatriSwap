import { createHash } from "node:crypto";

import type { IncomingHttpHeaders } from "node:http";

import type { SanitizedContactPayload } from "../../../shared/contactValidation";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export type ContactRequestHeaders = IncomingHttpHeaders | Headers;

export function clientIpFromHeaders(headers: ContactRequestHeaders): string {
  let xf: string | string[] | undefined;
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    const v = headers.get("x-forwarded-for");
    xf = v ?? undefined;
  } else {
    xf = (headers as IncomingHttpHeaders)["x-forwarded-for"];
  }

  if (typeof xf === "string" && xf.length > 0) {
    const first = xf.split(",")[0]?.trim();
    if (first && first.length > 0) return first.slice(0, 128);
  }
  if (Array.isArray(xf) && xf.length > 0) {
    const first = xf[0]!.split(",")[0]?.trim();
    if (first && first.length > 0) return first.slice(0, 128);
  }
  return "unknown";
}

/** Rate-limit / dedupe identity (hashed; avoids storing raw IPs in document IDs). */
export function contactClientKeyFromIp(ip: string): string {
  return sha256Hex(`${ip}|anon`);
}

export function contactSubmissionContentHash(payload: SanitizedContactPayload): string {
  const canonical = JSON.stringify({
    email: payload.email,
    message: payload.message,
    name: payload.name,
    subject: payload.subject,
  });
  return sha256Hex(canonical);
}

export function contactSubmissionKey(contentHash: string, clientKey: string): string {
  return sha256Hex(`${contentHash}|${clientKey}`);
}
