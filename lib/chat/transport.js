import {
  createHash,
  createHmac,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
const ephemeralSecret = randomBytes(32).toString("hex");
const maxAge = 2 * 60 * 60 * 1000;
const key = () =>
  process.env.STATE_SIGNING_SECRET ||
  createHash("sha256")
    .update("aw-state-v3:" + (process.env.ANTHROPIC_API_KEY || ephemeralSecret))
    .digest("hex");
const sign = (payload) =>
  createHmac("sha256", key()).update(payload).digest("base64url").slice(0, 32);
export function decodeState(token) {
  try {
    if (typeof token !== "string" || token.length > 3700) return null;
    const m = token.match(/^s3\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{32})$/);
    if (!m) return null;
    const a = Buffer.from(sign(m[1])),
      b = Buffer.from(m[2]);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const s = JSON.parse(
      inflateRawSync(Buffer.from(m[1], "base64url"), {
        maxOutputLength: 60000,
      }).toString(),
    );
    return s.iat && Date.now() - s.iat <= maxAge && s.iat <= Date.now() + 300000
      ? s
      : null;
  } catch {
    return null;
  }
}
export function readConversationState(req) {
  if (Object.hasOwn(req.body || {}, "stateToken"))
    return req.body.stateToken ? decodeState(req.body.stateToken) : null;
  const token = String(req.headers?.cookie || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("aw_state="))
    ?.slice(9);
  return decodeState(token);
}
export function attachState(res, state) {
  for (const count of [16, 10, 8, 6, 4]) {
    const compact = structuredClone(state);
    compact.iat = Date.now();
    compact.resultCards = (compact.resultCards || []).slice(0, count);
    const ids = new Set(compact.resultCards.map((c) => c.id));
    compact.viewIds = (compact.viewIds || []).filter((id) => ids.has(id));
    const payload = deflateRawSync(
      Buffer.from(JSON.stringify(compact)),
    ).toString("base64url");
    const token = "s3." + payload + "." + sign(payload);
    if (token.length <= 3600) {
      res.setHeader(
        "Set-Cookie",
        "aw_state=" +
          token +
          "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800",
      );
      return token;
    }
  }
  res.setHeader(
    "Set-Cookie",
    "aw_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
  );
  return null;
}
const limits = new Map();
export function requestStatus(req) {
  if (req.method === "OPTIONS") return 204;
  if (req.method !== "POST") return 405;
  const ip =
    req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  let l = limits.get(ip);
  if (!l || Date.now() - l.at > 60000) {
    l = { at: Date.now(), count: 0 };
    limits.set(ip, l);
  }
  l.count++;
  if (l.count > 20) return 429;
  return 200;
}
export function sanitiseMessages(messages) {
  if (!Array.isArray(messages)) return null;
  const safe = messages
    .filter(
      (m) =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string" &&
        m.content.trim(),
    )
    .slice(-24)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  return safe.length && safe.at(-1).role === "user" ? safe : null;
}
export function cors(req, res) {
  const origin = String(req.headers?.origin || "");
  const approved = [
    "https://www.askwakefield.co.uk",
    "https://askwakefield.co.uk",
    ...String(process.env.ALLOWED_ORIGINS || "").split(","),
  ];
  if (approved.includes(origin))
    res.setHeader("Access-Control-Allow-Origin", origin);
  else if (!origin)
    res.setHeader(
      "Access-Control-Allow-Origin",
      "https://www.askwakefield.co.uk",
    );
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
