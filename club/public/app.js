// Cars and Coffee Club: sign in, apply, approval, feed, hubs, garage, profiles, friends, recommend a mate, team queue.
// Plain ES modules, no build step. Data lives in the "Cars and Coffee Community" Supabase project.

const SUPABASE_URL = "https://auth.carsandcoffee.uk";
const SUPABASE_KEY = "sb_publishable_O9p-X8To8z-GisYYSBKoxg_RxAe1-cU"; // publishable key: safe in the browser

const MOCK = new URLSearchParams(location.search).get("mock");
// The Supabase library is loaded from a CDN; if one source fails, try the next before giving up.
const SUPABASE_SOURCES = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm",
  "https://esm.sh/@supabase/supabase-js@2.45.4",
  "https://unpkg.com/@supabase/supabase-js@2.45.4/dist/module/index.js?module",
];
async function loadSupabase() {
  for (const src of SUPABASE_SOURCES) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try { return await import(src); } catch { await new Promise((r) => setTimeout(r, 400)); }
    }
  }
  return null;
}
let sb;
if (MOCK) sb = (await import("/mock.js")).createMock(MOCK);
else {
  const lib = await loadSupabase();
  if (!lib) {
    document.getElementById("app").innerHTML = `<div class="panel" style="max-width:520px;margin:0 auto"><h2>Couldn't connect</h2>
      <p>We couldn't load the club just now. Please check your connection and try again.</p>
      <button class="btn red" type="button" onclick="location.reload()">Try again</button></div>`;
    throw new Error("Supabase library failed to load from all sources");
  }
  sb = lib.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true } });
}

// ---------- reference data ----------
const HUBS = {
  "Motorsport": ["F1", "Endurance and Le Mans", "BTCC and touring cars", "Rally", "MotoGP and bikes", "Karting"],
  "Car interests": ["Classic cars", "Modern performance and supercars", "JDM", "American", "EV and hybrid"],
  "Activities": ["Track days", "Sim racing", "Detailing and wraps", "Restoration and builds"],
};
const TOWNS = {
  "Norfolk": ["Norwich", "Great Yarmouth", "King's Lynn", "Thetford", "Dereham", "Wymondham", "Cromer", "North Walsham", "Attleborough", "Swaffham", "Fakenham", "Diss", "Aylsham", "Holt", "Sheringham", "Downham Market", "Hunstanton", "Watton", "Wells-next-the-Sea", "Acle", "Wroxham and Hoveton", "Reepham", "Loddon", "Harleston", "Elsewhere in Norfolk"],
  "Suffolk": ["Ipswich", "Bury St Edmunds", "Lowestoft", "Felixstowe", "Stowmarket", "Sudbury", "Woodbridge", "Beccles", "Elsewhere in Suffolk"],
  "Further afield": ["Cambridgeshire", "Essex", "Elsewhere in the UK"],
};
const HEARD = ["A friend or member", "A Cars and Coffee meet", "Instagram", "Facebook", "TikTok", "Google search", "Auto Opulence", "Race Car Graphics", "Le Man Cave", "Other"];
const REAPPLY_DAYS = 90;

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $("#app");
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const first = (name) => esc(String(name || "").trim().split(/\s+/)[0] || "there");
let toastTimer;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3200); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""; }
function store(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} }
function load(k) { try { return localStorage.getItem(k); } catch { return null; } }
function friendlyAuthError(msg = "") {
  if (/invite-only|saving new user|database error/i.test(msg)) return "The club is invite-only while we build. If a member has recommended you, use their invite link, or join the waiting list on carsandcoffee.uk.";
  if (/no longer join|banned/i.test(msg)) return "This email address can't join the club.";
  if (/rate limit|too many/i.test(msg)) return "Too many attempts. Please wait a few minutes and try again.";
  return msg || "Something went wrong. Please try again.";
}

// ---------- state ----------
const state = { session: null, profile: null, application: null, membership: null };
async function loadMember() {
  const { data: { session } } = await sb.auth.getSession();
  state.session = session;
  state.profile = state.application = state.membership = null;
  if (!session) return;
  const uid = session.user.id;
  const [p, a, m] = await Promise.all([
    sb.from("profiles").select("id,handle,display_name,location,bio,status,role,is_private,approved_at,avatar_path,instagram").eq("id", uid).maybeSingle(),
    sb.from("applications").select("*").eq("user_id", uid).maybeSingle(),
    sb.rpc("get_my_membership"),
  ]);
  state.profile = p.data; state.application = a.data; state.membership = (m.data && m.data[0]) || null;
}
const isTeam = () => state.profile && state.profile.status === "approved" && ["admin", "moderator"].includes(state.profile.role);

// ---------- routing ----------
const routes = {};
const route = (path, fn) => (routes[path] = fn);
const proutes = []; // routes with a parameter, e.g. /u/:handle
const routeP = (pattern, fn) => proutes.push({ re: new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), fn });
const withMock = (p) => (MOCK ? p + (p.includes("?") ? "&" : "?") + "mock=" + MOCK : p);
// depth counts in-app page visits, so Back only uses browser history when it stays inside the club
function go(path, replace = false) { path = withMock(path); replace ? history.replaceState({ depth: history.state?.depth || 0 }, "", path) : history.pushState({ depth: (history.state?.depth || 0) + 1 }, "", path); render(); }
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (a && a.origin === location.origin && !e.metaKey && !e.ctrlKey) { e.preventDefault(); go(a.pathname + a.search.replace(/[?&]mock=[^&]*/, "")); }
});
window.addEventListener("popstate", render);

function nav() {
  const n = $("#barnav");
  if (!state.session) { n.innerHTML = `<a href="/sign-in" data-link>Sign in</a>`; return; }
  const here = location.pathname;
  const link = (p, t) => `<a href="${p}" data-link class="${here === p ? "on" : ""}">${t}</a>`;
  n.innerHTML = (state.profile?.status === "approved" ? link("/feed", "Feed") + link("/hubs", "Hubs") + link("/garage", "Garage") + link("/friends", "Friends") + link("/recommend", "Invite") + link("/home", "Profile") : "")
    + (isTeam() ? link("/admin", "Team") : "")
    + `<button type="button" id="signout">Sign out</button>`;
  $("#signout").onclick = async () => { await sb.auth.signOut(); toast("Signed out"); go("/", true); };
}

// Where a signed-in person belongs, based on their status.
function homeFor() {
  const p = state.profile;
  if (!p) return "/apply";
  if (p.status === "approved") return "/feed";
  if (!state.application) return p.status === "banned" ? "/status" : "/apply";
  return "/status";
}

async function render() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/join/")) { store("cac_invite", decodeURIComponent(path.slice(6)).toLowerCase()); history.replaceState(null, "", withMock("/")); }
  await loadMember();
  nav();
  const clean = location.pathname.replace(/\/+$/, "") || "/";
  let fn = routes[clean], params = {};
  if (!fn) for (const r of proutes) { const m = clean.match(r.re); if (m) { fn = r.fn; params = m.groups || {}; break; } }
  fn = fn || routes["/404"];
  app.innerHTML = "";
  await fn(params);
  addBack(clean);
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

// Back link at the top of every page except the landing page and members' home.
const NO_BACK = ["/", "/home", "/feed", "/hubs", "/auth/callback"];
const PARENT = { "/feed": "/feed", "/invite": "/recommend", "/recommend": "/home", "/admin": "/home", "/garage": "/home", "/friends": "/home", "/garage/new": "/garage" };
function addBack(path) {
  if (NO_BACK.includes(path) || $(".backbar", app)) return;
  const fallback = PARENT[path] || (state.profile?.status === "approved" ? "/home" : "/");
  const b = document.createElement("a");
  b.className = "backbar"; b.href = withMock(fallback); b.innerHTML = `<span aria-hidden="true">&larr;</span> Back`;
  b.onclick = (e) => { e.preventDefault(); if ((history.state?.depth || 0) > 0) history.back(); else go(fallback); };
  const host = $(".narrow", app) && app.firstElementChild === $(".narrow", app) ? $(".narrow", app) : app;
  host.prepend(b);
}

// ---------- screens ----------
const G_ICON = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13.3 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.4 0-11.7-3.8-13.6-9.3l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>`;

function signInPanel(title = "Sign in or apply") {
  const invited = load("cac_invite");
  return `<div class="panel">
    <h2>${title}</h2>
    ${invited ? `<div class="notice green"><strong>You've been recommended by a member.</strong> Your application will be fast-tracked.</div>` : ""}
    <button class="btn gbtn wide" id="google" type="button">${G_ICON} Continue with Google</button>
    <div class="or">or get a sign-in link by email</div>
    <form id="emailform" novalidate>
      <label class="f">Email address<input type="email" id="email" autocomplete="email" required placeholder="you@example.com"></label>
      <button class="btn red wide" type="submit">Email me a sign-in link</button>
      <p class="err" id="autherr" role="alert"></p>
    </form>
    <p class="muted small">No password needed. By continuing you agree to our <a href="/guidelines" data-link>community guidelines</a>.</p>
  </div>`;
}
function wireSignIn() {
  const redirectTo = `${location.origin}/auth/callback`;
  $("#google").onclick = async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) $("#autherr").textContent = friendlyAuthError(error.message);
  };
  $("#emailform").onsubmit = async (e) => {
    e.preventDefault();
    const email = $("#email").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { $("#autherr").textContent = "Please enter a valid email address."; return; }
    const btn = e.submitter; btn.disabled = true; btn.textContent = "Sending…";
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    btn.disabled = false; btn.textContent = "Email me a sign-in link";
    if (error) { $("#autherr").textContent = friendlyAuthError(error.message); return; }
    app.innerHTML = `<div class="narrow panel"><span class="eyebrow">Check your inbox</span><h2>Sign-in link sent</h2>
      <p>We've emailed a link to <strong>${esc(email)}</strong>. Open it on this device to sign in. It expires in an hour.</p>
      <p class="muted small">Nothing there? Check your spam folder, or <a href="/sign-in" data-link>try again</a>.</p></div>`;
  };
}

route("/", async () => {
  if (state.session) return go(homeFor(), true);
  app.innerHTML = `<section class="hero">
    <div>
      <span class="eyebrow">Norfolk and Suffolk's car community</span>
      <h1>The Cars and Coffee <span>Club</span></h1>
      <p class="muted" style="font-size:18px">A members' club for people who love cars: share your builds, find your next meet and connect with enthusiasts across East Anglia.</p>
      <ul class="points">
        <li>Members' feed, motorsport and car hubs, and your own garage</li>
        <li>Meets, race nights and events across Norfolk and Suffolk</li>
        <li>The Forecourt and Parts Bin for buying and selling</li>
        <li>Every member is approved by our team, usually within 24 hours</li>
      </ul>
      <a class="btn red mobile-only" href="#signin" style="margin-top:18px">Apply or sign in</a>
    </div>
    <div id="signin">${signInPanel()}</div>
  </section>`;
  wireSignIn();
});

route("/sign-in", async () => {
  if (state.session) return go(homeFor(), true);
  app.innerHTML = `<div class="narrow">${signInPanel()}</div>`;
  wireSignIn();
});

route("/auth/callback", async () => {
  const q = new URLSearchParams(location.search + "&" + location.hash.slice(1));
  const err = q.get("error_description") || q.get("error");
  if (err) {
    app.innerHTML = `<div class="narrow"><div class="notice red">${esc(friendlyAuthError(err))}</div>${signInPanel("Try again")}</div>`;
    return wireSignIn();
  }
  if (!state.session) {
    // The library exchanges the code on load; give it a moment, then re-check.
    await new Promise((r) => setTimeout(r, 600));
    await loadMember();
  }
  go(state.session ? homeFor() : "/sign-in", true);
});

function tilesHTML(selected = []) {
  return Object.entries(HUBS).map(([g, items]) => `<span class="group">${g}</span>` +
    items.map((h) => `<button type="button" class="tile" aria-pressed="${selected.includes(h)}" data-hub="${esc(h)}">${esc(h)}</button>`).join("")).join("");
}
function townOptions(sel = "") {
  return `<option value="">Choose your town</option>` + Object.entries(TOWNS).map(([c, ts]) =>
    `<optgroup label="${c}">${ts.map((t) => { const v = ["Cambridgeshire", "Essex"].includes(t) || t.startsWith("Elsewhere") ? t : `${t}, ${c}`; return `<option ${v === sel ? "selected" : ""}>${esc(v)}</option>`; }).join("")}</optgroup>`).join("");
}

function applicationForm(a, mode) {
  const name = a?.full_name || state.session.user.user_metadata?.full_name || state.session.user.user_metadata?.name || "";
  const invite = a?.invite_code_used || load("cac_invite") || "";
  const label = { new: "Send my application", edit: "Save changes", more_info: "Send updated application", reapply: "Send my new application" }[mode];
  return `<form id="appform" novalidate>
    <label class="f">Full name<input type="text" id="full_name" autocomplete="name" required maxlength="80" value="${esc(name)}"></label>
    <label class="f">Where are you based?<select id="location" required>${townOptions(a?.location || "")}</select></label>
    <div class="f"><strong>What are you into?</strong> <small class="muted">Tap all that apply</small><div class="tiles" id="tiles" style="margin-top:8px">${tilesHTML(a?.favourite_series || [])}</div></div>
    <label class="f">Your car or cars <small>(optional) e.g. 1972 MGB GT, Focus RS</small><input type="text" id="car" maxlength="120" value="${esc(a?.car || "")}"></label>
    ${regBox("appreg", "to fill this in for you")}
    <label class="f">How did you hear about us? <small>(optional)</small><select id="heard"><option value="">Choose one</option>${HEARD.map((h) => `<option ${a?.heard_about === h ? "selected" : ""}>${h}</option>`).join("")}</select></label>
    ${mode === "new" ? `<label class="f">Invite code <small>(optional) from a member's link</small><input type="text" id="invite" maxlength="12" value="${esc(invite)}" autocapitalize="none"></label>` : ""}
    <label class="check"><input type="checkbox" id="guidelines" ${a?.guidelines_accepted ? "checked" : ""}> <span>I agree to the <a href="/guidelines" data-link target="_blank">community guidelines</a>.</span></label>
    <label class="check"><input type="checkbox" id="newsletter" ${a?.newsletter_opt_in ? "checked" : ""}> <span>Send me the Cars and Coffee digest, club updates and events emails. I can unsubscribe at any time.</span></label>
    <p class="err" id="formerr" role="alert"></p>
    <button class="btn red wide" type="submit">${label}</button>
  </form>`;
}
function wireApplicationForm(mode) {
  wireReg("appreg", (v) => { const el = $("#car"), lab = [v.year, v.make].filter(Boolean).join(" ") + (v.colour ? ` (${v.colour.toLowerCase()})` : "");
    el.value = el.value ? `${el.value}, ${lab}` : lab; el.focus(); });
  $("#tiles").onclick = (e) => { const b = e.target.closest(".tile"); if (b) b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); };
  $("#appform").onsubmit = async (e) => {
    e.preventDefault();
    const err = $("#formerr");
    const v = {
      full_name: $("#full_name").value.trim(), location: $("#location").value, car: $("#car").value.trim() || null,
      heard_about: $("#heard").value || null, guidelines_accepted: $("#guidelines").checked, newsletter_opt_in: $("#newsletter").checked,
      favourite_series: [...document.querySelectorAll(".tile[aria-pressed=true]")].map((b) => b.dataset.hub),
    };
    if (v.full_name.length < 2) return (err.textContent = "Please enter your full name.");
    if (!v.location) return (err.textContent = "Please choose where you're based.");
    if (!v.guidelines_accepted) return (err.textContent = "Please agree to the community guidelines.");
    const btn = e.submitter; btn.disabled = true;
    let res;
    if (mode === "new") {
      const code = ($("#invite")?.value || "").trim().toLowerCase();
      res = await sb.from("applications").insert({ ...v, user_id: state.session.user.id, invite_code_used: code || null });
    } else {
      res = await sb.from("applications").update(v).eq("id", state.application.id);
    }
    btn.disabled = false;
    if (res.error) return (err.textContent = res.error.message.includes("reapply") ? res.error.message : "We couldn't save your application. Please try again.");
    store("cac_invite", null);
    toast(mode === "edit" ? "Application updated" : "Application sent");
    go("/status", true);
  };
}

route("/apply", async () => {
  if (!state.session) return go("/sign-in", true);
  const p = state.profile, a = state.application;
  if (p?.status === "approved") return go("/home", true);
  if (a && !(a.status === "rejected" && reapplyOpen(a))) return go("/status", true);
  const mode = a ? "reapply" : "new";
  app.innerHTML = `<div class="narrow"><span class="eyebrow">${mode === "reapply" ? "Apply again" : "Apply to join"}</span>
    <h1>Tell us about you</h1><p class="muted">It takes under a minute. Every application is reviewed by the Cars and Coffee team, usually within 24 hours.</p>
    <div class="panel">${applicationForm(a, mode)}</div></div>`;
  wireApplicationForm(mode);
});

function reapplyOpen(a) { return a.decided_at && Date.now() - new Date(a.decided_at).getTime() > REAPPLY_DAYS * 864e5; }

route("/status", async () => {
  if (!state.session) return go("/sign-in", true);
  const p = state.profile, a = state.application;
  if (p?.status === "approved") return go("/home", true);
  if (p?.status === "banned") {
    app.innerHTML = `<div class="narrow panel"><h2>Account closed</h2><p>This account has been closed for breaking the community guidelines and can't take part in the club.</p><p class="muted small">If you think this is a mistake, contact the team via carsandcoffee.uk.</p></div>`;
    return;
  }
  if (!a) return go("/apply", true);
  const name = first(a.full_name);
  const steps = (s) => `<ol class="timeline">
      <li class="done"><div><strong>Application sent</strong><br><span class="muted small">${fmtDate(a.created_at)}</span></div></li>
      <li class="${s === "review" ? "now" : "done"}"><div><strong>Team review</strong><br><span class="muted small">${s === "review" ? "In progress, usually within 24 hours" : "Done"}</span></div></li>
      <li class="${s === "done" ? "done" : ""}"><div><strong>Welcome to the club</strong></div></li></ol>`;
  if (a.status === "pending") {
    app.innerHTML = `<div class="narrow"><span class="eyebrow">Application pending</span><h1>Thanks, ${name}</h1>
      ${a.fast_track ? `<p><span class="badge fast">Fast-tracked: recommended by a member</span></p>` : ""}
      <div class="panel"><p>Your application is with the Cars and Coffee team. We'll email you as soon as it's been reviewed.</p>${steps("review")}
      <div class="btns"><button class="btn ghost" id="edit" type="button">Edit my application</button><a class="btn ghost" href="https://carsandcoffee.uk/#events">See upcoming meets</a></div></div>
      <div id="editbox"></div></div>`;
    $("#edit").onclick = () => { $("#editbox").innerHTML = `<div class="panel" style="margin-top:18px">${applicationForm(a, "edit")}</div>`; wireApplicationForm("edit"); $("#full_name").focus(); };
  } else if (a.status === "more_info") {
    app.innerHTML = `<div class="narrow"><span class="eyebrow">More information needed</span><h1>Nearly there, ${name}</h1>
      <div class="notice"><strong>A message from the team:</strong><br>${esc(a.message_to_applicant || "Please add a few more details to your application.")}</div>
      <div class="panel">${applicationForm(a, "more_info")}</div></div>`;
    wireApplicationForm("more_info");
  } else if (a.status === "rejected") {
    const open = reapplyOpen(a);
    const when = a.decided_at ? fmtDate(new Date(new Date(a.decided_at).getTime() + REAPPLY_DAYS * 864e5)) : "";
    app.innerHTML = `<div class="narrow panel"><span class="eyebrow">Application decision</span><h2>Not this time, ${name}</h2>
      ${a.message_to_applicant ? `<div class="notice">${esc(a.message_to_applicant)}</div>` : ""}
      <p>Thanks for your interest in the club. ${open ? "You can now apply again." : `You can apply again from <strong>${when}</strong>.`}</p>
      ${open ? `<a class="btn red" href="/apply" data-link>Apply again</a>` : ""}
      <p class="muted small" style="margin-top:14px">You're still welcome at our public meets, listed on carsandcoffee.uk.</p></div>`;
  } else {
    app.innerHTML = `<div class="narrow panel"><h2>Welcome!</h2><p>Your application has been approved.</p><a class="btn red" href="/home" data-link>Go to the club</a></div>`;
  }
});

route("/home", async () => {
  if (!state.session) return go("/sign-in", true);
  if (state.profile?.status !== "approved") return go(homeFor(), true);
  const p = state.profile, m = state.membership || {};
  const fresh = p.approved_at && Date.now() - new Date(p.approved_at).getTime() < 7 * 864e5;
  app.innerHTML = `<span class="eyebrow">${fresh ? "You're in" : "Members' club"}</span>
    <h1>${fresh ? "Welcome to the club" : "Welcome back"}, ${first(p.display_name)}</h1>
    ${isTeam() ? `<div class="notice"><strong>Team access:</strong> review applications and manage the invite list in <a href="/admin" data-link>Team</a>.</div>` : ""}
    <div class="grid2">
      <div class="panel"><h3>Your profile</h3>
        <div class="avatar-edit"><div class="avatar big" id="avprev">${avatarHTML(p, 88)}</div>
          <div><label class="btn ghost small" style="cursor:pointer">Change photo<input type="file" id="avfile" accept="image/*" hidden></label>
          ${p.avatar_path ? `<button class="btn ghost small" type="button" id="avremove">Remove</button>` : ""}
          <p class="muted small" id="avmsg" style="margin:6px 0 0">A clear photo of you or your car.</p></div></div>
        ${p.handle ? `<p class="small"><a href="/u/${esc(p.handle)}" data-link>View your public profile</a></p>` : `<p class="small muted">Choose a username to get your own profile page.</p>`}
        <form id="profform" novalidate>
          <label class="f">Display name<input type="text" id="display_name" autocomplete="nickname" maxlength="60" value="${esc(p.display_name || "")}"></label>
          <label class="f">Username <small>3–24 lowercase letters, numbers or underscores</small><input type="text" id="handle" maxlength="24" value="${esc(p.handle || "")}" autocapitalize="none" placeholder="e.g. norfolk_gti"></label>
          <label class="f">Town<select id="ptown">${townOptions(p.location || "")}</select></label>
          <label class="f">Bio <small>(up to 500 characters)</small><textarea id="bio" maxlength="500">${esc(p.bio || "")}</textarea></label>
          <label class="f">Instagram <small>(optional, without the @)</small><input type="text" id="instagram" maxlength="30" value="${esc(p.instagram || "")}" autocapitalize="none" placeholder="e.g. norfolk_gti"></label>
          <label class="check"><input type="checkbox" id="private" ${p.is_private ? "checked" : ""}> <span><strong>Private profile</strong><br><span class="muted small">Only your friends and the team can see your full profile and garage.</span></span></label>
          <p class="err" id="proferr" role="alert"></p>
          <button class="btn red" type="submit">Save profile</button>
        </form></div>
      <div style="display:grid;gap:18px;align-content:start">
        <div class="panel"><h3>Recommend a mate</h3><p class="muted">Know someone who'd love the club? People you recommend are fast-tracked, and you'll be connected as friends when they're approved.</p>
          <a class="btn red" href="/recommend" data-link>Get your invite link</a>
          ${m.invite_code ? `<p class="muted small" style="margin-top:12px">Your code: <strong>${esc(m.invite_code)}</strong></p>` : ""}</div>
        <div class="panel"><h3>Coming to the club</h3><ul class="soon">
          <li><span><a href="/garage" data-link>Your garage</a></span><span class="badge ok">New</span></li>
          <li><span><a href="/friends" data-link>Friends</a></span><span class="badge ok">New</span></li>
          <li><span><a href="/feed" data-link>Members' feed and posts</a></span><span class="badge ok">New</span></li>
          <li><span><a href="/hubs" data-link>Motorsport, car and local hubs</a></span><span class="badge ok">New</span></li>
          <li><span>The Forecourt and Parts Bin</span><span class="badge">Soon</span></li>
        </ul></div>
      </div>
    </div>`;
  $("#profform").onsubmit = async (e) => {
    e.preventDefault();
    const handle = $("#handle").value.trim().toLowerCase() || null;
    if (handle && !/^[a-z0-9_]{3,24}$/.test(handle)) return ($("#proferr").textContent = "Usernames use 3–24 lowercase letters, numbers or underscores.");
    const { error } = await sb.from("profiles").update({
      display_name: $("#display_name").value.trim() || null, handle, location: $("#ptown").value || null,
      bio: $("#bio").value.trim() || null, is_private: $("#private").checked, instagram: $("#instagram").value.trim().replace(/^@/, "") || null,
    }).eq("id", p.id);
    if (error) return ($("#proferr").textContent = /duplicate|unique/i.test(error.message) ? "That username is taken. Try another." : "We couldn't save your profile. Please try again.");
    $("#proferr").textContent = ""; toast("Profile saved");
  };
  $("#avfile").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    $("#avmsg").textContent = "Uploading…";
    try {
      const up = await uploadPhoto(f, 800);
      const old = p.avatar_path;
      const { error } = await sb.from("profiles").update({ avatar_path: up.key }).eq("id", p.id);
      if (error) throw error;
      if (old) deletePhoto(old);
      p.avatar_path = up.key; $("#avprev").innerHTML = avatarHTML(p, 88); $("#avmsg").textContent = "Photo updated."; nav();
    } catch (err) { $("#avmsg").textContent = err.message || "Upload failed. Please try again."; }
  };
  if ($("#avremove")) $("#avremove").onclick = async () => {
    const old = p.avatar_path; const { error } = await sb.from("profiles").update({ avatar_path: null }).eq("id", p.id);
    if (error) return toast("Couldn't remove the photo"); deletePhoto(old); p.avatar_path = null; render();
  };
});

route("/recommend", async () => {
  if (!state.session) return go("/sign-in", true);
  if (state.profile?.status !== "approved") return go(homeFor(), true);
  const m = state.membership || {};
  const link = `${location.origin}/join/${m.invite_code || ""}`;
  const used = Number(m.recommendations_last_30_days || 0), limit = Number(m.recommendation_limit || 10);
  const { data: recs } = await sb.rpc("get_my_recommendations");
  const { data: invites } = await sb.rpc("get_my_invites");
  const msg = encodeURIComponent(`Join me in the Cars and Coffee Club, the members' club for car enthusiasts in Norfolk and Suffolk. My invite link fast-tracks your application: ${link}`);
  const statusBadge = { pending: `<span class="badge">Waiting</span>`, more_info: `<span class="badge">More info needed</span>`, approved: `<span class="badge ok">Approved</span>`, rejected: `<span class="badge red">Not approved</span>` };
  app.innerHTML = `<span class="eyebrow">Recommend a mate</span><h1>Bring your mates</h1>
    ${m.can_recommend === false ? `<div class="notice red">Your recommendation rights are paused. Contact the team if you think this is a mistake.</div>` : ""}
    <div class="panel invite">
      <div class="qr" id="qr" aria-label="QR code for your invite link"></div>
      <div>
        <p>Share your link or let them scan the code at a meet. Applications through your link are fast-tracked, and you'll be friends as soon as they're approved.</p>
        <div class="linkbox"><input type="text" id="link" readonly value="${esc(link)}" aria-label="Your invite link"><button class="btn red small" id="copy" type="button">Copy</button></div>
        <div class="btns">
          <a class="btn ghost small" href="https://wa.me/?text=${msg}" rel="noopener" target="_blank">WhatsApp</a>
          <a class="btn ghost small" href="/invite" data-link>Email</a>
          <a class="btn ghost small" href="sms:?&body=${msg}">Text</a>
        </div>
        <p class="small muted" style="margin-top:14px">Fast-track places used this month: <strong>${Math.min(used, limit)} of ${limit}</strong></p>
        <div class="meter" aria-hidden="true"><i style="width:${Math.min(100, (used / limit) * 100)}%"></i></div>
      </div>
    </div>
    <h2 style="margin-top:32px">People you've recommended</h2>
    ${recs && recs.length ? `<table><thead><tr><th>Name</th><th>Applied</th><th>Status</th></tr></thead><tbody>
      ${recs.map((r) => `<tr><td>${esc(r.first_name)}</td><td>${fmtDate(r.applied_at)}</td><td>${statusBadge[r.status] || esc(r.status)}</td></tr>`).join("")}</tbody></table>`
      : `<p class="muted">Nobody yet. Share your link to get started.</p>`}
    ${invites && invites.length ? `<h2 style="margin-top:32px">Email invites sent</h2><table><thead><tr><th>Name</th><th>Email</th><th>Sent</th><th>Status</th></tr></thead><tbody>
      ${invites.map((i) => `<tr><td>${esc(i.friend_name)}</td><td>${esc(i.email)}</td><td>${fmtDate(i.sent_at)}</td><td>${i.joined ? `<span class="badge ok">Applied</span>` : `<span class="badge">Invited</span>`}</td></tr>`).join("")}</tbody></table>` : ""}`;
  $("#copy").onclick = async () => { try { await navigator.clipboard.writeText(link); toast("Link copied"); } catch { $("#link").select(); toast("Press Ctrl+C / Cmd+C to copy"); } };
  try {
    let mod; for (const src of ["https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/+esm", "https://esm.sh/qrcode-generator@1.4.4"]) { try { mod = await import(src); break; } catch {} }
    const qrcode = mod.default;
    const qr = qrcode(0, "M"); qr.addData(link); qr.make();
    $("#qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  } catch { $("#qr").innerHTML = `<p style="color:#241712;font-size:13px;padding:8px">QR code unavailable. Share the link instead.</p>`; }
});

route("/invite", async () => {
  if (!state.session) return go("/sign-in", true);
  if (state.profile?.status !== "approved") return go(homeFor(), true);
  const m = state.membership || {};
  const me = esc(state.profile?.display_name || "A member");
  app.innerHTML = `<div class="narrow"><span class="eyebrow">Recommend a mate</span><h1>Email a mate</h1>
    <p class="muted">We'll send them a personal invite from the club with your invite link. Their application is fast-tracked, and they can join even while the club is invite-only.</p>
    ${m.can_recommend === false ? `<div class="notice red">Your recommendation rights are paused. Contact the team if you think this is a mistake.</div>` : `
    <form id="inviteform" class="panel" novalidate>
      <label class="f">Their first name<input type="text" id="inv_name" maxlength="60" autocomplete="off" required placeholder="e.g. Tom"></label>
      <label class="f">Their email address<input type="email" id="inv_email" maxlength="254" autocomplete="off" required placeholder="tom@example.com"></label>
      <label class="f">Add a note <small>(optional, up to 300 characters)</small><textarea id="inv_note" maxlength="300" rows="3" placeholder="See you at the next meet!"></textarea></label>
      <p class="small muted" id="inv_preview">They'll get an email from Cars and Coffee UK saying <strong>${me} has invited you to join the Cars and Coffee Club</strong>, with your note and a button to apply.</p>
      <p class="msg" id="inv_msg" role="status" aria-live="polite"></p>
      <div class="btns"><button class="btn red" type="submit" id="inv_send">Send invite</button><a class="btn ghost" href="/recommend" data-link>Back</a></div>
    </form>
    <p class="small muted">Only invite people you know. We only use their email to send this one invite, and won't email the same person again for a week.</p>`}</div>`;
  const f = $("#inviteform"); if (!f) return;
  f.onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#inv_name").value.trim(), email = $("#inv_email").value.trim(), note = $("#inv_note").value.trim(), msg = $("#inv_msg"), btn = $("#inv_send");
    if (!name) { msg.textContent = "Please enter your mate's name."; $("#inv_name").focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = "Please enter a valid email address."; $("#inv_email").focus(); return; }
    btn.disabled = true; msg.textContent = "Sending…";
    const { data, error } = await sb.rpc("send_member_invite", { p_name: name, p_email: email, p_note: note || null });
    btn.disabled = false;
    if (error || !data) { msg.textContent = "Sorry, something went wrong. Please try again."; return; }
    msg.textContent = data.message;
    if (data.status === "sent") { toast(data.message); f.reset(); $("#inv_name").focus(); msg.textContent = data.message + " Want to invite someone else?"; }
  };
});


// ---------- photos (stored in Cloudflare R2 through the club Worker) ----------
const mediaUrl = (key) => (!key ? "" : /^https?:|^\//.test(key) ? key : `/media/${key}`);
function avatarHTML(p, size = 40) {
  const initial = esc(((p?.display_name || p?.handle || "?").trim()[0] || "?").toUpperCase());
  return p?.avatar_path ? `<img src="${esc(mediaUrl(p.avatar_path))}" alt="" width="${size}" height="${size}" loading="lazy">` : `<span aria-hidden="true">${initial}</span>`;
}
// Shrinks big phone photos before upload (max edge in px), keeps quality high, sends WebP where the browser supports it.
async function shrink(file, maxEdge) {
  if (!/^image\//.test(file.type)) throw new Error("Please choose a photo.");
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { throw new Error("We couldn't read that photo. Try a JPG or PNG."); }
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, "image/webp", 0.86)) || await new Promise((r) => c.toBlob(r, "image/jpeg", 0.88));
  if (!blob) throw new Error("We couldn't process that photo.");
  return blob;
}
async function uploadPhoto(file, maxEdge = 2000) {
  const blob = await shrink(file, maxEdge);
  if (MOCK) return { key: "mock/" + Math.random().toString(36).slice(2), url: URL.createObjectURL(blob) };
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error("Please sign in again.");
  const r = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": blob.type }, body: blob });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(out.error || "Upload failed. Please try again.");
  return out;
}
async function deletePhoto(key) {
  if (MOCK || !key || !/^u\//.test(key)) return;
  const { data: { session } } = await sb.auth.getSession(); if (!session) return;
  fetch(`/api/media?key=${encodeURIComponent(key)}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => {});
}

// ---------- number plate lookup (DVLA via carsandcoffee.uk/api/vehicle; plates are never stored) ----------
async function vehicleLookup(reg) {
  const r = await fetch("https://carsandcoffee.uk/api/vehicle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reg }) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Lookup failed"); return j;
}
const regBox = (id, hint) => `<div class="regbox"><label class="f" for="${id}" style="margin-bottom:6px">Number plate <small>(optional) ${hint}</small></label>
  <div class="regrow"><input class="regin" id="${id}" maxlength="9" autocomplete="off" placeholder="AB12 CDE"><button type="button" class="btn ghost small" data-regfind="${id}">Find my car</button></div>
  <p class="muted small" id="${id}_msg" role="status" style="margin:6px 0 0"></p></div>`;
function wireReg(id, fill) {
  const inp = $("#" + id), btn = $(`[data-regfind="${id}"]`), msg = $("#" + id + "_msg"); if (!inp) return;
  inp.addEventListener("input", () => (inp.value = inp.value.toUpperCase()));
  const run = async () => {
    const reg = inp.value.replace(/[^A-Za-z0-9]/g, ""); if (reg.length < 2) { msg.textContent = "Enter your number plate."; return; }
    msg.textContent = "Looking up…"; btn.disabled = true;
    try { const v = await vehicleLookup(reg); fill(v); msg.innerHTML = `Found: <strong>${esc([v.year, v.make].filter(Boolean).join(" "))}</strong>${v.colour ? `, ${esc(v.colour.toLowerCase())}` : ""}. We've filled in what the DVLA holds; add the model yourself. Your plate isn't saved.`; }
    catch (err) { msg.textContent = err.message; }
    btn.disabled = false;
  };
  btn.onclick = run; inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
}
const engineText = (v) => [v.engine_cc ? (v.engine_cc / 1000).toFixed(1) + " litre" : "", v.fuel ? v.fuel.toLowerCase() : ""].filter(Boolean).join(" ");

// ---------- garage ----------
const USAGE = { daily: "Daily driver", weekend: "Weekend car", project: "Project", track: "Track car", show: "Show car", classic: "Classic" };
const carName = (c) => c.nickname || [c.year, c.make, c.model].filter(Boolean).join(" ");
const carCard = (c, href) => `<a class="carcard" href="${href}" data-link>
  <div class="carph">${c.photo_paths?.[0] ? `<img src="${esc(mediaUrl(c.photo_paths[0]))}" alt="${esc(carName(c))}" loading="lazy">` : `<span class="muted small">No photo yet</span>`}${c.usage ? `<span class="badge">${esc(USAGE[c.usage] || c.usage)}</span>` : ""}</div>
  <div class="carbody"><strong>${esc(carName(c))}</strong>${c.nickname ? `<span class="muted small">${esc([c.year, c.make, c.model].filter(Boolean).join(" "))}</span>` : ""}</div></a>`;

route("/garage", async () => {
  if (!state.session) return go("/sign-in", true);
  if (state.profile?.status !== "approved") return go(homeFor(), true);
  const { data: cars, error } = await sb.from("garage_cars").select("*").eq("owner_id", state.profile.id).order("sort").order("created_at");
  app.innerHTML = `<span class="eyebrow">Your garage</span><h1>My garage</h1>
    <p class="muted">Show off what you drive, what you're building and what you've owned. ${state.profile.handle ? `Your garage appears on <a href="/u/${esc(state.profile.handle)}" data-link>your profile</a>${state.profile.is_private ? " (friends only, because your profile is private)" : ""}.` : `Choose a username on your <a href="/home" data-link>profile</a> so people can see it.`}</p>
    ${error ? `<div class="notice red">We couldn't load your garage. Please refresh.</div>` : ""}
    <div class="cargrid">${(cars || []).map((c) => carCard(c, `/garage/${c.id}`)).join("")}
      ${(cars || []).length < 20 ? `<a class="carcard add" href="/garage/new" data-link><div class="carph"><span class="plus" aria-hidden="true">+</span></div><div class="carbody"><strong>Add a car</strong><span class="muted small">Photos, specs and the story</span></div></a>` : ""}</div>`;
});

routeP("/garage/:id", async ({ id }) => {
  if (!state.session) return go("/sign-in", true);
  if (state.profile?.status !== "approved") return go(homeFor(), true);
  const isNew = id === "new";
  let c = { make: "", model: "", photo_paths: [] };
  if (!isNew) {
    const { data } = await sb.from("garage_cars").select("*").eq("id", id).eq("owner_id", state.profile.id).maybeSingle();
    if (!data) { app.innerHTML = `<h1>Car not found</h1><p><a href="/garage" data-link>Back to your garage</a></p>`; return; }
    c = data;
  }
  let photos = [...(c.photo_paths || [])];
  const removed = [];
  const year = new Date().getFullYear();
  app.innerHTML = `<div class="narrow wide"><span class="eyebrow">Your garage</span><h1>${isNew ? "Add a car" : esc(carName(c))}</h1>
    <form id="carform" novalidate>
      <div class="panel"><h3>Photos</h3><p class="muted small">Up to 12. The first photo is the cover; use the arrows to reorder.</p>
        <div class="photogrid" id="photos"></div>
        <label class="btn ghost small" style="cursor:pointer" id="addph">Add photos<input type="file" id="phfile" accept="image/*" multiple hidden></label>
        <span class="muted small" id="phmsg"></span></div>
      <div class="panel"><h3>The car</h3>${isNew ? regBox("carreg", "and we'll fill in the make, year, colour and engine") : ""}<div class="row3">
        <label class="f">Make<input type="text" id="make" maxlength="60" required value="${esc(c.make)}" placeholder="e.g. Volkswagen"></label>
        <label class="f">Model<input type="text" id="model" maxlength="60" required value="${esc(c.model)}" placeholder="e.g. Golf GTI Mk1"></label>
        <label class="f">Year<input type="number" id="year" min="1885" max="${year + 1}" value="${esc(c.year ?? "")}" placeholder="${year - 40}"></label></div>
        <div class="row3">
        <label class="f">Nickname <small>(optional)</small><input type="text" id="nickname" maxlength="60" value="${esc(c.nickname || "")}" placeholder="e.g. The Orange One"></label>
        <label class="f">Colour <small>(optional)</small><input type="text" id="colour" maxlength="40" value="${esc(c.colour || "")}"></label>
        <label class="f">Engine <small>(optional)</small><input type="text" id="engine" maxlength="60" value="${esc(c.engine || "")}" placeholder="e.g. 1.6 8v"></label></div>
        <label class="f">What it is to you<select id="usage"><option value="">Choose…</option>${Object.entries(USAGE).map(([k, v]) => `<option value="${k}" ${c.usage === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="f">The story <small>(optional, up to 2,000 characters)</small><textarea id="description" maxlength="2000" rows="5" placeholder="How you found it, what you've done, where you take it">${esc(c.description || "")}</textarea></label>
        <label class="f">Modifications <small>(optional)</small><textarea id="mods" maxlength="2000" rows="3" placeholder="One per line">${esc(c.mods || "")}</textarea></label>
      </div>
      <p class="err" id="carerr" role="alert"></p>
      <div class="btns"><button class="btn red" type="submit">${isNew ? "Add to my garage" : "Save changes"}</button><a class="btn ghost" href="/garage" data-link>Cancel</a>
        ${!isNew ? `<button class="btn ghost" type="button" id="delcar" style="margin-left:auto">Remove car</button>` : ""}</div>
    </form></div>`;
  const draw = () => {
    $("#photos").innerHTML = photos.map((k, i) => `<div class="ph"><img src="${esc(mediaUrl(k))}" alt="Photo ${i + 1}">${i === 0 ? `<span class="badge">Cover</span>` : ""}
      <div class="phbtns"><button type="button" data-mv="-1" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move left">&larr;</button><button type="button" data-mv="1" data-i="${i}" ${i === photos.length - 1 ? "disabled" : ""} aria-label="Move right">&rarr;</button><button type="button" data-rm="${i}" aria-label="Remove photo">&times;</button></div></div>`).join("") || `<p class="muted small">No photos yet.</p>`;
    $("#addph").hidden = photos.length >= 12;
  };
  draw();
  $("#photos").onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.rm) { removed.push(...photos.splice(Number(b.dataset.rm), 1)); }
    else { const i = Number(b.dataset.i), j = i + Number(b.dataset.mv); [photos[i], photos[j]] = [photos[j], photos[i]]; }
    draw();
  };
  $("#phfile").onchange = async (e) => {
    const files = [...e.target.files].slice(0, 12 - photos.length); e.target.value = "";
    for (const [n, f] of files.entries()) {
      $("#phmsg").textContent = `Uploading ${n + 1} of ${files.length}…`;
      try { const up = await uploadPhoto(f); photos.push(up.key); draw(); }
      catch (err) { $("#phmsg").textContent = err.message; return; }
    }
    $("#phmsg").textContent = files.length ? "Uploaded. Remember to save." : "";
  };
  wireReg("carreg", (v) => { const set = (id, val) => { const el = $("#" + id); if (el && val && !el.value) el.value = val; };
    set("make", v.make); set("year", v.year); set("colour", v.colour); set("engine", engineText(v)); $("#model").focus(); });
  $("#carform").onsubmit = async (e) => {
    e.preventDefault();
    const v = (id) => $("#" + id).value.trim();
    if (!v("make") || !v("model")) return ($("#carerr").textContent = "Please add the make and model.");
    const yr = v("year") ? Number(v("year")) : null;
    if (yr && (yr < 1885 || yr > year + 1)) return ($("#carerr").textContent = "Please check the year.");
    const row = { make: v("make"), model: v("model"), year: yr, nickname: v("nickname") || null, colour: v("colour") || null, engine: v("engine") || null,
      usage: v("usage") || null, description: v("description") || null, mods: v("mods") || null, photo_paths: photos };
    const res = isNew ? await sb.from("garage_cars").insert({ ...row, owner_id: state.profile.id }) : await sb.from("garage_cars").update(row).eq("id", c.id);
    if (res.error) return ($("#carerr").textContent = /20 cars/.test(res.error.message) ? res.error.message : "We couldn't save the car. Please try again.");
    removed.forEach(deletePhoto);
    toast(isNew ? "Added to your garage" : "Saved"); go("/garage", true);
  };
  if ($("#delcar")) $("#delcar").onclick = async (e) => {
    const b = e.target;
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Click again to remove"; return; }
    const { error } = await sb.from("garage_cars").delete().eq("id", c.id);
    if (error) return toast("Couldn't remove the car");
    [...photos, ...removed].forEach(deletePhoto); toast("Car removed"); go("/garage", true);
  };
});

// ---------- member profiles ----------
function friendButton(p) {
  if (!state.session || state.profile?.status !== "approved" || p.is_me) return "";
  return { friends: `<button class="btn ghost small" data-fr="remove">Friends ✓</button>`, requested: `<button class="btn ghost small" disabled>Request sent</button>`,
    incoming: `<button class="btn red small" data-fr="accept">Accept friend request</button>`, none: `<button class="btn red small" data-fr="add">Add friend</button>` }[p.friendship] || "";
}
routeP("/u/:handle", async ({ handle }) => {
  const { data } = await sb.rpc("get_profile", { p_handle: decodeURIComponent(handle) });
  const p = data && data[0];
  if (!p) { app.innerHTML = `<div class="narrow"><h1>Member not found</h1><p class="muted">This profile doesn't exist or isn't available.</p></div>`; document.title = "Member not found · Cars and Coffee Club"; return; }
  document.title = `${p.display_name || "@" + p.handle} · Cars and Coffee Club`;
  let cars = [];
  if (p.can_see) { const r = await sb.from("garage_cars").select("*").eq("owner_id", p.id).order("sort").order("created_at"); cars = r.data || []; }
  app.innerHTML = `<div class="profile">
    <div class="profhead"><div class="avatar huge">${avatarHTML(p, 120)}</div>
      <div class="profinfo"><h1>${esc(p.display_name || "@" + p.handle)}</h1>
        <p class="muted">@${esc(p.handle)}${p.location ? ` · ${esc(p.location)}` : ""} · Member since ${new Date(p.approved_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
        <p class="small">${p.friend_count} friend${p.friend_count === 1 ? "" : "s"}${p.can_see ? ` · ${p.car_count} car${p.car_count === 1 ? "" : "s"}` : ""}${p.instagram ? ` · <a href="https://www.instagram.com/${esc(p.instagram)}/" rel="noopener nofollow" target="_blank">Instagram</a>` : ""}</p>
        <div class="btns">${friendButton(p)}${p.is_me ? `<a class="btn ghost small" href="/home" data-link>Edit profile</a><a class="btn ghost small" href="/garage" data-link>Edit garage</a>` : ""}</div></div></div>
    ${p.can_see ? `${p.bio ? `<div class="panel"><p style="margin:0;white-space:pre-line">${esc(p.bio)}</p></div>` : ""}
      <h2>Garage</h2>${cars.length ? `<div class="cargrid">${cars.map((c) => carCard(c, `/u/${esc(p.handle)}/car/${c.id}`)).join("")}</div>` : `<p class="muted">No cars in the garage yet.</p>`}`
      : `<div class="notice">This profile is private. ${state.session ? "Add them as a friend to see their garage." : `<a href="/sign-in" data-link>Sign in</a> to add them as a friend.`}</div>`}
    ${!state.session ? `<div class="panel" style="margin-top:24px"><h3>Join the Cars and Coffee Club</h3><p class="muted">The members' club for car enthusiasts across Norfolk and Suffolk.</p><a class="btn red" href="/apply" data-link>Apply to join</a></div>` : ""}
  </div>`;
  app.onclick = async (e) => {
    const b = e.target.closest("[data-fr]"); if (!b) return;
    b.disabled = true; let r;
    if (b.dataset.fr === "add") r = await sb.rpc("send_friend_request", { p_user: p.id });
    else if (b.dataset.fr === "accept") r = await sb.rpc("respond_friend_request", { p_requester: p.id, p_accept: true });
    else if (b.dataset.fr === "remove") { if (!b.dataset.armed) { b.dataset.armed = "1"; b.disabled = false; b.textContent = "Remove friend?"; return; } r = await sb.rpc("remove_friend", { p_user: p.id }); }
    if (r?.error) { b.disabled = false; return toast(r.error.message); }
    toast({ add: r?.data === "friends" ? "You're now friends" : "Friend request sent", accept: "You're now friends", remove: "Friend removed" }[b.dataset.fr]); render();
  };
});
routeP("/u/:handle/car/:id", async ({ handle, id }) => {
  const { data: pr } = await sb.rpc("get_profile", { p_handle: decodeURIComponent(handle) });
  const p = pr && pr[0];
  const { data: c } = p && p.can_see ? await sb.from("garage_cars").select("*").eq("id", id).eq("owner_id", p.id).maybeSingle() : { data: null };
  if (!c) { app.innerHTML = `<div class="narrow"><h1>Car not found</h1><p class="muted">It may have been removed, or the owner's profile is private.</p></div>`; return; }
  document.title = `${carName(c)} · ${p.display_name || "@" + p.handle} · Cars and Coffee Club`;
  const ph = c.photo_paths || [];
  app.innerHTML = `<span class="eyebrow"><a href="/u/${esc(p.handle)}" data-link>${esc(p.display_name || "@" + p.handle)}'s garage</a></span>
    <h1>${esc(carName(c))}</h1>${c.nickname ? `<p class="muted">${esc([c.year, c.make, c.model].filter(Boolean).join(" "))}</p>` : ""}
    ${ph.length ? `<div class="carhero"><img id="bigph" src="${esc(mediaUrl(ph[0]))}" alt="${esc(carName(c))}"></div>
      ${ph.length > 1 ? `<div class="thumbs">${ph.map((k, i) => `<button type="button" data-ph="${esc(mediaUrl(k))}" aria-label="Photo ${i + 1}"><img src="${esc(mediaUrl(k))}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}` : ""}
    <div class="grid2" style="margin-top:20px">
      <div>${c.description ? `<div class="panel"><h3>The story</h3><p style="white-space:pre-line;margin:0">${esc(c.description)}</p></div>` : ""}
        ${c.mods ? `<div class="panel"><h3>Modifications</h3><ul class="list">${c.mods.split("\n").filter((x) => x.trim()).map((m) => `<li>${esc(m.trim())}</li>`).join("")}</ul></div>` : ""}</div>
      <div class="panel"><h3>Specs</h3><dl class="kv">
        ${[["Make", c.make], ["Model", c.model], ["Year", c.year], ["Engine", c.engine], ["Colour", c.colour], ["Use", USAGE[c.usage]]].filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
        ${p.is_me ? `<a class="btn ghost small" href="/garage/${c.id}" data-link>Edit this car</a>` : ""}</div>
    </div>`;
  app.onclick = (e) => { const b = e.target.closest("[data-ph]"); if (b) $("#bigph").src = b.dataset.ph; };
});

// ---------- friends ----------
route("/friends", async () => {
  if (!state.session) return go("/sign-in", true);
  if (state.profile?.status !== "approved") return go(homeFor(), true);
  const { data } = await sb.rpc("get_my_friends");
  const rows = data || [];
  const person = (f, actions) => `<li class="person"><a href="${f.handle ? `/u/${esc(f.handle)}` : "#"}" data-link class="avatar">${avatarHTML(f, 44)}</a>
    <div><strong>${f.handle ? `<a href="/u/${esc(f.handle)}" data-link>${esc(f.display_name || "@" + f.handle)}</a>` : esc(f.display_name || "Member")}</strong><div class="muted small">${f.handle ? "@" + esc(f.handle) : ""}${f.location ? ` · ${esc(f.location)}` : ""}</div></div>
    <div class="btns" style="margin:0 0 0 auto">${actions}</div></li>`;
  const inc = rows.filter((r) => r.state === "incoming"), fr = rows.filter((r) => r.state === "friend"), out = rows.filter((r) => r.state === "outgoing");
  app.innerHTML = `<span class="eyebrow">Your people</span><h1>Friends</h1>
    ${inc.length ? `<h2>Friend requests</h2><ul class="people">${inc.map((f) => person(f, `<button class="btn red small" data-acc="${f.user_id}">Accept</button><button class="btn ghost small" data-dec="${f.user_id}">Decline</button>`)).join("")}</ul>` : ""}
    <h2>Friends${fr.length ? ` (${fr.length})` : ""}</h2>
    ${fr.length ? `<ul class="people">${fr.map((f) => person(f, "")).join("")}</ul>` : `<p class="muted">No friends yet. Find members at meets, in the hubs (coming soon) or <a href="/recommend" data-link>invite your mates</a>; you'll be friends as soon as they're approved.</p>`}
    ${out.length ? `<h2>Requests you've sent</h2><ul class="people">${out.map((f) => person(f, `<button class="btn ghost small" data-cancel="${f.user_id}">Cancel</button>`)).join("")}</ul>` : ""}`;
  app.onclick = async (e) => {
    const b = e.target.closest("button"); if (!b) return; b.disabled = true; let r;
    if (b.dataset.acc) r = await sb.rpc("respond_friend_request", { p_requester: b.dataset.acc, p_accept: true });
    else if (b.dataset.dec) r = await sb.rpc("respond_friend_request", { p_requester: b.dataset.dec, p_accept: false });
    else if (b.dataset.cancel) r = await sb.rpc("remove_friend", { p_user: b.dataset.cancel });
    else return;
    if (r.error) { b.disabled = false; return toast(r.error.message); }
    toast(b.dataset.acc ? "You're now friends" : "Done"); render();
  };
});


// ---------- feed ----------
const ago = (d) => { const m = Math.round((Date.now() - new Date(d)) / 6e4); if (m < 1) return "just now"; if (m < 60) return `${m}m`; if (m < 1440) return `${Math.round(m / 60)}h`; if (m < 10080) return `${Math.round(m / 1440)}d`; return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
const linkify = (t) => esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener nofollow ugc">$1</a>').replace(/\n/g, "<br>");
const ytId = (u) => (String(u || "").match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{6,})/) || [])[1];
const REASONS = { spam: "Spam or advertising", abuse: "Abusive or hateful", unsafe: "Dangerous driving or unsafe", illegal: "Illegal", privacy: "Shares someone's private details or number plate", other: "Something else" };
let HUB_LIST = null;
async function hubsList() { if (!HUB_LIST) { const { data } = await sb.rpc("get_hubs"); HUB_LIST = data || []; } return HUB_LIST; }
const HUB_CATS = { motorsport: "Motorsport", car_interests: "Car interests", activities: "Activities", local: "Local" };

function postHTML(p, opts = {}) {
  const who = p.author_name || (p.author_handle ? "@" + p.author_handle : "Member");
  const profile = p.author_handle ? `/u/${esc(p.author_handle)}` : null;
  const ph = p.photo_paths || [], yt = ytId(p.video_url);
  return `<article class="post${p.status === "hidden" ? " hidden-post" : ""}" data-post="${p.id}">
    <header class="phead">${profile ? `<a class="avatar" href="${profile}" data-link>${avatarHTML({ avatar_path: p.author_avatar, display_name: who }, 40)}</a>` : `<span class="avatar">${avatarHTML({ display_name: who }, 40)}</span>`}
      <div class="pmeta"><strong>${profile ? `<a href="${profile}" data-link>${esc(who)}</a>` : esc(who)}</strong>
        <span class="muted small">${p.hub_slug && !opts.inHub ? `in <a href="/hubs/${esc(p.hub_slug)}" data-link>${esc(p.hub_name)}</a> · ` : ""}<a href="/post/${p.id}" data-link class="muted">${ago(p.created_at)}</a>${p.edited_at ? " · edited" : ""}${p.visibility === "friends" ? " · friends only" : ""}${p.pinned ? ` · <span class="badge fast">Pinned</span>` : ""}</span></div>
      <div class="pmenu"><button type="button" class="dots" data-menu aria-label="Post options" aria-expanded="false">⋯</button>
        <div class="menu" hidden>${p.is_mine ? `<button type="button" data-edit>Edit</button><button type="button" data-del>Delete</button>` : `<button type="button" data-report>Report</button>`}${isTeam() ? `<button type="button" data-pin>${p.pinned ? "Unpin" : "Pin in hub"}</button><button type="button" data-hide>${p.status === "hidden" ? "Restore" : "Hide (team)"}</button>` : ""}<button type="button" data-copy>Copy link</button></div></div>
    </header>
    ${p.status === "hidden" ? `<p class="notice small">Hidden by the team. Only you and the team can see this.</p>` : ""}
    ${p.body ? `<div class="pbody">${linkify(p.body)}</div>` : ""}
    ${p.car_id && p.car_name && p.author_handle ? `<a class="carlink" href="/u/${esc(p.author_handle)}/car/${p.car_id}" data-link>🚗 ${esc(p.car_name)}</a>` : ""}
    ${ph.length ? `<div class="pphotos n${Math.min(ph.length, 4)}">${ph.slice(0, 4).map((k, i) => `<button type="button" class="pph" data-view="${i}">${i === 3 && ph.length > 4 ? `<span class="more">+${ph.length - 4}</span>` : ""}<img src="${esc(mediaUrl(k))}" alt="Photo ${i + 1}${p.car_name ? " of " + esc(p.car_name) : ""}" loading="lazy"></button>`).join("")}</div>` : ""}
    ${yt ? `<div class="pvideo"><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ""}
    <footer class="pfoot"><button type="button" class="pact${p.liked ? " on" : ""}" data-like aria-pressed="${p.liked}">${p.liked ? "♥" : "♡"} <span>${p.like_count || ""}</span> Like</button>
      <button type="button" class="pact" data-comments>💬 <span>${p.comment_count || ""}</span> Comment</button></footer>
    <div class="pcomments" hidden></div>
  </article>`;
}

function composerHTML(hubs, opts = {}) {
  return `<form class="panel composer" id="composer" novalidate>
    <div class="crow"><span class="avatar">${avatarHTML(state.profile, 40)}</span><textarea id="cbody" maxlength="5000" rows="2" placeholder="${opts.hub ? `Share something in ${esc(opts.hubName)}…` : "Share a photo, a build update or a question…"}"></textarea></div>
    <div class="cphotos" id="cphotos"></div>
    <div class="copts" id="copts" hidden>
      <label class="f small">YouTube link <small>(optional)</small><input type="text" id="cvideo" placeholder="https://youtu.be/…"></label>
      <div class="row3">
        <label class="f">Hub<select id="chub"><option value="">No hub (everyone)</option>${Object.entries(HUB_CATS).map(([k, v]) => `<optgroup label="${v}">${hubs.filter((h) => h.category === k).map((h) => `<option value="${h.id}" ${opts.hub === h.slug ? "selected" : ""}>${esc(h.name)}</option>`).join("")}</optgroup>`).join("")}</select></label>
        <label class="f">About one of your cars<select id="ccar"><option value="">No car</option></select></label>
        <label class="f">Who can see it<select id="cvis"><option value="members">All members</option><option value="friends">Friends only</option></select></label></div>
    </div>
    <div class="cbar"><label class="btn ghost small" style="cursor:pointer">📷 Photos<input type="file" id="cfile" accept="image/*" multiple hidden></label>
      <button type="button" class="btn ghost small" id="cmore">More options</button><span class="muted small" id="cmsg"></span>
      <button class="btn red small" type="submit" id="cpost" style="margin-left:auto">Post</button></div>
  </form>`;
}

function wireComposer(onPosted, hubs) {
  const f = $("#composer"); if (!f) return;
  let photos = [];
  const draw = () => { $("#cphotos").innerHTML = photos.map((k, i) => `<div class="ph"><img src="${esc(mediaUrl(k))}" alt=""><button type="button" data-rmph="${i}" aria-label="Remove photo">&times;</button></div>`).join(""); };
  const open = () => { $("#copts").hidden = false; $("#cmore").hidden = true; };
  $("#cbody").addEventListener("focus", () => { $("#cbody").rows = 4; }, { once: true });
  $("#cmore").onclick = async () => {
    open();
    const { data: cars } = await sb.from("garage_cars").select("id,make,model,year,nickname").eq("owner_id", state.profile.id).order("sort");
    $("#ccar").innerHTML = `<option value="">No car</option>` + (cars || []).map((c) => `<option value="${c.id}">${esc(carName(c))}</option>`).join("");
  };
  $("#cphotos").onclick = (e) => { const b = e.target.closest("[data-rmph]"); if (b) { deletePhoto(photos.splice(Number(b.dataset.rmph), 1)[0]); draw(); } };
  $("#cfile").onchange = async (e) => {
    const files = [...e.target.files].slice(0, 10 - photos.length); e.target.value = "";
    for (const [n, file] of files.entries()) {
      $("#cmsg").textContent = `Uploading ${n + 1} of ${files.length}…`;
      try { const up = await uploadPhoto(file); photos.push(up.key); draw(); } catch (err) { $("#cmsg").textContent = err.message; return; }
    }
    $("#cmsg").textContent = "";
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const body = $("#cbody").value.trim(), video = $("#cvideo").value.trim();
    if (!body && !photos.length && !video) { $("#cmsg").textContent = "Write something or add a photo."; return; }
    if (video && !ytId(video)) { open(); $("#cmsg").textContent = "That doesn't look like a YouTube link."; return; }
    $("#cpost").disabled = true; $("#cmsg").textContent = "Posting…";
    const row = { author_id: state.profile.id, body, photo_paths: photos, video_url: video ? `https://youtu.be/${ytId(video)}` : null,
      hub_id: $("#chub").value || null, car_id: $("#ccar").value || null, visibility: $("#cvis").value };
    const { error } = await sb.from("posts").insert(row);
    $("#cpost").disabled = false;
    if (error) { $("#cmsg").textContent = /a lot today/.test(error.message) ? error.message : "We couldn't post that. Please try again."; return; }
    toast("Posted"); onPosted();
  };
}

function wirePosts(container, reload) {
  container.onclick = async (e) => {
    const art = e.target.closest("[data-post]"); if (!art) return;
    const id = art.dataset.post, t = e.target;
    const menu = art.querySelector(".menu");
    if (t.closest("[data-menu]")) { const open = menu.hidden; $$(".menu").forEach((m) => (m.hidden = true)); menu.hidden = !open; t.closest("[data-menu]").setAttribute("aria-expanded", open); return; }
    if (t.closest("[data-like]")) {
      const b = t.closest("[data-like]"), on = b.getAttribute("aria-pressed") !== "true", span = b.querySelector("span");
      const n = Number(span.textContent || 0) + (on ? 1 : -1);
      b.setAttribute("aria-pressed", on); b.classList.toggle("on", on); b.firstChild.textContent = on ? "♥ " : "♡ "; span.textContent = n || "";
      const { error } = on ? await sb.from("post_likes").insert({ post_id: id, user_id: state.profile.id }) : await sb.from("post_likes").delete().eq("post_id", id).eq("user_id", state.profile.id);
      if (error && !/duplicate/i.test(error.message)) toast("Couldn't save that like");
      return;
    }
    if (t.closest("[data-comments]")) { const box = art.querySelector(".pcomments"); box.hidden = !box.hidden; if (!box.hidden) loadComments(id, box, art); return; }
    if (t.closest("[data-view]")) { openViewer(art, Number(t.closest("[data-view]").dataset.view)); return; }
    if (t.closest("[data-copy]")) { try { await navigator.clipboard.writeText(`${location.origin}/post/${id}`); toast("Link copied"); } catch {} menu.hidden = true; return; }
    if (t.closest("[data-del]")) {
      const b = t.closest("[data-del]"); if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Tap again to delete"; return; }
      const { data: row } = await sb.from("posts").select("photo_paths").eq("id", id).maybeSingle();
      const { error } = await sb.from("posts").delete().eq("id", id); if (error) return toast("Couldn't delete the post");
      (row?.photo_paths || []).forEach(deletePhoto); art.remove(); toast("Post deleted"); return;
    }
    if (t.closest("[data-edit]")) {
      menu.hidden = true;
      const body = art.querySelector(".pbody"); const { data: row } = await sb.from("posts").select("body").eq("id", id).maybeSingle();
      const ed = document.createElement("form"); ed.className = "pedit";
      ed.innerHTML = `<textarea maxlength="5000" rows="4">${esc(row?.body || "")}</textarea><div class="btns"><button class="btn red small">Save</button><button type="button" class="btn ghost small" data-cancel>Cancel</button></div>`;
      (body || art.querySelector(".phead")).after(ed); if (body) body.hidden = true;
      ed.querySelector("[data-cancel]").onclick = () => { ed.remove(); if (body) body.hidden = false; };
      ed.onsubmit = async (ev) => { ev.preventDefault(); const v = ed.querySelector("textarea").value.trim();
        const { error } = await sb.from("posts").update({ body: v }).eq("id", id); if (error) return toast("Couldn't save");
        toast("Saved"); reload(); };
      return;
    }
    if (t.closest("[data-report]")) { menu.hidden = true; reportDialog({ post_id: id }); return; }
    if (t.closest("[data-hide]")) { const hide = !art.classList.contains("hidden-post"); const { error } = await sb.rpc("moderate_content", { p_post: id, p_comment: null, p_action: hide ? "hide" : "restore", p_reason: "Hidden from the feed" }); if (error) return toast(error.message); toast(hide ? "Post hidden" : "Post restored"); reload(); return; }
    if (t.closest("[data-pin]")) { const { error } = await sb.rpc("pin_post", { p_post: id, p_pinned: !t.closest("[data-pin]").textContent.startsWith("Unpin") }); if (error) return toast(error.message); toast("Updated"); reload(); return; }
  };
}
document.addEventListener("click", (e) => { if (!e.target.closest(".pmenu")) $$(".menu").forEach((m) => (m.hidden = true)); });

async function loadComments(postId, box, art) {
  box.innerHTML = `<p class="muted small">Loading comments…</p>`;
  const { data } = await sb.rpc("get_comments", { p_post: postId });
  const rows = data || [];
  box.innerHTML = `<ul class="clist">${rows.map((c) => `<li data-comment="${c.id}"><span class="avatar">${avatarHTML({ avatar_path: c.author_avatar, display_name: c.author_name || c.author_handle }, 30)}</span>
      <div class="cbub${c.status === "hidden" ? " hidden-post" : ""}"><strong>${c.author_handle ? `<a href="/u/${esc(c.author_handle)}" data-link>${esc(c.author_name || "@" + c.author_handle)}</a>` : esc(c.author_name || "Member")}</strong> <span class="muted small">${ago(c.created_at)}</span>
        <div>${linkify(c.body)}</div>
        <div class="cacts">${c.is_mine || art.querySelector("[data-edit]") ? `<button type="button" data-cdel>Delete</button>` : ""}${!c.is_mine ? `<button type="button" data-creport>Report</button>` : ""}${isTeam() ? `<button type="button" data-chide>${c.status === "hidden" ? "Restore" : "Hide"}</button>` : ""}</div></div></li>`).join("")}</ul>
    <form class="cform"><input type="text" maxlength="2000" placeholder="Write a comment…" aria-label="Write a comment" required><button class="btn red small">Send</button></form>`;
  box.querySelector(".cform").onsubmit = async (e) => {
    e.preventDefault(); const inp = e.target.querySelector("input"), v = inp.value.trim(); if (!v) return;
    inp.disabled = true;
    const { error } = await sb.from("comments").insert({ post_id: postId, author_id: state.profile.id, body: v });
    inp.disabled = false; if (error) return toast(/a lot today/.test(error.message) ? error.message : "Couldn't post the comment");
    const cnt = art.querySelector("[data-comments] span"); cnt.textContent = Number(cnt.textContent || 0) + 1;
    loadComments(postId, box, art);
  };
  box.querySelector(".clist").onclick = async (e) => {
    const li = e.target.closest("[data-comment]"); if (!li) return; const cid = li.dataset.comment;
    if (e.target.matches("[data-cdel]")) { const { error } = await sb.from("comments").delete().eq("id", cid); if (error) return toast("Couldn't delete"); li.remove(); const cnt = art.querySelector("[data-comments] span"); cnt.textContent = Math.max(0, Number(cnt.textContent || 0) - 1) || ""; }
    if (e.target.matches("[data-creport]")) reportDialog({ comment_id: cid });
    if (e.target.matches("[data-chide]")) { const hide = e.target.textContent === "Hide"; const { error } = await sb.rpc("moderate_content", { p_post: null, p_comment: cid, p_action: hide ? "hide" : "restore", p_reason: null }); if (error) return toast(error.message); loadComments(postId, box, art); }
  };
}

function reportDialog(target) {
  const d = document.createElement("div"); d.className = "overlay";
  d.innerHTML = `<form class="panel dialog" role="dialog" aria-modal="true" aria-labelledby="rep-h"><h3 id="rep-h">Report ${target.post_id ? "post" : "comment"}</h3>
    <p class="muted small">The team will take a look. The member won't know who reported it.</p>
    ${Object.entries(REASONS).map(([k, v], i) => `<label class="check"><input type="radio" name="reason" value="${k}" ${i === 0 ? "checked" : ""}> <span>${v}</span></label>`).join("")}
    <label class="f">Anything else? <small>(optional)</small><textarea maxlength="1000" rows="3" name="details"></textarea></label>
    <div class="btns"><button class="btn red">Send report</button><button type="button" class="btn ghost" data-close>Cancel</button></div></form>`;
  document.body.append(d); d.querySelector("input").focus();
  const close = () => d.remove();
  d.onclick = (e) => { if (e.target === d || e.target.matches("[data-close]")) close(); };
  d.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    const { error } = await sb.from("reports").insert({ reporter_id: state.profile.id, ...target, reason: fd.get("reason"), details: fd.get("details") || null });
    close(); toast(error && /duplicate/i.test(error.message) ? "You've already reported this" : error ? "Couldn't send the report" : "Thanks. The team will review it.");
  };
}

function openViewer(art, start) {
  const imgs = [...art.querySelectorAll(".pph img")].map((i) => i.src);
  sb.from("posts").select("photo_paths").eq("id", art.dataset.post).maybeSingle().then(({ data }) => { if (data?.photo_paths?.length) { all = data.photo_paths.map(mediaUrl); show(); } });
  let all = imgs, i = start;
  const d = document.createElement("div"); d.className = "overlay viewer"; d.tabIndex = -1;
  const show = () => { d.innerHTML = `<img src="${esc(all[i])}" alt="Photo ${i + 1} of ${all.length}"><button class="vclose" aria-label="Close">&times;</button>${all.length > 1 ? `<button class="vprev" aria-label="Previous">&larr;</button><button class="vnext" aria-label="Next">&rarr;</button><span class="vcount">${i + 1} / ${all.length}</span>` : ""}`; };
  show(); document.body.append(d); d.focus();
  d.onclick = (e) => { if (e.target.matches(".vnext")) { i = (i + 1) % all.length; show(); } else if (e.target.matches(".vprev")) { i = (i - 1 + all.length) % all.length; show(); } else if (e.target === d || e.target.matches(".vclose")) d.remove(); };
  d.onkeydown = (e) => { if (e.key === "Escape") d.remove(); if (e.key === "ArrowRight") { i = (i + 1) % all.length; show(); } if (e.key === "ArrowLeft") { i = (i - 1 + all.length) % all.length; show(); } };
}

async function feedList(container, args, opts = {}) {
  let before = null, done = false;
  const more = async () => {
    const { data, error } = await sb.rpc("get_feed", { p_scope: args.scope || "all", p_hub: args.hub || null, p_author: args.author || null, p_post: args.post || null, p_before: before, p_limit: 20 });
    if (error) { container.insertAdjacentHTML("beforeend", `<div class="notice red">We couldn't load posts. Please refresh.</div>`); return; }
    const rows = data || [];
    if (!before && !rows.length) container.innerHTML = opts.empty || `<div class="empty panel"><p>Nothing here yet.</p></div>`;
    container.insertAdjacentHTML("beforeend", rows.map((p) => postHTML(p, opts)).join(""));
    if (rows.length) before = rows[rows.length - 1].created_at;
    done = rows.length < 20 || !!args.post;
    $("#loadmore") && ($("#loadmore").hidden = done);
  };
  container.innerHTML = "";
  await more();
  if (!args.post) container.insertAdjacentHTML("afterend", `<button class="btn ghost" id="loadmore" ${done ? "hidden" : ""} style="display:block;margin:18px auto">Load more</button>`);
  if ($("#loadmore")) $("#loadmore").onclick = more;
  wirePosts(container, () => render());
}

route("/feed", async () => {
  if (!state.session) return go("/sign-in", true);
  if (state.profile?.status !== "approved") return go(homeFor(), true);
  const scope = new URLSearchParams(location.search).get("scope") || "all";
  const hubs = await hubsList();
  const p = state.profile, fresh = p.approved_at && Date.now() - new Date(p.approved_at).getTime() < 7 * 864e5;
  const joined = hubs.filter((h) => h.joined);
  app.innerHTML = `<div class="feedwrap"><div class="feedmain">
    ${fresh && (!p.handle || !p.avatar_path || !joined.length) ? `<div class="panel welcome"><h3>Welcome to the club, ${first(p.display_name)}</h3><ul class="wsteps">
      <li class="${p.handle && p.avatar_path ? "done" : ""}"><a href="/home" data-link>Add a photo and choose a username</a></li>
      <li class="${joined.length ? "done" : ""}"><a href="/hubs" data-link>Join the hubs you're into</a></li>
      <li><a href="/garage/new" data-link>Add your car to your garage</a></li></ul></div>` : ""}
    ${composerHTML(hubs)}
    <div class="tabs" role="tablist"><a href="/feed" data-link class="${scope === "all" ? "on" : ""}" role="tab" aria-selected="${scope === "all"}">All members</a><a href="/feed?scope=following" data-link class="${scope === "following" ? "on" : ""}" role="tab" aria-selected="${scope === "following"}">Following</a></div>
    <div id="posts"></div></div>
    <aside class="feedside"><div class="panel"><h3>Your hubs</h3>${joined.length ? `<ul class="hublinks">${joined.map((h) => `<li><a href="/hubs/${esc(h.slug)}" data-link>${esc(h.name)}</a></li>`).join("")}</ul>` : `<p class="muted small">You haven't joined any hubs yet.</p>`}<a class="btn ghost small" href="/hubs" data-link>Browse all hubs</a></div>
      <div class="panel"><h3>Meets coming up</h3><p class="muted small">See what's on at <a href="https://carsandcoffee.uk/events" target="_blank" rel="noopener">carsandcoffee.uk</a>.</p></div></aside></div>`;
  wireComposer(() => render(), hubs);
  await feedList($("#posts"), { scope }, { empty: scope === "following" ? `<div class="empty panel"><p>Nothing from your hubs or friends yet. <a href="/hubs" data-link>Join some hubs</a> or switch to <a href="/feed" data-link>All members</a>.</p></div>` : `<div class="empty panel"><p>No posts yet. Be the first: share a photo of your car.</p></div>` });
});

route("/hubs", async () => {
  if (!state.session) return go("/sign-in", true);
  if (state.profile?.status !== "approved") return go(homeFor(), true);
  HUB_LIST = null; const hubs = await hubsList();
  app.innerHTML = `<span class="eyebrow">Hubs</span><h1>Find your people</h1><p class="muted">Join the hubs you're into. Posts from your hubs show in your Following feed.</p>
    ${Object.entries(HUB_CATS).map(([k, v]) => `<h2>${v}</h2><div class="hubgrid">${hubs.filter((h) => h.category === k).map((h) => `<div class="hubcard">
      <a href="/hubs/${esc(h.slug)}" data-link class="hubname">${esc(h.name)}</a><p class="muted small">${esc(h.description || "")}</p>
      <p class="small muted">${h.member_count} member${h.member_count === 1 ? "" : "s"} · ${h.post_count_7d} post${h.post_count_7d === 1 ? "" : "s"} this week</p>
      <button type="button" class="btn ${h.joined ? "ghost" : "red"} small" data-hub="${h.id}" data-joined="${h.joined}">${h.joined ? "Joined ✓" : "Join"}</button></div>`).join("")}</div>`).join("")}`;
  app.onclick = async (e) => {
    const b = e.target.closest("[data-hub]"); if (!b) return; b.disabled = true;
    const joined = b.dataset.joined === "true";
    const { error } = joined ? await sb.from("hub_members").delete().eq("hub_id", b.dataset.hub).eq("user_id", state.profile.id) : await sb.from("hub_members").insert({ hub_id: b.dataset.hub, user_id: state.profile.id });
    b.disabled = false; if (error && !/duplicate/i.test(error.message)) return toast("Couldn't update that hub");
    b.dataset.joined = String(!joined); b.textContent = joined ? "Join" : "Joined ✓"; b.classList.toggle("red", joined); b.classList.toggle("ghost", !joined); HUB_LIST = null;
  };
});

routeP("/hubs/:slug", async ({ slug }) => {
  if (!state.session) return go("/sign-in", true);
  if (state.profile?.status !== "approved") return go(homeFor(), true);
  HUB_LIST = null; const hubs = await hubsList(); const h = hubs.find((x) => x.slug === slug);
  if (!h) { app.innerHTML = `<h1>Hub not found</h1><p><a href="/hubs" data-link>See all hubs</a></p>`; return; }
  document.title = `${h.name} · Cars and Coffee Club`;
  app.innerHTML = `<div class="hubhead"><div><span class="eyebrow">${HUB_CATS[h.category]} hub</span><h1>${esc(h.name)}</h1><p class="muted">${esc(h.description || "")}</p>
    <p class="small muted">${h.member_count} member${h.member_count === 1 ? "" : "s"}</p></div>
    <button type="button" class="btn ${h.joined ? "ghost" : "red"}" id="joinhub">${h.joined ? "Joined ✓" : "Join this hub"}</button></div>
    <div class="feedmain">${composerHTML(hubs, { hub: h.slug, hubName: h.name })}<div id="posts"></div></div>`;
  $("#joinhub").onclick = async () => {
    const { error } = h.joined ? await sb.from("hub_members").delete().eq("hub_id", h.id).eq("user_id", state.profile.id) : await sb.from("hub_members").insert({ hub_id: h.id, user_id: state.profile.id });
    if (error && !/duplicate/i.test(error.message)) return toast("Couldn't update the hub"); render();
  };
  wireComposer(() => render(), hubs);
  if ($("#chub")) { $("#copts").hidden = true; }
  await feedList($("#posts"), { hub: h.slug }, { inHub: true, empty: `<div class="empty panel"><p>No posts in ${esc(h.name)} yet. Start the conversation.</p></div>` });
});

routeP("/post/:id", async ({ id }) => {
  if (!state.session) return go("/sign-in", true);
  if (state.profile?.status !== "approved") return go(homeFor(), true);
  app.innerHTML = `<div class="feedmain"><div id="posts"></div></div>`;
  await feedList($("#posts"), { post: id }, { empty: `<div class="empty panel"><p>This post isn't available. It may have been deleted or shared with friends only.</p></div>` });
  const art = $("[data-post]"); if (art) art.querySelector("[data-comments]").click();
});

route("/admin", async () => {
  if (!state.session) return go("/sign-in", true);
  if (!isTeam()) return go(homeFor(), true);
  const tab = new URLSearchParams(location.search).get("tab") || "queue";
  app.innerHTML = `<span class="eyebrow">Team</span><h1>Club admin</h1>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="${tab === "queue"}" data-tab="queue">Approval queue</button>
      ${state.profile.role === "admin" ? `<button role="tab" aria-selected="${tab === "invites"}" data-tab="invites">Invite list</button>` : ""}
    </div><div id="tabbody"></div>`;
  app.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => go(`/admin?tab=${b.dataset.tab}`)));
  if (tab === "invites" && state.profile.role === "admin") return renderInvites();
  return renderQueue();
});

async function renderQueue() {
  const body = $("#tabbody");
  const { data, error } = await sb.rpc("get_application_queue");
  if (error) { body.innerHTML = `<div class="notice red">${esc(error.message)}</div>`; return; }
  if (!data.length) { body.innerHTML = `<div class="empty"><h3>All caught up</h3><p>No applications waiting for review.</p></div>`; return; }
  const fast = data.filter((d) => d.fast_track).length;
  body.innerHTML = `<div class="qhead"><p class="muted" style="margin:0"><strong style="color:var(--ink)">${data.length}</strong> waiting · ${fast} fast-track</p>
      <button class="btn green small" id="bulk" type="button" disabled>Approve selected</button></div>
    ${data.map((a) => `<article class="card ${a.fast_track ? "fast" : ""}" data-id="${a.id}">
      <div class="chead"><div><h3>${esc(a.full_name)}</h3><div class="cmeta"><span>${esc(a.email)}</span><span>${esc(a.location)}</span><span>Waiting ${Math.round(a.waiting_hours)}h</span></div></div>
        <div class="row">${a.fast_track ? `<span class="badge fast">Fast-track</span>` : ""}${a.status === "more_info" ? `<span class="badge">Asked for more info</span>` : ""}
        <label class="check small"><input type="checkbox" class="pick" ${a.status === "more_info" ? "disabled" : ""}> Select</label></div></div>
      ${a.recommender_name ? `<p class="small" style="margin:0">Recommended by <strong>${esc(a.recommender_name)}</strong>${a.recommender_handle ? ` (@${esc(a.recommender_handle)})` : ""} · ${a.recommender_approved_count} approved, ${a.recommender_removed_count} removed</p>` : ""}
      <dl class="kv"><dt>Car</dt><dd>${esc(a.car || "–")}</dd><dt>Heard via</dt><dd>${esc(a.heard_about || "–")}</dd></dl>
      ${a.favourite_series?.length ? `<div class="chips">${a.favourite_series.map((s) => `<span>${esc(s)}</span>`).join("")}</div>` : ""}
      <div class="decide"><textarea class="msg" placeholder="Optional message to the applicant (required for 'Ask for info')" maxlength="600"></textarea>
        <div class="btns" style="margin:0"><button class="btn green small" data-d="approved" type="button">Approve</button>
        <button class="btn ghost small" data-d="more_info" type="button">Ask for info</button>
        <button class="btn ghost small" data-d="rejected" type="button">Reject</button></div></div>
    </article>`).join("")}`;
  const bulk = $("#bulk");
  body.addEventListener("change", () => { const n = body.querySelectorAll(".pick:checked").length; bulk.disabled = !n; bulk.textContent = n ? `Approve selected (${n})` : "Approve selected"; });
  const decide = async (id, d, message) => {
    const { error } = await sb.rpc("decide_application", { p_application_id: id, p_decision: d, p_message: message || null });
    if (error) { toast(error.message); return false; }
    return true;
  };
  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-d]"); if (!b) return;
    const card = b.closest(".card"); const msg = card.querySelector(".msg").value.trim();
    if (b.dataset.d === "more_info" && !msg) { card.querySelector(".msg").focus(); toast("Add a message saying what you need"); return; }
    if (b.dataset.d === "rejected" && !confirm("Reject this application? They can reapply after 90 days.")) return;
    b.disabled = true;
    if (await decide(card.dataset.id, b.dataset.d, msg)) { toast({ approved: "Approved", rejected: "Rejected", more_info: "Asked for more info" }[b.dataset.d]); renderQueue(); }
    else b.disabled = false;
  });
  bulk.onclick = async () => {
    const ids = [...body.querySelectorAll(".pick:checked")].map((c) => c.closest(".card").dataset.id);
    bulk.disabled = true; let ok = 0;
    for (const id of ids) if (await decide(id, "approved")) ok++;
    toast(`${ok} approved`); renderQueue();
  };
}

async function renderInvites() {
  const body = $("#tabbody");
  const [{ data: list }, { data: setting }] = await Promise.all([
    sb.from("signup_allowlist").select("email,note,added_at").order("added_at", { ascending: false }),
    sb.from("settings").select("value").eq("key", "signups_open").maybeSingle(),
  ]);
  const open = setting?.value === true;
  body.innerHTML = `<div class="switch"><div><strong>Public applications</strong><br><span class="muted small">${open ? "Open: anyone can create an account and apply." : "Invite-only: only emails on this list can create an account."}</span></div>
      <button class="btn ${open ? "ghost" : "red"} small" id="toggle" type="button">${open ? "Switch to invite-only" : "Open to everyone"}</button></div>
    <h3>Invite list</h3><p class="muted small">Add the email address someone will sign in with (for Google sign-in, their Google account email).</p>
    <form id="addform" class="row" novalidate><input type="email" id="newemail" autocomplete="email" placeholder="name@example.com" required aria-label="Email address">
      <input type="text" id="newnote" placeholder="Note (optional)" aria-label="Note"><button class="btn red small" type="submit">Add</button></form>
    <ul class="list">${(list || []).map((r) => `<li><span><strong>${esc(r.email)}</strong>${r.note ? ` <span class="muted small">· ${esc(r.note)}</span>` : ""}</span>
      <button class="btn ghost small" data-remove="${esc(r.email)}" type="button">Remove</button></li>`).join("") || `<li class="muted">No emails yet.</li>`}</ul>`;
  $("#toggle").onclick = async () => {
    if (!confirm(open ? "Switch back to invite-only?" : "Open applications to everyone? Anyone will be able to create an account and apply.")) return;
    const { error } = await sb.from("settings").update({ value: !open }).eq("key", "signups_open");
    if (error) return toast(error.message); toast(open ? "Now invite-only" : "Applications are open"); renderInvites();
  };
  $("#addform").onsubmit = async (e) => {
    e.preventDefault();
    const email = $("#newemail").value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("Enter a valid email address");
    const { error } = await sb.from("signup_allowlist").insert({ email, note: $("#newnote").value.trim() || null });
    if (error) return toast(/duplicate/i.test(error.message) ? "That email is already on the list" : error.message);
    toast("Added to the invite list"); renderInvites();
  };
  body.querySelectorAll("[data-remove]").forEach((b) => (b.onclick = async () => {
    if (!confirm(`Remove ${b.dataset.remove} from the invite list?`)) return;
    const { error } = await sb.from("signup_allowlist").delete().eq("email", b.dataset.remove);
    if (error) return toast(error.message); toast("Removed"); renderInvites();
  }));
}

route("/guidelines", async () => {
  app.innerHTML = `<div class="narrow"><span class="eyebrow">Community guidelines</span><h1>How we do things</h1>
    <div class="panel">
      <p>The Cars and Coffee Club is a friendly place for people who love cars. By joining, you agree to:</p>
      <h3>Be respectful</h3><p>Debate is fine; abuse isn't. No harassment, bullying, hate, threats or discrimination of any kind.</p>
      <h3>Keep it legal and safe</h3><p>No illegal content, no promoting dangerous or illegal driving, no street racing, and no stolen or counterfeit goods.</p>
      <h3>Be genuine</h3><p>Use your real name, don't impersonate anyone, and don't spam. Businesses advertise through our advertising options, not in posts.</p>
      <h3>Respect privacy</h3><p>Don't share other people's personal details or number plates without permission, and blur them in photos where you can.</p>
      <h3>Share your own content</h3><p>Only post photos and videos you have the right to share. No pirated race streams.</p>
      <h3>Keep the marketplace honest</h3><p>Describe items accurately, declare write-offs and outstanding finance, and never ask for payment before a buyer has seen the item.</p>
      <h3>What happens if rules are broken</h3><p>Our team may remove content, issue warnings, suspend accounts or ban members permanently. Everything can be reported, and you can appeal a decision once.</p>
      <p class="muted small">Members must be 13 or over. Under-18s have private profiles by default.</p>
    </div></div>`;
});

route("/404", async () => {
  app.innerHTML = `<div class="narrow panel"><h2>Page not found</h2><p>That page doesn't exist (yet).</p><a class="btn red" href="/" data-link>Back to the club</a></div>`;
});

// keep the screen in sync if the session changes in another tab or after the sign-in redirect
sb.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN" || event === "SIGNED_OUT") render(); });
render();
