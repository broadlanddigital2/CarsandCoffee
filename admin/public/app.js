// Cars and Coffee admin (admin.carsandcoffee.uk): website pages and SEO, Google Ads landing pages, homepage content, and club moderation.
// Plain ES modules, no build step. CoreUI provides the styling. Data: "Cars and Coffee Community" Supabase project.
import { analyse, slugify, labelType, LIMITS, MIN_WORDS, utmUrl, md } from "/seo.js";
import { richField, wireRich, cleanHTML } from "/editor.js";

const SUPABASE_URL = "https://auth.carsandcoffee.uk";
const SUPABASE_KEY = "sb_publishable_O9p-X8To8z-GisYYSBKoxg_RxAe1-cU"; // publishable key: safe in the browser
const SITE = "https://carsandcoffee.uk";
const MOCK = new URLSearchParams(location.search).get("mock");

async function loadSupabase() {
  for (const src of ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm", "https://esm.sh/@supabase/supabase-js@2.45.4", "https://unpkg.com/@supabase/supabase-js@2.45.4/dist/module/index.js?module"]) {
    for (let i = 0; i < 2; i++) { try { return await import(src); } catch { await new Promise((r) => setTimeout(r, 400)); } }
  }
  return null;
}
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const view = $("#view");
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (d, time = false) => d ? new Date(d).toLocaleString("en-GB", time ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" }) : "";
const ago = (d) => { if (!d) return ""; const m = Math.round((Date.now() - new Date(d)) / 6e4); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
function toast(msg, err = false) { const t = document.createElement("div"); t.className = "toast-msg" + (err ? " err" : ""); t.textContent = msg; $("#toast").append(t); setTimeout(() => t.remove(), err ? 6000 : 3000); }
const oops = (e) => toast(e?.message || String(e) || "Something went wrong", true);

let sb;
if (MOCK) sb = (await import("/mock.js")).createMock(MOCK);
else {
  const lib = await loadSupabase();
  if (!lib) { view.innerHTML = `<div class="card mt-5 mx-auto" style="max-width:480px"><div class="card-body"><h2 class="h4">Couldn't connect</h2><p>We couldn't load the admin just now. Check your connection and try again.</p><button class="btn btn-primary" onclick="location.reload()">Try again</button></div></div>`; throw new Error("supabase failed to load"); }
  sb = lib.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true, storageKey: "cac-admin-auth" } });
}
const site = () => sb.schema("site");

// ---------- state ----------
const state = { session: null, profile: null, stats: null, myShops: [] };
const isTeam = () => state.profile?.status === "approved" && ["admin", "moderator"].includes(state.profile?.role);
const isAdmin = () => state.profile?.status === "approved" && state.profile?.role === "admin";
let meLoaded = false;
async function loadMe(force = false) {
  if (meLoaded && !force) return;
  meLoaded = true;
  const { data: { session } } = await sb.auth.getSession();
  state.session = session; state.profile = null;
  if (!session) return;
  const { data } = await sb.from("profiles").select("id,display_name,handle,status,role").eq("id", session.user.id).maybeSingle();
  state.profile = data;
  state.myShops = [];
  state.myListings = [];
  if (!isTeam()) { const [{ data: ms }, { data: ml }] = await Promise.all([site().rpc("my_shops"), site().rpc("my_listings")]); state.myShops = ms || []; state.myListings = ml || []; }
}
const isPartner = () => !isTeam() && (state.myShops.length > 0 || (state.myListings || []).length > 0);
const hasShops = () => state.myShops.length > 0, hasBiz = () => (state.myListings || []).length > 0;
const PARTNER_OK = [/^\/$/, /^\/content\/my_products(\/[^/]+)?$/, /^\/content\/my_orders(\/[^/]+)?$/, /^\/content\/my_shop\/[^/]+$/,
  /^\/content\/my_listing\/[^/]+$/, /^\/content\/my_leads(\/[^/]+)?$/, /^\/content\/my_reviews(\/[^/]+)?$/];

// ---------- routing ----------
const routes = [];
const route = (pattern, fn, crumbs) => routes.push({ re: new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), fn, crumbs });
const withMock = (p) => (MOCK ? p + (p.includes("?") ? "&" : "?") + "mock=" + MOCK : p);
function go(path, replace = false) { path = withMock(path); replace ? history.replaceState({ d: history.state?.d || 0 }, "", path) : history.pushState({ d: (history.state?.d || 0) + 1 }, "", path); render(); }
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (a && a.origin === location.origin && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); closeSidebar(); go(a.pathname + a.search.replace(/[?&]mock=[^&]*/, "").replace(/^&/, "?") + a.hash); }
});
window.addEventListener("popstate", render);
const qs = () => new URLSearchParams(location.search);
let dirty = false;
window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

// ---------- layout ----------
const I = {
  dash: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  page: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  ad: '<path d="M3 11l15-6v14L3 13z"/><path d="M7 13v5a2 2 0 0 0 4 0v-4"/>',
  pin: '<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  home: '<path d="M3 11l9-8 9 8v10H3z"/><path d="M9 21v-7h6v7"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h6v5H7zM15 8h2M15 12h2M7 16h10"/>',
  faq: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>',
  star: '<path d="M12 3l2.7 5.6 6.3.9-4.5 4.4 1 6.1L12 17l-5.5 3 1-6.1L3 9.5l6.3-.9z"/>',
  dir: '<path d="M4 4h16v4H4zM4 12h16v8H4z"/><path d="M8 16h3"/>',
  mega: '<path d="M4 9v6h4l6 4V5L8 9z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.5.5 4 2.5 4 6"/>',
  check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
};
const icon = (k) => `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
function partnerNav() {
  const item = (href, ic, label) => `<li class="nav-item"><a class="nav-link" href="${href}" data-link>${icon(ic)}${label}</a></li>`;
  const biz = hasBiz() ? `<li class="nav-title">My business</li>${state.myListings.map((x) => item(`/content/my_listing/${x.id}`, "dir", esc(x.name) + (state.myListings.length > 1 ? "" : " profile"))).join("")}
    ${item("/content/my_leads", "mail", "Enquiries")}${item("/content/my_reviews", "star", "Reviews")}` : "";
  const shop = hasShops() ? `<li class="nav-title">My shop</li>${item("/content/my_orders", "send", "My orders")}${item("/content/my_products", "star", "My products")}
    ${state.myShops.map((x) => item(`/content/my_shop/${x.id}`, "home", esc(x.name) + " page")).join("")}` : "";
  return `${item("/", "dash", "Dashboard")}${biz}${shop}`;
}
function navHTML() {
  const pend = state.stats?.pending_applications || 0;
  const item = (href, ic, label, badge = "") => `<li class="nav-item"><a class="nav-link" href="${href}" data-link>${icon(ic)}${label}${badge}</a></li>`;
  return `<li class="nav-item"><a class="nav-link" href="/" data-link>${icon("dash")}Dashboard</a></li>
    <li class="nav-title">Marketing</li>
    ${item("/marketing", "dash", "SEO overview")}
    ${item("/marketing/directory", "dir", "Directory performance")}
    ${item("/pages?type=location", "pin", "Location pages")}
    ${item("/pages?type=landing", "ad", "Ad landing pages")}
    ${item("/pages", "page", "All SEO pages")}
    <li class="nav-title">Website</li>
    ${item("/homepage", "home", "Homepage blocks")}
    ${item("/content/events", "cal", "Events")}
    ${item("/content/venues", "pin", "Venues")}
    ${item("/content/articles", "news", "News")}
    ${item("/content/guides", "page", "Guides")}
    ${item("/content/faqs", "faq", "FAQs")}
    ${item("/content/partners", "star", "Partners")}
    ${item("/content/partner_features", "star", "Partner features")}
    ${item("/content/community_highlights", "users", "Community posts")}
        ${item("/content/gallery_items", "page", "Gallery")}
    ${item("/content/site_stats", "dash", "Stats")}
    ${item("/content/directory_listings", "dir", "Directory")}
    ${item("/directory/import", "dir", "Import businesses")}
    ${item("/directory/claims", "check", "Claim requests")}
    ${item("/content/directory_services", "dir", "Directory services")}
    ${item("/content/directory_regions", "pin", "Directory areas")}
    ${item("/content/sponsored_slots", "mega", "Sponsored slots")}
    ${item("/email", "send", "Email marketing")}
    ${item("/content/newsletter_subscribers", "mail", "Newsletter")}
    ${item("/content/enquiries", "send", "Enquiries")}
    <li class="nav-title">Shop</li>
    ${item("/content/products", "star", "Products")}
    ${item("/content/product_categories", "page", "Categories")}
    ${item("/content/orders", "send", "Orders")}
    ${item("/content/shops", "home", "Partner shops")}
    <li class="nav-title">Club</li>
    ${item("/club/applications", "check", "Applications", pend ? `<span class="badge text-bg-danger">${pend}</span>` : "")}
    ${item("/club/moderation", "faq", "Moderation", state.stats?.reports_open ? `<span class="badge text-bg-danger">${state.stats.reports_open}</span>` : "")}
    ${item("/club/members", "users", "Members")}
    ${item("/club/access", "key", "Invites and access")}
    ${item("/club/emails", "send", "Emails")}`;
}
function markNav() {
  const here = location.pathname + (qs().get("type") === "landing" ? "?type=landing" : "");
  for (const a of $$("#sidenav .nav-link")) {
    const href = a.getAttribute("href");
    const on = href === "/" ? location.pathname === "/" : href.includes("?") ? here === href : (location.pathname === href || location.pathname.startsWith(href + "/")) && !(href === "/pages" && here.includes("landing"));
    a.classList.toggle("active", on);
  }
}
function openSidebar() { $("#sidebar").classList.add("open"); $("#backdrop").hidden = false; }
function closeSidebar() { $("#sidebar").classList.remove("open"); $("#backdrop").hidden = true; }
$("#sidebar-open").onclick = openSidebar; $("#sidebar-close").onclick = closeSidebar; $("#backdrop").onclick = closeSidebar;
$("#signout").onclick = async () => { await sb.auth.signOut(); await loadMe(true); go("/", true); };
function crumbs(list) { $("#crumbs").innerHTML = list.map((c, i) => i < list.length - 1 && c[1] ? `<li class="breadcrumb-item"><a href="${c[1]}" data-link>${esc(c[0])}</a></li>` : `<li class="breadcrumb-item active" aria-current="page">${esc(c[0])}</li>`).join(""); document.title = list[list.length - 1][0] + " · Cars and Coffee Admin"; }
function chrome(show) {
  $("#sidebar").hidden = !show; $("#topbar").hidden = !show; document.body.classList.toggle("has-sidebar", show);
  if (show) { $("#sidenav").innerHTML = isPartner() ? partnerNav() : navHTML(); $("#whoami").textContent = `${state.profile?.display_name || state.session?.user?.email || ""} · ${isPartner() ? (hasBiz() ? "business owner" : "shop manager") : state.profile?.role || ""}`; markNav(); }
}

// Who's signed in is checked once, and again only when they sign in or out (not on every click).
if (sb.auth.onAuthStateChange) sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT" || ev === "USER_UPDATED") { const had = state.session?.user?.id; loadMe(true).then(() => { if ((state.session?.user?.id || null) !== (had || null)) render(); }); } });
// Dashboard figures and the sidebar badges refresh in the background.
let statsAt = 0;
async function refreshStats(force = false) {
  if (!force && Date.now() - statsAt < 60e3) return;
  statsAt = Date.now();
  try { const { data } = await sb.rpc("admin_dashboard_stats"); state.stats = data; if (!$("#sidebar").hidden) { $("#sidenav").innerHTML = navHTML(); markNav(); } } catch {}
}
let busyTimer;
const busy = (on) => { clearTimeout(busyTimer); $("#busy").hidden = !on; };
let renderSeq = 0;
async function render() {
  if (dirty && !confirmLeave()) return;
  dirty = false;
  const seq = ++renderSeq;
  busy(true);
  try { await renderInner(seq); } finally { if (seq === renderSeq) busy(false); }
}
async function renderInner(seq) {
  await loadMe();
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/auth/callback") { history.replaceState(null, "", withMock("/")); return render(); }
  if (!state.session) { chrome(false); return signInScreen(); }
  if (!isTeam() && !isPartner()) { chrome(false); return noAccess(); }
  if (isPartner() && !PARTNER_OK.some((re) => re.test(path))) { history.replaceState(null, "", withMock("/")); return render(); }
  if (isTeam()) { if (!state.stats || path === "/") await refreshStats(path === "/"); else refreshStats(); }
  if (seq !== renderSeq) return;
  if ($("#sidebar").hidden) chrome(true); else markNav();
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) { view.classList.add("is-loading"); const slow = setTimeout(() => { if (seq === renderSeq) view.innerHTML = `<div class="py-5 text-center text-body-secondary">Loading…</div>`; }, 600); try { await r.fn(m.groups || {}); } catch (e) { view.innerHTML = `<div class="alert alert-danger mt-3">${esc(e.message || e)}</div>`; } clearTimeout(slow); view.classList.remove("is-loading"); $("#main").focus({ preventScroll: true }); window.scrollTo(0, 0); return; }
  }
  crumbs([["Not found"]]); view.innerHTML = `<div class="empty"><h1 class="h4">Page not found</h1><a href="/" data-link>Back to the dashboard</a></div>`;
}
function confirmLeave() { return window.confirm("You have unsaved changes. Leave this page?"); }

// ---------- sign in ----------
const G = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13.3 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.4 0-11.7-3.8-13.6-9.3l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>`;
function signInScreen() {
  document.title = "Sign in · Cars and Coffee Admin";
  view.innerHTML = `<div class="signin-wrap"><div class="card signin-card"><div class="card-body p-4">
    <div class="d-flex align-items-center gap-3 mb-3"><img src="/logo.svg" alt="" width="52" height="50"><div><div class="fw-bold fs-5">Cars and Coffee</div><div class="text-body-secondary">Team and shop partners</div></div></div>
    <p class="text-body-secondary">For the Cars and Coffee team and partner shop managers. Sign in with the email address you were added with.</p>
    <button class="gbtn mb-3" id="google" type="button">${G} Continue with Google</button>
    <form id="emailform" novalidate><label class="form-label" for="email">Or get a sign-in link by email</label>
    <div class="input-group"><input class="form-control" type="email" id="email" autocomplete="email" placeholder="you@example.com" required><button class="btn btn-primary" type="submit">Send link</button></div>
    <p class="small mt-2 mb-0" id="msg" role="status"></p></form>
  </div></div></div>`;
  $("#google").onclick = async () => { const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + "/auth/callback" } }); if (error) $("#msg").textContent = error.message; };
  { const pre = qs().get("email"); if (pre && $("#email")) $("#email").value = pre; }
  $("#emailform").onsubmit = async (e) => {
    e.preventDefault(); const em = $("#email").value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { $("#msg").textContent = "Please enter a valid email address."; return; }
    const { data: invited } = await site().rpc("has_shop_invite", { p_email: em });
    const { error } = await sb.auth.signInWithOtp({ email: em, options: { shouldCreateUser: !!invited, emailRedirectTo: location.origin + "/auth/callback" } });
    $("#msg").textContent = error ? "We couldn't send a link to that address. Only the team, partner shops and businesses listed in our directory can sign in here. Use the email address you registered your business with." : "Check your email for a sign-in link.";
  };
}
function noAccess() {
  document.title = "No access · Cars and Coffee Admin";
  view.innerHTML = `<div class="signin-wrap"><div class="card signin-card"><div class="card-body p-4">
    <h1 class="h4">This area is for the team, partner shops and listed businesses</h1><p>You're signed in as <strong>${esc(state.session.user.email)}</strong>, which isn't linked to a business or shop. If you've listed your business, sign in with the email address you registered with. To list a business, <a href="${SITE}/directory/list-your-business">start here</a>.</p>
    <div class="d-flex gap-2"><a class="btn btn-primary" href="https://club.carsandcoffee.uk">Go to the club</a><button class="btn btn-outline-secondary" id="so">Sign out</button></div></div></div></div>`;
  $("#so").onclick = async () => { await sb.auth.signOut(); go("/", true); };
}

// ---------- dashboard ----------
route("/", async () => {
  if (isPartner()) return partnerDash();
  crumbs([["Dashboard"]]);
  const s = state.stats || {};
  const card = (v, label, href, tone = "") => `<div class="col-6 col-lg-3"><div class="card stat h-100"><div class="card-body"><a href="${href}" data-link><div class="value ${tone}">${v ?? "–"}</div><div class="label">${label}</div></a></div></div></div>`;
  const [{ data: apps }, { data: pages }] = await Promise.all([
    sb.rpc("get_application_queue"),
    site().from("pages").select("id,title,path,page_type,status,seo_score,updated_at").order("updated_at", { ascending: false }).limit(6),
  ]);
  view.innerHTML = `<div class="page-head"><h1>Dashboard</h1><div class="d-flex gap-2"><a class="btn btn-primary" href="/pages/new" data-link>New SEO page</a><a class="btn btn-outline-primary" href="/pages/new?type=landing" data-link>New ad landing page</a></div></div>
    <div class="row g-3 mb-4">
      ${card(s.pending_applications, `Applications waiting${s.fast_track_waiting ? ` (${s.fast_track_waiting} fast-track)` : ""}`, "/club/applications", s.pending_applications ? "text-danger" : "")}
      ${card(s.members, `Members${s.new_members_7d ? ` · +${s.new_members_7d} this week` : ""}`, "/club/members")}
      ${card(s.pages_published, `Pages live · ${s.pages_draft || 0} in draft`, "/pages")}
      ${card(s.newsletter_subscribers, "Newsletter subscribers", "/content/newsletter_subscribers")}
      ${card(s.emails_sent_7d, "Emails sent this week", "/club/emails")}
      ${card(s.emails_queued, "Emails waiting to send", "/club/emails")}
      ${card(s.emails_failed, "Emails failed", "/club/emails?status=failed", s.emails_failed ? "text-danger" : "")}
      ${card(s.invites_7d, "Member invites this week", "/club/access")}
      ${card(s.reports_open, "Reports to review", "/club/moderation", s.reports_open ? "text-danger" : "")}
      ${card(s.posts_7d, `Club posts this week · ${s.comments_7d || 0} comments`, "/club/moderation")}
    </div>
    <div class="row g-3">
      <div class="col-lg-6"><div class="card h-100"><div class="card-header bg-white fw-semibold d-flex justify-content-between">Waiting for approval <a href="/club/applications" data-link class="small">Open queue</a></div>
        ${apps && apps.length ? `<ul class="list-group list-group-flush">${apps.slice(0, 6).map((a) => `<li class="list-group-item d-flex justify-content-between align-items-center"><span><strong>${esc(a.full_name)}</strong> <span class="text-body-secondary small">${esc(a.location || "")}</span>${a.fast_track ? ' <span class="badge text-bg-warning">Fast-track</span>' : ""}</span><span class="small text-body-secondary">${Math.round(a.waiting_hours)}h</span></li>`).join("")}</ul>` : `<div class="empty">Nobody waiting. Nice.</div>`}
      </div></div>
      <div class="col-lg-6"><div class="card h-100"><div class="card-header bg-white fw-semibold d-flex justify-content-between">Recently edited pages <a href="/pages" data-link class="small">All pages</a></div>
        ${pages && pages.length ? `<ul class="list-group list-group-flush">${pages.map((p) => `<li class="list-group-item d-flex justify-content-between align-items-center"><a class="rowlink text-reset" href="/pages/${p.id}" data-link>${esc(p.title)}</a><span>${scoreBadge(p.seo_score)} ${statusBadge(p.status)}</span></li>`).join("")}</ul>` : `<div class="empty">No pages yet. <a href="/pages/new" data-link>Create your first SEO page</a>.</div>`}
      </div></div>
    </div>`;
});
const statusBadge = (s) => `<span class="badge ${{ published: "text-bg-success", draft: "text-bg-secondary", review: "text-bg-warning", archived: "text-bg-light border" }[s] || "text-bg-light"}">${esc({ published: "Live", draft: "Draft", review: "In review", archived: "Archived" }[s] || s)}</span>`;
const scoreBadge = (n) => n == null ? "" : `<span class="badge ${n >= 80 ? "text-bg-success" : n >= 55 ? "text-bg-warning" : "text-bg-danger"}" title="SEO score">SEO ${n}</span>`;

// ---------- AI writing help (admin Worker /api/generate) ----------
async function aiCall(field, context, brief = "") {
  if (MOCK) { await new Promise((r) => setTimeout(r, 300));
    if (["body", "scene", "getting_car", "getting_nocar"].includes(field)) return { html: `<h2>Sample AI section</h2><p>This is sample AI text about ${esc(context.place || context.title || "the page")} with the keyword ${esc(context.focus_keyword || "")}.</p><ul><li>First point</li><li>Second point</li></ul>` };
    if (field === "faqs") return { faqs: [["Are meets free?", "Most breakfast meets are free; just RSVP."], ["Can I bring my car?", "Yes, all cars are welcome."]] };
    return { options: [1, 2, 3].map((i) => `${context.focus_keyword || context.title || "Sample"} suggestion ${i}`) }; }
  const { data: { session } } = await sb.auth.getSession();
  const r = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ field, context, brief }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "AI request failed");
  return j;
}
const aiBtn = (field, target, label = "Suggest") => `<button type="button" class="btn btn-link btn-sm ai-btn p-0 ms-2" data-ai-field="${field}" data-ai-target="${target}">✦ ${label}</button>`;
// Shows AI options under a field; clicking one fills it in.
function wireAiSuggest(root, getCtx) {
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-ai-field]"); if (!b) return;
    e.preventDefault();
    const field = b.dataset.aiField, target = $("#" + b.dataset.aiTarget, root) || $("#" + b.dataset.aiTarget);
    let box = root.querySelector(`.ai-sugg[data-for="${b.dataset.aiTarget}"]`);
    if (!box) { box = document.createElement("div"); box.className = "ai-sugg"; box.dataset.for = b.dataset.aiTarget; (target.closest(".input-group") || target).insertAdjacentElement("afterend", box); }
    const old = b.textContent; b.textContent = "✦ Thinking…"; b.disabled = true;
    try {
      const res = await aiCall(field, getCtx());
      const opts = res.options || [];
      box.innerHTML = `<div class="small text-body-secondary mb-1">Pick one to use it (you can edit it after):</div>` + opts.map((o, i) => `<button type="button" class="ai-opt" data-i="${i}">${esc(o)}${["meta_title", "meta_description"].includes(field) ? ` <span class="ai-len">${o.length}</span>` : ""}</button>`).join("") + `<button type="button" class="btn btn-link btn-sm p-0 ai-close">Close</button>`;
      box.onclick = (ev) => { const o = ev.target.closest(".ai-opt"); if (o) { target.value = opts[+o.dataset.i]; target.dispatchEvent(new Event("input", { bubbles: true })); box.remove(); } if (ev.target.closest(".ai-close")) box.remove(); };
    } catch (err) { box.innerHTML = `<div class="small text-danger">${esc(err.message)}</div>`; }
    finally { b.textContent = old; b.disabled = false; }
  });
}

// ---------- SEO scoring shared by the page editor, content editors and the Marketing overview ----------
const htmlText = (h) => String(h || "").replace(/<\/(p|h[1-6]|li|blockquote)>/gi, "\n\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/[ \t]+/g, " ").trim();
const htmlHeadings = (h) => [...String(h || "").matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => "#".repeat(+m[1]) + " " + htmlText(m[2])).join("\n\n");
const htmlLinks = (h) => [...String(h || "").matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => `[${htmlText(m[2])}](${m[1]})`).join(" ");
const richVal = (id) => { const a = document.getElementById(id + "_area"); return a ? cleanHTML(a.innerHTML) : ""; };
const htmlToMd = (h) => [htmlHeadings(h), htmlText(h), htmlLinks(h), [...String(h || "").matchAll(/<img [^>]*alt="([^"]*)"[^>]*>/gi)].map((m) => `![${m[1]}](x)`).join(" ")].filter(Boolean).join("\n\n");
function locationScoreInput(d) {
  const lcx = d.content || {};
  return { ...d, body_md: [d.body_md, ...(lcx.scene || []).map((x, i) => (i === 0 ? "## The local car scene\n\n" : "") + x), (lcx.drives || []).length ? "## Best drives\n\n" + lcx.drives.map((x) => x.title + ". " + x.text).join("\n\n") : "", (lcx.faqs || []).length ? "## Frequently asked questions\n\n" + lcx.faqs.map(([qq, an]) => qq + " " + an).join("\n\n") : "", "[events](/events) [club](/club)"].filter(Boolean).join("\n\n") };
}
// events / news / guides → the shape analyse() expects
const SEO_KINDS = {
  events: { label: "Event", path: (r) => `/events/${r.slug}`, type: "standard", intro: (r) => r.summary, h1: (r) => r.title },
  articles: { label: "News", path: (r) => `/news/${r.slug}`, type: "standard", intro: (r) => r.excerpt, h1: (r) => r.title },
  guides: { label: "Guide", path: (r) => `/guides/${r.slug}`, type: "guide", intro: (r) => r.intro, h1: (r) => r.title },
  directory_listings: { label: "Business", path: (r) => `/directory/${r.slug}`, type: "standard", intro: (r) => r.summary, h1: (r) => r.name },
};
function contentScoreInput(kind, r) {
  const k = SEO_KINDS[kind];
  const html = r.body_html || "";
  const ttl = r.title || r.name;
  return { page_type: k.type, title: ttl, h1: k.h1(r), meta_title: r.meta_title || `${ttl} | Cars and Coffee UK`, meta_description: r.meta_description || "", focus_keyword: r.focus_keyword || "",
    path: k.path(r), intro: k.intro(r) || "", body_md: [htmlHeadings(html), htmlText(html), htmlLinks(html), (r.gallery || []).length || r.image_path ? "![photo](x)" : ""].filter(Boolean).join("\n\n"),
    hero_image_path: r.image_path, hero_image_alt: r.image_alt, og_image_path: r.image_path };
}
const scoreOf = (kind, r) => { try { return kind === "pages" ? analyse(r.page_type === "location" ? locationScoreInput(r) : r) : analyse(contentScoreInput(kind, r)); } catch { return { score: 0, grade: "bad", checks: [] }; } };

// ---------- Marketing: SEO overview of every public page ----------
route("/marketing", async () => {
  crumbs([["Marketing"], ["SEO overview"]]);
  const now = new Date().toISOString();
  const [pg, ev, ar, gu, di] = await Promise.all([
    site().from("pages").select("*").limit(500),
    site().from("events").select("id,slug,title,summary,body_html,meta_title,meta_description,focus_keyword,image_path,image_alt,published,ends_at").limit(500),
    site().from("articles").select("id,slug,title,excerpt,body_html,meta_title,meta_description,focus_keyword,image_path,image_alt,gallery,status").limit(500),
    site().from("guides").select("id,slug,title,intro,body_html,meta_title,meta_description,focus_keyword,image_path,image_alt,status").limit(200),
    site().from("directory_listings").select("id,slug,name,summary,body_html,meta_title,meta_description,focus_keyword,image_path,image_alt,gallery,status").limit(500),
  ]);
  for (const r of [pg, ev, ar, gu]) if (r.error) throw r.error;
  const rows = [
    ...(pg.data || []).filter((p) => p.status !== "archived").map((p) => ({ kind: p.page_type === "location" ? "Location" : labelType(p.page_type), title: p.title, path: p.path, kw: p.focus_keyword, live: p.status === "published", noindex: p.noindex, edit: `/pages/${p.id}`, r: scoreOf("pages", p) })),
    ...(ev.data || []).filter((e) => e.ends_at >= now).map((e) => ({ kind: "Event", title: e.title, path: `/events/${e.slug}`, kw: e.focus_keyword, live: e.published, edit: `/content/events/${e.id}#seo`, r: scoreOf("events", e) })),
    ...(ar.data || []).map((a) => ({ kind: "News", title: a.title, path: `/news/${a.slug}`, kw: a.focus_keyword, live: a.status === "published", edit: `/content/articles/${a.id}#seo`, r: scoreOf("articles", a) })),
    ...(di.data || []).filter((x) => x.status !== "rejected").map((x) => ({ kind: "Business", title: x.name, path: `/directory/${x.slug}`, kw: x.focus_keyword, live: x.status === "published", edit: `/content/directory_listings/${x.id}#seo`, r: scoreOf("directory_listings", x) })),
    ...(gu.data || []).map((g) => ({ kind: "Guide", title: g.title, path: `/guides/${g.slug}`, kw: g.focus_keyword, live: g.status === "published", edit: `/content/guides/${g.id}#seo`, r: scoreOf("guides", g) })),
  ];
  const kindF = qs().get("kind") || "", sort = qs().get("sort") || "score";
  const kinds = [...new Set(rows.map((x) => x.kind))];
  let list = rows.filter((x) => !kindF || x.kind === kindF);
  list.sort((a, b) => sort === "score" ? a.r.score - b.r.score : a.title.localeCompare(b.title));
  const live = rows.filter((x) => x.live);
  const avg = live.length ? Math.round(live.reduce((n, x) => n + x.r.score, 0) / live.length) : 0;
  const weak = live.filter((x) => x.r.score < 55).length, noKw = live.filter((x) => !x.kw).length;
  const noDesc = live.filter((x) => x.r.checks.some((c) => /meta description/i.test(c.label) && c.status === "fail")).length;
  const topIssue = (r) => { const c = r.checks.filter((c) => c.status === "fail").sort((a, b) => b.weight - a.weight)[0] || r.checks.filter((c) => c.status === "warn").sort((a, b) => b.weight - a.weight)[0]; return c ? c.label : "All checks passed"; };
  const tab = (k, l) => `<a href="/marketing${k ? "?kind=" + encodeURIComponent(k) : ""}" data-link class="${kindF === k ? "on" : ""}">${esc(l)}</a>`;
  view.innerHTML = `<div class="page-head"><h1>SEO overview</h1><div class="d-flex gap-2"><a class="btn btn-outline-secondary" href="/pages/new?type=location" data-link>New location page</a><a class="btn btn-primary" href="/pages/new?type=landing" data-link>New ad landing page</a></div></div>
    <p class="text-body-secondary">Every public page on the website, scored by the SEO optimiser. Lowest scores first: open one to see exactly what to fix.</p>
    <div class="row g-3 mb-3">
      <div class="col-6 col-lg-3"><div class="card stat"><div class="card-body"><div class="value ${avg >= 80 ? "" : avg >= 55 ? "" : "text-danger"}">${avg}</div><div class="label">Average score (live pages)</div></div></div></div>
      <div class="col-6 col-lg-3"><div class="card stat"><div class="card-body"><div class="value ${weak ? "text-danger" : ""}">${weak}</div><div class="label">Live pages scoring under 55</div></div></div></div>
      <div class="col-6 col-lg-3"><div class="card stat"><div class="card-body"><div class="value ${noKw ? "text-danger" : ""}">${noKw}</div><div class="label">Live pages without a focus keyword</div></div></div></div>
      <div class="col-6 col-lg-3"><div class="card stat"><div class="card-body"><div class="value ${noDesc ? "text-danger" : ""}">${noDesc}</div><div class="label">Missing a Google description</div></div></div></div>
    </div>
    <div class="pill-tabs">${tab("", "All")}${kinds.map((k) => tab(k, k)).join("")}</div>
    <div class="card">${list.length ? `<div class="table-responsive"><table class="table table-hover mb-0 align-middle"><thead><tr><th>Page</th><th>Type</th><th>Focus keyword</th><th>Score</th><th>Biggest fix</th><th></th></tr></thead><tbody>
      ${list.map((x) => `<tr class="${x.live ? "" : "row-off"}"><td><a class="rowlink" href="${x.edit}" data-link>${esc(x.title)}</a><div class="small text-body-secondary">${esc(x.path)}${x.live ? "" : " · not live"}${x.noindex ? " · hidden from Google" : ""}</div></td>
        <td>${esc(x.kind)}</td><td class="small">${x.kw ? esc(x.kw) : '<span class="text-danger">None</span>'}</td><td>${scoreBadge(x.r.score)}</td><td class="small">${esc(topIssue(x.r))}</td>
        <td class="text-end text-nowrap"><a class="btn btn-sm btn-primary" href="${x.edit}" data-link>Optimise</a> <a class="btn btn-sm btn-outline-secondary" href="${SITE}${esc(x.path)}" target="_blank" rel="noopener">View</a></td></tr>`).join("")}
    </tbody></table></div>` : '<div class="empty">Nothing here yet.</div>'}</div>
    <p class="small text-body-secondary mt-3">Scores use the same checks as the page editor: focus keyword, Google title and description, headings, word count, links and images. Past events aren't listed.</p>`;
});

// ---------- SEO pages ----------
const TYPES = ["location", "sector", "audience", "guide", "landing", "standard"];
const TYPE_HELP = {
  location: "A town or county page, e.g. Car meets in Norwich.", sector: "A type of car or motorsport, e.g. Classic cars, JDM, Track days.",
  audience: "A group of people, e.g. New drivers, Families, Car clubs.", guide: "A how-to or explainer article.",
  landing: "A focused page for a Google Ads campaign, with one call to action.", standard: "Any other page, e.g. About or Advertise.",
};
const PATH_PREFIX = { location: "/", sector: "/cars/", audience: "/for/", guide: "/guides/", landing: "/go/", standard: "/" };

route("/pages", async () => {
  const type = qs().get("type") || "", status = qs().get("status") || "", q = (qs().get("q") || "").trim();
  crumbs([["Marketing", "/marketing"], [type === "landing" ? "Ad landing pages" : type === "location" ? "Location pages" : "All SEO pages"]]);
  let query = site().from("pages").select("*").order("updated_at", { ascending: false }).limit(500);
  if (type) query = query.eq("page_type", type);
  if (status) query = query.eq("status", status);
  const { data, error } = await query; if (error) throw error;
  const rows = (data || []).filter((p) => !q || (p.title + " " + p.path + " " + (p.focus_keyword || "")).toLowerCase().includes(q.toLowerCase()));
  const tab = (t, label) => `<a href="/pages${t ? "?type=" + t : ""}" data-link class="${type === t ? "on" : ""}">${label}</a>`;
  view.innerHTML = `<div class="page-head"><h1>${type === "landing" ? "Ad landing pages" : type === "location" ? "Location pages" : "All SEO pages"}</h1>
      <a class="btn btn-primary" href="/pages/new${type ? "?type=" + type : ""}" data-link>New ${type ? labelType(type).toLowerCase() + " " : ""}page</a></div>
    <div class="pill-tabs">${tab("", "All")}${TYPES.map((t) => tab(t, labelType(t))).join("")}</div>
    <div class="card"><div class="card-body pb-0"><form class="row g-2 mb-3" id="filt"><div class="col-md-6"><input class="form-control" name="q" placeholder="Search title, address or keyword" value="${esc(q)}"></div>
      <div class="col-md-3"><select class="form-select" name="status"><option value="">Any status</option>${["draft", "review", "published", "archived"].map((s) => `<option value="${s}" ${s === status ? "selected" : ""}>${{ draft: "Draft", review: "In review", published: "Live", archived: "Archived" }[s]}</option>`).join("")}</select></div>
      <div class="col-md-3"><button class="btn btn-outline-secondary w-100">Filter</button></div></form></div>
    ${rows.length ? `<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>Page</th><th>Type</th><th>Focus keyword</th><th>SEO</th><th>Status</th><th>Updated</th><th class="text-end">Actions</th></tr></thead><tbody>
      ${rows.map((p) => `<tr><td><a class="rowlink" href="/pages/${p.id}" data-link>${esc(p.title)}</a><div class="small text-body-secondary">${esc(p.path)}</div></td><td>${labelType(p.page_type)}</td><td class="small">${esc(p.focus_keyword || "–")}</td><td>${scoreBadge(scoreOf("pages", p).score)}</td><td>${statusBadge(p.status)}</td><td class="small text-body-secondary">${ago(p.updated_at)}</td>
        <td class="text-end text-nowrap"><a class="btn btn-sm btn-primary" href="/pages/${p.id}" data-link>Edit</a> ${p.status === "published" ? `<a class="btn btn-sm btn-outline-secondary" href="${SITE}${esc(p.path)}" target="_blank" rel="noopener">View</a>` : `<a class="btn btn-sm btn-outline-secondary" href="${SITE}${esc(p.path)}?preview=${esc(String(p.id).replace(/-/g, "").slice(0, 12))}" target="_blank" rel="noopener" title="Draft: preview only">Preview</a>`}</td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty">No pages here yet.${type ? ` ${esc(TYPE_HELP[type])}` : ""} <a href="/pages/new${type ? "?type=" + type : ""}" data-link>Create one</a>.</div>`}</div>`;
  $("#filt").onsubmit = (e) => { e.preventDefault(); const f = new FormData(e.target); const p = new URLSearchParams(); if (type) p.set("type", type); if (f.get("q")) p.set("q", f.get("q")); if (f.get("status")) p.set("status", f.get("status")); go("/pages" + (p.toString() ? "?" + p : "")); };
});

route("/pages/:id", async ({ id }) => {
  const isNew = id === "new";
  let p = { page_type: qs().get("type") || "location", status: "draft", secondary_keywords: [], ads: { headlines: [], descriptions: [], keywords: [], utm_source: "google", utm_medium: "cpc" }, schema_type: "WebPage", noindex: false };
  let revisions = 0;
  if (!isNew) {
    const { data, error } = await site().from("pages").select("*").eq("id", id).maybeSingle();
    if (error) throw error; if (!data) throw new Error("Page not found");
    p = data; p.ads = p.ads || {};
    const { count } = await site().from("page_revisions").select("id", { count: "exact", head: true }).eq("page_id", id);
    revisions = count || 0;
  }
  if (isNew && p.page_type === "landing") p.noindex = true;
  const listLabel = p.page_type === "landing" ? ["Ad landing pages", "/pages?type=landing"] : ["SEO pages", "/pages"];
  crumbs([listLabel, [isNew ? "New page" : p.title]]);
  let pathTouched = !isNew;
  const a = p.ads;
  const lc = p.content || {};
  const adRows = (arr, n, max, name, ph) => Array.from({ length: n }, (_, i) => `<div class="adline"><input class="form-control form-control-sm" data-ad="${name}" data-i="${i}" maxlength="${max + 20}" value="${esc(arr?.[i] || "")}" placeholder="${ph} ${i + 1}"><span class="count" data-for="${name}-${i}"></span></div>`).join("");

  view.innerHTML = `<form id="pf" novalidate>
  <div class="page-head"><h1>${isNew ? "New page" : esc(p.title)}</h1>
    <div class="d-flex flex-wrap gap-2 align-items-center">
      ${!isNew ? `<span class="small text-body-secondary">${revisions} earlier version${revisions === 1 ? "" : "s"} saved</span>` : ""}
      ${!isNew && p.status === "published" ? `<a class="btn btn-outline-secondary" href="${SITE}${esc(p.path)}" target="_blank" rel="noopener">View live ↗</a>` : ""}${!isNew && p.status !== "published" ? `<a class="btn btn-outline-secondary" href="${SITE}${esc(p.path)}?preview=${esc(p.id.replace(/-/g, "").slice(0, 12))}" target="_blank" rel="noopener">Preview draft ↗</a>` : ""}
      <button class="btn btn-outline-secondary" type="button" id="prev">Preview</button>
      <button class="btn btn-outline-primary" type="submit" data-status="draft">Save draft</button>
      <button class="btn btn-primary" type="submit" data-status="published">${p.status === "published" ? "Update live page" : "Publish"}</button>
    </div></div>
  <div class="row g-4">
    <div class="col-xl-7">
      <div class="card mb-4"><div class="card-body">
        <div class="row g-3">
          <div class="col-md-5"><label class="form-label" for="page_type">Page type</label><select class="form-select" id="page_type">${TYPES.map((t) => `<option value="${t}" ${t === p.page_type ? "selected" : ""}>${labelType(t)}</option>`).join("")}</select><div class="form-text" id="typehelp">${esc(TYPE_HELP[p.page_type])}</div></div>
          <div class="col-md-7"><label class="form-label" for="title">Page name</label><input class="form-control" id="title" required maxlength="120" value="${esc(p.title || "")}" placeholder="e.g. Car meets in Norwich"></div>
          <div class="col-12"><label class="form-label" for="path">Page address</label><div class="input-group"><span class="input-group-text">carsandcoffee.uk</span><input class="form-control" id="path" required value="${esc(p.path || "")}" placeholder="/norfolk/norwich"></div><div class="form-text">Lower-case letters, numbers and hyphens. Changing the address of a live page breaks old links.</div></div>
          <div class="col-md-6 loc-only"><label class="form-label" for="county">County</label><select class="form-select" id="county"><option value="">Choose…</option>${["Norfolk", "Suffolk", "Cambridgeshire", "Essex"].map((c) => `<option ${c === p.county ? "selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="col-md-6 loc-only"><label class="form-label" for="town">Town or area</label><input class="form-control" id="town" value="${esc(p.town || "")}" placeholder="e.g. Norwich"></div>
          <div class="col-12"><label class="form-label" for="h1">Main heading (H1)</label><input class="form-control" id="h1" maxlength="120" value="${esc(p.h1 || "")}" placeholder="Leave blank to use the page name"></div>
          <div class="col-12"><label class="form-label" for="intro">Opening paragraph ${aiBtn("intro", "intro")}</label><textarea class="form-control" id="intro" rows="3" placeholder="One or two sentences that answer the search straight away. Use the focus keyword.">${esc(p.intro || "")}</textarea></div>
          <div class="col-12"><label class="form-label d-flex justify-content-between" for="body_html_area"><span>Page content</span><span class="small text-body-secondary" id="wc"></span></label>
            ${richField("body_html", p.body_html || (p.body_md ? md(p.body_md) : ""), esc, { ai: "body" })}</div>
        </div></div></div>
      <div class="card mb-4"><div class="card-header bg-white fw-semibold">Image and call to action</div><div class="card-body"><div class="row g-3">
        <div class="col-12"><label class="form-label" for="hero_image_path">Main image</label>${imageInput("hero_image_path", p.hero_image_path || "")}</div>
        <div class="col-md-6"><label class="form-label" for="hero_image_alt">Image description (alt text)</label><input class="form-control" id="hero_image_alt" value="${esc(p.hero_image_alt || "")}" placeholder="What the photo shows"></div>
        <div class="col-md-6"><label class="form-label" for="cta_label">Button text</label><input class="form-control" id="cta_label" maxlength="40" value="${esc(p.cta_label || "")}" placeholder="e.g. See upcoming meets"></div>
        <div class="col-md-6"><label class="form-label" for="cta_url">Button link</label><input class="form-control" id="cta_url" value="${esc(p.cta_url || "")}" placeholder="/events or https://club.carsandcoffee.uk/apply"></div>
      </div></div></div>
      <div class="card mb-4 locsec"><div class="card-header bg-white fw-semibold d-flex justify-content-between">Location page sections <span class="small text-body-secondary fw-normal">Events, businesses and nearby towns fill in automatically</span></div><div class="card-body">
        <div class="mb-3"><label class="form-label" for="lc_label">Small label above the heading</label><input class="form-control" id="lc_label" value="${esc(lc.label || "")}" placeholder="Norfolk · Norwich"></div>
        <div class="hub-only">
          <div class="mb-3"><label class="form-label" for="lc_ntowns">Norfolk towns to list <span class="small text-body-secondary">(comma separated)</span></label><textarea class="form-control" id="lc_ntowns" rows="2">${esc((lc.norfolk_towns || []).join(", "))}</textarea></div>
          <div class="mb-3"><label class="form-label" for="lc_stowns">Suffolk towns to list</label><textarea class="form-control" id="lc_stowns" rows="2">${esc((lc.suffolk_towns || []).join(", "))}</textarea></div>
          <div class="mb-3"><label class="form-label" for="lc_soon">Coming soon note</label><textarea class="form-control" id="lc_soon" rows="2">${esc(lc.coming_soon || "")}</textarea></div>
        </div>
        <div class="place-only">
          <label class="form-label">At a glance <span class="small text-body-secondary">(up to 4 facts: a short value and what it means)</span></label>
          ${[0, 1, 2, 3].map((i) => `<div class="row g-2 mb-2"><div class="col-5"><input class="form-control" data-stat-n="${i}" value="${esc(lc.stats?.[i]?.[0] || "")}" placeholder="${["Monthly", "About 10 miles", "About 25 miles", "Free"][i]}"></div><div class="col-7"><input class="form-control" data-stat-l="${i}" value="${esc(lc.stats?.[i]?.[1] || "")}" placeholder="${["Breakfast meet", "To Lotus at Hethel", "To Snetterton Circuit", "Morning meets"][i]}"></div></div>`).join("")}
          <div class="mb-3 mt-3"><label class="form-label" for="lc_scene_area">The local car scene</label>${richField("lc_scene", lc.scene_html || (lc.scene || []).map((x) => `<p>${esc(x)}</p>`).join(""), esc, { ai: "scene" })}</div>
          <div class="mb-3"><label class="form-label" for="lc_interests">Popular interests here <span class="small text-body-secondary">(comma separated, e.g. Classic cars, Track days)</span></label><input class="form-control" id="lc_interests" value="${esc((lc.interests || []).join(", "))}"></div>
          <label class="form-label">Best drives <span class="small text-body-secondary">(up to 4)</span></label>
          <div id="drives">${[0, 1, 2, 3].map((i) => { const d = lc.drives?.[i] || {}; return `<div class="border rounded p-3 mb-2" data-drive="${i}"><div class="row g-2"><div class="col-md-6"><input class="form-control" data-dk="title" value="${esc(d.title || "")}" placeholder="Route name, e.g. North Norfolk coast"></div><div class="col-md-6"><input class="form-control" data-dk="distance" value="${esc(d.distance || "")}" placeholder="About 25 miles"></div>
            <div class="col-12"><input class="form-control" data-dk="text" value="${esc(d.text || "")}" placeholder="One line about the route"></div><div class="col-12">${imageInput("drive_img_" + i, d.image || "")}</div></div></div>`; }).join("")}</div>
          <div class="mb-3 mt-3"><label class="form-label" for="lc_more">More places to link <span class="small text-body-secondary">(comma separated; town pages that exist are shown as cards automatically)</span></label><textarea class="form-control" id="lc_more" rows="2">${esc((lc.more_places || []).join(", "))}</textarea></div>
          <div class="row g-3 mb-3"><div class="col-lg-6"><label class="form-label" for="lc_car_area">Getting around by car</label>${richField("lc_car", lc.getting_there?.car_html || (lc.getting_there?.car ? `<p>${esc(lc.getting_there.car)}</p>` : ""), esc, { compact: true, ai: "getting_car" })}</div>
            <div class="col-lg-6"><label class="form-label" for="lc_nocar_area">Getting around without a car</label>${richField("lc_nocar", lc.getting_there?.no_car_html || (lc.getting_there?.no_car ? `<p>${esc(lc.getting_there.no_car)}</p>` : ""), esc, { compact: true, ai: "getting_nocar" })}</div></div>
        </div>
        <label class="form-label">Frequently asked questions</label>
        <div id="faqs">${(lc.faqs?.length ? lc.faqs : [["", ""]]).map(([qq, a]) => faqRow(qq, a)).join("")}</div>
        <button class="btn btn-sm btn-outline-secondary" type="button" id="addfaq">Add a question</button> <button class="btn btn-sm btn-outline-primary" type="button" id="aifaq">✦ Suggest FAQs with AI</button>
      </div></div>
      <div class="card mb-4 ads-only"><div class="card-header bg-white fw-semibold">Google Ads</div><div class="card-body">
        <p class="small text-body-secondary">Write the ads for this page here so the page and ad copy match. Copy them into Google Ads when you set up the campaign.</p>
        <div class="row g-3 mb-3">
          <div class="col-md-6"><label class="form-label" for="ad_campaign">Campaign</label><input class="form-control" id="ad_campaign" value="${esc(a.campaign || "")}" placeholder="e.g. Norfolk car meets"></div>
          <div class="col-md-6"><label class="form-label" for="ad_group">Ad group</label><input class="form-control" id="ad_group" value="${esc(a.ad_group || "")}" placeholder="e.g. Norwich"></div>
          <div class="col-12"><label class="form-label" for="ad_keywords">Keywords <span class="text-body-secondary small">(one per line)</span></label><textarea class="form-control code" id="ad_keywords" rows="4" placeholder="car meets norwich&#10;&quot;cars and coffee norfolk&quot;&#10;[car shows near me]">${esc((a.keywords || []).join("\n"))}</textarea></div>
        </div>
        <label class="form-label">Headlines <span class="text-body-secondary small">(3 to 15, max 30 characters)</span> <button type="button" class="btn btn-link btn-sm p-0 ms-2" id="aiheads">✦ Fill empty with AI</button></label>${adRows(a.headlines, 15, LIMITS.adHeadline, "headlines", "Headline")}
        <label class="form-label mt-3">Descriptions <span class="text-body-secondary small">(2 to 4, max 90 characters)</span> <button type="button" class="btn btn-link btn-sm p-0 ms-2" id="aidescs">✦ Fill empty with AI</button></label>${adRows(a.descriptions, 4, LIMITS.adDescription, "descriptions", "Description")}
        <div class="row g-3 mt-1">
          <div class="col-md-6"><label class="form-label" for="ad_path1">Display path</label><div class="input-group"><span class="input-group-text">carsandcoffee.uk/</span><input class="form-control" id="ad_path1" maxlength="15" value="${esc(a.path1 || "")}" placeholder="car-meets"><span class="input-group-text">/</span><input class="form-control" id="ad_path2" maxlength="15" value="${esc(a.path2 || "")}" placeholder="norwich"></div></div>
          <div class="col-md-2"><label class="form-label" for="utm_source">Source</label><input class="form-control" id="utm_source" value="${esc(a.utm_source || "google")}"></div>
          <div class="col-md-2"><label class="form-label" for="utm_medium">Medium</label><input class="form-control" id="utm_medium" value="${esc(a.utm_medium || "cpc")}"></div>
          <div class="col-md-2"><label class="form-label" for="utm_campaign">Campaign tag</label><input class="form-control" id="utm_campaign" value="${esc(a.utm_campaign || "")}" placeholder="norfolk-meets"></div>
          <div class="col-12"><label class="form-label">Final URL for Google Ads</label><div class="input-group"><input class="form-control" id="finalurl" readonly><button class="btn btn-outline-secondary" type="button" id="copyurl">Copy</button></div></div>
        </div>
        <label class="form-label mt-3">Ad preview</label><div class="adpreview" id="adprev"></div>
      </div></div>
    </div>
    <div class="col-xl-5"><div class="sticky-side">
      <div class="card mb-4"><div class="card-header bg-white fw-semibold">SEO optimiser</div><div class="card-body">
        <div class="mb-3"><label class="form-label" for="focus_keyword">Focus keyword</label><input class="form-control" id="focus_keyword" value="${esc(p.focus_keyword || "")}" placeholder="e.g. car meets norwich"></div>
        <div class="mb-3"><label class="form-label" for="secondary_keywords">Other keywords <span class="text-body-secondary small">(comma separated)</span></label><input class="form-control" id="secondary_keywords" value="${esc((p.secondary_keywords || []).join(", "))}" placeholder="cars and coffee norwich, norfolk car shows"></div>
        <div class="mb-3"><label class="form-label d-flex justify-content-between" for="meta_title"><span>SEO title ${aiBtn("meta_title", "meta_title")}</span><span class="count" id="c_mt"></span></label><input class="form-control" id="meta_title" maxlength="90" value="${esc(p.meta_title || "")}" placeholder="Car Meets in Norwich | Cars and Coffee UK"></div>
        <div class="mb-3"><label class="form-label d-flex justify-content-between" for="meta_description"><span>Meta description ${aiBtn("meta_description", "meta_description")}</span><span class="count" id="c_md"></span></label><textarea class="form-control" id="meta_description" rows="3" maxlength="220" placeholder="Find car meets in Norwich every month…">${esc(p.meta_description || "")}</textarea></div>
        <label class="form-label">Google preview</label><div class="serp mb-3" id="serp"></div>
        <div class="d-flex align-items-center gap-3 mb-2"><div class="score-ring" id="ring">–</div><div><div class="fw-semibold" id="grade"></div><div class="small text-body-secondary">Updates as you type</div></div></div>
        <ul class="checks" id="checks"></ul>
      </div></div>
      <div class="card mb-4"><div class="card-header bg-white fw-semibold">Settings</div><div class="card-body">
        <div class="mb-3"><label class="form-label" for="status">Status</label><select class="form-select" id="status">${["draft", "review", "published", "archived"].map((s) => `<option value="${s}" ${s === p.status ? "selected" : ""}>${{ draft: "Draft", review: "In review", published: "Live", archived: "Archived" }[s]}</option>`).join("")}</select></div>
        <div class="form-check form-switch mb-3"><input class="form-check-input" type="checkbox" id="noindex" ${p.noindex ? "checked" : ""}><label class="form-check-label" for="noindex">Hide from search engines (noindex)</label></div>
        <div class="mb-3"><label class="form-label" for="canonical_url">Canonical address <span class="text-body-secondary small">(optional)</span></label><input class="form-control" id="canonical_url" value="${esc(p.canonical_url || "")}" placeholder="Only if another page is the main version"></div>
        <div class="mb-3"><label class="form-label" for="schema_type">Structured data type</label><select class="form-select" id="schema_type">${["WebPage", "Article", "FAQPage", "CollectionPage", "LocalBusiness", "Event"].map((s) => `<option ${s === p.schema_type ? "selected" : ""}>${s}</option>`).join("")}</select></div>
        <div class="mb-0"><label class="form-label" for="og_image_path">Social share image <span class="text-body-secondary small">(optional)</span></label><input class="form-control" id="og_image_path" value="${esc(p.og_image_path || "")}" placeholder="Uses the main image if blank"></div>
        ${!isNew ? `<hr><button class="btn btn-sm btn-outline-danger" type="button" id="del">Delete page</button>` : ""}
      </div></div>
    </div></div>
  </div></form>
  <div class="modal-lite" id="pv" hidden></div>`;

  const f = $("#pf");
  wireImageInputs(f);
  const pageCtx = () => { const d = collect(); return { kind: labelType(d.page_type) + " page", title: d.title, h1: d.h1, focus_keyword: d.focus_keyword, secondary: (d.secondary_keywords || []).join(", "), place: d.town || d.county || "", county: d.county, url: d.path,
    intro: d.intro, existing: htmlText(richVal("body_html")).slice(0, 3000), words: MIN_WORDS[d.page_type] || 400 }; };
  wireRich(f, { upload: uploadSiteImage, onChange: () => { dirty = true; f.dispatchEvent(new Event("input", { bubbles: true })); }, ai: async (field, brief) => (await aiCall(field, pageCtx(), brief)).html });
  wireAiSuggest(f, pageCtx);
  $("#aifaq").onclick = async (e) => { const b = e.target; b.disabled = true; b.textContent = "✦ Thinking…";
    try { const { faqs } = await aiCall("faqs", pageCtx()); const blank = $$("[data-faq]").filter((r) => !$("[data-fq]", r).value.trim()); blank.forEach((r) => r.remove());
      faqs.forEach(([qq, a]) => $("#faqs").insertAdjacentHTML("beforeend", faqRow(qq, a))); dirty = true; f.dispatchEvent(new Event("input", { bubbles: true })); toast(`${faqs.length} questions added. Check and edit them before saving.`); }
    catch (err) { toast(err.message, true); } finally { b.disabled = false; b.textContent = "✦ Suggest FAQs with AI"; } };
  const fillAds = (field, name) => async (e) => { const b = e.target; const t = b.textContent; b.disabled = true; b.textContent = "✦ Thinking…";
    try { const { options } = await aiCall(field, pageCtx()); const max = name === "headlines" ? LIMITS.adHeadline : LIMITS.adDescription; const ok = options.filter((o) => o.length <= max);
      const empty = $$(`[data-ad="${name}"]`).filter((i) => !i.value.trim()); empty.forEach((i, k) => { if (ok[k]) i.value = ok[k]; }); dirty = true; f.dispatchEvent(new Event("input", { bubbles: true }));
      toast(ok.length ? `Filled ${Math.min(ok.length, empty.length)} empty ${name}.` : "No suggestions fitted the character limit. Try again.", !ok.length); }
    catch (err) { toast(err.message, true); } finally { b.disabled = false; b.textContent = t; } };
  $("#aiheads").onclick = fillAds("ad_headlines", "headlines"); $("#aidescs").onclick = fillAds("ad_descriptions", "descriptions");
  $("#addfaq").onclick = () => { $("#faqs").insertAdjacentHTML("beforeend", faqRow()); dirty = true; };
  $("#faqs").addEventListener("click", (e) => { if (e.target.matches("[data-rmfaq]")) { e.target.closest("[data-faq]").remove(); dirty = true; refresh(); } });
  const val = (id) => $("#" + id)?.value ?? "";
  const collect = () => {
    const ad = (name) => $$(`[data-ad="${name}"]`).map((i) => i.value.trim()).filter(Boolean);
    return {
      page_type: val("page_type"), title: val("title").trim(), path: val("path").trim(), county: val("county") || null, town: val("town").trim() || null,
      h1: val("h1").trim() || null, intro: val("intro").trim() || null, body_html: richVal("body_html") || null, body_md: htmlToMd(richVal("body_html")) || null, hero_image_path: val("hero_image_path").trim() || null,
      hero_image_alt: val("hero_image_alt").trim() || null, cta_label: val("cta_label").trim() || null, cta_url: val("cta_url").trim() || null,
      focus_keyword: val("focus_keyword").trim() || null, secondary_keywords: val("secondary_keywords").split(",").map((s) => s.trim()).filter(Boolean),
      meta_title: val("meta_title").trim() || null, meta_description: val("meta_description").trim() || null, status: val("status"),
      noindex: $("#noindex").checked, canonical_url: val("canonical_url").trim() || null, schema_type: val("schema_type"), og_image_path: val("og_image_path").trim() || null,
      content: collectLocation(),
      ads: { campaign: val("ad_campaign").trim(), ad_group: val("ad_group").trim(), keywords: val("ad_keywords").split("\n").map((s) => s.trim()).filter(Boolean),
        headlines: ad("headlines"), descriptions: ad("descriptions"), path1: val("ad_path1").trim(), path2: val("ad_path2").trim(),
        utm_source: val("utm_source").trim(), utm_medium: val("utm_medium").trim(), utm_campaign: val("utm_campaign").trim() },
    };
  };
  function collectLocation() {
    if (val("page_type") !== "location") return p.content || {};
    const list = (id) => val(id).split(",").map((x) => x.trim()).filter(Boolean);
    const out = { ...(p.content || {}), label: val("lc_label").trim() };
    out.faqs = $$("[data-faq]").map((r) => [$("[data-fq]", r).value.trim(), $("[data-fa]", r).value.trim()]).filter(([qq, an]) => qq && an);
    if (!val("county")) { out.norfolk_towns = list("lc_ntowns"); out.suffolk_towns = list("lc_stowns"); out.coming_soon = val("lc_soon").trim(); return out; }
    out.stats = [0, 1, 2, 3].map((i) => [$(`[data-stat-n="${i}"]`).value.trim(), $(`[data-stat-l="${i}"]`).value.trim()]).filter(([n]) => n);
    out.scene_html = richVal("lc_scene"); out.scene = htmlText(out.scene_html).split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    out.interests = list("lc_interests");
    out.drives = $$("[data-drive]").map((r, i) => ({ title: $('[data-dk="title"]', r).value.trim(), distance: $('[data-dk="distance"]', r).value.trim(), text: $('[data-dk="text"]', r).value.trim(), image: $("#drive_img_" + i).value.trim() })).filter((d) => d.title);
    out.more_places = list("lc_more");
    const car = richVal("lc_car"), nocar = richVal("lc_nocar");
    out.getting_there = { car_html: car, no_car_html: nocar, car: htmlText(car).replace(/\s*\n\s*/g, " ").trim(), no_car: htmlText(nocar).replace(/\s*\n\s*/g, " ").trim() };
    return out;
  }
  const countEl = (el, n, [lo, hi]) => { el.textContent = `${n} / ${hi}`; el.className = "count " + (n === 0 ? "" : n > hi ? "bad" : n < lo ? "warn" : "good"); };
  function refresh() {
    const d = collect(); const t = d.page_type;
    $$(".loc-only").forEach((e) => (e.hidden = t !== "location")); $$(".ads-only").forEach((e) => (e.hidden = t !== "landing"));
    $$(".locsec").forEach((e) => (e.hidden = t !== "location")); $$(".hub-only").forEach((e) => (e.hidden = !!d.county)); $$(".place-only").forEach((e) => (e.hidden = !d.county));
    $("#typehelp").textContent = TYPE_HELP[t];
    countEl($("#c_mt"), (d.meta_title || d.title).length, LIMITS.metaTitle); countEl($("#c_md"), (d.meta_description || "").length, LIMITS.metaDesc);
    const url = SITE + (d.path || "/");
    $("#serp").innerHTML = `<div class="site"><img src="/favicon.svg" alt=""><span>Cars and Coffee UK<small>${esc(url.replace("https://", "").replace(/\//g, " › ").replace(" › ", " › ").slice(0, 70))}</small></span></div>
      <div class="t">${esc(d.meta_title || d.title || "Your SEO title")}</div><div class="d">${esc((d.meta_description || "Write a meta description to control the text Google shows here.").slice(0, 160))}${(d.meta_description || "").length > 160 ? "…" : ""}</div>`;
    const lcx = d.content || {};
    const r = analyse(t === "location" ? locationScoreInput(d) : d);
    const ring = $("#ring"); ring.textContent = r.score; ring.className = "score-ring " + r.grade;
    $("#grade").textContent = { good: "Good to go", ok: "Nearly there", bad: "Needs work" }[r.grade];
    $("#checks").innerHTML = r.checks.map((c) => `<li class="${c.status}"><span class="dot">${{ pass: "✓", warn: "!", fail: "✕", info: "i" }[c.status]}</span><span>${esc(c.label)}${c.tip ? `<span class="tip">${esc(c.tip)}</span>` : ""}</span></li>`).join("");
    $("#wc").textContent = `${r.words} words`;
    for (const name of ["headlines", "descriptions"]) {
      const max = name === "headlines" ? LIMITS.adHeadline : LIMITS.adDescription;
      $$(`[data-ad="${name}"]`).forEach((i) => { const c = $(`[data-for="${name}-${i.dataset.i}"]`); const n = i.value.length; c.textContent = n ? `${n}/${max}` : ""; c.className = "count " + (n > max ? "bad" : n ? "good" : ""); });
    }
    const final = utmUrl(url, d.ads); $("#finalurl").value = final;
    const hs = d.ads.headlines.slice(0, 3), ds = d.ads.descriptions.slice(0, 2);
    $("#adprev").innerHTML = `<div class="spons">Sponsored</div><div class="small">carsandcoffee.uk${d.ads.path1 ? "/" + esc(d.ads.path1) : ""}${d.ads.path2 ? "/" + esc(d.ads.path2) : ""}</div>
      <div class="t">${hs.length ? hs.map(esc).join(" | ") : "Headline 1 | Headline 2 | Headline 3"}</div><div class="d">${ds.length ? ds.map(esc).join(" ") : "Description 1. Description 2."}</div>`;
    return r;
  }
  f.addEventListener("input", (e) => {
    dirty = true;
    if (e.target.id === "path") pathTouched = true;
    if (!pathTouched && ["title", "page_type", "town", "county"].includes(e.target.id)) {
      const d = collect();
      const base = d.page_type === "location" && d.county ? (d.town ? `/${slugify(d.county)}/${slugify(d.town)}` : `/${slugify(d.county)}`) : (PATH_PREFIX[d.page_type] || "/") + slugify(d.title);
      $("#path").value = base.replace(/\/+$/, "") || "/";
    }
    refresh();
  });
  f.addEventListener("change", refresh);
  refresh();
  $("#copyurl").onclick = async () => { try { await navigator.clipboard.writeText($("#finalurl").value); toast("Final URL copied"); } catch { $("#finalurl").select(); } };
  $("#prev").onclick = () => {
    const d = collect(); const pv = $("#pv");
    pv.hidden = false;
    pv.innerHTML = `<div class="modal-lite-box card"><div class="card-header bg-white d-flex justify-content-between align-items-center"><strong>Preview</strong><button class="btn-close" type="button" aria-label="Close"></button></div>
      <div class="card-body md-preview">${d.hero_image_path ? `<img src="${esc(d.hero_image_path.startsWith("/") ? SITE + d.hero_image_path : d.hero_image_path)}" alt="${esc(d.hero_image_alt || "")}" class="mb-3 rounded">` : ""}<h1>${esc(d.h1 || d.title)}</h1>${d.intro ? `<p class="lead">${esc(d.intro)}</p>` : ""}${(d.body_html || md(d.body_md))}${d.cta_label ? `<p><span class="btn btn-primary">${esc(d.cta_label)}</span></p>` : ""}</div></div>`;
    pv.onclick = (e) => { if (e.target === pv || e.target.closest(".btn-close")) pv.hidden = true; };
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = collect();
    const wanted = e.submitter?.dataset.status; if (wanted === "published") d.status = "published"; else if (wanted === "draft" && d.status === "published" && isNew) d.status = "draft";
    if (wanted === "draft" && !isNew && p.status === "published") d.status = $("#status").value;
    if (!d.title) { toast("Give the page a name", true); $("#title").focus(); return; }
    if (!/^\/[a-z0-9/-]*$/.test(d.path)) { toast("The page address can only use lower-case letters, numbers, hyphens and slashes, and must start with /", true); $("#path").focus(); return; }
    d.seo_score = Number($("#ring").textContent) || analyse(d).score;
    const btns = $$("button[type=submit]", f); btns.forEach((b) => (b.disabled = true));
    const res = isNew ? await site().from("pages").insert(d).select("id").single() : await site().from("pages").update(d).eq("id", id).select("id").single();
    btns.forEach((b) => (b.disabled = false));
    if (res.error) { return toast(/duplicate|unique/i.test(res.error.message) ? "Another page already uses that address" : res.error.message, true); }
    dirty = false;
    toast(d.status === "published" ? "Saved and live" : "Saved");
    if (isNew) go(`/pages/${res.data.id}`, true); else render();
  };
  if ($("#del")) {
    let armed = false;
    $("#del").onclick = async () => {
      if (!armed) { armed = true; $("#del").textContent = "Click again to delete for good"; $("#del").classList.replace("btn-outline-danger", "btn-danger"); setTimeout(() => { armed = false; const b = $("#del"); if (b) { b.textContent = "Delete page"; b.classList.replace("btn-danger", "btn-outline-danger"); } }, 4000); return; }
      const { error } = await site().from("pages").delete().eq("id", id); if (error) return oops(error);
      dirty = false; toast("Page deleted"); go(p.page_type === "landing" ? "/pages?type=landing" : "/pages", true);
    };
  }
});

const faqRow = (qq = "", a = "") => `<div class="border rounded p-2 mb-2" data-faq><input class="form-control mb-2" data-fq value="${esc(qq)}" placeholder="Question"><textarea class="form-control" data-fa rows="2" placeholder="Answer">${esc(a)}</textarea><button type="button" class="btn btn-sm btn-link text-danger p-0 mt-1" data-rmfaq>Remove</button></div>`;

// ---------- generic content editors ----------
const F = (name, label, type = "text", extra = {}) => ({ name, label, type, ...extra });
// Reference options; shop categories show their full path (Car parts › Engine › Turbos) so deep trees stay clear.
async function refRows(f) {
  if (f.table !== "product_categories") { const { data } = await site().from(f.table).select(`id,${f.show}`).order(f.show); return data || []; }
  const { data } = await site().from("product_categories").select("id,name,parent_id,sort");
  const rows = data || [], by = Object.fromEntries(rows.map((r) => [r.id, r]));
  const path = (r) => { const out = []; const seen = new Set(); let x = r; while (x && !seen.has(x.id)) { seen.add(x.id); out.unshift(x.name); x = by[x.parent_id]; } return out.join(" › "); };
  return rows.map((r) => ({ id: r.id, name: path(r) })).sort((a, b) => a.name.localeCompare(b.name));
}
const CONTENT = {
  homepage_blocks: { title: "Homepage blocks", pk: "key", order: ["position", true], list: ["title", "position", "enabled"], noCreate: true, noDelete: true,
    help: "Turn homepage sections on or off and change their order (lower numbers appear first). Schedule a block by setting start and end times.",
    fields: [F("key", "Key", "readonly"), F("title", "Name"), F("position", "Position", "number"), F("enabled", "Shown on the homepage", "bool"), F("starts_at", "Show from", "datetime"), F("ends_at", "Show until", "datetime")] },
  events: { title: "Events", order: ["starts_at", true], list: ["title", "starts_at", "venue", "ticket_status", "published"], view: "/events/",
    help: "The homepage shows the short card (title, date, venue, price). Clicking it opens the full event page with everything below.",
    fields: [F("h_basics", "The basics", "heading"), F("title", "Title", "text", { required: true }), F("slug", "Address (slug)", "slug", { from: "title" }), F("event_type", "Type", "select", { options: ["meet", "tour", "garage", "watch", "race", "track", "show"] }),
      F("starts_at", "Starts", "datetime", { required: true }), F("ends_at", "Ends", "datetime", { required: true }), F("venue_id", "Venue (for the map and directions)", "ref", { table: "venues", show: "name" }), F("venue", "Venue name as shown on cards", "text", { required: true }), F("county", "County", "select", { options: ["Norfolk", "Suffolk", "Cambridgeshire", "Essex"] }), F("town", "Town"), F("region", "Region"),
      F("price_pence", "Price (pence, 0 for free)", "number"), F("ticket_status", "Tickets", "select", { options: ["free_rsvp", "on_sale", "selling_fast", "sold_out"] }),
      F("ticket_url", "Booking or RSVP link", "text", { ph: "https://… (leave empty if booking isn't open yet)" }), F("members_only", "Members only", "bool"), F("image_path", "Image", "image"), F("image_alt", "Image description"), F("published", "Published", "bool", { def: true }),
      F("h_page", "Event page", "heading", { note: "Shown on the event's own page." }), F("summary", "Short summary (one or two sentences, shown at the top)", "textarea", { ai: "summary" }), F("body_html", "Full description", "rich", { ai: "body" }),
      F("schedule", "On the day (one line each, start with the time, e.g. 07:30 Display parking opens)", "lines"), F("what_to_bring", "What to bring (one item per line)", "lines"), F("accessibility", "Access and facilities", "textarea", { ph: "Step-free access, toilets, blue-badge parking…" }),
      F("h_seo", "Search engines", "heading", { note: "Optional. Left empty, the title and summary are used. The SEO score below updates as you type." }), F("focus_keyword", "Focus keyword", "text", { ph: "e.g. car meet Norfolk" }), F("meta_title", "Google title", "text", { ai: "meta_title" }), F("meta_description", "Google description", "textarea", { ai: "meta_description" })] },
  articles: { title: "News", order: ["published_at", false], list: ["title", "category", "published_at", "status", "featured"], view: "/news/",
    fields: [F("title", "Headline", "text", { required: true }), F("slug", "Address (slug)", "slug", { from: "title" }), F("category", "Category", "text", { required: true, ph: "Restoration, WEC, Technical…" }), F("author", "Author", "text", { ph: "Cars and Coffee team" }),
      F("excerpt", "Summary (shown on cards and under the headline)", "textarea", { ai: "summary" }), F("body_html", "Article", "rich", { ai: "body" }), F("image_path", "Main photo (the header)", "image"), F("image_alt", "Main photo description"),
      F("gallery", "Photo gallery (shown under the article; visitors can open each photo full screen)", "gallery"), F("read_minutes", "Reading time (minutes)", "number"),
      F("featured", "Featured on the homepage", "bool"), F("status", "Status", "select", { options: ["draft", "published"] }), F("published_at", "Publish date", "date"),
      F("h_seo", "Search engines", "heading", { note: "Optional. Left empty, the headline and summary are used. The SEO score below updates as you type." }), F("focus_keyword", "Focus keyword", "text", { ph: "e.g. classic car restoration" }), F("meta_title", "Google title", "text", { ai: "meta_title" }), F("meta_description", "Google description", "textarea", { ai: "meta_description" })] },
  guides: { title: "Guides", order: ["sort", true], list: ["title", "slug", "sort", "status"], view: "/guides/",
    help: "Practical guides such as Your first car meet. They appear at /guides and can be linked from any page.",
    fields: [F("title", "Title", "text", { required: true }), F("slug", "Address (slug)", "slug", { from: "title" }), F("intro", "Introduction (shown under the title)", "textarea", { ai: "intro" }), F("body_html", "Guide", "rich", { ai: "body" }),
      F("image_path", "Header image", "image"), F("image_alt", "Image description"), F("read_minutes", "Reading time (minutes)", "number"), F("sort", "Order", "number", { def: 100 }), F("status", "Status", "select", { options: ["draft", "published"] }),
      F("h_seo", "Search engines", "heading", { note: "Optional. Left empty, the title and introduction are used. The SEO score below updates as you type." }), F("focus_keyword", "Focus keyword", "text", { ph: "e.g. first car meet" }), F("meta_title", "Google title", "text", { ai: "meta_title" }), F("meta_description", "Google description", "textarea", { ai: "meta_description" })] },
  faqs: { title: "FAQs", idType: "int", order: ["sort", true], list: ["question", "sort", "published"],
    fields: [F("question", "Question", "text", { required: true }), F("answer", "Answer", "textarea", { required: true }), F("sort", "Order", "number"), F("published", "Published", "bool", { def: true })] },
  partners: { title: "Partners", order: ["sort", true], list: ["name", "tagline", "sort", "active"],
    fields: [F("name", "Name", "text", { required: true }), F("slug", "Slug", "slug", { from: "name" }), F("tagline", "Tagline"), F("page_path", "Website"), F("logo_path", "Logo (for light backgrounds)", "image"), F("logo_dark_path", "Logo (for dark backgrounds)", "image"), F("sort", "Order", "number"), F("active", "Active", "bool", { def: true })] },
  partner_features: { title: "Partner features", order: ["starts_at", false], list: ["title", "block_key", "starts_at", "active"],
    help: "The Detail of the Month, Livery of the Week and Race Night blocks on the homepage.",
    fields: [F("partner_id", "Partner", "ref", { table: "partners", show: "name", required: true }), F("block_key", "Homepage block", "select", { options: ["detail_of_month", "livery_of_week", "race_night"] }), F("title", "Title", "text", { required: true }),
      F("body", "Text", "textarea"), F("extra", "Extra line"), F("image_path", "Image", "image"), F("image_alt", "Image description"), F("cta_label", "Button 1 text"), F("cta_url", "Button 1 link"),
      F("cta2_label", "Button 2 text"), F("cta2_url", "Button 2 link"), F("countdown_to", "Countdown to", "datetime"), F("starts_at", "Show from", "datetime"), F("ends_at", "Show until", "datetime"), F("active", "Active", "bool", { def: true })] },
  directory_listings: { title: "Directory", order: ["created_at", false], list: ["name", "town", "status", "unclaimed", "featured"], view: "/directory/", seo: true,
    help: "Businesses in the directory. New submissions from the website arrive as Pending: check them, add details, then set Status to Published.",
    fields: [F("h_basics", "The business", "heading"), F("name", "Business name", "text", { required: true }), F("slug", "Slug", "slug", { from: "name" }), F("services", "Services (comma separated)", "array"),
      F("summary", "Short summary (shown on cards and in Google)", "textarea", { ai: "summary" }), F("body_html", "About the business", "rich", { ai: "body" }),
      F("image_path", "Main photo", "image"), F("image_alt", "Photo description"), F("logo_path", "Logo", "image"),
      F("h_sections", "Page sections", "heading", { note: "Each section only shows on the business page when it has something in it." }),
      F("offerings", "Services and products (name, short description, optional price and photo)", "offerings"), F("gallery", "Photo gallery", "gallery"), F("video_url", "Video (YouTube or Vimeo link)", "text", { ph: "https://www.youtube.com/watch?v=…" }),
      F("enquiries_enabled", "Show the enquiry form", "bool", { def: true }), F("lead_email", "Send enquiries to (private, never shown)", "lead"), F("reviews_enabled", "Show reviews and the review form", "bool", { def: true }),
      F("h_contact", "Contact and location", "heading"), F("website", "Website"), F("phone", "Public phone"), F("show_phone", "Show the phone number (visitors click to reveal it)", "bool", { def: true }), F("email", "Public email"),
      F("instagram", "Instagram (handle or link)"), F("facebook", "Facebook (page name or link)"), F("youtube", "YouTube (channel handle or link)"), F("tiktok", "TikTok (handle or link)"), F("x_url", "X (handle or link)"), F("linkedin", "LinkedIn (company page or link)"),
      F("hours", "Opening times", "hours"), F("opening_hours", "Opening notes (optional, one per line, e.g. Closed bank holidays)", "lines"),
      F("address_line", "Street address (shown publicly)"), F("town", "Town"), F("county", "County", "select", { options: ["Norfolk", "Suffolk", "Cambridgeshire", "Essex"] }), F("postcode", "Postcode", "postcode"), F("lat", "Latitude", "number", { step: "any" }), F("lng", "Longitude", "number", { step: "any" }), F("approximate", "Map pin is only approximate", "bool"), F("region", "Region"),
      F("h_status", "Status and promotion", "heading"), F("status", "Status", "select", { options: ["pending", "published", "rejected"] }), F("unclaimed", "Not yet claimed by the owner (shows a Claim this business button)", "bool", { short: "Unclaimed" }), F("company_number", "Companies House number"), F("checked_at", "Checked on", "date"), F("featured", "Featured", "bool"), F("featured_until", "Featured until", "date"),
      F("h_seo", "Search engines", "heading", { note: "Optional. Left empty, the name and summary are used." }), F("focus_keyword", "Focus keyword", "text", { ph: "e.g. car detailing norwich" }), F("meta_title", "Google title", "text", { ai: "meta_title" }), F("meta_description", "Google description", "textarea", { ai: "meta_description" })] },
  sponsored_slots: { title: "Sponsored slots", order: ["starts_at", false], list: ["advertiser", "title", "starts_at", "ends_at", "status"],
    fields: [F("advertiser", "Advertiser", "text", { required: true }), F("title", "Headline", "text", { required: true }), F("body", "Text", "textarea"), F("image_path", "Image", "image"), F("image_alt", "Image description"),
      F("cta_label", "Button text"), F("cta_url", "Button link"), F("starts_at", "Starts", "datetime", { required: true }), F("ends_at", "Ends", "datetime", { required: true }),
      F("status", "Status", "select", { options: ["pending", "approved", "rejected", "paused"] }), F("impressions", "Impressions", "readonly"), F("clicks", "Clicks", "readonly")] },
  venues: { title: "Venues", order: ["name", true], list: ["name", "town", "county", "approximate", "active"],
    help: "Places where meets happen. Events pick a venue, and venues appear on location page maps with directions. Enter a postcode and press Look up to place the pin exactly.",
    fields: [F("name", "Venue name", "text", { required: true }), F("slug", "Slug", "slug", { from: "name" }), F("address_line", "Street address"), F("town", "Town"),
      F("county", "County", "select", { options: ["Norfolk", "Suffolk", "Cambridgeshire", "Essex"] }), F("postcode", "Postcode", "postcode"), F("lat", "Latitude", "number", { step: "any" }), F("lng", "Longitude", "number", { step: "any" }),
      F("approximate", "Pin is only approximate", "bool"), F("parking", "Parking", "textarea"), F("access", "Accessibility", "textarea"), F("website", "Website"), F("notes", "Team notes (not shown)", "textarea"), F("active", "Active", "bool", { def: true })] },
  community_highlights: { title: "Community posts", order: ["sort", true], list: ["title", "handle", "sort", "active"],
    help: "The three posts shown in “From the community” on the homepage (lowest order numbers first).",
    fields: [F("title", "Title", "text", { required: true }), F("handle", "Member handle", "text", { required: true, ph: "@norfolkseries" }), F("posted_label", "When (shown next to the handle)", "text", { ph: "3 days ago" }),
      F("excerpt", "Summary", "textarea"), F("image_path", "Image", "image"), F("image_alt", "Image description"), F("post_url", "Link to the post", "text", { ph: "https://club.carsandcoffee.uk/…" }), F("sort", "Order", "number"), F("active", "Shown", "bool", { def: true })] },
  products: { title: "Products", order: ["created_at", false], list: ["name", "shop_id", "price_pence", "stock_status", "featured", "active"], view: "/shop/", seo: true,
    help: "Every product in the shop. Products with no shop are club merch; partner products also show on their shop page. Featured products appear on the shop home.",
    fields: [F("h_basics", "The product", "heading"), F("name", "Product name", "text", { required: true }), F("slug", "Address (slug)", "slug", { from: "name" }),
      F("shop_id", "Shop (leave empty for club merch)", "ref", { table: "shops", show: "name", empty: "Club merch", short: "Shop" }), F("category_id", "Category", "ref", { table: "product_categories", show: "name" }),
      F("summary", "Short description (shown under the price and in Google)", "textarea", { ai: "summary" }), F("body_html", "Full details", "rich", { ai: "body" }),
      F("image_path", "Main photo", "image"), F("image_alt", "Photo description"), F("gallery", "More photos (add as many as you like; drag to reorder)", "gallery"),
      F("h_price", "Price and stock", "heading"), F("price_pence", "Price (pence, e.g. 2200 for £22)", "number", { required: true, short: "Price" }), F("compare_at_pence", "Was price (pence, shows as a sale)", "number"), F("member_price_pence", "Member price (pence)", "number"),
      F("stock_status", "Availability", "select", { options: ["in_stock", "low", "out", "preorder"] }), F("stock_qty", "Stock count (optional, not shown)", "number"), F("condition", "Condition", "select", { options: ["new", "used", "refurbished"] }),
      F("options", "Options (one per line, e.g. Size: S, M, L, XL)", "options"), F("brand", "Brand"), F("sku", "Part number or SKU"), F("tags", "Search tags (comma separated)", "array"),
      F("buy_url", "Buy link (the product on the shop's own website; leave empty to show an enquiry button)", "text", { ph: "https://…" }),
      F("h_status", "Promotion and status", "heading"), F("badge", "Badge on the photo", "text", { ph: "Best seller, New…" }), F("featured", "Featured on the shop home", "bool", { short: "Featured" }), F("sort", "Order (lower first)", "number", { def: 100 }), F("units_sold_30d", "Sold in the last 30 days (homepage best sellers)", "number"), F("active", "On sale", "bool", { def: true }),
      F("h_seo", "Search engines", "heading", { note: "Optional. Left empty, the name and short description are used." }), F("meta_title", "Google title", "text", { ai: "meta_title" }), F("meta_description", "Google description", "textarea", { ai: "meta_description" })] },
  product_categories: { title: "Shop categories", order: ["sort", true], list: ["name", "parent_id", "sort", "active"], view: "/shop/category/",
    help: "Categories can go as many levels deep as you need, e.g. Car parts › Engine › Turbos. Pick a parent to put a category inside another. Top-level categories show as tiles on the shop home, and the whole tree shows down the left of category pages.",
    fields: [F("name", "Category name", "text", { required: true }), F("slug", "Address (slug)", "slug", { from: "name" }), F("parent_id", "Parent category (leave empty for a top-level category)", "ref", { table: "product_categories", show: "name", short: "Parent", empty: "Top level" }),
      F("description", "Description (shown on the category page)", "textarea"), F("image_path", "Tile image (optional)", "image"), F("sort", "Order", "number", { def: 100 }), F("active", "Shown", "bool", { def: true }),
      F("meta_title", "Google title"), F("meta_description", "Google description", "textarea")] },
  shops: { title: "Partner shops", order: ["name", true], list: ["name", "town", "status", "featured"], view: "/shops/",
    help: "Partner storefronts. A shop is public when its status is Live and its plan is on trial or active (see Plan and billing below). Partners can edit their own shop and products once you add them under Shop managers.",
    fields: [F("h_basics", "The shop", "heading"), F("name", "Shop name", "text", { required: true }), F("slug", "Address (slug)", "slug", { from: "name" }), F("tagline", "Tagline (one line)"),
      F("about_html", "About the shop", "rich", { ai: "body" }), F("logo_path", "Logo", "image"), F("banner_path", "Banner photo (wide)", "image"),
      F("h_contact", "Contact and links", "heading"), F("website", "Website"), F("email", "Public email"), F("phone", "Public phone"), F("socials", "Social links (one per line, e.g. instagram: https://instagram.com/…)", "socials"),
      F("town", "Town"), F("county", "County", "select", { options: ["", "Norfolk", "Suffolk", "Cambridgeshire", "Essex"] }),
      F("partner_id", "Linked partner (optional)", "ref", { table: "partners", show: "name" }), F("directory_listing_id", "Linked directory listing (optional)", "ref", { table: "directory_listings", show: "name" }),
      F("h_status", "Status and promotion", "heading"), F("status", "Status", "select", { options: ["draft", "live", "paused"] }), F("featured", "Featured shop on the shop home", "bool", { short: "Featured" }), F("featured_order", "Featured order (lower first)", "number", { def: 0 }),
      F("meta_title", "Google title"), F("meta_description", "Google description", "textarea")] },
  orders: { title: "Orders", order: ["created_at", false], list: ["ref", "name", "total_pence", "created_at", "status"], noCreate: true,
    help: "Shop orders. Payment isn't taken online yet: once sellers confirm, send the customer a payment link and set the status to Paid.",
    fields: [F("ref", "Order", "readonly"), F("created_at", "Placed", "readonly"), F("status", "Status", "select", { options: ["pending_payment", "paid", "processing", "shipped", "completed", "cancelled", "refunded"] }),
      F("name", "Customer", "readonly"), F("email", "Email", "readonly"), F("phone", "Phone", "readonly"),
      F("address_line1", "Address line 1", "readonly"), F("address_line2", "Address line 2", "readonly"), F("town", "Town", "readonly"), F("county", "County", "readonly"), F("postcode", "Postcode", "readonly"),
      F("notes", "Customer notes", "readonly_long"), F("total_pence", "Total (pence)", "readonly", { short: "Total" }), F("commission_pence", "Commission (pence)", "readonly"),
      F("payment_provider", "Payment method"), F("payment_ref", "Payment reference"), F("paid_at", "Paid on", "datetime"), F("team_notes", "Team notes (not shared)", "textarea")] },
  my_orders: { title: "My orders", table: "order_items", noAi: true, noCreate: true, noDelete: true, order: ["id", false], list: ["name", "qty", "line_pence", "status"],
    filter: (qq) => qq.in("shop_id", state.myShops.map((x) => x.id)),
    help: "Orders for your products. Confirm each line when you have stock, then add tracking when you send it. We take payment from the customer and pay you after commission.",
    fields: [F("name", "Product", "readonly"), F("qty", "Quantity", "readonly", { short: "Qty" }), F("unit_pence", "Unit price (pence)", "readonly"), F("line_pence", "Line total (pence)", "readonly", { short: "Total" }), F("commission_pence", "Commission (pence)", "readonly"),
      F("status", "Status", "select", { options: ["new", "confirmed", "shipped", "cancelled"] }), F("tracking", "Tracking number or courier link")] },
  my_products: { title: "My products", table: "products", noAi: true, order: ["created_at", false], list: ["name", "shop_id", "price_pence", "stock_status", "active"], view: "/shop/",
    filter: (qq) => qq.in("shop_id", state.myShops.map((x) => x.id)),
    help: "Your products show on your shop page and across the Cars and Coffee UK shop. Switch “On sale” off to hide a product without deleting it.",
    fields: [F("h_basics", "The product", "heading"), F("name", "Product name", "text", { required: true }), F("slug", "Address (slug)", "slug", { from: "name" }),
      F("shop_id", "Shop", "ref", { table: "shops", show: "name", required: true, rows: () => state.myShops, short: "Shop" }), F("category_id", "Category", "ref", { table: "product_categories", show: "name" }),
      F("summary", "Short description (shown under the price and in Google)", "textarea"), F("body_html", "Full details", "rich"),
      F("image_path", "Main photo", "image"), F("image_alt", "Photo description"), F("gallery", "More photos (add as many as you like; drag to reorder)", "gallery"),
      F("h_price", "Price and stock", "heading"), F("price_pence", "Price (pence, e.g. 2200 for £22)", "number", { required: true, short: "Price" }), F("compare_at_pence", "Was price (pence, shows as a sale)", "number"),
      F("stock_status", "Availability", "select", { options: ["in_stock", "low", "out", "preorder"] }), F("stock_qty", "Stock count (optional, not shown)", "number"), F("condition", "Condition", "select", { options: ["new", "used", "refurbished"] }),
      F("options", "Options (one per line, e.g. Size: S, M, L, XL)", "options"), F("brand", "Brand"), F("sku", "Part number or SKU"), F("tags", "Search tags (comma separated)", "array"),
      F("buy_url", "Buy link (this product on your own website; leave empty to show an enquiry button)", "text", { ph: "https://…" }),
      F("badge", "Badge on the photo", "text", { ph: "New, Sale…" }), F("sort", "Order on your shop page (lower first)", "number", { def: 100 }), F("active", "On sale", "bool", { def: true }),
      F("h_seo", "Search engines", "heading", { note: "Optional. Left empty, the name and short description are used." }), F("meta_title", "Google title"), F("meta_description", "Google description", "textarea")] },
  my_shop: { title: "Shop page", table: "shops", noAi: true, noCreate: true, noDelete: true, order: ["name", true], list: ["name"], view: "/shops/",
    help: "Your storefront at carsandcoffee.uk/shops/… Set the status to Live when you're ready for people to see it.",
    fields: [F("name", "Shop name", "text", { required: true }), F("tagline", "Tagline (one line)"), F("about_html", "About the shop", "rich"), F("logo_path", "Logo", "image"), F("banner_path", "Banner photo (wide)", "image"),
      F("website", "Website"), F("email", "Public email"), F("phone", "Public phone"), F("socials", "Social links (one per line, e.g. instagram: https://instagram.com/…)", "socials"),
      F("town", "Town"), F("county", "County", "select", { options: ["", "Norfolk", "Suffolk", "Cambridgeshire", "Essex"] }), F("status", "Status", "select", { options: ["draft", "live", "paused"] }),
      F("meta_title", "Google title"), F("meta_description", "Google description", "textarea")] },
  my_listing: { title: "Business profile", table: "directory_listings", noAi: true, noCreate: true, noDelete: true, order: ["name", true], list: ["name"], view: "/directory/",
    help: "Everything on your business page at carsandcoffee.uk/directory/… Each section only appears on your page once it has something in it. The more you add, the more you'll be found.",
    fields: [F("h_basics", "Your business", "heading"), F("name", "Business name", "text", { required: true }), F("services", "Services (comma separated, e.g. Detailing, Ceramic coating)", "array"),
      F("summary", "Short summary (one or two sentences, shown on cards and in Google)", "textarea"), F("body_html", "About your business (who you are, what you specialise in, why people choose you)", "rich"),
      F("logo_path", "Logo", "image"), F("image_path", "Main photo (wide, shown at the top of your page)", "image"), F("image_alt", "Main photo description (for people who can't see it)"),
      F("h_offer", "Services, products and prices", "heading", { note: "Add each service or product with a short description, an optional price (e.g. From £150) and a photo." }),
      F("offerings", "Services and products", "offerings"),
      F("h_media", "Photos and video", "heading", { note: "Show off your work. Add as many photos as you like and drag to reorder." }),
      F("gallery", "Photo gallery", "gallery"), F("video_url", "Video (YouTube or Vimeo link)", "text", { ph: "https://www.youtube.com/watch?v=…" }),
      F("h_contact", "Contact and location", "heading"), F("website", "Website"), F("phone", "Public phone"), F("show_phone", "Show the phone number (visitors click to reveal it)", "bool", { def: true }), F("email", "Public email"),
      F("address_line", "Street address (shown publicly)"), F("town", "Town", "text", { required: true }), F("county", "County", "select", { options: ["Norfolk", "Suffolk", "Cambridgeshire", "Essex"] }), F("postcode", "Postcode", "postcode"),
      F("lat", "Latitude (filled in by Look up)", "number", { step: "any" }), F("lng", "Longitude (filled in by Look up)", "number", { step: "any" }), F("approximate", "Only show my approximate area on the map", "bool"),
      F("h_hours", "Opening times", "heading"), F("hours", "Opening times", "hours"), F("opening_hours", "Opening notes (optional, one per line, e.g. Closed bank holidays, Evenings by appointment)", "lines"),
      F("h_social", "Social media", "heading"), F("instagram", "Instagram (handle or link)"), F("facebook", "Facebook (page name or link)"), F("youtube", "YouTube (channel handle or link)"), F("tiktok", "TikTok (handle or link)"), F("x_url", "X (handle or link)"), F("linkedin", "LinkedIn (company page or link)"),
      F("h_leads", "Enquiries and reviews", "heading"), F("enquiries_enabled", "Show an enquiry form on my page", "bool", { def: true }), F("lead_email", "Send enquiries to", "mylead"), F("reviews_enabled", "Show reviews and let customers leave one", "bool", { def: true }),
      F("h_seo", "Search engines (optional)", "heading", { note: "Left empty, your business name and summary are used." }), F("meta_title", "Google title"), F("meta_description", "Google description", "textarea")] },
  my_leads: { title: "Enquiries", table: "directory_leads", noAi: true, noCreate: true, noDelete: true, order: ["created_at", false], list: ["name", "email", "created_at"],
    filter: (qq) => qq.in("listing_id", (state.myListings || []).map((x) => x.id)),
    help: "Messages people sent from the enquiry form on your business page. Reply to them by email.",
    fields: [F("name", "From", "readonly"), F("email", "Email", "readonly"), F("phone", "Phone", "readonly"), F("created_at", "Sent", "readonly", { short: "Sent" }), F("message", "Message", "readonly_long")] },
  my_reviews: { title: "Reviews", table: "directory_reviews", noAi: true, noCreate: true, noDelete: true, order: ["created_at", false], list: ["name", "rating", "status", "created_at"],
    filter: (qq) => qq.in("listing_id", (state.myListings || []).map((x) => x.id)),
    help: "Reviews of your business. Our team checks each review before it appears. Add a public reply to thank people or answer a concern: it shows under the review on your page.",
    fields: [F("name", "From", "readonly"), F("rating", "Stars", "readonly"), F("status", "Status", "readonly"), F("created_at", "Received", "readonly", { short: "Received" }), F("body", "Review", "readonly_long"),
      F("owner_reply", "Your public reply (optional)", "textarea", { ph: "Thanks for the kind words…" })] },
  gallery_items: { title: "Gallery", order: ["sort", true], list: ["title", "sort", "featured"],
    help: "Each gallery has its own page at /galleries/… The homepage shows the first five featured galleries.", view: "/galleries/",
    fields: [F("title", "Title", "text", { required: true }), F("slug", "Slug", "slug", { from: "title" }), F("description", "Short description (shown on the gallery page)", "textarea"), F("image_path", "Cover photo", "image", { required: true }), F("image_alt", "Cover photo description", "text", { required: true }),
      F("photos", "More photos (shown on the gallery page with a full-screen viewer)", "gallery"), F("sort", "Order", "number"), F("featured", "Show on the homepage", "bool", { def: true })] },
  site_stats: { title: "Stats", pk: "key", order: ["key", true], list: ["label", "value", "is_sample"],
    help: "The numbers in the “Why join” block.",
    fields: [F("key", "Key", "slug", { from: "label" }), F("label", "Label", "text", { required: true, ph: "members" }), F("value", "Number", "text", { required: true, ph: "1,240" }), F("is_sample", "Sample figure (not real yet)", "bool")] },
  directory_services: { title: "Directory services", idType: "int", order: ["sort", true], list: ["name", "slug", "sort"],
    help: "The service tiles and search options in the directory block.",
    fields: [F("name", "Service", "text", { required: true }), F("slug", "Slug", "slug", { from: "name" }), F("sort", "Order", "number")] },
  directory_regions: { title: "Directory areas", idType: "int", order: ["sort", true], list: ["name", "slug", "sort"],
    help: "The “Browse by region” links in the directory block.",
    fields: [F("name", "Area", "text", { required: true }), F("slug", "Slug", "slug", { from: "name" }), F("sort", "Order", "number")] },
  enquiries: { title: "Enquiries", order: ["created_at", false], list: ["name", "topic", "created_at", "status"], noCreate: true, csv: false,
    help: "Messages sent from the website's help chat. Admins also get each one by email. Reply by email, then mark it as replied.",
    fields: [F("name", "Name", "readonly"), F("email", "Email", "readonly"), F("topic", "About", "readonly"), F("page", "Sent from page", "readonly"), F("created_at", "Received", "readonly"),
      F("message", "Message", "readonly_long"), F("status", "Status", "select", { options: ["new", "replied", "closed"] }), F("notes", "Team notes (not shared)", "textarea")] },
  newsletter_subscribers: { title: "Newsletter", order: ["created_at", false], list: ["email", "source", "created_at", "unsubscribed_at"], noCreate: true, csv: true,
    fields: [F("email", "Email", "readonly"), F("source", "Signed up from", "readonly"), F("created_at", "Signed up", "readonly"), F("consent_text", "Agreed to", "readonly"), F("unsubscribed_at", "Unsubscribed", "datetime")] },
};
const LABELS = { pending_payment: "Awaiting payment", paid: "Paid", processing: "Processing", shipped: "Shipped", completed: "Completed", cancelled: "Cancelled", refunded: "Refunded", new: "New", confirmed: "Confirmed", in_stock: "In stock", low: "Low stock", out: "Out of stock", preorder: "Pre-order", refurbished: "Refurbished", trial: "Trial", past_due: "Payment overdue", free_rsvp: "Free (RSVP)", on_sale: "On sale", selling_fast: "Selling fast", sold_out: "Sold out", detail_of_month: "Detail of the Month", livery_of_week: "Livery of the Week", race_night: "Race Night" };
function cell(v, f) {
  if (f?._names) return v == null || v === "" ? `<span class="text-body-secondary">${esc(f.empty || "–")}</span>` : esc(f._names[v] || "–");
  if (v == null || v === "") return '<span class="text-body-secondary">–</span>';
  if (typeof v === "boolean") return v ? '<span class="badge text-bg-success">Yes</span>' : '<span class="badge text-bg-light border">No</span>';
  if (f?.type === "datetime" || /_at$/.test(f?.name || "")) return fmtDate(v, true);
  if (/_pence$/.test(f?.name || "")) return "£" + (v / 100).toFixed(2);
  if (f?.type === "date") return fmtDate(v);
  return esc(LABELS[v] || v);
}
// on/off switch shown on each row of a list: which field it flips and the "on" / "off" values
const TOGGLE = {
  my_products: { field: "active", label: "On sale" },
  events: { field: "published", label: "Live" }, guides: { field: "status", on: "published", off: "draft", label: "Live" }, venues: { field: "active", label: "Active" }, articles: { field: "status", on: "published", off: "draft", label: "Live" },
  faqs: { field: "published", label: "Live" }, partners: { field: "active", label: "Active" }, partner_features: { field: "active", label: "Live" },
  community_highlights: { field: "active", label: "Shown" }, products: { field: "active", label: "On sale" }, product_categories: { field: "active", label: "Shown" }, shops: { field: "status", on: "live", off: "paused", label: "Live" }, gallery_items: { field: "featured", label: "On homepage" },
  directory_listings: { field: "status", on: "published", off: "pending", label: "Live" }, sponsored_slots: { field: "status", on: "approved", off: "paused", label: "Running" },
  homepage_blocks: { field: "enabled", label: "Shown" },
};
const isOn = (t, r) => (t.on ?? true) === r[t.field];
route("/content/:table", async ({ table }) => {
  const c = CONTENT[table]; if (!c) throw new Error("Unknown section");
  crumbs([[c.title]]);
  const when = qs().get("when") || (table === "events" ? "upcoming" : ""), search = (qs().get("q") || "").trim().toLowerCase();
  let query = site().from(c.table || table).select("*").order(c.order[0], { ascending: c.order[1] }).limit(1000);
  if (c.filter) query = c.filter(query);
  if (table === "directory_listings") query = site().from(table).select("*").order("status", { ascending: true }).order("created_at", { ascending: false }).limit(1000);
  if (table === "events" && when === "upcoming") query = query.gte("ends_at", new Date().toISOString());
  if (table === "events" && when === "past") query = query.lt("ends_at", new Date().toISOString()).order("starts_at", { ascending: false });
  const { data: all, error } = await query;
  if (error) throw error;
  if (table === "product_categories" && all) { const paths = Object.fromEntries((await refRows({ table: "product_categories" })).map((x) => [x.id, x.name])); all.forEach((r) => { r._path = paths[r.id]; r._name = r.name; r.name = paths[r.id] || r.name; }); all.sort((x, y) => String(x._path).localeCompare(String(y._path))); }
  const fmap = Object.fromEntries(c.fields.map((f) => [f.name, f]));
  const pk = c.pk || "id";
  const tg = TOGGLE[table];
  const cols = c.list.filter((k) => !tg || k !== tg.field);
  for (const k of cols) { const f = fmap[k]; if (f?.type === "ref" && f.rows) { f._names = Object.fromEntries(f.rows().map((x) => [x.id, x[f.show]])); continue; } if (f?.type === "ref") { const rr = await refRows(f); f._names = Object.fromEntries(rr.map((x) => [x.id, x[f.show]])); } }
  const data = (all || []).filter((r) => !search || cols.some((k) => String(r[k] ?? "").toLowerCase().includes(search)));
  const filterTab = (w, l) => `<a href="/content/events${w ? "?when=" + w : "?when=all"}" data-link class="${when === w || (w === "all" && !when) ? "on" : ""}">${l}</a>`;
  view.innerHTML = `<div class="page-head"><h1>${esc(c.title)}</h1><div class="d-flex gap-2">${c.csv ? `<button class="btn btn-outline-secondary" id="csv">Download CSV</button>` : ""}${c.noCreate ? "" : `<a class="btn btn-primary" href="/content/${table}/new" data-link>Add</a>`}</div></div>
    ${c.help ? `<p class="text-body-secondary">${esc(c.help)}</p>` : ""}
    ${table === "events" ? `<div class="pill-tabs">${filterTab("upcoming", "Upcoming")}${filterTab("past", "Past")}${filterTab("all", "All")}</div>` : ""}
    <div class="card">${(all || []).length > 8 ? `<div class="card-body pb-0"><form id="lsearch" class="mb-3"><input class="form-control" name="q" value="${esc(search)}" placeholder="Search ${esc(c.title.toLowerCase())}"></form></div>` : ""}
    ${data.length ? `<div class="table-responsive"><table class="table table-hover mb-0 align-middle"><thead><tr>${cols.map((k) => `<th>${esc(fmap[k]?.short || fmap[k]?.label || k)}</th>`).join("")}${tg ? `<th>${esc(tg.label)}</th>` : ""}<th class="text-end">Actions</th></tr></thead><tbody>
      ${data.map((r) => `<tr data-pk="${esc(r[pk])}" class="${tg && !isOn(tg, r) ? "row-off" : ""}">${cols.map((k, i) => `<td>${i === 0 ? `<a class="rowlink" href="/content/${table}/${encodeURIComponent(r[pk])}" data-link>${esc(r[k] ?? "(untitled)")}</a>` : cell(r[k], fmap[k])}</td>`).join("")}
        ${tg ? `<td><div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" data-toggle ${isOn(tg, r) ? "checked" : ""} aria-label="${esc(tg.label)}"></div></td>` : ""}
        <td class="text-end text-nowrap"><a class="btn btn-sm btn-outline-secondary" href="/content/${table}/${encodeURIComponent(r[pk])}" data-link>Edit</a>
          ${c.noCreate ? "" : `<button class="btn btn-sm btn-outline-secondary" data-dup>Duplicate</button>`}
          ${c.noDelete ? "" : `<button class="btn btn-sm btn-outline-danger" data-del>Delete</button>`}</td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty">${search ? "Nothing matches your search." : table === "events" && when === "upcoming" ? 'No upcoming events. <a href="/content/events/new" data-link>Add one</a>.' : "Nothing here yet."}</div>`}</div>
    <p class="small text-body-secondary mt-3">${data.length} item${data.length === 1 ? "" : "s"}. Changes show on the website within a minute.</p>`;
  if ($("#lsearch")) $("#lsearch").onsubmit = (e) => { e.preventDefault(); const p = new URLSearchParams(location.search); p.delete("mock"); const v = new FormData(e.target).get("q"); v ? p.set("q", v) : p.delete("q"); go(`/content/${table}${p.toString() ? "?" + p : ""}`); };
  const keyOf = (tr) => (c.idType === "int" ? Number(tr.dataset.pk) : tr.dataset.pk);
  view.onchange = async (e) => {
    const sw = e.target.closest("[data-toggle]"); if (!sw) return;
    const tr = sw.closest("tr"); const val = sw.checked ? (tg.on ?? true) : (tg.off ?? false);
    const { error } = await site().from(c.table || table).update({ [tg.field]: val }).eq(pk, keyOf(tr));
    if (error) { sw.checked = !sw.checked; return oops(error); }
    tr.classList.toggle("row-off", !sw.checked); toast(sw.checked ? `Switched on: ${tg.label.toLowerCase()}` : "Switched off");
  };
  view.onclick = async (e) => {
    const tr = e.target.closest("tr[data-pk]"); if (!tr) return;
    if (e.target.matches("[data-del]")) {
      const b = e.target;
      if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Confirm delete"; b.classList.replace("btn-outline-danger", "btn-danger"); setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "Delete"; b.classList.replace("btn-danger", "btn-outline-danger"); } }, 4000); return; }
      const { error } = await site().from(c.table || table).delete().eq(pk, keyOf(tr));
      if (error) return oops(/foreign key|violates/i.test(error.message) ? new Error("This item is used elsewhere (for example a partner with features or products), so it can't be deleted. Switch it off instead.") : error);
      tr.remove(); toast("Deleted");
    }
    if (e.target.matches("[data-dup]")) {
      const r = (all || []).find((x) => String(x[pk]) === tr.dataset.pk); if (!r) return;
      const copy = { ...r };
      delete copy.id; delete copy.created_at; delete copy.updated_at;
      if ("_path" in copy) { copy.name = copy._name; delete copy._path; delete copy._name; }
      const suffix = "-copy-" + Math.random().toString(36).slice(2, 6);
      if (copy.slug) copy.slug += suffix;
      if (pk !== "id" && copy[pk]) copy[pk] += suffix.replace(/-/g, "_");
      if ("title" in copy && copy.title) copy.title += " (copy)"; else if ("name" in copy && copy.name) copy.name += " (copy)";
      if (tg) copy[tg.field] = tg.off ?? false;
      const { data: made, error } = await site().from(c.table || table).insert(copy).select(pk).single();
      if (error) return oops(error);
      toast("Copy created (switched off). Edit it, then switch it on."); go(`/content/${table}/${encodeURIComponent(made[pk])}`);
    }
  };
  if (c.csv) $("#csv").onclick = () => {
    const cols = ["email", "source", "created_at", "unsubscribed_at"];
    const csv = [cols.join(","), ...data.map((r) => cols.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${table}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
});
const toLocal = (v) => { if (!v) return ""; const d = new Date(v); const z = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };
route("/content/:table/:id", async ({ table, id }) => {
  const c = CONTENT[table]; if (!c) throw new Error("Unknown section");
  const pk = c.pk || "id"; const isNew = id === "new";
  let row = {};
  if (!isNew) { const { data, error } = await site().from(c.table || table).select("*").eq(pk, c.idType === "int" ? Number(id) : decodeURIComponent(id)).maybeSingle(); if (error) throw error; if (!data) throw new Error("Not found"); row = data; }
  else c.fields.forEach((f) => { if (f.def !== undefined) row[f.name] = f.def; if (f.type === "select") row[f.name] = row[f.name] ?? f.options[0]; });
  const refs = {};
  for (const f of c.fields.filter((f) => f.type === "ref")) { if (f.rows) { refs[f.name] = f.rows(); continue; } refs[f.name] = await refRows(f); }
  const titleKey = c.list[0];
  crumbs([[c.title, `/content/${table}`], [isNew ? "Add" : String(row[titleKey] ?? "Edit")]]);
  const input = (f) => {
    const v = row[f.name]; const id = "f_" + f.name; const req = f.required ? "required" : "";
    switch (f.type) {
      case "readonly_long": return `<div class="form-control readonly-long">${esc(v ?? "").replace(/\n/g, "<br>")}</div>${row.email ? `<a class="btn btn-sm btn-primary mt-2" href="mailto:${esc(row.email)}?subject=${encodeURIComponent("Re: your message to Cars and Coffee UK")}">Reply by email</a>` : ""}`;
      case "readonly": return `<input class="form-control" id="${id}" value="${esc(/_at$/.test(f.name) ? fmtDate(v, true) : v ?? "")}" readonly disabled>`;
      case "bool": return `<div class="form-check form-switch mt-1"><input class="form-check-input" type="checkbox" id="${id}" ${v ? "checked" : ""}><label class="form-check-label" for="${id}">${esc(f.label)}</label></div>`;
      case "textarea": return `<textarea class="form-control" id="${id}" rows="4" ${req}>${esc(v ?? "")}</textarea>`;
      case "rich": return richField(id, v || (row.body ? md(row.body) : ""), esc, f.ai ? { ai: f.ai } : {});
      case "gallery": return galleryField(id, v);
      case "offerings": return offeringsField(id, v);
      case "hours": return hoursField(id, v);
      case "mylead": return `<input class="form-control" id="${id}" type="email" autocomplete="email" placeholder="e.g. enquiries@yourbusiness.co.uk" data-mylead><div class="form-text">Private: never shown on your page. Leave empty to send enquiries to the Cars and Coffee team, who'll pass them on.</div>`;
      case "lead": return `<input class="form-control" id="${id}" type="email" placeholder="e.g. enquiries@business.co.uk (leave empty to send enquiries to the team)" data-lead><div class="form-check mt-2"><input class="form-check-input" type="checkbox" id="${id}_copy" data-lead-copy><label class="form-check-label small" for="${id}_copy">Also send our team a copy of every enquiry</label></div>`;
      case "lines": return `<textarea class="form-control" id="${id}" rows="${Math.max(3, (v || []).length + 1)}">${esc((v || []).join("\n"))}</textarea>`;
      case "options": return `<textarea class="form-control" id="${id}" rows="3" placeholder="Size: S, M, L, XL">${esc((Array.isArray(v) ? v : []).map((o) => `${o.name}: ${(o.values || []).join(", ")}`).join("\n"))}</textarea>`;
      case "socials": return `<textarea class="form-control" id="${id}" rows="3" placeholder="instagram: https://instagram.com/yourshop">${esc(Object.entries(v || {}).map(([k, x]) => `${k}: ${x}`).join("\n"))}</textarea>`;
      case "markdown": return `<textarea class="form-control code" id="${id}" rows="14">${esc(v ?? "")}</textarea>`;
      case "select": return `<select class="form-select" id="${id}">${f.options.map((o) => `<option value="${o}" ${o === v ? "selected" : ""}>${esc(LABELS[o] || o)}</option>`).join("")}</select>`;
      case "ref": return `<select class="form-select" id="${id}" ${req}>${f.rows ? "" : `<option value="">Choose…</option>`}${refs[f.name].map((o) => `<option value="${o.id}" ${o.id === v ? "selected" : ""}>${esc(o[f.show])}</option>`).join("")}</select>`;
      case "number": return `<input class="form-control" type="number" ${f.step ? `step="${f.step}"` : ""} id="${id}" value="${esc(v ?? "")}" ${req}>`;
      case "postcode": return `<div class="input-group"><input class="form-control" id="${id}" value="${esc(v ?? "")}" placeholder="e.g. NR1 3DD" autocapitalize="characters"><button class="btn btn-outline-secondary" type="button" data-pclookup="${id}">Look up</button></div><div class="form-text" data-pcmsg="${id}">Fills in the map position from the postcode.</div>`;
      case "date": return `<input class="form-control" type="date" id="${id}" value="${esc(v ? String(v).slice(0, 10) : "")}" ${req}>`;
      case "datetime": return `<input class="form-control" type="datetime-local" id="${id}" value="${toLocal(v)}" ${req}>`;
      case "array": return `<input class="form-control" id="${id}" value="${esc((v || []).join(", "))}">`;
      case "image": return imageInput(id, v, req);
      default: return `<input class="form-control" id="${id}" value="${esc(v ?? "")}" placeholder="${esc(f.ph || "")}" ${req}>`;
    }
  };
  view.innerHTML = `<form id="cf" novalidate><div class="page-head"><h1>${isNew ? "Add to " + esc(c.title) : esc(row[titleKey] ?? "Edit")}</h1>
      <div class="d-flex gap-2"><a class="btn btn-outline-secondary" href="/content/${table}" data-link>Back</a>${c.view && !isNew && row.slug ? `<a class="btn btn-outline-secondary" href="${SITE}${c.view}${encodeURIComponent(row.slug)}" target="_blank" rel="noopener">View on website</a>` : ""}<button class="btn btn-primary" type="submit">Save</button></div></div>
    ${c.help ? `<p class="text-body-secondary">${esc(c.help)}</p>` : ""}
    <div class="card"><div class="card-body"><div class="row g-3">
      ${c.fields.map((f) => f.type === "heading" ? `<div class="col-12 form-section"><h2 class="h5 mb-0">${esc(f.label)}</h2>${f.note ? `<p class="small text-body-secondary mb-0">${esc(f.note)}</p>` : ""}</div>`
        : `<div class="${["textarea", "markdown", "rich", "lines", "gallery", "readonly_long", "offerings", "hours", "options", "socials"].includes(f.type) ? "col-12" : "col-md-6"}">${f.type === "bool" ? "" : `<label class="form-label" for="f_${f.name}${f.type === "rich" ? "_area" : ""}">${esc(f.label)}${f.required ? ' <span class="text-danger">*</span>' : ""}${f.ai && f.type !== "rich" ? aiBtn(f.ai, "f_" + f.name) : ""}</label>`}${input(f)}</div>`).join("")}
    </div></div></div>
    ${SEO_KINDS[table] ? `<div class="card mt-3" id="seo"><div class="card-body"><div class="row g-4">
      <div class="col-lg-6"><h2 class="h5">SEO score</h2><div class="d-flex align-items-center gap-3 mb-2"><div class="score-ring" id="ring">–</div><div><div class="fw-semibold" id="grade"></div><div class="small text-body-secondary">Updates as you type · <span id="wc"></span></div></div></div>
        <ul class="checks" id="checks"></ul></div>
      <div class="col-lg-6"><h2 class="h5">Google preview</h2><div class="serp" id="serp"></div><p class="small text-body-secondary mt-2">Shows roughly how this page will look in Google search results.</p></div>
    </div></div></div>` : ""}
    ${!isNew && !c.noDelete ? `<button class="btn btn-sm btn-outline-danger mt-3" type="button" id="del">Delete</button>` : ""}</form>`;
  const slugF = c.fields.find((f) => f.type === "slug");
  if (slugF && isNew) $("#f_" + slugF.from).addEventListener("input", (e) => { if (!$("#f_" + slugF.name).dataset.touched) $("#f_" + slugF.name).value = slugify(e.target.value); });
  if (slugF) $("#f_" + slugF.name).addEventListener("input", (e) => (e.target.dataset.touched = "1"));
  $("#cf").addEventListener("input", () => (dirty = true));
  wireImageInputs($("#cf"));
  const kindLabel = { events: "event page", articles: "news article", guides: "practical guide", directory_listings: "business directory listing (write about the business in the third person, only from the facts given)" }[table] || "page";
  const contentCtx = () => { const v = (n) => { const el = $("#f_" + n); return el ? el.value : ""; }; const body = $("#f_body_html_area");
    const facts = table === "events" ? [`Title: ${v("title")}`, `Type: ${v("event_type")}`, v("starts_at") && `Starts: ${new Date(v("starts_at")).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}`, v("ends_at") && `Ends: ${new Date(v("ends_at")).toLocaleTimeString("en-GB", { timeStyle: "short" })}`, `Venue: ${v("venue")}`, v("town") && `Town: ${v("town")}`, v("county") && `County: ${v("county")}`,
      `Price: ${Number(v("price_pence")) ? "£" + (Number(v("price_pence")) / 100).toFixed(2) : "Free"}`, v("schedule") && `On the day: ${v("schedule").replace(/\n/g, "; ")}`, v("what_to_bring") && `What to bring: ${v("what_to_bring").replace(/\n/g, "; ")}`, v("accessibility") && `Access: ${v("accessibility")}`].filter(Boolean).join("\n") : "";
    const dirFacts = table === "directory_listings" ? [`Business: ${v("name")}`, v("services") && `Services: ${v("services")}`, v("town") && `Town: ${v("town")}`, v("county") && `County: ${v("county")}`, v("website") && `Website: ${v("website")}`, v("opening_hours") && `Opening hours: ${v("opening_hours").replace(/\n/g, "; ")}`].filter(Boolean).join("\n") : "";
    return { kind: kindLabel, title: v("title") || v("name"), focus_keyword: v("focus_keyword"), place: v("town") || v("county"), county: v("county"), intro: v("summary") || v("excerpt") || v("intro"), facts: facts || dirFacts, existing: body ? htmlText(body.innerHTML).slice(0, 3000) : "", words: table === "guides" ? 900 : table === "events" ? 250 : 450,
      url: table === "directory_listings" ? `/directory/${v("slug")}` : table === "events" ? `/events/${v("slug")}` : table === "articles" ? `/news/${v("slug")}` : table === "guides" ? `/guides/${v("slug")}` : "" }; };
  wireRich($("#cf"), { upload: uploadSiteImage, onChange: () => (dirty = true), ai: c.noAi ? null : async (field, brief) => (await aiCall(field, contentCtx(), brief)).html });
  wireAiSuggest($("#cf"), contentCtx);
  if (table === "directory_listings" || table === "my_listing") wireOfferings($("#cf"));
  if (table === "directory_listings" && !isNew) {
    const { data: ct } = await site().from("directory_contacts").select("lead_email,copy_team").eq("listing_id", row.id).maybeSingle();
    if (ct && $("[data-lead]")) { $("[data-lead]").value = ct.lead_email || ""; $("[data-lead-copy]").checked = !!ct.copy_team; }
    await directoryExtras(row);
    const { data: subs } = await site().from("directory_submissions").select("*").eq("listing_id", row.id).order("created_at", { ascending: false });
    if (subs && subs.length) $("#cf .card").insertAdjacentHTML("beforebegin", `<div class="alert alert-warning"><strong>Submitted from the website</strong> ${fmtDate(subs[0].created_at, true)} by ${esc(subs[0].contact_name)} · <a href="mailto:${esc(subs[0].contact_email)}?subject=${encodeURIComponent("Your Cars and Coffee directory listing")}">${esc(subs[0].contact_email)}</a>${subs[0].contact_phone ? ` · ${esc(subs[0].contact_phone)}` : ""}${subs[0].notes ? `<div class="small mt-1">Note: ${esc(subs[0].notes)}</div>` : ""}<div class="small mt-1">Only the team can see this. ${row.status === "pending" ? "Check the details, then set Status to Published." : ""}</div></div>`);
  }
  if (table === "shops" && !isNew) await shopExtras(row);
  if (table === "orders" && !isNew) await orderExtras(row);
  if (table === "my_orders" && !isNew) await myOrderExtras(row);
  if (table === "my_shop") state.uploadShop = row.id;
  state.uploadListing = table === "my_listing" ? row.id : null;
  if (table === "my_listing") await myListingExtras(row);
  if (table === "my_reviews") myReviewExtras(row);
  if (table === "directory_listings" && !isNew) { await listingPeopleExtras(row); await listingLookupExtras(row); }
  wireGallery($("#cf"));
  if (SEO_KINDS[table]) {
    const cur = () => { const r = { ...row }; for (const f of c.fields) { const el = $("#f_" + f.name); if (!el) continue;
      if (f.type === "rich") r[f.name] = $("#f_" + f.name + "_area").innerHTML; else if (f.type === "gallery") { try { r[f.name] = JSON.parse(el.value || "[]"); } catch {} } else if (f.type !== "bool" && f.type !== "readonly" && f.type !== "heading") r[f.name] = el.value; }
      if (!r.slug) r.slug = slugify(r.title || ""); return r; };
    const upd = () => {
      const d = cur(), inp = contentScoreInput(table, d), r = analyse(inp);
      const ring = $("#ring"); ring.textContent = r.score; ring.className = "score-ring " + r.grade;
      $("#grade").textContent = { good: "Good to go", ok: "Nearly there", bad: "Needs work" }[r.grade]; $("#wc").textContent = `${r.words} words`;
      $("#checks").innerHTML = r.checks.map((x) => `<li class="${x.status}"><span class="dot">${{ pass: "✓", warn: "!", fail: "✕", info: "i" }[x.status]}</span><span>${esc(x.label)}${x.tip ? `<span class="tip">${esc(x.tip)}</span>` : ""}</span></li>`).join("");
      const url = SITE + inp.path, desc = inp.meta_description || inp.intro || "";
      $("#serp").innerHTML = `<div class="site"><img src="/favicon.svg" alt=""><span>Cars and Coffee UK<small>${esc(url.replace("https://", "").replace(/\//g, " › ").slice(0, 70))}</small></span></div><div class="t">${esc(inp.meta_title)}</div><div class="d">${esc(desc.slice(0, 160))}${desc.length > 160 ? "…" : ""}</div>`;
    };
    let t; $("#cf").addEventListener("input", () => { clearTimeout(t); t = setTimeout(upd, 150); }); upd();
    if (location.hash === "#seo") setTimeout(() => $("#seo").scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }
  for (const b of $$("[data-pclookup]")) b.onclick = async () => {
    const id = b.dataset.pclookup, msg = $(`[data-pcmsg="${id}"]`), pc = $("#" + id).value.trim();
    if (!pc) { msg.textContent = "Enter a postcode first."; return; }
    msg.textContent = "Looking up…";
    try {
      const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`); const j = await r.json();
      if (!r.ok || !j.result) { msg.textContent = "Postcode not found. Check it and try again."; return; }
      $("#f_postcode").value = j.result.postcode; if ($("#f_lat")) $("#f_lat").value = j.result.latitude.toFixed(6); if ($("#f_lng")) $("#f_lng").value = j.result.longitude.toFixed(6);
      if ($("#f_approximate")) $("#f_approximate").checked = false;
      if ($("#f_town") && !$("#f_town").value) $("#f_town").value = j.result.admin_district || "";
      dirty = true; msg.textContent = `Found: ${j.result.admin_ward || ""}, ${j.result.admin_district || ""}. Pin placed exactly. Remember to save.`;
    } catch { msg.textContent = "Couldn't reach the postcode service. Enter the position by hand or try again."; }
  };
  $("#cf").onsubmit = async (e) => {
    e.preventDefault();
    const out = {};
    for (const f of c.fields) {
      if (f.type === "readonly" || f.type === "readonly_long" || f.type === "heading" || f.type === "lead" || f.type === "mylead") continue;
      const el = $("#f_" + f.name); let v;
      if (f.type === "bool") v = el.checked;
      else if (f.type === "number") v = el.value === "" ? null : Number(el.value);
      else if (f.type === "datetime") v = el.value ? new Date(el.value).toISOString() : null;
      else if (f.type === "array") v = el.value.split(",").map((s) => s.trim()).filter(Boolean);
      else if (f.type === "image") v = el.value.trim() || null;
      else if (f.type === "rich") { v = cleanHTML($("#f_" + f.name + "_area").innerHTML) || null; }
      else if (f.type === "gallery") v = JSON.parse(el.value || "[]").filter((x) => x.src);
      else if (f.type === "offerings") v = $$(`[data-off-row]`).map((r) => ({ name: $("[data-o=name]", r).value.trim(), description: $("[data-o=description]", r).value.trim(), price: $("[data-o=price]", r).value.trim(), image: $("[data-o=image]", r).value.trim() || null })).filter((o) => o.name);
      else if (f.type === "hours") { v = {}; for (const [k] of DAYS_ADMIN) { const r = $(`[data-hday="${k}"]`); const closed = $("[data-hclosed]", r).checked, open = $("[data-hopen]", r).value, close = $("[data-hclose]", r).value; if (closed || open || close) v[k] = closed ? { closed: true } : { open, close }; } }
      else if (f.type === "lead") continue;
      else if (f.type === "lines") v = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
      else if (f.type === "options") v = el.value.split("\n").map((l) => { const i = l.indexOf(":"); return i < 1 ? null : { name: l.slice(0, i).trim(), values: l.slice(i + 1).split(",").map((x) => x.trim()).filter(Boolean) }; }).filter((o) => o && o.name && o.values.length);
      else if (f.type === "socials") { v = {}; el.value.split("\n").forEach((l) => { const i = l.indexOf(":"); if (i > 0) { const k = l.slice(0, i).trim().toLowerCase().replace(/[^a-z]/g, ""), x = l.slice(i + 1).trim(); if (k && x) v[k] = x; } }); }
      else v = el.value.trim() === "" ? null : el.value.trim();
      if (f.required && (v == null || v === "")) { toast(`${f.label} is required`, true); el.focus(); return; }
      out[f.name] = v;
    }
    if (slugF && out[slugF.name]) out[slugF.name] = slugify(out[slugF.name]);
    const res = isNew ? await site().from(c.table || table).insert(out).select(pk).single() : await site().from(c.table || table).update(out).eq(pk, row[pk]).select(pk).single();
    if (res.error) return toast(/duplicate|unique/i.test(res.error.message) ? "That slug is already used" : res.error.message, true);
    if (table === "directory_listings" && $("[data-lead]")) {
      const le = $("[data-lead]").value.trim();
      const { error: ce } = await site().from("directory_contacts").upsert({ listing_id: res.data[pk], lead_email: le || null, copy_team: $("[data-lead-copy]").checked, updated_at: new Date().toISOString() }, { onConflict: "listing_id" });
      if (ce) return toast("Saved, but the enquiry email didn't save: " + ce.message, true);
    }
    if (table === "my_listing" && $("[data-mylead]")) {
      const { error: le } = await site().rpc("set_my_listing_lead", { p_listing: res.data[pk], p_email: $("[data-mylead]").value.trim() });
      if (le) return toast("Saved, but the enquiry email didn't save: " + le.message, true);
    }
    dirty = false;
    if (table === "my_listing") { toast(row.status === "published" ? "Saved. Your page updates within a minute." : "Saved. Your page goes live once our team has checked it."); await loadMe(true); chrome(true); go("/", true); return; }
    toast("Saved. Live on the website within a minute."); go(`/content/${table}`, true);
  };
  if ($("#del")) { let armed = false; $("#del").onclick = async () => {
    if (!armed) { armed = true; $("#del").textContent = "Click again to delete for good"; $("#del").classList.replace("btn-outline-danger", "btn-danger"); return; }
    const { error } = await site().from(c.table || table).delete().eq(pk, row[pk]); if (error) return oops(error);
    dirty = false; toast("Deleted"); go(`/content/${table}`, true);
  }; }
});

// ---------- orders ----------
const gbpA = (p) => "£" + ((Number(p) || 0) / 100).toFixed(2);
async function orderExtras(row) {
  const { data: items } = await site().from("order_items").select("*").eq("order_id", row.id);
  $("#cf .card").insertAdjacentHTML("beforebegin", `<div class="card mb-3"><div class="card-body"><h2 class="h5">Items</h2><div class="table-responsive"><table class="table table-sm align-middle mb-0"><thead><tr><th>Product</th><th>Seller</th><th>Qty</th><th>Price</th><th>Line</th><th>Commission</th><th>Seller status</th><th>Tracking</th></tr></thead><tbody>
    ${(items || []).map((i) => `<tr><td>${esc(i.name)}${Object.keys(i.options || {}).length ? `<br><small class="text-body-secondary">${esc(Object.entries(i.options).map(([k, v]) => `${k}: ${v}`).join(", "))}</small>` : ""}</td><td>${esc(i.seller)}</td><td>${i.qty}</td><td>${gbpA(i.unit_pence)}</td><td>${gbpA(i.line_pence)}</td><td>${gbpA(i.commission_pence)} <small class="text-body-secondary">(${esc(i.commission_pct)}%)</small></td><td>${esc(LABELS[i.status] || i.status)}</td><td>${esc(i.tracking || "")}</td></tr>`).join("")}
    </tbody></table></div><p class="mt-2 mb-0"><strong>Total ${gbpA(row.total_pence)}</strong> · commission ${gbpA(row.commission_pence)} · to sellers ${gbpA(row.total_pence - row.commission_pence)}</p></div></div>`);
}
async function myOrderExtras(row) {
  const { data: o } = await site().from("orders").select("ref,created_at,status,name,email,phone,address_line1,address_line2,town,county,postcode,notes").eq("id", row.order_id).maybeSingle();
  if (!o) return;
  $("#cf .card").insertAdjacentHTML("beforebegin", `<div class="card mb-3"><div class="card-body"><h2 class="h5">Order ${esc(o.ref)} <span class="badge text-bg-light border">${esc(LABELS[o.status] || o.status)}</span></h2>
    <p class="mb-1">Placed ${fmtDate(o.created_at, true)}${Object.keys(row.options || {}).length ? ` · Options: ${esc(Object.entries(row.options).map(([k, v]) => `${k}: ${v}`).join(", "))}` : ""}</p>
    <p class="mb-1"><strong>Deliver to:</strong> ${esc(o.name)}, ${esc([o.address_line1, o.address_line2, o.town, o.county, o.postcode].filter(Boolean).join(", "))}</p>
    <p class="mb-1"><strong>Contact:</strong> <a href="mailto:${esc(o.email)}">${esc(o.email)}</a>${o.phone ? ` · ${esc(o.phone)}` : ""}</p>${o.notes ? `<p class="mb-0"><strong>Customer notes:</strong> ${esc(o.notes)}</p>` : ""}
    <p class="small text-body-secondary mt-2 mb-0">Only send the item once the order shows as Paid.</p></div></div>`);
}

// ---------- partner dashboard ----------
async function partnerDash() {
  crumbs([["Dashboard"]]);
  view.innerHTML = `<div class="page-head"><h1>Welcome${state.profile?.display_name ? ", " + esc(state.profile.display_name.split(" ")[0]) : ""}</h1></div><div id="bizdash"></div><div id="shopdash"></div>`;
  if (hasBiz()) await bizDash($("#bizdash"));
  if (hasShops()) await shopDash($("#shopdash"));
}

// ---------- business owners ----------
const BIZ_CHECKS = [
  ["summary", "A short summary", (l) => (l.summary || "").length >= 40],
  ["body_html", "About your business (100+ words)", (l) => htmlText(l.body_html || "").split(/\s+/).filter(Boolean).length >= 100],
  ["logo_path", "Your logo", (l) => !!l.logo_path],
  ["image_path", "A main photo", (l) => !!l.image_path],
  ["offerings", "At least 3 services or products", (l) => (l.offerings || []).length >= 3],
  ["gallery", "At least 6 gallery photos", (l) => (l.gallery || []).length >= 6],
  ["hours", "Opening times", (l) => l.hours && Object.keys(l.hours).length > 0],
  ["phone", "A phone number or email", (l) => !!(l.phone || l.email)],
  ["address_line", "Your address and map pin", (l) => !!(l.postcode && l.lat)],
  ["instagram", "At least one social link", (l) => !!(l.instagram || l.facebook || l.youtube || l.tiktok || l.x_url || l.linkedin)],
];
async function bizDash(box) {
  const ids = state.myListings.map((x) => x.id), since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [{ data: rows }, { data: ev }, { data: leads }, { data: revs }] = await Promise.all([
    site().from("directory_listings").select("*").in("id", ids),
    site().from("directory_events").select("listing_id,type").in("listing_id", ids).gte("created_at", since).limit(20000),
    site().from("directory_leads").select("listing_id,created_at").in("listing_id", ids).order("created_at", { ascending: false }).limit(500),
    site().from("directory_reviews").select("listing_id,rating,status,owner_reply").in("listing_id", ids).limit(1000)]);
  box.innerHTML = (rows || []).map((l) => {
    const done = BIZ_CHECKS.filter(([, , t]) => t(l)), pct = Math.round((done.length / BIZ_CHECKS.length) * 100);
    const e = (ev || []).filter((x) => x.listing_id === l.id), cnt = (t) => e.filter((x) => x.type === t).length;
    const myLeads = (leads || []).filter((x) => x.listing_id === l.id), r = (revs || []).filter((x) => x.listing_id === l.id), pub = r.filter((x) => x.status === "published");
    const avg = pub.length ? (pub.reduce((a, x) => a + x.rating, 0) / pub.length).toFixed(1) : "–", unreplied = pub.filter((x) => !x.owner_reply).length;
    const live = l.status === "published";
    const stat = (v, label, href) => `<div class="col-6 col-md-3"><div class="card stat h-100"><div class="card-body">${href ? `<a href="${href}" data-link>` : ""}<div class="value">${v}</div><div class="label">${label}</div>${href ? "</a>" : ""}</div></div></div>`;
    return `<div class="card mb-3"><div class="card-body">
      <div class="d-flex flex-wrap justify-content-between gap-3 align-items-start">
        <div class="d-flex gap-3 align-items-center">${l.logo_path ? `<img src="${esc(imgSrc(l.logo_path))}" alt="" style="width:64px;height:64px;object-fit:contain;border-radius:8px;border:1px solid var(--cui-border-color)">` : ""}
          <div><h2 class="h4 mb-1">${esc(l.name)}</h2><p class="mb-0"><span class="badge ${live ? "text-bg-success" : l.status === "rejected" ? "text-bg-danger" : "text-bg-warning"}">${live ? "Live" : l.status === "rejected" ? "Not approved" : "Waiting for our team to check"}</span>${l.featured ? ' <span class="badge text-bg-primary">Featured</span>' : ""}${l.checked_at ? ' <span class="badge text-bg-light border">Checked by Cars and Coffee</span>' : ""}</p></div></div>
        <div class="d-flex gap-2 flex-wrap"><a class="btn btn-primary" href="/content/my_listing/${l.id}" data-link>Edit your profile</a>${live ? `<a class="btn btn-outline-secondary" href="${SITE}/directory/${esc(l.slug)}" target="_blank" rel="noopener">View your page</a>` : ""}</div></div>
      ${live ? "" : `<p class="small text-body-secondary mt-3 mb-0">${l.status === "rejected" ? "Our team couldn't approve this listing. Please <a href=\"" + SITE + "/contact?topic=directory\">contact us</a> if you have questions." : "Build your full profile now. It goes live once our team has checked it, usually within a few days."}</p>`}
      <div class="row g-3 mt-1">${stat(cnt("views"), "Page views (30 days)")}${stat(cnt("website") + cnt("phone_reveal") + cnt("phone_call") + cnt("email") + cnt("directions") + cnt("social"), "Clicks to contact you (30 days)")}${stat(myLeads.length, "Enquiries", "/content/my_leads")}${stat(`${avg}${pub.length ? ` <small class="fs-6 text-body-secondary">from ${pub.length}</small>` : ""}`, `Review rating${unreplied ? ` · ${unreplied} to reply to` : ""}`, "/content/my_reviews")}</div>
      <div class="mt-4"><div class="d-flex justify-content-between align-items-center mb-2"><h3 class="h6 mb-0">Profile strength</h3><strong>${pct}%</strong></div>
        <div class="progress mb-3" role="progressbar" aria-label="Profile strength" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" style="height:10px"><div class="progress-bar ${pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-danger"}" style="width:${pct}%"></div></div>
        <div class="row g-2">${BIZ_CHECKS.map(([k, label, t]) => `<div class="col-md-6"><a class="d-flex gap-2 align-items-center text-decoration-none ${t(l) ? "text-body-secondary" : "text-body"}" href="/content/my_listing/${l.id}#f_${k}" data-link><span class="badge rounded-pill ${t(l) ? "text-bg-success" : "text-bg-light border"}">${t(l) ? "✓" : "+"}</span>${esc(label)}</a></div>`).join("")}</div></div>
    </div></div>`; }).join("") + `<p class="small text-body-secondary">Need help, or want a featured listing? <a href="${SITE}/contact?topic=directory">Contact the team</a>.</p>`;
}
async function myListingExtras(row) {
  const { data: ld } = await site().rpc("my_listing_lead", { p_listing: row.id });
  if ($("[data-mylead]")) $("[data-mylead]").value = (ld && ld[0] && ld[0].lead_email) || "";
  const live = row.status === "published";
  $("#cf .card").insertAdjacentHTML("beforebegin", `<div class="alert ${live ? "alert-success" : "alert-warning"} d-flex flex-wrap justify-content-between gap-2 align-items-center"><span>${live ? "Your page is live. Changes show within a minute of saving." : "Your page isn't live yet. Fill in as much as you can: it goes live once our team has checked it."}</span>${live ? `<a class="btn btn-sm btn-outline-secondary" href="${SITE}/directory/${esc(row.slug)}" target="_blank" rel="noopener">View your page</a>` : ""}</div>`);
  if (location.hash) setTimeout(() => { const el = document.querySelector(location.hash); if (el) { el.scrollIntoView({ block: "center" }); el.focus?.(); } }, 150);
}
function myReviewExtras(row) {
  const stars = "★★★★★".slice(0, row.rating) + "☆☆☆☆☆".slice(0, 5 - row.rating);
  $("#cf .card").insertAdjacentHTML("beforebegin", `<div class="card mb-3"><div class="card-body"><div class="fs-4 text-warning">${stars}</div><p class="mb-1"><strong>${esc(row.name)}</strong> · ${fmtDate(row.created_at)} · <span class="badge ${row.status === "published" ? "text-bg-success" : "text-bg-secondary"}">${row.status === "published" ? "Shown on your page" : row.status === "pending" ? "Waiting for our team to check" : esc(row.status)}</span></p><p class="mb-0" style="white-space:pre-line">${esc(row.body)}</p></div></div>`);
}
async function listingPeopleExtras(row) {
  const { data: people, error: pe } = await site().rpc("listing_people", { p_listing: row.id });
  $("#cf .card").insertAdjacentHTML("afterend", `<div class="card mt-3" id="lpx"><div class="card-body">
    <h2 class="h5">Business owners</h2><p class="small text-body-secondary">People who can sign in at admin.carsandcoffee.uk to build and edit this business's profile, read its enquiries and reply to reviews. Whoever submitted the listing is added automatically. They can't change the status, featured spots, slug or checked date.</p>
    ${pe ? `<p class="text-danger small">${esc(pe.message)}</p>` : ""}
    <ul class="list-group mb-3">${(people || []).map((x) => `<li class="list-group-item d-flex justify-content-between align-items-center"><span>${esc(x.email)} <span class="badge text-bg-light border">${esc(x.role)}</span> ${x.kind === "invite" ? '<span class="badge text-bg-warning">Not signed in yet</span>' : ""}</span><button type="button" class="btn btn-sm btn-outline-danger" data-lrm="${esc(x.kind)}:${esc(x.ref)}">Remove</button></li>`).join("") || '<li class="list-group-item text-body-secondary">No owners yet.</li>'}</ul>
    <div class="input-group" style="max-width:560px"><input class="form-control" id="lp_email" type="email" placeholder="owner@business.co.uk"><select class="form-select" id="lp_role" style="max-width:130px"><option value="owner">Owner</option><option value="editor">Editor</option></select><button type="button" class="btn btn-outline-primary" id="lp_add">Add owner</button></div></div></div>`);
  $("#lp_add").onclick = async () => { const em = $("#lp_email").value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return toast("Please enter a valid email", true);
    const { error } = await site().from("listing_invites").insert({ listing_id: row.id, email: em, role: $("#lp_role").value }); if (error) return oops(error); toast("Added. They get access the first time they sign in with that address."); render(); };
  for (const b of $$("[data-lrm]")) b.onclick = async () => { const [kind, ref] = b.dataset.lrm.split(":");
    const { error } = kind === "invite" ? await site().from("listing_invites").delete().eq("id", ref) : await site().from("listing_members").delete().eq("listing_id", row.id).eq("user_id", ref);
    if (error) return oops(error); toast("Removed"); render(); };
}

async function shopDash(box) {
  const { data: prods } = await site().from("products").select("shop_id,active,stock_status").in("shop_id", state.myShops.map((x) => x.id));
  const PLAN = { trial: ["Trial", "text-bg-info"], active: ["Active", "text-bg-success"], past_due: ["Payment overdue", "text-bg-warning"], cancelled: ["Cancelled", "text-bg-danger"] };
  box.innerHTML = `<div class="d-flex justify-content-between align-items-center mt-4 mb-3"><h2 class="h4 mb-0">Your shop${state.myShops.length > 1 ? "s" : ""}</h2><a class="btn btn-primary" href="/content/my_products/new" data-link>Add a product</a></div>
    ${state.myShops.map((x) => { const mine = (prods || []).filter((p) => p.shop_id === x.id), on = mine.filter((p) => p.active).length, out = mine.filter((p) => p.stock_status === "out").length, pl = PLAN[x.plan_status] || [x.plan_status || "No plan", "text-bg-secondary"];
      const open = x.status === "live" && ["trial", "active"].includes(x.plan_status);
      return `<div class="card mb-3"><div class="card-body"><div class="d-flex flex-wrap justify-content-between gap-3 align-items-start"><div><h2 class="h4 mb-1">${esc(x.name)}</h2>
        <p class="mb-2"><span class="badge ${pl[1]}">Plan: ${esc(pl[0])}</span> <span class="badge ${x.status === "live" ? "text-bg-success" : "text-bg-secondary"}">Shop: ${esc(x.status)}</span></p>
        <p class="small text-body-secondary mb-0">${open ? "Your shop is public." : x.status !== "live" ? "Your shop is hidden. Set its status to Live on the shop page when you're ready." : "Your shop is hidden because the plan isn't active. Contact the Cars and Coffee team."} Commission on sales: ${esc(x.commission_pct ?? "–")}%.${x.monthly_fee_pence ? ` Monthly fee: £${(x.monthly_fee_pence / 100).toFixed(2)}.` : ""}</p></div>
        <div class="d-flex gap-2 flex-wrap"><a class="btn btn-outline-secondary" href="/content/my_shop/${x.id}" data-link>Edit shop page</a><a class="btn btn-outline-secondary" href="${SITE}/shops/${esc(x.slug)}" target="_blank" rel="noopener">View shop</a></div></div>
        <div class="row g-3 mt-2"><div class="col-6 col-md-3"><div class="card stat"><div class="card-body"><a href="/content/my_products" data-link><div class="value">${mine.length}</div><div class="label">Products</div></a></div></div></div>
          <div class="col-6 col-md-3"><div class="card stat"><div class="card-body"><a href="/content/my_products" data-link><div class="value">${on}</div><div class="label">On sale</div></a></div></div></div>
          <div class="col-6 col-md-3"><div class="card stat"><div class="card-body"><a href="/content/my_products" data-link><div class="value ${out ? "text-warning" : ""}">${out}</div><div class="label">Out of stock</div></a></div></div></div></div></div></div>`; }).join("")}
    <p class="small text-body-secondary">Online checkout is coming soon. Until then, each product either links to your own website (add a Buy link) or shows an enquiry button. Questions? <a href="${SITE}/contact?topic=shop">Contact the team</a>.</p>`;
}

// ---------- partner shops: plan, commission and managers (team only) ----------
async function shopExtras(row) {
  const [{ data: bill }, { data: people, error: pe }] = await Promise.all([site().from("shop_billing").select("*").eq("shop_id", row.id).maybeSingle(), site().rpc("shop_people", { p_shop: row.id })]);
  const b = bill || { plan: "standard", plan_status: "trial", monthly_fee_pence: 0, commission_pct: 10, renews_at: null, notes: "" };
  const st = ["trial", "active", "past_due", "cancelled"];
  $("#cf .card").insertAdjacentHTML("afterend", `<div class="card mt-3" id="shopx"><div class="card-body">
    <h2 class="h5">Plan and billing</h2><p class="small text-body-secondary">The shop is only public while the plan is on Trial or Active and the status above is Live. Payment isn't taken automatically yet: update this when the partner pays.</p>
    <div class="row g-3"><div class="col-md-3"><label class="form-label" for="b_status">Plan status</label><select class="form-select" id="b_status">${st.map((x) => `<option value="${x}" ${x === b.plan_status ? "selected" : ""}>${esc(LABELS[x] || x[0].toUpperCase() + x.slice(1))}</option>`).join("")}</select></div>
      <div class="col-md-3"><label class="form-label" for="b_plan">Plan name</label><input class="form-control" id="b_plan" value="${esc(b.plan)}"></div>
      <div class="col-md-2"><label class="form-label" for="b_fee">Monthly fee (£)</label><input class="form-control" id="b_fee" type="number" step="0.01" min="0" value="${(b.monthly_fee_pence / 100).toFixed(2)}"></div>
      <div class="col-md-2"><label class="form-label" for="b_comm">Commission (%)</label><input class="form-control" id="b_comm" type="number" step="0.5" min="0" max="100" value="${esc(b.commission_pct)}"></div>
      <div class="col-md-2"><label class="form-label" for="b_renew">Renews on</label><input class="form-control" id="b_renew" type="date" value="${esc(b.renews_at || "")}"></div>
      <div class="col-12"><label class="form-label" for="b_notes">Billing notes (team only)</label><textarea class="form-control" id="b_notes" rows="2">${esc(b.notes || "")}</textarea></div>
      <div class="col-12"><button type="button" class="btn btn-outline-primary" id="b_save">Save plan</button></div></div>
    <hr class="my-4"><h2 class="h5">Shop managers</h2><p class="small text-body-secondary">People who can sign in at admin.carsandcoffee.uk to edit this shop and its products. Add their email; they get access the first time they sign in with that address (Google or email link). They can't change the plan, commission, featured spots or member prices.</p>
    ${pe ? `<p class="text-danger small">${esc(pe.message)}</p>` : ""}
    <ul class="list-group mb-3" id="ppl">${(people || []).map((x) => `<li class="list-group-item d-flex justify-content-between align-items-center"><span>${esc(x.email)} <span class="badge text-bg-light border">${esc(x.role)}</span> ${x.kind === "invite" ? '<span class="badge text-bg-warning">Not signed in yet</span>' : ""}</span><button type="button" class="btn btn-sm btn-outline-danger" data-rm="${esc(x.kind)}:${esc(x.ref)}">Remove</button></li>`).join("") || '<li class="list-group-item text-body-secondary">No managers yet.</li>'}</ul>
    <div class="input-group" style="max-width:560px"><input class="form-control" id="p_email" type="email" placeholder="partner@business.co.uk"><select class="form-select" id="p_role" style="max-width:130px"><option value="owner">Owner</option><option value="editor">Editor</option></select><button type="button" class="btn btn-outline-primary" id="p_add">Add manager</button></div>
    <p class="small text-body-secondary mt-2">Send them this link to sign in: <code>https://admin.carsandcoffee.uk</code></p></div></div>`);
  $("#b_save").onclick = async () => {
    const out = { shop_id: row.id, plan_status: $("#b_status").value, plan: $("#b_plan").value.trim() || "standard", monthly_fee_pence: Math.round(Number($("#b_fee").value || 0) * 100), commission_pct: Number($("#b_comm").value || 0), renews_at: $("#b_renew").value || null, notes: $("#b_notes").value.trim() || null, updated_at: new Date().toISOString() };
    const { error } = await site().from("shop_billing").upsert(out, { onConflict: "shop_id" }); error ? oops(error) : toast("Plan saved");
  };
  $("#p_add").onclick = async () => {
    const email = $("#p_email").value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("Enter a valid email", true);
    const { error } = await site().from("shop_invites").insert({ shop_id: row.id, email, role: $("#p_role").value });
    if (error) return oops(/duplicate|unique/i.test(error.message) ? new Error("That email has already been added") : error);
    toast("Manager added. They get access when they sign in."); render();
  };
  $("#ppl").onclick = async (e) => {
    const bt = e.target.closest("[data-rm]"); if (!bt) return;
    if (!bt.dataset.armed) { bt.dataset.armed = "1"; bt.textContent = "Confirm remove"; return; }
    const [kind, ref] = bt.dataset.rm.split(":");
    const { error } = kind === "invite" ? await site().from("shop_invites").delete().eq("id", ref) : await site().from("shop_members").delete().eq("shop_id", row.id).eq("user_id", ref);
    if (error) return oops(error); bt.closest("li").remove(); toast("Removed");
  };
}

// ---------- directory: services/products, opening times, reviews and enquiries ----------
const DAYS_ADMIN = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]];
const offRow = (o = {}, i = 0) => `<div class="off-row" data-off-row><div class="row g-2"><div class="col-md-4"><input class="form-control form-control-sm" data-o="name" value="${esc(o.name || "")}" placeholder="Name, e.g. Ceramic coating"></div>
  <div class="col-md-5"><input class="form-control form-control-sm" data-o="description" value="${esc(o.description || "")}" placeholder="Short description"></div><div class="col-md-3"><input class="form-control form-control-sm" data-o="price" value="${esc(o.price || "")}" placeholder="Price (optional), e.g. From £350"></div>
  <div class="col-12">${imageInput("off_img_" + Math.random().toString(36).slice(2, 8), o.image || "").replace('class="form-control mb-2"', 'class="form-control form-control-sm mb-2" data-o="image"')}</div></div>
  <button type="button" class="btn btn-sm btn-link text-danger p-0 mt-1" data-off-rm>Remove</button></div>`;
function offeringsField(id, v) { const list = Array.isArray(v) ? v : []; return `<div id="${id}" data-offerings>${list.map(offRow).join("")}</div><button type="button" class="btn btn-sm btn-outline-secondary" data-off-add>Add a service or product</button>`; }
function wireOfferings(root) {
  root.addEventListener("click", (e) => {
    if (e.target.matches("[data-off-add]")) { $("[data-offerings]", root).insertAdjacentHTML("beforeend", offRow()); wireImageInputs($("[data-offerings]", root)); dirty = true; }
    if (e.target.matches("[data-off-rm]")) { e.target.closest("[data-off-row]").remove(); dirty = true; }
  });
}
function hoursField(id, v) {
  const h = v && typeof v === "object" ? v : {};
  return `<div id="${id}" class="hours-ed">${DAYS_ADMIN.map(([k, n]) => { const d = h[k] || {}; return `<div class="hours-row" data-hday="${k}"><span>${n}</span><input type="time" class="form-control form-control-sm" data-hopen value="${esc(d.open || "")}" aria-label="${n} opens"><span class="small">to</span><input type="time" class="form-control form-control-sm" data-hclose value="${esc(d.close || "")}" aria-label="${n} closes"><label class="form-check-label small"><input type="checkbox" class="form-check-input me-1" data-hclosed ${d.closed ? "checked" : ""}>Closed</label></div>`; }).join("")}
    <button type="button" class="btn btn-sm btn-link p-0" data-hcopy>Copy Monday to Tuesday–Friday</button></div>`;
}
document.addEventListener("click", (e) => { if (!e.target.matches("[data-hcopy]")) return; const ed = e.target.closest(".hours-ed"), mon = $('[data-hday="mon"]', ed);
  ["tue", "wed", "thu", "fri"].forEach((k) => { const r = $(`[data-hday="${k}"]`, ed); $("[data-hopen]", r).value = $("[data-hopen]", mon).value; $("[data-hclose]", r).value = $("[data-hclose]", mon).value; $("[data-hclosed]", r).checked = $("[data-hclosed]", mon).checked; }); dirty = true; });
async function directoryExtras(row) {
  const [{ data: reviews }, { data: leads }] = await Promise.all([site().from("directory_reviews").select("*").eq("listing_id", row.id).order("created_at", { ascending: false }), site().from("directory_leads").select("*").eq("listing_id", row.id).order("created_at", { ascending: false }).limit(20)]);
  const starsTxt = (n) => "★".repeat(n) + "☆".repeat(5 - n);
  const box = document.createElement("div");
  box.innerHTML = `<div class="card mt-3" id="reviews"><div class="card-header bg-white fw-semibold d-flex justify-content-between align-items-center">Reviews <span class="small fw-normal text-body-secondary">${(reviews || []).filter((r) => r.status === "pending").length} waiting for approval</span></div><div class="card-body">
      ${(reviews || []).length ? `<div class="table-responsive"><table class="table table-sm align-middle"><thead><tr><th>Rating</th><th>Review</th><th>From</th><th>Status</th><th></th></tr></thead><tbody>${reviews.map((r) => `<tr data-rv="${r.id}"><td class="text-warning text-nowrap">${starsTxt(r.rating)}</td><td class="small">${esc(r.body)}</td><td class="small">${esc(r.name)}<br><span class="text-body-secondary">${esc(r.source)}${r.email ? " · " + esc(r.email) : ""} · ${fmtDate(r.created_at)}</span></td><td>${r.status === "published" ? '<span class="badge text-bg-success">Live</span>' : r.status === "pending" ? '<span class="badge text-bg-warning">Pending</span>' : '<span class="badge text-bg-light border">Rejected</span>'}</td>
        <td class="text-nowrap">${r.status !== "published" ? `<button type="button" class="btn btn-sm btn-success" data-rvs="published">Approve</button>` : ""} ${r.status !== "rejected" ? `<button type="button" class="btn btn-sm btn-outline-secondary" data-rvs="rejected">Reject</button>` : ""} <button type="button" class="btn btn-sm btn-outline-danger" data-rvdel>Delete</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="text-body-secondary">No reviews yet.</p>'}
      <details class="mt-2"><summary class="btn btn-sm btn-outline-secondary">Add a genuine review you've received</summary><div class="row g-2 mt-2"><div class="col-md-3"><input class="form-control form-control-sm" id="rv_name" placeholder="Reviewer's name"></div><div class="col-md-2"><select class="form-select form-select-sm" id="rv_rating">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${n} stars</option>`).join("")}</select></div>
        <div class="col-md-3"><select class="form-select form-select-sm" id="rv_source"><option value="google">From Google</option><option value="facebook">From Facebook</option><option value="in person">In person</option><option value="other">Other</option></select></div><div class="col-12"><textarea class="form-control form-control-sm" id="rv_body" rows="2" placeholder="Their review, word for word"></textarea></div>
        <div class="col-12"><button type="button" class="btn btn-sm btn-primary" id="rv_add">Add review</button> <span class="small text-body-secondary">Only add real reviews with the reviewer's permission. Made-up reviews are against the law.</span></div></div></details></div></div>
    <div class="card mt-3"><div class="card-header bg-white fw-semibold">Recent enquiries <span class="small fw-normal text-body-secondary">(sent from this business's page)</span></div><div class="card-body">
      ${(leads || []).length ? `<div class="table-responsive"><table class="table table-sm"><thead><tr><th>When</th><th>From</th><th>Message</th><th>Sent to</th></tr></thead><tbody>${leads.map((x) => `<tr><td class="small text-nowrap">${fmtDate(x.created_at, true)}</td><td class="small">${esc(x.name)}<br><a href="mailto:${esc(x.email)}">${esc(x.email)}</a>${x.phone ? "<br>" + esc(x.phone) : ""}</td><td class="small">${esc(x.message)}</td><td class="small">${esc(x.sent_to || "")}</td></tr>`).join("")}</tbody></table></div>` : '<p class="text-body-secondary mb-0">No enquiries yet.</p>'}
      <a class="small" href="/marketing/directory" data-link>See all directory performance</a></div></div>`;
  $("#cf").appendChild(box);
  box.addEventListener("click", async (e) => {
    const tr = e.target.closest("[data-rv]");
    if (tr && e.target.matches("[data-rvs]")) { const { error } = await site().from("directory_reviews").update({ status: e.target.dataset.rvs }).eq("id", +tr.dataset.rv); if (error) return oops(error); toast(e.target.dataset.rvs === "published" ? "Review approved. It shows within a minute." : "Review rejected"); render(); }
    if (tr && e.target.matches("[data-rvdel]")) { if (!e.target.dataset.armed) { e.target.dataset.armed = 1; e.target.textContent = "Confirm"; return; } const { error } = await site().from("directory_reviews").delete().eq("id", +tr.dataset.rv); if (error) return oops(error); tr.remove(); toast("Review deleted"); }
    if (e.target.id === "rv_add") { const name = $("#rv_name").value.trim(), body = $("#rv_body").value.trim(); if (!name || body.length < 10) return toast("Add the reviewer's name and their review", true);
      const { error } = await site().from("directory_reviews").insert({ listing_id: row.id, name, body, rating: +$("#rv_rating").value, source: $("#rv_source").value, status: "published" }); if (error) return oops(error); toast("Review added"); render(); }
  });
}

// ---------- Marketing: directory performance ----------
// ---------- directory: website lookup and private outreach contact (team only) ----------
async function listingLookupExtras(row) {
  const { data: ct } = await site().from("directory_contacts").select("contact_name,email,phone").eq("listing_id", row.id).maybeSingle();
  const g = `https://www.google.com/search?q=${encodeURIComponent([row.name.replace(/\b(ltd|limited|llp)\b\.?/gi, ""), row.town, "car"].filter(Boolean).join(" "))}`;
  $("#cf .card").insertAdjacentHTML("afterend", `<div class="card mt-3" id="lookup"><div class="card-body">
    <h2 class="h5">Find their details</h2><p class="small text-body-secondary">Find the business's own website, then fetch the phone, email, address, social links and logo from it. Everything is a suggestion: press Use for each one you've checked, then Save at the top.</p>
    <div class="input-group mb-2" style="max-width:720px"><a class="btn btn-outline-secondary" href="${g}" target="_blank" rel="noopener">Find website on Google</a><input class="form-control" id="lk_url" placeholder="Paste their website, e.g. www.example.co.uk" value="${esc(row.website || "")}"><button class="btn btn-primary" type="button" id="lk_go">Fetch details</button></div>
    <div id="lk_out" class="small"></div>
    <hr class="my-4"><h2 class="h5">Outreach contact (private)</h2><p class="small text-body-secondary">Who to email about claiming this listing. Never shown on the website. Only email limited companies like this one without asking first; sole traders need to have agreed.</p>
    <div class="row g-2" style="max-width:720px"><div class="col-md-5"><input class="form-control" id="oc_email" type="email" placeholder="Email" value="${esc(ct?.email || "")}"></div><div class="col-md-4"><input class="form-control" id="oc_name" placeholder="Contact name (optional)" value="${esc(ct?.contact_name || "")}"></div><div class="col-md-3"><button class="btn btn-outline-primary w-100" type="button" id="oc_save">Save contact</button></div></div></div></div>`);
  $("#oc_save").onclick = async () => { const em = $("#oc_email").value.trim().toLowerCase(); if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return toast("Check the email address", true);
    const { error } = await site().from("directory_contacts").upsert({ listing_id: row.id, email: em || null, contact_name: $("#oc_name").value.trim() || null, updated_at: new Date().toISOString() }, { onConflict: "listing_id" });
    if (error) return oops(error); toast("Outreach contact saved"); };
  $("#lk_go").onclick = async () => {
    const out = $("#lk_out"), url = $("#lk_url").value.trim(); if (!url) return toast("Paste their website first", true);
    out.innerHTML = "Reading their website…"; const { data: { session } } = await sb.auth.getSession();
    let j; try { const r = await fetch(SITE + "/api/site-scan", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ url }) }); j = await r.json(); if (!r.ok) throw new Error(j.error || "Couldn't read that website"); }
    catch (err) { out.innerHTML = `<div class="alert alert-warning mb-0">${esc(err.message)}</div>`; return; }
    const sugg = [["website", "Website", j.website], ["phone", "Public phone", j.phone], ["email", "Public email", j.email], ["address_line", "Street address", j.address?.line], ["postcode", "Postcode", j.address?.postcode || j.postcode],
      ...Object.entries(j.socials || {}).map(([k, v]) => [k, k === "x_url" ? "X" : k[0].toUpperCase() + k.slice(1), v]), ["logo_path", "Logo", j.logo]].filter((x) => x[2]);
    out.innerHTML = sugg.length ? `<table class="table table-sm align-middle mb-2"><tbody>${sugg.map(([k, l, v], i) => `<tr><td class="text-body-secondary" style="width:140px">${esc(l)}</td><td>${k === "logo_path" ? `<img src="${esc(v)}" alt="" style="max-height:48px;max-width:160px;background:#f4f4f4;padding:4px;border-radius:4px"> <span class="small text-body-secondary">Only add the logo once the owner has claimed the listing or agreed.</span>` : esc(v)}</td><td class="text-end"><button type="button" class="btn btn-sm btn-outline-primary" data-use="${i}">Use</button></td></tr>`).join("")}
      ${j.email ? `<tr><td class="text-body-secondary">Outreach email</td><td>${esc(j.email)}${(j.other_emails || []).length ? `<div class="small text-body-secondary">Also found: ${esc(j.other_emails.join(", "))}</div>` : ""}</td><td class="text-end"><button type="button" class="btn btn-sm btn-outline-primary" id="lk_oc">Use for outreach</button></td></tr>` : ""}</tbody></table>
      <button type="button" class="btn btn-sm btn-primary" id="lk_all">Use all except logo</button>` : '<div class="alert alert-light border mb-0">Nothing useful found on that site. Add the details by hand.</div>';
    const use = (i) => { const [k, , v] = sugg[i]; const el = $("#f_" + k); if (!el) return; el.value = k === "logo_path" ? v : v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); dirty = true; };
    $$("[data-use]", out).forEach((b) => (b.onclick = () => { use(+b.dataset.use); b.textContent = "Added"; b.disabled = true; }));
    if ($("#lk_all")) $("#lk_all").onclick = () => { sugg.forEach(([k], i) => { if (k !== "logo_path") use(i); }); toast("Added. Check them, then Save."); };
    if ($("#lk_oc")) $("#lk_oc").onclick = () => { $("#oc_email").value = j.email; $("#oc_save").click(); };
  };
}

// ---------- email marketing (team only) ----------
const CAMP_KINDS = { newsletter: ["Newsletter", "People who signed up for the newsletter (they ticked the consent box)."],
  business_outreach: ["Claim your listing (businesses)", "Unclaimed limited companies we imported, that have an outreach email saved and haven't been emailed in the last 60 days. Each one is invited to manage their listing: signing in with that email claims it."],
  businesses: ["Business owners", "Businesses that manage their own listing (signed-in owners)."] };
const CAMP_STATUS = { draft: ["Draft", "text-bg-secondary"], sending: ["Sending", "text-bg-primary"], paused: ["Paused", "text-bg-warning"], sent: ["Sent", "text-bg-success"] };
const OUTREACH_BODY = `<p>Hi {{first_name}},</p><p>We've added <strong>{{business}}</strong> to the Cars and Coffee UK directory, where car enthusiasts across Norfolk and Suffolk find garages, detailers and specialists they can trust.</p><p>Your listing is basic for now. Claim it free to add your photos, services and prices, opening times and contact details. Enquiries come straight to you, and you can reply to reviews and see how many people view your page.</p><p><a href="{{listing_url}}">See your listing</a></p><p>Thanks,<br>The Cars and Coffee UK team</p>`;
route("/email", async () => {
  crumbs([["Email marketing"]]);
  const [{ data: camps, error }, { data: stats }] = await Promise.all([site().from("email_campaigns").select("*").order("created_at", { ascending: false }), site().from("email_sends").select("campaign_id,status,clicked_at,unsubscribed_at").limit(50000)]);
  if (error) throw error;
  const st = (id) => { const r = (stats || []).filter((x) => x.campaign_id === id); return { total: r.length, sent: r.filter((x) => x.status === "sent").length, queued: r.filter((x) => ["queued", "sending"].includes(x.status)).length, clicks: r.filter((x) => x.clicked_at).length, unsub: r.filter((x) => x.unsubscribed_at).length }; };
  view.innerHTML = `<div class="page-head"><h1>Email marketing</h1><div class="d-flex gap-2"><a class="btn btn-outline-primary" href="/email/new?kind=business_outreach" data-link>New business outreach</a><a class="btn btn-primary" href="/email/new" data-link>New newsletter</a></div></div>
    <p class="text-body-secondary">Branded emails sent from your TrekMail mailbox, a few at a time so they arrive in inboxes rather than spam. Every email has an unsubscribe link, and anyone who unsubscribes is never emailed again.</p>
    <div class="card">${(camps || []).length ? `<div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr><th>Campaign</th><th>Audience</th><th>Status</th><th>Sent</th><th>Clicked</th><th>Unsubscribed</th></tr></thead><tbody>
      ${camps.map((c) => { const x = st(c.id), b = CAMP_STATUS[c.status]; return `<tr><td><a class="rowlink" href="/email/${c.id}" data-link>${esc(c.name)}</a><div class="small text-body-secondary">${esc(c.subject || "No subject yet")}</div></td><td class="small">${esc(CAMP_KINDS[c.kind][0])}</td><td><span class="badge ${b[1]}">${b[0]}</span></td><td>${x.sent}${x.queued ? ` <span class="small text-body-secondary">+${x.queued} to go</span>` : ""}</td><td>${x.sent ? `${x.clicks} <span class="small text-body-secondary">(${Math.round((x.clicks / x.sent) * 100)}%)</span>` : "–"}</td><td>${x.unsub || "–"}</td></tr>`; }).join("")}
      </tbody></table></div>` : '<div class="empty">No campaigns yet. Start with a business outreach email or a newsletter.</div>'}</div>`;
});
route("/email/:id", async ({ id }) => {
  const isNew = id === "new";
  let c = { name: "", kind: qs().get("kind") || "newsletter", subject: "", preheader: "", heading: "", body_html: "", cta_label: "", cta_url: "", from_name: "Cars and Coffee UK", reply_to: "", audience: {}, daily_cap: 150, status: "draft" };
  if (isNew && c.kind === "business_outreach") Object.assign(c, { name: "Claim your listing", subject: "{{business}} is on Cars and Coffee UK", preheader: "Claim your free business profile in two minutes.", heading: "Your business is on Cars and Coffee UK", body_html: OUTREACH_BODY, cta_label: "Claim your free profile", cta_url: "{{claim_url}}", daily_cap: 40 });
  if (!isNew) { const { data, error } = await site().from("email_campaigns").select("*").eq("id", id).maybeSingle(); if (error) throw error; if (!data) throw new Error("Campaign not found"); c = data; }
  crumbs([["Email marketing", "/email"], [isNew ? "New campaign" : c.name]]);
  const locked = c.status === "sending" || c.status === "sent";
  let count = null, sends = [];
  if (!isNew) { const [{ data: aud }, { data: ss }] = await Promise.all([site().rpc("campaign_audience", { p_campaign: c.id }), site().from("email_sends").select("email,business,status,sent_at,clicked_at,unsubscribed_at,error").eq("campaign_id", c.id).order("id").limit(2000)]); count = (aud || []).length; sends = ss || []; }
  const n = (k) => sends.filter((x) => x.status === k).length;
  const fld = (idk, label, val, extra = "") => `<div class="mb-3"><label class="form-label" for="${idk}">${label}</label><input class="form-control" id="${idk}" value="${esc(val || "")}" ${locked ? "disabled" : ""} ${extra}></div>`;
  view.innerHTML = `<div class="page-head"><h1>${isNew ? "New campaign" : esc(c.name)}</h1>${!isNew ? `<span class="badge ${CAMP_STATUS[c.status][1]} fs-6">${CAMP_STATUS[c.status][0]}</span>` : ""}</div>
    ${!isNew && sends.length ? `<div class="row g-3 mb-3">${[["Sent", n("sent")], ["Waiting to send", n("queued") + n("sending")], ["Failed", n("failed")], ["Clicked", sends.filter((x) => x.clicked_at).length], ["Unsubscribed", sends.filter((x) => x.unsubscribed_at).length]].map(([l, v]) => `<div class="col-6 col-md"><div class="card stat"><div class="card-body"><div class="value">${v}</div><div class="label">${l}</div></div></div></div>`).join("")}</div>` : ""}
    <div class="row g-3"><div class="col-lg-7"><form id="ecf" class="card"><div class="card-body">
      ${fld("e_name", "Campaign name (only you see this)", c.name, "required")}
      <div class="mb-3"><label class="form-label" for="e_kind">Who it goes to</label><select class="form-select" id="e_kind" ${locked || !isNew ? "disabled" : ""}>${Object.entries(CAMP_KINDS).map(([k, v]) => `<option value="${k}" ${c.kind === k ? "selected" : ""}>${esc(v[0])}</option>`).join("")}</select><div class="form-text" id="e_kind_help">${esc(CAMP_KINDS[c.kind][1])}</div></div>
      ${c.kind === "business_outreach" ? `<div class="mb-3"><label class="form-label" for="e_county">Only businesses in</label><select class="form-select" id="e_county" ${locked ? "disabled" : ""}><option value="">Any county</option>${["Norfolk", "Suffolk", "Cambridgeshire", "Essex"].map((x) => `<option ${c.audience?.county === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>` : ""}
      ${fld("e_subject", "Subject line", c.subject, 'maxlength="150" required')}${fld("e_pre", "Preview text (shown after the subject in most inboxes)", c.preheader, 'maxlength="150"')}${fld("e_heading", "Big heading in the email (optional)", c.heading, 'maxlength="120"')}
      <div class="mb-3"><label class="form-label" for="e_body_area">Message</label>${richField("e_body", c.body_html || "", esc, { compact: true })}<div class="form-text">Personalise with <code>{{first_name}}</code>, <code>{{business}}</code>, <code>{{listing_url}}</code> and <code>{{claim_url}}</code>.</div></div>
      <div class="row g-3"><div class="col-md-6">${fld("e_cta", "Button text (optional)", c.cta_label)}</div><div class="col-md-6">${fld("e_cta_url", "Button link", c.cta_url, 'placeholder="https://carsandcoffee.uk/… or {{claim_url}}"')}</div></div>
      <div class="row g-3"><div class="col-md-6">${fld("e_from", "From name", c.from_name)}</div><div class="col-md-6">${fld("e_reply", "Replies go to (optional)", c.reply_to, 'type="email" placeholder="Defaults to the sending mailbox"')}</div></div>
      ${fld("e_cap", "Most emails to send per day", c.daily_cap, 'type="number" min="1" max="2000"')}<div class="form-text mb-3">Keep business outreach to 30–50 a day so replies stay manageable and the emails arrive in inboxes.</div>
      <div class="d-flex flex-wrap gap-2">${locked ? "" : '<button class="btn btn-primary" type="submit">Save</button>'}${!isNew ? `<button class="btn btn-outline-secondary" type="button" id="e_test">Send me a test</button>` : ""}
        ${!isNew && (c.status === "draft" || c.status === "paused") ? `<button class="btn btn-success" type="button" id="e_start">${c.status === "paused" ? "Resume sending" : `Start sending to ${count ?? 0}`}</button>` : ""}
        ${c.status === "sending" ? '<button class="btn btn-warning" type="button" id="e_pause">Pause</button>' : ""}${!isNew && c.status !== "sending" ? '<button class="btn btn-outline-secondary" type="button" id="e_dup">Duplicate</button>' : ""}
        ${!isNew && c.status === "draft" ? '<button class="btn btn-outline-danger ms-auto" type="button" id="e_del">Delete</button>' : ""}</div>
    </div></form></div>
    <div class="col-lg-5"><div class="card"><div class="card-header bg-white"><span class="fw-semibold">Preview</span> <span class="small text-body-secondary">· Subject: <span id="e_subj"></span></span></div><div class="card-body p-0"><iframe id="e_prev" title="Email preview" style="width:100%;height:820px;border:0;background:#efe6da"></iframe></div></div>
      ${!isNew ? `<div class="card mt-3"><div class="card-header bg-white fw-semibold">Recipients ${count != null && c.status === "draft" ? `<span class="small fw-normal text-body-secondary">· ${count} will get this</span>` : ""}</div><div class="card-body small" style="max-height:340px;overflow:auto">${sends.length ? sends.slice(0, 300).map((x) => `<div class="d-flex justify-content-between border-bottom py-1"><span>${esc(x.business || x.email)}${x.business ? `<span class="text-body-secondary"> · ${esc(x.email)}</span>` : ""}</span><span>${x.unsubscribed_at ? "Unsubscribed" : x.clicked_at ? "Clicked" : esc(x.status)}</span></div>`).join("") : count ? "Recipients are added when you start sending." : c.kind === "business_outreach" ? "No businesses ready yet. Publish imported listings and save an outreach email on each (Find their details)." : "Nobody to send to yet."}</div></div>` : ""}</div></div>`;
  wireRich($("#ecf"), { upload: uploadSiteImage, onChange: () => { dirty = true; $("#ecf").dispatchEvent(new Event("input")); } });
  const val = () => ({ name: $("#e_name").value.trim(), kind: $("#e_kind").value, subject: $("#e_subject").value.trim(), preheader: $("#e_pre").value.trim() || null, heading: $("#e_heading").value.trim() || null,
    body_html: cleanHTML ? cleanHTML($("#e_body_area").innerHTML) : $("#e_body_area").innerHTML, cta_label: $("#e_cta").value.trim() || null, cta_url: $("#e_cta_url").value.trim() || null, from_name: $("#e_from").value.trim() || "Cars and Coffee UK",
    reply_to: $("#e_reply").value.trim() || null, daily_cap: Math.max(1, Math.min(2000, +$("#e_cap").value || 150)), audience: $("#e_county") ? { county: $("#e_county").value } : {}, updated_at: new Date().toISOString() });
  const sample = { first_name: "Sam", name: "Sam Smith", business: "Example Motors Ltd", listing_url: SITE + "/directory", claim_url: "https://admin.carsandcoffee.uk/", email: "sam@example.co.uk" };
  const fill = (t, html) => String(t || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (html ? esc(sample[k] ?? "") : sample[k] ?? ""));
  // live preview of the real email (rendered by the sending service), with a simple local version if that can't be reached
  let pvTimer = null;
  const prevLocal = () => { const v = val(), t = (x) => esc(fill(x));
    $("#e_prev").srcdoc = `<html><body style="margin:0;background:#efe6da;font-family:Arial,sans-serif"><div style="max-width:600px;margin:16px auto;background:#fff;border-radius:10px;overflow:hidden">
      <div style="background:#1d130f;padding:16px 22px"><img src="${SITE}/logo.png" width="52" alt=""></div><div style="padding:22px;color:#241712;font-size:15px;line-height:1.6">
      ${v.heading ? `<h1 style="font:900 22px/1.15 Arial Black,Arial;text-transform:uppercase;margin:0 0 12px">${t(v.heading)}</h1>` : ""}${fill(v.body_html, true)}
      ${v.cta_label ? `<p style="margin:22px 0"><span style="background:#c00d0d;color:#fff;padding:12px 22px;border-radius:6px;font-weight:700;display:inline-block">${t(v.cta_label)}</span></p>` : ""}</div></div></body></html>`; };
  const prev = () => { clearTimeout(pvTimer); pvTimer = setTimeout(async () => {
    try { const v = val(); const { data: { session } } = await sb.auth.getSession();
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-campaigns`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: SUPABASE_KEY }, body: JSON.stringify({ preview: true, draft: v }) });
      const j = await r.json(); if (!r.ok || !j.html) throw new Error(j.error || "preview failed");
      $("#e_prev").srcdoc = j.html; $("#e_subj").textContent = j.subject; }
    catch { prevLocal(); } }, 500); };
  prev();
  $("#ecf").addEventListener("input", () => { dirty = true; prev(); });
  if ($("#e_kind")) $("#e_kind").onchange = () => ($("#e_kind_help").textContent = CAMP_KINDS[$("#e_kind").value][1]);
  const save = async () => { const v = val(); if (!v.name) { toast("Give the campaign a name", true); return null; }
    const res = isNew ? await site().from("email_campaigns").insert(v).select("id").single() : await site().from("email_campaigns").update(v).eq("id", c.id).select("id").single();
    if (res.error) { oops(res.error); return null; } dirty = false; return res.data.id; };
  $("#ecf").onsubmit = async (e) => { e.preventDefault(); const nid = await save(); if (nid) { toast("Saved"); go(`/email/${nid}`, true); } };
  const fn = async (body) => { const { data: { session } } = await sb.auth.getSession(); const r = await fetch(`${SUPABASE_URL}/functions/v1/send-campaigns`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: SUPABASE_KEY }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Couldn't send"); return j; };
  if ($("#e_test")) $("#e_test").onclick = async () => { if (!locked && !(await save())) return; try { await fn({ test: true, campaign: c.id }); toast("Test sent to " + state.session.user.email); } catch (err) { toast(err.message, true); } };
  if ($("#e_start")) $("#e_start").onclick = async () => { if (!locked && !(await save())) return;
    const b = $("#e_start"); if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = c.status === "paused" ? "Click again to resume" : `Click again to send to ${count} people`; b.classList.replace("btn-success", "btn-danger"); return; }
    if (c.status === "paused") { const { error } = await site().from("email_campaigns").update({ status: "sending" }).eq("id", c.id); if (error) return oops(error); }
    else { const { data, error } = await site().rpc("campaign_start", { p_campaign: c.id }); if (error) return oops(error); toast(`${data} emails queued. They go out a few at a time, up to ${c.daily_cap} a day.`); }
    render(); };
  if ($("#e_pause")) $("#e_pause").onclick = async () => { const { error } = await site().from("email_campaigns").update({ status: "paused" }).eq("id", c.id); if (error) return oops(error); toast("Paused"); render(); };
  if ($("#e_dup")) $("#e_dup").onclick = async () => { const { id: _i, created_at, updated_at, started_at, finished_at, created_by, ...rest } = c; const { data, error } = await site().from("email_campaigns").insert({ ...rest, name: c.name + " (copy)", status: "draft" }).select("id").single(); if (error) return oops(error); go(`/email/${data.id}`); };
  if ($("#e_del")) $("#e_del").onclick = async () => { const b = $("#e_del"); if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Click again to delete"; return; } const { error } = await site().from("email_campaigns").delete().eq("id", c.id); if (error) return oops(error); toast("Deleted"); go("/email", true); };
});

// ---------- directory: import businesses from Companies House (team only) ----------
const CH_GROUPS = { repair: "Garages and repairs", parts: "Parts and accessories", sales: "Car sales" };
route("/directory/import", async () => {
  crumbs([["Directory", "/content/directory_listings"], ["Import businesses"]]);
  view.innerHTML = `<div class="page-head"><h1>Import businesses</h1></div>
    <p class="text-body-secondary">Find active car businesses registered at Companies House and add them to the directory as <strong>Pending, not yet claimed</strong> listings. Only the name, town and services are imported. Registered office addresses are often an accountant's, so no street address or phone number is copied. Check each one, publish the real ones, and the owner can claim it to build their full profile.</p>
    <div class="card mb-3"><div class="card-body"><form id="chf" class="row g-3 align-items-end">
      <div class="col-md-3"><label class="form-label" for="ch_county">County</label><select class="form-select" id="ch_county"><option>Norfolk</option><option>Suffolk</option><option>Cambridgeshire</option><option>Essex</option></select></div>
      <div class="col-md-4"><label class="form-label" for="ch_group">Type of business</label><select class="form-select" id="ch_group"><option value="">Any (use the name search)</option>${Object.entries(CH_GROUPS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div>
      <div class="col-md-3"><label class="form-label" for="ch_name">Name includes (optional)</label><input class="form-control" id="ch_name" placeholder="e.g. detailing, tyres, body"></div>
      <div class="col-md-2"><button class="btn btn-primary w-100" type="submit">Search</button></div></form>
      <p class="small text-body-secondary mt-2 mb-0">Tip: detailers, wrappers and tuners often register under general codes, so search their names too (detailing, valeting, wraps, tuning, performance).</p></div></div>
    <div id="chr"></div>`;
  let start = 0, last = null;
  const run = async (more = false) => {
    if (!more) start = 0;
    const body = { county: $("#ch_county").value, group: $("#ch_group").value, name: $("#ch_name").value.trim(), start };
    $("#chr").innerHTML = '<div class="text-body-secondary">Searching Companies House…</div>';
    const { data: { session } } = await sb.auth.getSession();
    let j;
    try { const r = await fetch(SITE + "/api/ch-search", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify(body) }); j = await r.json(); if (!r.ok) throw new Error(j.error || "Search failed"); }
    catch (err) { $("#chr").innerHTML = `<div class="alert alert-warning">${esc(err.message)}</div>`; return; }
    const nums = j.items.map((x) => x.company_number);
    const { data: have } = nums.length ? await site().from("directory_listings").select("company_number,name,status").in("company_number", nums) : { data: [] };
    const got = Object.fromEntries((have || []).map((x) => [x.company_number, x]));
    last = j;
    $("#chr").innerHTML = `<div class="card"><div class="card-body pb-0 d-flex flex-wrap justify-content-between gap-2 align-items-center"><div><strong>${j.total}</strong> active companies found${j.total > 100 ? `, showing ${start + 1}–${start + j.items.length}` : ""}.</div>
      <div class="d-flex gap-2"><button class="btn btn-sm btn-outline-secondary" id="ch_all">Select all new</button><button class="btn btn-sm btn-primary" id="ch_imp">Import selected as pending</button></div></div>
      <div class="table-responsive"><table class="table table-hover align-middle mb-0 mt-2"><thead><tr><th></th><th>Company</th><th>Town</th><th>Services</th><th>Since</th><th></th></tr></thead><tbody>
      ${j.items.map((x, i) => { const g = got[x.company_number]; return `<tr${g ? ' class="row-off"' : ""}><td><input class="form-check-input" type="checkbox" data-i="${i}" ${g ? "disabled" : ""} aria-label="Select ${esc(x.name)}"></td>
        <td><strong>${esc(x.name)}</strong><div class="small text-body-secondary">No. ${esc(x.company_number)} · SIC ${esc(x.sic.join(", "))}</div></td><td>${esc(x.town || "–")}<div class="small text-body-secondary">${esc(x.postcode)}</div></td>
        <td><input class="form-control form-control-sm" data-svc="${i}" value="${esc(x.services.join(", "))}" ${g ? "disabled" : ""} aria-label="Services for ${esc(x.name)}"></td><td class="small">${esc((x.incorporated || "").slice(0, 4))}</td>
        <td class="small">${g ? `Already in directory (${esc(g.status)})` : `<a href="https://find-and-update.company-information.service.gov.uk/company/${esc(x.company_number)}" target="_blank" rel="noopener">Companies House</a>`}</td></tr>`; }).join("") || '<tr><td colspan="6" class="text-body-secondary">Nothing found. Try another type or a name word.</td></tr>'}
      </tbody></table></div>
      <div class="card-body d-flex justify-content-between align-items-center"><span class="small text-body-secondary">${esc(j.attribution || "")}</span>${start + j.items.length < j.total ? '<button class="btn btn-sm btn-outline-secondary" id="ch_more">Next 100</button>' : ""}</div></div>`;
    $("#ch_all").onclick = () => $$("#chr input[type=checkbox]:not(:disabled)").forEach((c) => (c.checked = true));
    if ($("#ch_more")) $("#ch_more").onclick = () => { start += 100; run(true); };
    $("#ch_imp").onclick = async () => {
      const picked = $$("#chr input[type=checkbox]:checked").map((c) => +c.dataset.i);
      if (!picked.length) return toast("Tick the businesses to import first", true);
      const rows = picked.map((i) => { const x = last.items[i], svc = $(`[data-svc="${i}"]`).value.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 6);
        return { name: x.name, slug: slugify(`${x.name.replace(/\b(ltd|limited|llp|plc)\b\.?/gi, "")} ${x.town}`) + "-" + x.company_number.slice(-4).toLowerCase(), services: svc.length ? svc : ["Servicing"], town: x.town || null,
          county: $("#ch_county").value, status: "pending", source: "companies_house", company_number: x.company_number, unclaimed: true, approximate: true, enquiries_enabled: true, reviews_enabled: true }; });
      const { error } = await site().from("directory_listings").insert(rows);
      if (error) return oops(error);
      toast(`${rows.length} business${rows.length === 1 ? "" : "es"} added as pending. Check and publish them in Directory.`); run(true);
    };
  };
  $("#chf").onsubmit = (e) => { e.preventDefault(); run(); };
});

// ---------- directory: claim requests (team only) ----------
route("/directory/claims", async () => {
  crumbs([["Directory", "/content/directory_listings"], ["Claim requests"]]);
  const { data, error } = await site().from("listing_claims").select("*, directory_listings(name,slug)").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  view.innerHTML = `<div class="page-head"><h1>Claim requests</h1></div><p class="text-body-secondary">People asking to manage an unclaimed listing. Check they run the business (for example, call the business number or check their email domain), then press Approve: they get access the first time they sign in with that email.</p>
    <div class="card">${(data || []).length ? `<div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th>Business</th><th>Person</th><th>Message</th><th>Received</th><th></th></tr></thead><tbody>
    ${data.map((c) => `<tr data-id="${c.id}"><td><a href="/content/directory_listings/${c.listing_id}" data-link>${esc(c.directory_listings?.name || "")}</a></td><td>${esc(c.name)}${c.role ? ` <span class="small text-body-secondary">(${esc(c.role)})</span>` : ""}<div class="small"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a>${c.phone ? ` · ${esc(c.phone)}` : ""}</div></td>
      <td class="small">${esc(c.message || "")}</td><td class="small">${fmtDate(c.created_at, true)}</td>
      <td class="text-end text-nowrap">${c.status === "new" ? `<button class="btn btn-sm btn-success" data-ok>Approve</button> <button class="btn btn-sm btn-outline-danger" data-no>Reject</button>` : `<span class="badge ${c.status === "approved" ? "text-bg-success" : "text-bg-secondary"}">${esc(c.status)}</span>`}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">No claim requests yet.</div>'}</div>`;
  view.onclick = async (e) => {
    const tr = e.target.closest("tr[data-id]"); if (!tr) return; const c = data.find((x) => String(x.id) === tr.dataset.id);
    if (e.target.matches("[data-ok]")) {
      const { error: ie } = await site().from("listing_invites").insert({ listing_id: c.listing_id, email: c.email, role: "owner" });
      if (ie && !/duplicate|unique/i.test(ie.message)) return oops(ie);
      await site().from("listing_claims").update({ status: "approved" }).eq("id", c.id);
      toast("Approved. Email them to say they can sign in at admin.carsandcoffee.uk with " + c.email); render();
    }
    if (e.target.matches("[data-no]")) { await site().from("listing_claims").update({ status: "rejected" }).eq("id", c.id); toast("Rejected"); render(); }
  };
});

route("/marketing/directory", async () => {
  crumbs([["Marketing", "/marketing"], ["Directory performance"]]);
  const days = Number(qs().get("days") || 30);
  const [{ data: stats, error }, { data: leads }] = await Promise.all([(MOCK ? Promise.resolve({ data: [{ listing_id: "d1", slug: "coastline-detailing", name: "Coastline Detailing", status: "published", views: 120, website: 14, phone_reveal: 9, phone_call: 4, email: 2, directions: 6, social: 3, video: 5, gallery: 11, enquiry: 3, review: 1 }] }) : sb.schema("site").rpc("directory_stats", { p_days: days })), site().from("directory_leads").select("id,listing_id,name,email,phone,message,sent_to,created_at").gte("created_at", new Date(Date.now() - days * 864e5).toISOString()).order("created_at", { ascending: false }).limit(200)]);
  if (error) throw error;
  const rows = (stats || []).filter((r) => r.status !== "rejected");
  const cols = [["views", "Page views"], ["website", "Website clicks"], ["phone_reveal", "Number shown"], ["phone_call", "Calls tapped"], ["email", "Email clicks"], ["directions", "Directions"], ["social", "Social clicks"], ["video", "Video plays"], ["gallery", "Photos opened"], ["enquiry", "Enquiries"], ["review", "Reviews"]];
  const tot = Object.fromEntries(cols.map(([k]) => [k, rows.reduce((n, r) => n + Number(r[k] || 0), 0)]));
  const actions = (r) => ["website", "phone_reveal", "phone_call", "email", "directions", "enquiry"].reduce((n, k) => n + Number(r[k] || 0), 0);
  const rate = (r) => (Number(r.views) ? Math.round((actions(r) / Number(r.views)) * 100) + "%" : "–");
  const nameOf = Object.fromEntries((stats || []).map((r) => [r.listing_id, r.name]));
  const tab = (d, l) => `<a href="/marketing/directory?days=${d}" data-link class="${days === d ? "on" : ""}">${l}</a>`;
  view.innerHTML = `<div class="page-head"><h1>Directory performance</h1><button class="btn btn-outline-secondary" id="leadcsv">Download enquiries (CSV)</button></div>
    <p class="text-body-secondary">How visitors interact with each business page: anonymous counts, no cookies. Use it to show businesses the value of their listing.</p>
    <div class="pill-tabs">${tab(7, "Last 7 days")}${tab(30, "Last 30 days")}${tab(90, "Last 90 days")}${tab(365, "Last year")}</div>
    <div class="row g-3 mb-3">${[["views", "Page views"], ["website", "Website clicks"], ["phone_reveal", "Phone numbers shown"], ["enquiry", "Enquiries sent"]].map(([k, l]) => `<div class="col-6 col-lg-3"><div class="card stat"><div class="card-body"><div class="value">${tot[k]}</div><div class="label">${l}</div></div></div></div>`).join("")}</div>
    <div class="card"><div class="table-responsive"><table class="table table-hover mb-0 align-middle small"><thead><tr><th>Business</th>${cols.map(([, l]) => `<th class="text-end">${l}</th>`).join("")}<th class="text-end" title="Website, phone, email, directions and enquiries per page view">Action rate</th></tr></thead><tbody>
      ${rows.map((r) => `<tr class="${r.status === "published" ? "" : "row-off"}"><td><a class="rowlink" href="/content/directory_listings/${r.listing_id}" data-link>${esc(r.name)}</a>${r.status === "published" ? "" : ' <span class="badge text-bg-warning">' + esc(r.status) + "</span>"}</td>${cols.map(([k]) => `<td class="text-end">${Number(r[k] || 0) || '<span class="text-body-secondary">0</span>'}</td>`).join("")}<td class="text-end fw-semibold">${rate(r)}</td></tr>`).join("")}
      <tr class="fw-semibold"><td>Total</td>${cols.map(([k]) => `<td class="text-end">${tot[k]}</td>`).join("")}<td class="text-end">${rate(tot)}</td></tr></tbody></table></div></div>
    <h2 class="h5 mt-4">Enquiries in this period</h2>
    <div class="card">${(leads || []).length ? `<div class="table-responsive"><table class="table table-sm mb-0"><thead><tr><th>When</th><th>Business</th><th>From</th><th>Message</th><th>Sent to</th></tr></thead><tbody>${leads.map((x) => `<tr><td class="small text-nowrap">${fmtDate(x.created_at, true)}</td><td class="small">${esc(nameOf[x.listing_id] || "")}</td><td class="small">${esc(x.name)}<br><a href="mailto:${esc(x.email)}">${esc(x.email)}</a>${x.phone ? " · " + esc(x.phone) : ""}</td><td class="small">${esc(x.message)}</td><td class="small">${esc(x.sent_to || "")}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">No enquiries in this period yet.</div>'}</div>`;
  $("#leadcsv").onclick = () => { const head = ["created_at", "business", "name", "email", "phone", "message", "sent_to"]; const csv = [head.join(","), ...(leads || []).map((x) => [x.created_at, nameOf[x.listing_id] || "", x.name, x.email, x.phone || "", x.message, x.sent_to || ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `directory-enquiries-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); };
});

// ---------- photo gallery field ----------
function galleryField(id, v) {
  return `<div class="galf" data-gal="${id}"><input type="hidden" id="${id}" value="${esc(JSON.stringify(Array.isArray(v) ? v : []))}">
    <div class="galf-list"></div>
    <div class="d-flex align-items-center gap-2 flex-wrap"><label class="btn btn-outline-secondary btn-sm mb-0">Add photos<input type="file" accept="image/webp,image/jpeg,image/png,image/avif" multiple hidden data-galadd></label>
      <span class="small text-body-secondary" data-galmsg>Choose several at once if you like. Up to 5 MB each. Drag to reorder or use the arrows.</span></div></div>`;
}
function wireGallery(root) {
  for (const box of $$("[data-gal]", root)) {
    const hidden = $("input[type=hidden]", box), list = $(".galf-list", box), msg = $("[data-galmsg]", box);
    let items = JSON.parse(hidden.value || "[]");
    const save = () => { hidden.value = JSON.stringify(items); dirty = true; };
    const draw = () => {
      list.innerHTML = items.length ? items.map((x, i) => `<div class="galf-item" draggable="true" data-i="${i}">
        <img src="${esc(imgSrc(x.src))}" alt=""><div class="galf-fields"><input class="form-control form-control-sm" data-k="alt" value="${esc(x.alt || "")}" placeholder="Describe the photo (for people who can't see it)" aria-label="Photo ${i + 1} description">
        <input class="form-control form-control-sm" data-k="caption" value="${esc(x.caption || "")}" placeholder="Caption (optional, shown under the photo)" aria-label="Photo ${i + 1} caption"></div>
        <div class="galf-btns"><button type="button" class="btn btn-sm btn-outline-secondary" data-mv="-1" ${i === 0 ? "disabled" : ""} aria-label="Move earlier">↑</button><button type="button" class="btn btn-sm btn-outline-secondary" data-mv="1" ${i === items.length - 1 ? "disabled" : ""} aria-label="Move later">↓</button><button type="button" class="btn btn-sm btn-outline-danger" data-rm aria-label="Remove photo">Remove</button></div></div>`).join("")
        : '<div class="galf-empty">No gallery photos yet.</div>';
    };
    list.addEventListener("input", (e) => { const it = e.target.closest(".galf-item"); if (!it || !e.target.dataset.k) return; items[+it.dataset.i][e.target.dataset.k] = e.target.value; save(); });
    list.addEventListener("click", (e) => {
      const it = e.target.closest(".galf-item"); if (!it) return; const i = +it.dataset.i;
      if (e.target.dataset.mv) { const j = i + +e.target.dataset.mv; [items[i], items[j]] = [items[j], items[i]]; save(); draw(); }
      if (e.target.hasAttribute("data-rm")) { items.splice(i, 1); save(); draw(); }
    });
    let from = null;
    list.addEventListener("dragstart", (e) => { const it = e.target.closest(".galf-item"); if (it) { from = +it.dataset.i; it.classList.add("dragging"); } });
    list.addEventListener("dragover", (e) => { if (from != null) e.preventDefault(); });
    list.addEventListener("drop", (e) => { e.preventDefault(); const it = e.target.closest(".galf-item"); if (from == null || !it) return; const to = +it.dataset.i; const [m] = items.splice(from, 1); items.splice(to, 0, m); from = null; save(); draw(); });
    list.addEventListener("dragend", () => { from = null; draw(); });
    $("[data-galadd]", box).onchange = async (e) => {
      const files = [...e.target.files]; e.target.value = ""; if (!files.length) return;
      let done = 0, failed = 0;
      for (const f of files) {
        msg.textContent = `Uploading ${done + 1} of ${files.length}…`;
        try { const url = await uploadSiteImage(f); items.push({ src: url, alt: "", caption: "" }); save(); draw(); } catch (err) { failed++; }
        done++;
      }
      msg.textContent = failed ? `${files.length - failed} uploaded, ${failed} failed (check they're photos under 5 MB). Add a description to each, then save.` : `${files.length} photo${files.length === 1 ? "" : "s"} added. Add a description to each, then save.`;
    };
    draw();
  }
}

// ---------- images ----------
async function uploadSiteImage(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error("That photo is over 5 MB. Please use a smaller one.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const listingId = isPartner() && state.uploadListing ? state.uploadListing : null;
  const shopId = isPartner() && !listingId ? ($("#f_shop_id")?.value || state.uploadShop || state.myShops[0]?.id) : null;
  const path = `${listingId ? `listings/${listingId}` : shopId ? `shops/${shopId}` : "uploads"}/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, "")) || "image"}.${ext}`;
  const { error } = await sb.storage.from("site-images").upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw error;
  return sb.storage.from("site-images").getPublicUrl(path).data.publicUrl;
}
const imgSrc = (p) => !p ? "" : /^https?:\/\//.test(p) ? p : SITE + "/" + String(p).replace(/^\//, "");
function imageInput(id, v, req = "") {
  return `<div class="imgfield"><div class="imgprev">${v ? `<img src="${esc(imgSrc(v))}" alt="">` : '<span class="small text-body-secondary">No image</span>'}</div>
    <div class="flex-grow-1"><input class="form-control mb-2" id="${id}" value="${esc(v ?? "")}" placeholder="Upload a photo or paste an image address" ${req}>
    <label class="btn btn-sm btn-outline-secondary mb-0">Upload photo<input type="file" accept="image/webp,image/jpeg,image/png,image/avif,image/svg+xml" data-upload="${id}" hidden></label>
    <span class="small text-body-secondary ms-2" data-upmsg="${id}">WebP, JPG or PNG, up to 5 MB</span></div></div>`;
}
function wireImageInputs(root) {
  for (const fi of $$("[data-upload]", root)) fi.onchange = async () => {
    const file = fi.files[0]; if (!file) return;
    const id = fi.dataset.upload, msg = $(`[data-upmsg="${id}"]`, root);
    if (file.size > 5 * 1024 * 1024) { msg.textContent = "That file is over 5 MB. Please use a smaller photo."; return; }
    msg.textContent = "Uploading…";
    let url; try { url = await uploadSiteImage(file); } catch (error) { msg.textContent = "Upload failed: " + error.message; return; }
    const input = $("#" + id, root); input.value = url; input.dispatchEvent(new Event("input", { bubbles: true }));
    fi.closest(".imgfield").querySelector(".imgprev").innerHTML = `<img src="${esc(url)}" alt="">`;
    msg.textContent = "Uploaded. Remember to save.";
  };
  for (const inp of $$(".imgfield input.form-control", root)) inp.addEventListener("change", () => { inp.closest(".imgfield").querySelector(".imgprev").innerHTML = inp.value ? `<img src="${esc(imgSrc(inp.value))}" alt="">` : '<span class="small text-body-secondary">No image</span>'; });
}

// ---------- homepage blocks ----------
let BLOCKS = null;
async function blockDefs() { if (!BLOCKS) BLOCKS = await (await fetch("/blocks.json", { cache: "no-cache" })).json(); return BLOCKS; }
const BLOCK_LINKS = { detail_of_month: "/content/partner_features", livery_of_week: "/content/partner_features", race_night: "/content/partner_features", sponsored: "/content/sponsored_slots",
  events: "/content/events", news: "/content/articles", community: "/content/community_highlights", shop: "/content/products", gallery: "/content/gallery_items", directory: "/content/directory_listings", faqs: "/content/faqs", partners: "/content/partners", why_join: "/content/site_stats" };
const BLOCK_LINK_LABEL = { events: "Edit events", news: "Edit news", community: "Edit community posts", shop: "Edit shop", gallery: "Edit galleries", directory: "Edit listings", faqs: "Edit FAQs", partners: "Edit partners", why_join: "Edit stats", sponsored: "Edit the advert", detail_of_month: "Edit partner feature", livery_of_week: "Edit partner feature", race_night: "Edit partner feature" };
route("/homepage", async () => {
  crumbs([["Homepage blocks"]]);
  const defs = await blockDefs();
  const { data, error } = await site().from("homepage_blocks").select("*").order("position"); if (error) throw error;
  const rows = data.filter((b) => defs[b.key]);
  view.innerHTML = `<div class="page-head"><h1>Homepage blocks</h1><a class="btn btn-outline-secondary" href="${SITE}" target="_blank" rel="noopener">View homepage ↗</a></div>
    <p class="text-body-secondary">Change the order with the arrows, switch blocks on or off, and edit each block's text and photos. Changes are live on the website within a minute.</p>
    <div class="card"><ul class="list-group list-group-flush" id="blist">${rows.map((b, i) => `<li class="list-group-item d-flex flex-wrap align-items-center gap-3" data-key="${esc(b.key)}">
      <div class="btn-group-vertical btn-group-sm"><button class="btn btn-outline-secondary" data-mv="-1" ${i === 0 ? "disabled" : ""} aria-label="Move up">▲</button><button class="btn btn-outline-secondary" data-mv="1" ${i === rows.length - 1 ? "disabled" : ""} aria-label="Move down">▼</button></div>
      <div class="flex-grow-1"><a class="rowlink" href="/homepage/${esc(b.key)}" data-link>${esc(defs[b.key].label || b.title)}</a>
        <div class="small text-body-secondary">${b.starts_at || b.ends_at ? `Scheduled ${b.starts_at ? "from " + fmtDate(b.starts_at, true) : ""} ${b.ends_at ? "until " + fmtDate(b.ends_at, true) : ""}` : defs[b.key].note ? esc(defs[b.key].note) : `${(defs[b.key].fields || []).length} editable fields`}</div></div>
      ${BLOCK_LINKS[b.key] ? `<a class="btn btn-sm btn-outline-secondary" href="${BLOCK_LINKS[b.key]}" data-link>${BLOCK_LINK_LABEL[b.key]}</a>` : ""}
      <a class="btn btn-sm btn-outline-primary" href="/homepage/${esc(b.key)}" data-link>Edit block</a>
      <div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" data-on ${b.enabled ? "checked" : ""} id="on-${esc(b.key)}"><label class="form-check-label small" for="on-${esc(b.key)}">${b.enabled ? "Shown" : "Hidden"}</label></div>
    </li>`).join("")}</ul></div>`;
  view.onclick = async (e) => {
    const mv = e.target.closest("[data-mv]"); if (!mv) return;
    const li = mv.closest("li"); const i = rows.findIndex((r) => r.key === li.dataset.key); const j = i + Number(mv.dataset.mv);
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    const updates = rows.map((r, k) => ({ key: r.key, position: (k + 2) * 10 })).filter((u, k) => u.position !== rows[k].position);
    for (const u of updates) { const { error } = await site().from("homepage_blocks").update({ position: u.position }).eq("key", u.key); if (error) return oops(error); }
    toast("Order saved"); render();
  };
  view.onchange = async (e) => {
    const sw = e.target.closest("[data-on]"); if (!sw) return;
    const key = sw.closest("li").dataset.key;
    const { error } = await site().from("homepage_blocks").update({ enabled: sw.checked }).eq("key", key); if (error) { sw.checked = !sw.checked; return oops(error); }
    sw.nextElementSibling.textContent = sw.checked ? "Shown" : "Hidden"; toast(sw.checked ? "Block shown" : "Block hidden");
  };
});
route("/homepage/:key", async ({ key }) => {
  const defs = await blockDefs(); const def = defs[key]; if (!def) throw new Error("Unknown block");
  const { data: b, error } = await site().from("homepage_blocks").select("*").eq("key", key).maybeSingle(); if (error) throw error; if (!b) throw new Error("Block not found");
  crumbs([["Homepage blocks", "/homepage"], [def.label]]);
  const st = b.settings || {};
  const field = (f) => {
    const id = "s_" + f.name, v = st[f.name] ?? f.default ?? "";
    const label = `<label class="form-label" for="${id}">${esc(f.label)}</label>`;
    if (f.type === "image") return `<div class="col-12">${label}${imageInput(id, v)}</div>`;
    if (f.type === "textarea") return `<div class="col-12">${label}<textarea class="form-control" id="${id}" rows="${String(v).length > 300 ? 7 : 3}">${esc(v)}</textarea></div>`;
    return `<div class="col-md-6">${label}<input class="form-control" id="${id}" type="${f.type === "number" ? "number" : "text"}" value="${esc(v)}"></div>`;
  };
  view.innerHTML = `<form id="bf" novalidate><div class="page-head"><h1>${esc(def.label)}</h1>
      <div class="d-flex gap-2"><a class="btn btn-outline-secondary" href="/homepage" data-link>Back</a><a class="btn btn-outline-secondary" href="${SITE}/#${esc(key.replace(/_/g, "-"))}" target="_blank" rel="noopener">View ↗</a><button class="btn btn-primary" type="submit">Save</button></div></div>
    ${def.note ? `<div class="alert alert-info">${esc(def.note)} ${BLOCK_LINKS[key] ? `<a href="${BLOCK_LINKS[key]}" data-link>${BLOCK_LINK_LABEL[key]}</a>` : ""}</div>` : ""}
    ${def.fields ? `<div class="card mb-4"><div class="card-header bg-white fw-semibold">Text and photos</div><div class="card-body"><div class="row g-3">${def.fields.map(field).join("")}</div>
      <p class="small text-body-secondary mt-3 mb-0">Clear a field to go back to the standard wording.</p></div></div>` : ""}
    ${BLOCK_LINKS[key] && !def.note ? `<p><a class="btn btn-sm btn-outline-secondary" href="${BLOCK_LINKS[key]}" data-link>${BLOCK_LINK_LABEL[key]}</a></p>` : ""}
    <div class="card"><div class="card-header bg-white fw-semibold">Visibility</div><div class="card-body"><div class="row g-3">
      <div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="b_enabled" ${b.enabled ? "checked" : ""}><label class="form-check-label" for="b_enabled">Show this block on the homepage</label></div></div>
      <div class="col-md-6"><label class="form-label" for="b_starts">Show from <span class="small text-body-secondary">(optional)</span></label><input class="form-control" type="datetime-local" id="b_starts" value="${toLocal(b.starts_at)}"></div>
      <div class="col-md-6"><label class="form-label" for="b_ends">Show until <span class="small text-body-secondary">(optional)</span></label><input class="form-control" type="datetime-local" id="b_ends" value="${toLocal(b.ends_at)}"></div>
    </div></div></div></form>`;
  wireImageInputs($("#bf"));
  $("#bf").addEventListener("input", () => (dirty = true));
  $("#bf").onsubmit = async (e) => {
    e.preventDefault();
    const settings = {};
    for (const f of def.fields || []) { const v = $("#s_" + f.name).value.trim(); if (v && v !== String(f.default ?? "")) settings[f.name] = v; }
    const out = { settings, enabled: $("#b_enabled").checked, starts_at: $("#b_starts").value ? new Date($("#b_starts").value).toISOString() : null, ends_at: $("#b_ends").value ? new Date($("#b_ends").value).toISOString() : null };
    const { error } = await site().from("homepage_blocks").update(out).eq("key", key); if (error) return oops(error);
    dirty = false; toast("Saved. Live on the website within a minute."); go("/homepage", true);
  };
});

// ---------- club ----------
route("/club/applications", async () => {
  crumbs([["Applications"]]);
  const { data, error } = await sb.rpc("get_application_queue"); if (error) throw error;
  const rows = data || [];
  view.innerHTML = `<div class="page-head"><h1>Applications</h1><span class="text-body-secondary">${rows.length} waiting · target: decide within 24 hours</span></div>
    ${rows.length ? rows.map((a) => `<div class="card mb-3" data-app="${a.id}"><div class="card-body">
      <div class="d-flex flex-wrap justify-content-between gap-2"><div><h2 class="h5 mb-1">${esc(a.full_name)} ${a.fast_track ? '<span class="badge text-bg-warning">Fast-track</span>' : ""} ${a.status === "more_info" ? '<span class="badge text-bg-info">Asked for more info</span>' : ""}</h2>
        <div class="small text-body-secondary">${esc(a.email || "")} · ${esc(a.location || "")} · waiting ${Math.round(a.waiting_hours)}h</div></div></div>
      <dl class="row small mt-3 mb-2"><dt class="col-sm-3">Interests</dt><dd class="col-sm-9">${esc((a.favourite_series || []).join(", ") || "–")}</dd>
        <dt class="col-sm-3">Car</dt><dd class="col-sm-9">${esc(a.car || "–")}</dd><dt class="col-sm-3">Heard about us</dt><dd class="col-sm-9">${esc(a.heard_about || "–")}</dd>
        ${a.recommender_name ? `<dt class="col-sm-3">Recommended by</dt><dd class="col-sm-9">${esc(a.recommender_name)}${a.recommender_handle ? " (@" + esc(a.recommender_handle) + ")" : ""} · ${a.recommender_approved_count} approved, ${a.recommender_removed_count} removed</dd>` : ""}
        ${a.message_to_applicant ? `<dt class="col-sm-3">Our question</dt><dd class="col-sm-9">${esc(a.message_to_applicant)}</dd>` : ""}</dl>
      <textarea class="form-control form-control-sm mb-2" rows="2" placeholder="Message to the applicant (needed for More info; optional otherwise)" data-msg></textarea>
      <input class="form-control form-control-sm mb-2" placeholder="Private team note (optional)" data-notes value="${esc(a.admin_notes || "")}">
      <div class="d-flex flex-wrap gap-2"><button class="btn btn-sm btn-success" data-d="approved">Approve</button><button class="btn btn-sm btn-outline-secondary" data-d="more_info">Ask for more info</button><button class="btn btn-sm btn-outline-danger" data-d="rejected">Decline</button></div>
    </div></div>`).join("") : `<div class="card"><div class="empty">Nobody waiting for approval.</div></div>`}`;
  view.onclick = async (e) => {
    const b = e.target.closest("[data-d]"); if (!b) return;
    const card = b.closest("[data-app]"); const msg = $("[data-msg]", card).value.trim();
    if (b.dataset.d === "more_info" && !msg) { toast("Write the question you want to ask them", true); $("[data-msg]", card).focus(); return; }
    b.disabled = true;
    const { error } = await sb.rpc("decide_application", { p_application_id: card.dataset.app, p_decision: b.dataset.d, p_message: msg || null, p_notes: $("[data-notes]", card).value.trim() || null });
    if (error) { b.disabled = false; return oops(error); }
    toast({ approved: "Approved, welcome email queued", more_info: "Question sent", rejected: "Declined" }[b.dataset.d]); card.remove();
  };
});


route("/club/moderation", async () => {
  crumbs([["Moderation"]]);
  const st = qs().get("status") || "open";
  const { data, error } = await sb.rpc("get_reports", { p_status: st }); if (error) throw error;
  const R = { spam: "Spam or advertising", abuse: "Abusive or hateful", unsafe: "Dangerous driving or unsafe", illegal: "Illegal", privacy: "Private details or number plate", other: "Something else" };
  const seen = new Set(); const rows = (data || []).filter((r) => { const k = r.post_id || r.comment_id; if (st === "open" && seen.has(k)) return false; seen.add(k); return true; });
  const tab = (v, l) => `<a href="/club/moderation?status=${v}" data-link class="${st === v ? "on" : ""}">${l}</a>`;
  view.innerHTML = `<div class="page-head"><h1>Moderation</h1><span class="text-body-secondary">Reports from members about posts and comments in the club</span></div>
    <div class="pill-tabs">${tab("open", "To review")}${tab("actioned", "Hidden")}${tab("dismissed", "Dismissed")}${tab("all", "All")}</div>
    ${rows.length ? rows.map((r) => `<div class="card mb-3" data-post="${r.post_id || ""}" data-comment="${r.comment_id || ""}"><div class="card-body">
      <div class="d-flex flex-wrap justify-content-between gap-2 mb-2"><div><span class="badge text-bg-warning">${esc(R[r.reason] || r.reason)}</span> ${r.report_count > 1 ? `<span class="badge text-bg-danger">${r.report_count} reports</span>` : ""}
        <span class="small text-body-secondary ms-2">${r.post_id ? "Post" : "Comment"} by <strong>${esc(r.author_name || "member")}</strong>${r.author_handle ? ` (@${esc(r.author_handle)})` : ""} · reported by ${esc(r.reporter_name || "a member")} ${ago(r.created_at)}</span></div>
        <span class="badge ${r.content_status === "hidden" ? "text-bg-secondary" : "text-bg-success"}">${r.content_status === "hidden" ? "Hidden" : "Visible"}</span></div>
      <blockquote class="border-start ps-3 mb-2" style="white-space:pre-line">${esc((r.content_body || "").slice(0, 800)) || '<span class="text-body-secondary">(photos only)</span>'}</blockquote>
      ${(r.content_photos || []).length ? `<div class="d-flex gap-2 mb-2">${r.content_photos.slice(0, 4).map((k) => `<img src="https://club.carsandcoffee.uk/media/${esc(k)}" alt="" style="width:90px;height:68px;object-fit:cover;border-radius:6px">`).join("")}</div>` : ""}
      ${r.details ? `<p class="small mb-2"><strong>Reporter's note:</strong> ${esc(r.details)}</p>` : ""}
      <div class="d-flex flex-wrap gap-2">${r.post_id ? `<a class="btn btn-sm btn-outline-secondary" href="https://club.carsandcoffee.uk/post/${r.post_id}" target="_blank" rel="noopener">Open in the club ↗</a>` : ""}
        ${r.content_status === "hidden" ? `<button class="btn btn-sm btn-outline-success" data-act="restore">Restore</button>` : `<button class="btn btn-sm btn-danger" data-act="hide">Hide</button>`}
        ${r.status === "open" ? `<button class="btn btn-sm btn-outline-secondary" data-act="dismiss">Dismiss report</button>` : `<span class="small text-body-secondary align-self-center">${esc(r.status)}</span>`}</div>
    </div></div>`).join("") : `<div class="card"><div class="empty">${st === "open" ? "Nothing to review. Nice." : "Nothing here."}</div></div>`}
    <p class="small text-body-secondary">Hiding takes a post or comment out of the club for everyone except its author and the team. To remove a member, use Members.</p>`;
  view.onclick = async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return; const c = b.closest("[data-post]");
    b.disabled = true;
    const { error } = await sb.rpc("moderate_content", { p_post: c.dataset.post || null, p_comment: c.dataset.comment || null, p_action: b.dataset.act, p_reason: b.dataset.act === "hide" ? "Hidden after a report" : null });
    if (error) { b.disabled = false; return oops(error); }
    toast({ hide: "Hidden", restore: "Restored", dismiss: "Report dismissed" }[b.dataset.act]); render();
  };
});

route("/club/members", async () => {
  crumbs([["Members"]]);
  const q = qs().get("q") || "", st = qs().get("status") || "";
  const { data, error } = await sb.rpc("admin_list_members", { p_search: q || null, p_status: st || null, p_limit: 500 }); if (error) throw error;
  const rows = data || [];
  view.innerHTML = `<div class="page-head"><h1>Members</h1><span class="text-body-secondary">${rows.length} shown</span></div>
    <div class="card"><div class="card-body pb-0"><form class="row g-2 mb-3" id="mf"><div class="col-md-6"><input class="form-control" name="q" value="${esc(q)}" placeholder="Search name, @handle or email"></div>
      <div class="col-md-3"><select class="form-select" name="status"><option value="">Everyone</option>${["approved", "pending", "banned"].map((s) => `<option ${s === st ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="col-md-3"><button class="btn btn-outline-secondary w-100">Search</button></div></form></div>
    ${rows.length ? `<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>Member</th><th>Status</th><th>Role</th><th>Recommended</th><th>Joined</th><th>Last seen</th><th></th></tr></thead><tbody>
      ${rows.map((m) => `<tr data-id="${m.id}"><td><strong>${esc(m.display_name || "–")}</strong>${m.handle ? ` <span class="text-body-secondary">@${esc(m.handle)}</span>` : ""}<div class="small text-body-secondary">${esc(m.email)}${m.is_private ? " · private profile" : ""}</div></td>
        <td><span class="badge ${m.status === "approved" ? "text-bg-success" : m.status === "banned" ? "text-bg-danger" : "text-bg-secondary"}">${esc(m.status)}</span></td>
        <td>${isAdmin() && m.id !== state.profile.id ? `<select class="form-select form-select-sm" data-role style="width:auto">${["member", "moderator", "admin"].map((r) => `<option ${r === m.role ? "selected" : ""}>${r}</option>`).join("")}</select>` : esc(m.role)}</td>
        <td class="small">${m.recommended_count}${m.can_recommend ? "" : ' <span class="badge text-bg-warning">paused</span>'}</td>
        <td class="small">${fmtDate(m.approved_at || m.created_at)}</td><td class="small text-body-secondary">${ago(m.last_sign_in_at)}</td>
        <td class="text-end text-nowrap">${m.id === state.profile.id ? '<span class="small text-body-secondary">You</span>' : `<button class="btn btn-sm btn-outline-secondary" data-rec="${m.can_recommend ? 0 : 1}">${m.can_recommend ? "Pause invites" : "Allow invites"}</button>
          ${m.status === "banned" ? `<button class="btn btn-sm btn-outline-success" data-unban>Unban</button>` : `<button class="btn btn-sm btn-outline-danger" data-ban>Ban</button>`}`}</td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty">No members match.</div>`}</div>`;
  $("#mf").onsubmit = (e) => { e.preventDefault(); const f = new FormData(e.target); const p = new URLSearchParams(); if (f.get("q")) p.set("q", f.get("q")); if (f.get("status")) p.set("status", f.get("status")); go("/club/members" + (p.toString() ? "?" + p : "")); };
  view.onchange = async (e) => { const s = e.target.closest("[data-role]"); if (!s) return; const { error } = await sb.rpc("set_member_role", { p_user_id: s.closest("tr").dataset.id, p_role: s.value }); error ? oops(error) : toast("Role updated"); };
  view.onclick = async (e) => {
    const tr = e.target.closest("tr[data-id]"); if (!tr) return; const uid = tr.dataset.id; let r;
    if (e.target.matches("[data-rec]")) r = await sb.rpc("set_recommend_rights", { p_user_id: uid, p_allowed: e.target.dataset.rec === "1" });
    else if (e.target.matches("[data-ban]")) {
      if (!e.target.dataset.armed) { e.target.dataset.armed = "1"; e.target.textContent = "Confirm ban"; e.target.classList.replace("btn-outline-danger", "btn-danger"); return; }
      r = await sb.rpc("ban_member", { p_user_id: uid, p_reason: "Banned from admin" });
    } else if (e.target.matches("[data-unban]")) r = await sb.rpc("unban_member", { p_user_id: uid, p_reason: "Unbanned from admin" });
    else return;
    if (r.error) return oops(r.error); toast("Updated"); render();
  };
});

route("/club/access", async () => {
  crumbs([["Invites and access"]]);
  const [{ data: open }, { data: allow, error: aErr }, { data: inv }] = await Promise.all([
    sb.from("settings").select("value").eq("key", "signups_open").maybeSingle(),
    sb.from("signup_allowlist").select("email,note,added_at").order("added_at", { ascending: false }),
    sb.from("member_invites").select("friend_name,email,created_at,inviter").order("created_at", { ascending: false }).limit(100),
  ]);
  view.innerHTML = `<div class="page-head"><h1>Invites and access</h1></div>
    <div class="card mb-4"><div class="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div><h2 class="h5 mb-1">Who can sign up</h2><p class="mb-0 text-body-secondary">${open?.value ? "Anyone can sign up and apply." : "Invite-only: only people on the list below (or invited by a member) can create an account."}</p></div>
      ${isAdmin() ? `<div class="form-check form-switch fs-5"><input class="form-check-input" type="checkbox" id="openup" ${open?.value ? "checked" : ""}><label class="form-check-label fs-6" for="openup">Open sign-ups</label></div>` : ""}
    </div></div>
    <div class="row g-4"><div class="col-lg-6"><div class="card h-100"><div class="card-header bg-white fw-semibold">Sign-up list</div><div class="card-body">
      ${isAdmin() ? `<form class="row g-2 mb-3" id="af"><div class="col-sm-6"><input class="form-control" type="email" id="aem" placeholder="email@example.com" required></div><div class="col-sm-4"><input class="form-control" id="anote" placeholder="Note"></div><div class="col-sm-2"><button class="btn btn-primary w-100">Add</button></div></form>` : ""}
      ${aErr ? `<p class="text-body-secondary">Only admins can see this list.</p>` : `<ul class="list-group list-group-flush">${(allow || []).map((r) => `<li class="list-group-item d-flex justify-content-between align-items-center"><span><strong>${esc(r.email)}</strong><div class="small text-body-secondary">${esc(r.note || "")} · ${fmtDate(r.added_at)}</div></span>${isAdmin() ? `<button class="btn btn-sm btn-outline-danger" data-rm="${esc(r.email)}">Remove</button>` : ""}</li>`).join("") || '<li class="list-group-item text-body-secondary">Empty</li>'}</ul>`}
    </div></div></div>
    <div class="col-lg-6"><div class="card h-100"><div class="card-header bg-white fw-semibold">Email invites sent by members</div>
      ${(inv || []).length ? `<div class="table-responsive"><table class="table mb-0"><thead><tr><th>Friend</th><th>Email</th><th>Sent</th></tr></thead><tbody>${inv.map((i) => `<tr><td>${esc(i.friend_name)}</td><td class="small">${esc(i.email)}</td><td class="small">${ago(i.created_at)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">No invites yet.</div>`}
    </div></div></div>`;
  if ($("#openup")) $("#openup").onchange = async (e) => { const { error } = await sb.from("settings").update({ value: e.target.checked }).eq("key", "signups_open"); if (error) return oops(error); toast(e.target.checked ? "Sign-ups are open" : "Sign-ups are invite-only"); render(); };
  if ($("#af")) $("#af").onsubmit = async (e) => { e.preventDefault(); const em = $("#aem").value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return toast("Enter a valid email", true);
    const { error } = await sb.from("signup_allowlist").insert({ email: em, note: $("#anote").value.trim() || null }); if (error) return oops(error); toast("Added"); render(); };
  view.onclick = async (e) => { const b = e.target.closest("[data-rm]"); if (!b) return;
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Confirm"; return; }
    const { error } = await sb.from("signup_allowlist").delete().eq("email", b.dataset.rm); if (error) return oops(error); toast("Removed"); render(); };
});

route("/club/emails", async () => {
  crumbs([["Emails"]]);
  const st = qs().get("status") || "";
  let q = sb.from("email_outbox").select("id,to_email,template,status,attempts,error,created_at,sent_at").order("id", { ascending: false }).limit(200);
  if (st) q = q.eq("status", st);
  const { data, error } = await q;
  if (error) { view.innerHTML = `<div class="page-head"><h1>Emails</h1></div><div class="alert alert-info">Only admins can see the email log.</div>`; return; }
  const T = { member_invite: "Member invite", application_received: "Application received", application_approved: "Welcome (approved)", application_more_info: "More info needed", application_rejected: "Not approved", recommendation_approved: "Your mate joined", team_new_application: "Team: new application" };
  const tab = (s, l) => `<a href="/club/emails${s ? "?status=" + s : ""}" data-link class="${st === s ? "on" : ""}">${l}</a>`;
  view.innerHTML = `<div class="page-head"><h1>Emails</h1><span class="text-body-secondary">Sent through SendGrid every minute from club@carsandcoffee.uk</span></div>
    <div class="pill-tabs">${tab("", "All")}${tab("queued", "Waiting")}${tab("sent", "Sent")}${tab("failed", "Failed")}</div>
    <div class="card">${data.length ? `<div class="table-responsive"><table class="table mb-0"><thead><tr><th>To</th><th>Email</th><th>Status</th><th>Queued</th><th>Sent</th><th></th></tr></thead><tbody>
      ${data.map((m) => `<tr><td class="small">${esc(m.to_email)}</td><td>${esc(T[m.template] || m.template)}</td>
        <td><span class="badge ${{ sent: "text-bg-success", failed: "text-bg-danger", queued: "text-bg-secondary", sending: "text-bg-info" }[m.status] || "text-bg-light"}">${esc(m.status)}</span>${m.error ? `<div class="small text-danger mt-1" style="max-width:320px">${esc(m.error.slice(0, 160))}</div>` : ""}</td>
        <td class="small">${fmtDate(m.created_at, true)}</td><td class="small">${fmtDate(m.sent_at, true)}</td>
        <td>${m.status === "failed" && isAdmin() ? `<button class="btn btn-sm btn-outline-secondary" data-retry="${m.id}">Retry</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty">No emails.</div>`}</div>`;
  view.onclick = async (e) => { const b = e.target.closest("[data-retry]"); if (!b) return; const { error } = await sb.rpc("admin_retry_email", { p_id: Number(b.dataset.retry) }); if (error) return oops(error); toast("Queued to retry"); render(); };
});

render();
