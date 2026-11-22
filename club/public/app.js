// Cars and Coffee Club – Phase 1a: sign in, apply, status, welcome, recommend a mate, admin queue.
// Plain ES modules, no build step. Data lives in the "Cars and Coffee Community" Supabase project.

const SUPABASE_URL = "https://mslidnchoopgsnbraaxe.supabase.co";
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
    sb.from("profiles").select("id,handle,display_name,location,bio,status,role,is_private,approved_at").eq("id", uid).maybeSingle(),
    sb.from("applications").select("*").eq("user_id", uid).maybeSingle(),
    sb.rpc("get_my_membership"),
  ]);
  state.profile = p.data; state.application = a.data; state.membership = (m.data && m.data[0]) || null;
}
const isTeam = () => state.profile && state.profile.status === "approved" && ["admin", "moderator"].includes(state.profile.role);

// ---------- routing ----------
const routes = {};
const route = (path, fn) => (routes[path] = fn);
const withMock = (p) => (MOCK ? p + (p.includes("?") ? "&" : "?") + "mock=" + MOCK : p);
function go(path, replace = false) { path = withMock(path); replace ? history.replaceState(null, "", path) : history.pushState(null, "", path); render(); }
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
  n.innerHTML = (state.profile?.status === "approved" ? link("/home", "Home") + link("/recommend", "Invite a mate") : "")
    + (isTeam() ? link("/admin", "Team") : "")
    + `<button type="button" id="signout">Sign out</button>`;
  $("#signout").onclick = async () => { await sb.auth.signOut(); toast("Signed out"); go("/", true); };
}

// Where a signed-in person belongs, based on their status.
function homeFor() {
  const p = state.profile;
  if (!p) return "/apply";
  if (p.status === "approved") return "/home";
  if (!state.application) return p.status === "banned" ? "/status" : "/apply";
  return "/status";
}

async function render() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/join/")) { store("cac_invite", decodeURIComponent(path.slice(6)).toLowerCase()); history.replaceState(null, "", withMock("/")); }
  await loadMember();
  nav();
  const clean = location.pathname.replace(/\/+$/, "") || "/";
  const fn = routes[clean] || routes["/404"];
  app.innerHTML = "";
  await fn();
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
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
    <label class="f">How did you hear about us? <small>(optional)</small><select id="heard"><option value="">Choose one</option>${HEARD.map((h) => `<option ${a?.heard_about === h ? "selected" : ""}>${h}</option>`).join("")}</select></label>
    ${mode === "new" ? `<label class="f">Invite code <small>(optional) from a member's link</small><input type="text" id="invite" maxlength="12" value="${esc(invite)}" autocapitalize="none"></label>` : ""}
    <label class="check"><input type="checkbox" id="guidelines" ${a?.guidelines_accepted ? "checked" : ""}> <span>I agree to the <a href="/guidelines" data-link target="_blank">community guidelines</a>.</span></label>
    <label class="check"><input type="checkbox" id="newsletter" ${a?.newsletter_opt_in ? "checked" : ""}> <span>Send me the Cars and Coffee digest, club updates and events emails. I can unsubscribe at any time.</span></label>
    <p class="err" id="formerr" role="alert"></p>
    <button class="btn red wide" type="submit">${label}</button>
  </form>`;
}
function wireApplicationForm(mode) {
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
      <div class="btns"><button class="btn ghost" id="edit" type="button">Edit my application</button><a class="btn ghost" href="https://www.carsandcoffee.uk/#events">See upcoming meets</a></div></div>
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
        <form id="profform" novalidate>
          <label class="f">Display name<input type="text" id="display_name" maxlength="60" value="${esc(p.display_name || "")}"></label>
          <label class="f">Username <small>3–24 lowercase letters, numbers or underscores</small><input type="text" id="handle" maxlength="24" value="${esc(p.handle || "")}" autocapitalize="none" placeholder="e.g. norfolk_gti"></label>
          <label class="f">Town<select id="ptown">${townOptions(p.location || "")}</select></label>
          <label class="f">Bio <small>(up to 500 characters)</small><textarea id="bio" maxlength="500">${esc(p.bio || "")}</textarea></label>
          <label class="check"><input type="checkbox" id="private" ${p.is_private ? "checked" : ""}> <span><strong>Private profile</strong><br><span class="muted small">Only your friends and the team can see your full profile and garage.</span></span></label>
          <p class="err" id="proferr" role="alert"></p>
          <button class="btn red" type="submit">Save profile</button>
        </form></div>
      <div style="display:grid;gap:18px;align-content:start">
        <div class="panel"><h3>Recommend a mate</h3><p class="muted">Know someone who'd love the club? People you recommend are fast-tracked, and you'll be connected as friends when they're approved.</p>
          <a class="btn red" href="/recommend" data-link>Get your invite link</a>
          ${m.invite_code ? `<p class="muted small" style="margin-top:12px">Your code: <strong>${esc(m.invite_code)}</strong></p>` : ""}</div>
        <div class="panel"><h3>Coming to the club</h3><ul class="soon">
          <li><span>Your garage</span><span class="badge">Next</span></li>
          <li><span>Members' feed and posts</span><span class="badge">Soon</span></li>
          <li><span>Motorsport, car and local hubs</span><span class="badge">Soon</span></li>
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
      bio: $("#bio").value.trim() || null, is_private: $("#private").checked,
    }).eq("id", p.id);
    if (error) return ($("#proferr").textContent = /duplicate|unique/i.test(error.message) ? "That username is taken. Try another." : "We couldn't save your profile. Please try again.");
    $("#proferr").textContent = ""; toast("Profile saved");
  };
});

route("/recommend", async () => {
  if (!state.session) return go("/sign-in", true);
  if (state.profile?.status !== "approved") return go(homeFor(), true);
  const m = state.membership || {};
  const link = `${location.origin}/join/${m.invite_code || ""}`;
  const used = Number(m.recommendations_last_30_days || 0), limit = Number(m.recommendation_limit || 10);
  const { data: recs } = await sb.rpc("get_my_recommendations");
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
          <a class="btn ghost small" href="mailto:?subject=${encodeURIComponent("Join me in the Cars and Coffee Club")}&body=${msg}">Email</a>
          <a class="btn ghost small" href="sms:?&body=${msg}">Text</a>
        </div>
        <p class="small muted" style="margin-top:14px">Fast-track places used this month: <strong>${Math.min(used, limit)} of ${limit}</strong></p>
        <div class="meter" aria-hidden="true"><i style="width:${Math.min(100, (used / limit) * 100)}%"></i></div>
      </div>
    </div>
    <h2 style="margin-top:32px">People you've recommended</h2>
    ${recs && recs.length ? `<table><thead><tr><th>Name</th><th>Applied</th><th>Status</th></tr></thead><tbody>
      ${recs.map((r) => `<tr><td>${esc(r.first_name)}</td><td>${fmtDate(r.applied_at)}</td><td>${statusBadge[r.status] || esc(r.status)}</td></tr>`).join("")}</tbody></table>`
      : `<p class="muted">Nobody yet. Share your link to get started.</p>`}`;
  $("#copy").onclick = async () => { try { await navigator.clipboard.writeText(link); toast("Link copied"); } catch { $("#link").select(); toast("Press Ctrl+C / Cmd+C to copy"); } };
  try {
    let mod; for (const src of ["https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/+esm", "https://esm.sh/qrcode-generator@1.4.4"]) { try { mod = await import(src); break; } catch {} }
    const qrcode = mod.default;
    const qr = qrcode(0, "M"); qr.addData(link); qr.make();
    $("#qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  } catch { $("#qr").innerHTML = `<p style="color:#241712;font-size:13px;padding:8px">QR code unavailable. Share the link instead.</p>`; }
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
    <form id="addform" class="row" novalidate><input type="email" id="newemail" placeholder="name@example.com" required aria-label="Email address">
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
