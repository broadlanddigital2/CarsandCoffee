// Number plate lookup: POST /api/vehicle { reg } -> { reg, make, colour, year, engine_cc, fuel, mot_status, mot_expiry, tax_status, tax_due }
// Uses the DVLA Vehicle Enquiry Service. The API key is the Worker secret DVLA_API_KEY (set in the Cloudflare dashboard).
// Plates are never stored or logged; results are cached for a day so repeat lookups don't use DVLA quota.
// Called from carsandcoffee.uk, club.carsandcoffee.uk and admin.carsandcoffee.uk (CORS limited to those).
const ORIGINS = ["https://carsandcoffee.uk", "https://club.carsandcoffee.uk", "https://admin.carsandcoffee.uk"];
const cors = (request) => {
  const o = request.headers.get("Origin") || "";
  return ORIGINS.includes(o) ? { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" } : {};
};
const out = (request, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(request) } });
const title = (s) => String(s || "").toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bBmw\b/g, "BMW").replace(/\bMg\b/g, "MG").replace(/\bTvr\b/g, "TVR").replace(/\bDs\b/g, "DS").replace(/\bVw\b/g, "VW");

async function limited(request, max) {
  const ip = request.headers.get("CF-Connecting-IP") || "x";
  const k = new Request(`https://rate.local/veh/${ip}/${Math.floor(Date.now() / 60000)}`);
  const c = caches.default; const hit = await c.match(k); const n = hit ? +(await hit.text()) : 0;
  if (n >= max) return true;
  await c.put(k, new Response(String(n + 1), { headers: { "Cache-Control": "max-age=70" } }));
  return false;
}
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("cac-veh:" + s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }

export async function vehicleLookup(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (request.method !== "POST") return out(request, { error: "Method not allowed" }, 405);
  if (!env.DVLA_API_KEY) return out(request, { error: "Number plate lookup isn't switched on yet. Please type the details in.", unavailable: true }, 503);
  let b; try { b = await request.json(); } catch { return out(request, { error: "Bad request" }, 400); }
  const reg = String(b.reg || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (reg.length < 2 || reg.length > 8) return out(request, { error: "Please enter a valid UK number plate." }, 400);
  if (await limited(request, 10)) return out(request, { error: "Please wait a minute before looking up another plate." }, 429);
  const key = new Request(`https://veh.local/${await sha(reg)}`), cache = caches.default;
  const hit = await cache.match(key); if (hit) return out(request, await hit.json());
  let r;
  try {
    r = await fetch("https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles", { method: "POST", headers: { "x-api-key": env.DVLA_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ registrationNumber: reg }) });
  } catch { return out(request, { error: "We couldn't reach the DVLA just now. Please type the details in." }, 502); }
  if (r.status === 404) return out(request, { error: "We couldn't find that number plate. Check it, or type the details in." }, 404);
  if (!r.ok) return out(request, { error: "The number plate lookup isn't working right now. Please type the details in." }, 502);
  const v = await r.json();
  const data = { reg: v.registrationNumber || reg, make: title(v.make), colour: title(v.colour), year: v.yearOfManufacture || null, first_registered: v.monthOfFirstRegistration || null,
    engine_cc: v.engineCapacity || null, fuel: title(v.fuelType), mot_status: v.motStatus || null, mot_expiry: v.motExpiryDate || null, tax_status: v.taxStatus || null, tax_due: v.taxDueDate || null };
  await cache.put(key, new Response(JSON.stringify(data), { headers: { "Cache-Control": "max-age=86400" } }));
  return out(request, data);
}
