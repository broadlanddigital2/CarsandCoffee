// Email marketing pages on the main site: /unsubscribe/<token> (with RFC 8058 one-click POST) and /r/<token>?u=… tracked links.
import { shell } from "./pages.js";
import { E } from "./home.js";

const SB_URL = "https://mslidnchoopgsnbraaxe.supabase.co";
const SB_KEY = "sb_publishable_O9p-X8To8z-GisYYSBKoxg_RxAe1-cU";
const rpc = (fn, body) => fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Profile": "site", "Content-Type": "application/json" }, body: JSON.stringify(body) });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function unsubscribePage(request, url) {
  const token = url.pathname.split("/")[2] || "";
  if (!UUID.test(token)) return new Response("Not found", { status: 404 });
  // one-click unsubscribe from mail apps (List-Unsubscribe-Post), or the button below
  if (request.method === "POST") {
    const r = await rpc("email_unsubscribe", { p_token: token }).then((x) => x.json()).catch(() => ({}));
    if (!(request.headers.get("Accept") || "").includes("text/html")) return new Response(null, { status: 200 });
    return page(r && r.ok ? `<h1 class="page-h1">You're unsubscribed</h1><p class="lp-lead">We won't send marketing emails to ${E(r.email || "that address")} again. Sorry to see you go.</p><p><a class="btn ghost" href="/">Back to Cars and Coffee UK</a></p>` : notFound());
  }
  return page(`<h1 class="page-h1">Unsubscribe</h1><p class="lp-lead">Stop marketing emails from Cars and Coffee UK to this address?</p>
    <form method="post"><button class="btn red" type="submit">Yes, unsubscribe me</button></form>
    <p class="ct-small" style="margin-top:18px">Order confirmations and replies to messages you send us aren't affected.</p>`);
}
const notFound = () => `<h1 class="page-h1">Link not recognised</h1><p class="lp-lead">This unsubscribe link has expired or isn't valid. Reply to any of our emails and we'll take you off our list.</p>`;
const page = (inner) => new Response(shell({ title: "Unsubscribe | Cars and Coffee UK", description: "Manage emails from Cars and Coffee UK.", path: "/unsubscribe", noindex: true, ld: [], main: `<section class="lp-sec std-head"><div class="wrap std-narrow">${inner}</div></section>` }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

export async function trackedRedirect(url, ctx) {
  const token = url.pathname.split("/")[2] || "", to = url.searchParams.get("u") || "";
  let dest = "https://carsandcoffee.uk/";
  try { const u = new URL(to); if (/^(carsandcoffee\.uk|club\.carsandcoffee\.uk|admin\.carsandcoffee\.uk)$/.test(u.hostname) && u.protocol === "https:") dest = u.href; } catch {}
  if (UUID.test(token)) ctx.waitUntil(rpc("email_click", { p_token: token }).catch(() => {}));
  return Response.redirect(dest, 302);
}
