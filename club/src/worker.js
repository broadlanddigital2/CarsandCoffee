// Cars and Coffee Club Worker (club.carsandcoffee.uk)
// - /api/upload   POST a photo (signed-in, approved members only) → stored in R2, recorded in public.media_objects
// - /api/media    DELETE ?key=… → removes your own photo
// - /media/<key>  serves photos from R2, cached at the edge
// Everything else is the single-page app in ./public.
const SB_URL = "https://mslidnchoopgsnbraaxe.supabase.co";
const SB_KEY = "sb_publishable_O9p-X8To8z-GisYYSBKoxg_RxAe1-cU"; // publishable key; every call also carries the member's own sign-in token
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_FILES_PER_MEMBER = 500;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/media/")) return serveMedia(request, env, ctx, url);
    if (url.pathname === "/api/upload" && request.method === "POST") return upload(request, env);
    if (url.pathname === "/api/media" && request.method === "DELETE") return removeMedia(request, env, url);
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  },
};

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function who(request) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const user = await r.json();
  const p = await fetch(`${SB_URL}/rest/v1/profiles?select=status,role&id=eq.${user.id}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } });
  const [profile] = p.ok ? await p.json() : [];
  return { id: user.id, token, profile };
}
const rest = (path, token, init = {}) => fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) } });

async function upload(request, env) {
  const me = await who(request);
  if (!me) return json({ error: "Please sign in again." }, 401);
  if (me.profile?.status !== "approved") return json({ error: "Only approved members can upload photos." }, 403);
  const type = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (!TYPES[type]) return json({ error: "Please upload a JPG, PNG, WebP or AVIF photo." }, 415);
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > MAX_BYTES) return json({ error: "That photo is over 8 MB." }, 413);
  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ error: "The file was empty." }, 400);
  if (body.byteLength > MAX_BYTES) return json({ error: "That photo is over 8 MB." }, 413);
  if (!looksLikeImage(new Uint8Array(body.slice(0, 16)), type)) return json({ error: "That file doesn't look like a photo." }, 415);
  const count = await rest(`media_objects?select=key&owner_id=eq.${me.id}`, me.token, { method: "HEAD", headers: { Prefer: "count=exact" } });
  const total = Number((count.headers.get("Content-Range") || "*/0").split("/")[1] || 0);
  if (total >= MAX_FILES_PER_MEMBER) return json({ error: "You've reached the photo limit. Remove some old photos first." }, 429);
  const key = `u/${me.id}/${crypto.randomUUID()}.${TYPES[type]}`;
  await env.MEDIA.put(key, body, { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { owner: me.id } });
  const rec = await rest("media_objects", me.token, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ key, owner_id: me.id, bytes: body.byteLength, content_type: type }) });
  if (!rec.ok) { await env.MEDIA.delete(key); return json({ error: "We couldn't save that photo. Please try again." }, 500); }
  return json({ key, url: `/media/${key}` });
}

function looksLikeImage(b, type) {
  if (type === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8;
  if (type === "image/png") return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (type === "image/webp") return b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45;
  if (type === "image/avif") return b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;
  return false;
}

async function removeMedia(request, env, url) {
  const me = await who(request);
  if (!me) return json({ error: "Please sign in again." }, 401);
  const key = url.searchParams.get("key") || "";
  const mod = me.profile?.status === "approved" && ["admin", "moderator"].includes(me.profile?.role);
  if (!/^u\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.test(key) || (!key.startsWith(`u/${me.id}/`) && !mod)) return json({ error: "Not allowed." }, 403);
  await env.MEDIA.delete(key);
  await caches.default.delete(new Request(`${url.origin}/media/${key}`));
  await rest(`media_objects?key=eq.${encodeURIComponent(key)}`, me.token, { method: "DELETE" });
  return json({ ok: true });
}

async function serveMedia(request, env, ctx, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const key = decodeURIComponent(url.pathname.slice("/media/".length));
  if (!/^u\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.test(key)) return new Response("Not found", { status: 404 });
  const cache = caches.default;
  const cacheKey = new Request(url.origin + url.pathname);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("ETag", obj.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  const res = new Response(obj.body, { headers });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
