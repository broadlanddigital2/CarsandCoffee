// send-campaigns: sends queued email marketing (site.email_sends) through the TrekMail mailbox over SMTP.
// Uses Nodemailer (denomailer crashed the Deno 2 runtime with "Bad resource ID" after sending).
// Called every 5 minutes by the pg_cron job "send-campaigns" (only while something is queued), plus "test" sends from admin.
// Auth: x-outbox-token must match the Vault secret "outbox_cron_token" (checked in the database). Test sends use the admin's own token instead.
// Secrets (Supabase → Edge Functions → Secrets): MARKETING_SMTP_USER (e.g. hello@carsandcoffee.uk), MARKETING_SMTP_PASS (an app password for that mailbox),
// optional MARKETING_SMTP_HOST (default smtp.consensusmedia.co.uk), MARKETING_FOOTER (your business name and postal address for the footer).
import nodemailer from "npm:nodemailer@6.9.16";
import { ImapFlow } from "npm:imapflow@1.0.164";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SITE = "https://carsandcoffee.uk";
const ADMIN = "https://admin.carsandcoffee.uk";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const s = (v: unknown) => String(v ?? "").trim();
type C = { id: string; kind: string; subject: string; preheader?: string; heading?: string; body_html: string; cta_label?: string; cta_url?: string; from_name: string; reply_to?: string };
type L = { name?: string; town?: string; county?: string; services?: string[]; slug?: string; image?: string; logo?: string };
type R = { send_id: number; email: string; name?: string; business?: string; listing_slug?: string; token: string; campaign: C; listing?: L | null };

const OURS = /^https:\/\/(carsandcoffee\.uk|club\.carsandcoffee\.uk|admin\.carsandcoffee\.uk)(\/|$)/;
function track(url: string, token: string) { return OURS.test(url) ? `${SITE}/r/${token}?u=${encodeURIComponent(url)}` : url; }
const img = (p?: string) => !p ? "" : /^https?:\/\//.test(p) ? p : `${SITE}/${p.replace(/^\//, "")}`;

function merge(text: string, r: R, html: boolean) {
  const first = s(r.name).split(/\s+/)[0] || "";
  const listing = r.listing_slug ? `${SITE}/directory/${r.listing_slug}` : `${SITE}/directory`;
  const claim = `${ADMIN}/?email=${encodeURIComponent(r.email)}`;
  const v: Record<string, string> = { name: s(r.name) || "there", first_name: first || "there", business: s(r.business) || "your business", email: r.email, listing_url: listing, claim_url: claim };
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (k in v ? (html ? esc(v[k]) : v[k]) : ""));
}

// colours and fonts (with fallbacks for clients that ignore web fonts or CSS)
const RED = "#c00d0d", ESP = "#1d130f", INK = "#241712", SOFT = "#6b5a50", CREAM = "#faf3ea", LINE = "#eadfd2";
const HEAD = "'Anton','Arial Narrow','Arial Black',Impact,Arial,sans-serif", BODY = "Arial,Helvetica,sans-serif";

// bulletproof button: VML for Outlook on Windows, a padded link everywhere else
function button(href: string, label: string) {
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${esc(href)}" style="height:52px;v-text-anchor:middle;width:300px;" arcsize="12%" stroke="f" fillcolor="${RED}"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">${esc(label)}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${esc(href)}" style="display:inline-block;background:${RED};color:#ffffff;font:bold 17px ${BODY};text-decoration:none;padding:16px 30px;border-radius:6px;mso-hide:all">${esc(label)} &rarr;</a><!--<![endif]-->`;
}

function render(r: R) {
  const c = r.campaign, unsub = `${SITE}/unsubscribe/${r.token}`;
  const footer = s(Deno.env.get("MARKETING_FOOTER")) || "Cars and Coffee UK";
  const outreach = c.kind === "business_outreach";
  let body = merge(c.body_html || "", r, false);
  body = body.replace(/href="([^"]+)"/g, (_, u) => `href="${esc(track(u.replace(/&amp;/g, "&"), r.token))}" style="color:${RED};font-weight:bold"`)
    .replace(/<p>/g, `<p style="margin:0 0 16px;font:16px/1.65 ${BODY};color:${INK}">`).replace(/<h2>/g, `<h2 style="margin:24px 0 10px;font:normal 22px/1.15 ${HEAD};text-transform:uppercase;color:${ESP}">`)
    .replace(/<ul>/g, `<ul style="margin:0 0 16px;padding-left:20px;font:16px/1.65 ${BODY};color:${INK}">`).replace(/<li>/g, `<li style="margin:0 0 6px">`);
  const ctaUrl = c.cta_url ? track(merge(c.cta_url, r, false), r.token) : "";
  const listingUrl = track(r.listing_slug ? `${SITE}/directory/${r.listing_slug}` : `${SITE}/directory`, r.token);
  const L = r.listing || null;
  const reason = c.kind === "newsletter" ? "You're getting this because you signed up for the Cars and Coffee UK newsletter."
    : outreach ? `You're getting this because ${esc(s(r.business) || "your business")} is listed in the Cars and Coffee UK directory. We used the contact address published on your business's website.`
    : `You're getting this because you manage ${esc(s(r.business) || "a business")} on Cars and Coffee UK.`;

  // outreach: a preview of their listing and what claiming gets them
  const card = outreach && L ? `<tr><td style="padding:0 32px 8px" class="px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:10px;background:${CREAM}" bgcolor="${CREAM}">
      <tr>${L.logo ? `<td width="88" valign="top" style="padding:18px 0 18px 20px"><img src="${esc(L.logo)}" width="68" alt="${esc(L.name || "")}" style="display:block;width:68px;max-width:68px;height:auto;border:0;border-radius:6px;background:#ffffff"></td>` : ""}<td style="padding:18px 20px">
        <p style="margin:0 0 4px;font:bold 11px ${BODY};letter-spacing:1.5px;text-transform:uppercase;color:${RED}">Your listing</p>
        <p style="margin:0 0 4px;font:normal 24px/1.15 ${HEAD};text-transform:uppercase;color:${ESP}">${esc(L.name || r.business || "")}</p>
        <p style="margin:0 0 10px;font:14px ${BODY};color:${SOFT}">${esc([L.town, L.county].filter(Boolean).join(", "))}${(L.services || []).length ? ` &middot; ${esc((L.services || []).slice(0, 4).join(", "))}` : ""}</p>
        <p style="margin:0;font:14px ${BODY};color:${SOFT}"><span style="display:inline-block;background:#fff3cd;color:#7a5a00;border-radius:4px;padding:2px 8px;font-weight:bold;font-size:12px">Not yet claimed</span> &nbsp;<a href="${esc(listingUrl)}" style="color:${RED};font-weight:bold">See it on the site &rarr;</a></p>
      </td></tr></table></td></tr>
    <tr><td style="padding:16px 32px 0" class="px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${[["Your own business page", "Photos, services and prices, opening times and a map"], ["Enquiries straight to you", "Customers message you from your page"], ["Reviews you can reply to", "Build trust with local enthusiasts"], ["See your results", "Page views, calls and clicks each month"]].map(([t, d]) => `<tr><td width="34" valign="top" style="padding:0 0 12px"><div style="width:24px;height:24px;border-radius:12px;background:${RED};color:#ffffff;font:bold 14px/24px ${BODY};text-align:center">&#10003;</div></td><td valign="top" style="padding:0 0 12px;font:15px/1.45 ${BODY};color:${INK}"><strong>${t}</strong><br><span style="color:${SOFT}">${d}</span></td></tr>`).join("")}
    </table></td></tr>` : "";

  const html = `<!doctype html><html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${esc(merge(c.subject, r, false))}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>td,a,p,h1{font-family:Arial,sans-serif!important}</style><![endif]-->
<style>@import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');
@media (max-width:620px){.px{padding-left:20px!important;padding-right:20px!important}.h1{font-size:30px!important}}
a{color:${RED}}</style></head>
<body style="margin:0;padding:0;background:#efe6da;-webkit-text-size-adjust:100%" bgcolor="#efe6da">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#efe6da">${esc(merge(c.preheader || "", r, false))}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#efe6da" style="background:#efe6da"><tr><td align="center" style="padding:24px 10px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden" bgcolor="#ffffff">
  <tr><td bgcolor="${ESP}" style="background:${ESP};padding:18px 32px" class="px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><a href="${SITE}"><img src="${SITE}/logo.png" width="58" height="56" alt="CARS AND COFFEE UK" style="display:block;border:0;width:58px;height:56px;color:#ffffff;font:bold 14px ${BODY}"></a></td>
    <td align="right" style="font:bold 12px ${BODY};letter-spacing:1.5px;text-transform:uppercase;color:#f2a93b">${outreach ? "Business directory" : c.kind === "newsletter" ? "The newsletter" : "For businesses"}</td></tr></table></td></tr>
  <tr><td height="5" bgcolor="${RED}" style="background:${RED};font-size:0;line-height:0">&nbsp;</td></tr>
  ${c.heading ? `<tr><td style="padding:32px 32px 6px" class="px"><h1 class="h1" style="margin:0;font:normal 36px/1.05 ${HEAD};text-transform:uppercase;color:${ESP};letter-spacing:.3px">${esc(merge(c.heading, r, false))}</h1></td></tr>` : ""}
  <tr><td style="padding:${c.heading ? "18px" : "32px"} 32px 8px" class="px">${body}</td></tr>
  ${card}
  ${ctaUrl && c.cta_label ? `<tr><td style="padding:18px 32px 8px" class="px">${button(ctaUrl, merge(c.cta_label, r, false))}<p style="margin:12px 0 0;font:13px ${BODY};color:${SOFT}">${outreach ? `Free. Takes about two minutes. Sign in with ${esc(r.email)}.` : ""}</p></td></tr>` : ""}
  <tr><td style="padding:24px 32px 30px" class="px"><p style="margin:0;font:15px/1.6 ${BODY};color:${INK}">Any questions, just reply to this email.</p></td></tr>
  <tr><td bgcolor="${ESP}" style="background:${ESP};padding:24px 32px" class="px">
    <p style="margin:0 0 10px;font:normal 18px ${HEAD};text-transform:uppercase;color:#ffffff;letter-spacing:.5px">Cars and Coffee UK</p>
    <p style="margin:0 0 14px;font:13px/1.6 ${BODY};color:#cbb9a8">Norfolk and Suffolk's car community: meets, a members' club, trusted local businesses and a shop.</p>
    <p style="margin:0 0 14px;font:bold 13px ${BODY}"><a href="${SITE}/events" style="color:#ffffff;text-decoration:none">Events</a> &nbsp;&middot;&nbsp; <a href="${SITE}/directory" style="color:#ffffff;text-decoration:none">Directory</a> &nbsp;&middot;&nbsp; <a href="${SITE}/shop" style="color:#ffffff;text-decoration:none">Shop</a> &nbsp;&middot;&nbsp; <a href="https://club.carsandcoffee.uk" style="color:#ffffff;text-decoration:none">Club</a></p>
    <p style="margin:0 0 6px;font:12px/1.6 ${BODY};color:#a8968a">${reason}</p>
    <p style="margin:0;font:12px/1.6 ${BODY};color:#a8968a"><a href="${unsub}" style="color:#f2a93b">Unsubscribe</a> &middot; ${esc(footer)} &middot; <a href="${SITE}/privacy" style="color:#a8968a">Privacy</a></p>
  </td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table><img src="${SITE}/o/${r.token}.gif" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0"></body></html>`;

  // plain-text version for mail apps that don't show HTML
  const strip = (h: string) => h.replace(/<br\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "• ").replace(/<\/(p|h\d|li|div|ul)>/gi, "\n\n").replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&rarr;/g, "→").replace(/&middot;/g, "·").replace(/\n{3,}/g, "\n\n").trim();
  const text = [c.heading ? merge(c.heading, r, false).toUpperCase() : "", strip(merge(c.body_html || "", r, false)),
    outreach && L ? `YOUR LISTING\n${L.name || r.business}${L.town ? ", " + L.town : ""} (not yet claimed)\n${listingUrl}\n\nClaim it free to get your own business page, enquiries straight to you, reviews you can reply to and monthly results.` : "",
    ctaUrl && c.cta_label ? `${merge(c.cta_label, r, false)}: ${ctaUrl}` : "", "Any questions, just reply to this email.",
    `--\nCars and Coffee UK · ${SITE}\n${reason}\nUnsubscribe: ${unsub}\n${footer}`].filter(Boolean).join("\n\n");
  return { subject: merge(c.subject, r, false), html, text, unsub };
}

Deno.serve(async (req) => {
  try { return await handle(req); } catch (e) {
    return new Response(JSON.stringify({ error: "Sending failed: " + String((e as Error).message ?? e).slice(0, 300) }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ADMIN } });
  }
});

async function handle(req: Request): Promise<Response> {
  const clean = (v: string | undefined) => (v || "").trim().replace(/^["']|["']$/g, "").trim();
  const user = clean(Deno.env.get("MARKETING_SMTP_USER")).toLowerCase(), pass = clean(Deno.env.get("MARKETING_SMTP_PASS"));
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const cors = { "Access-Control-Allow-Origin": ADMIN, "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const reply = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json", ...cors } });
  if (!user || !pass) return reply({ error: "The sending mailbox isn't set up yet. Add MARKETING_SMTP_USER and MARKETING_SMTP_PASS in Supabase → Edge Functions → Secrets." }, 503);

  let rows: R[] = [], token = "", isTest = false;
  const body = await req.json().catch(() => ({}));
  if (body.bounces) {
    token = req.headers.get("x-outbox-token") ?? "";
    return reply(await checkBounces(db, token, user, pass));
  }
  if (body.test || body.preview) {
    // test send from admin: the caller must be on the team
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
    const { data: team } = await asUser.schema("site").rpc("am_i_team");
    const { data: { user: me } } = await asUser.auth.getUser();
    if (team !== true || !me?.email) return reply({ error: "Team only." }, 403);
    // a sequence step can be asked for by number (outreach screen), a saved campaign by id, or an unsaved draft
    const q = db.schema("site").from("email_campaigns").select("*");
    const { data: saved } = body.draft ? { data: null } : body.step ? await q.eq("sequence_step", body.step).maybeSingle() : await q.eq("id", body.campaign).maybeSingle();
    const c = body.draft ? { id: "preview", from_name: "Cars and Coffee UK", ...body.draft } as C : saved;
    if (!c) return reply({ error: "Campaign not found" }, 404);
    let sample: R = { send_id: 0, email: me.email, name: "Sam Smith", business: "Example Motors Ltd", listing_slug: "", token: crypto.randomUUID(), campaign: c,
      listing: c.kind === "business_outreach" ? { name: "Example Motors Ltd", town: "Norwich", county: "Norfolk", services: ["Servicing", "Bodywork"] } : null };
    if (body.listing_id) {
      // the real email for one business: its listing, and the outreach contact (tests go to that address; previews just show it)
      const [{ data: l }, { data: o }] = await Promise.all([db.schema("site").from("directory_listings").select("name,slug,town,county,services,image_path").eq("id", body.listing_id).maybeSingle(),
        db.schema("site").from("outreach").select("contact_email,contact_name,enrichment").eq("listing_id", body.listing_id).maybeSingle()]);
      if (!l) return reply({ error: "Business not found" }, 404);
      sample = { ...sample, email: body.preview ? (o?.contact_email || me.email) : me.email, name: o?.contact_name || "", business: l.name, listing_slug: l.slug,
        listing: { name: l.name, town: l.town, county: l.county, services: l.services, slug: l.slug, image: l.image_path, logo: o?.enrichment?.site?.logo || "" } };
    }
    if (body.preview) { const m = render(sample); return reply({ subject: m.subject, html: m.html, text: m.text }); }
    rows = [sample];
    isTest = true;
  } else {
    token = req.headers.get("x-outbox-token") ?? "";
    const { data, error } = await db.schema("site").rpc("campaign_claim", { p_token: token, p_limit: 25 });
    if (error) return reply({ error: "not allowed" }, 401);
    rows = (data ?? []) as R[];
  }
  if (!rows.length) return reply({ sent: 0 });

  const transport = nodemailer.createTransport({ host: Deno.env.get("MARKETING_SMTP_HOST") || "smtp.consensusmedia.co.uk", port: 465, secure: true, auth: { user, pass }, pool: !isTest, maxConnections: 1, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000 });
  const results: { id: number; ok: boolean; error?: string }[] = [];
  for (const r of rows) {
    let ok = false, err = "", hard = false;
    try {
      const m = render(r);
      await transport.sendMail({
        from: { name: r.campaign.from_name || "Cars and Coffee UK", address: user }, to: r.email, replyTo: r.campaign.reply_to || user,
        subject: (isTest ? "[Test] " : "") + m.subject, text: m.text, html: m.html,
        headers: { "List-Unsubscribe": `<${m.unsub}>, <mailto:${user}?subject=unsubscribe>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click", "X-CAC-Campaign": r.campaign.id },
      });
      ok = true;
    } catch (e) {
      err = String((e as Error).message ?? e).slice(0, 500);
      // a permanent refusal of this recipient (5xx on RCPT, e.g. "user unknown") is a bounce; login or server errors are not
      const code = Number((e as { responseCode?: number }).responseCode || 0), cmd = String((e as { command?: string }).command || "");
      hard = code >= 500 && code < 600 && /RCPT/i.test(cmd);
    }
    if (!isTest) await db.schema("site").rpc("campaign_mark", { p_token: token, p_id: r.send_id, p_ok: ok, p_error: ok ? null : err, p_bounce: hard });
    results.push({ id: r.send_id, ok, ...(ok ? {} : { error: err }) });
    if (!isTest) await new Promise((res) => setTimeout(res, 1500)); // gentle pace: about 40 a minute at most
  }
  try { transport.close(); } catch { /* ignore */ }
  if (isTest && !results[0]?.ok) {
    const host = Deno.env.get("MARKETING_SMTP_HOST") || "smtp.consensusmedia.co.uk";
    const masked = user.replace(/^(.{2}).*(@.*)$/, "$1…$2");
    return reply({ error: `The mailbox refused the test: ${results[0]?.error || "unknown error"}. Logging in to ${host}:465 as "${masked}" with a ${pass.length}-character password${/\s/.test(pass) ? " that contains a space" : ""}.` }, 502);
  }
  return reply({ sent: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).length, results });
}

// Reads bounce reports (delivery status notifications) that land in the sending mailbox and marks those recipients as bounced.
// Hard bounces (5.x.x) are added to the suppression list so they're never emailed again. Processed reports are marked read and tagged.
// deno-lint-ignore no-explicit-any
async function checkBounces(db: any, token: string, user: string, pass: string) {
  const { data: okTok } = await db.schema("site").rpc("email_bounce", { p_token: token, p_email: "nobody@invalid", p_reason: "token check", p_hard: false });
  if (okTok === null) return { error: "not allowed" };
  const client = new ImapFlow({ host: Deno.env.get("MARKETING_IMAP_HOST") || "imap.consensusmedia.co.uk", port: 993, secure: true, auth: { user, pass }, logger: false, socketTimeout: 30000 });
  let found = 0, marked = 0, replies = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 8 * 864e5);
      const uids = (await client.search({ since, unKeyword: "$CACBounce", not: { keyword: "$CACReply" } } as never, { uid: true }).catch(async () => await client.search({ since }, { uid: true }))) || [];
      for (const uid of (uids as number[]).slice(-200)) {
        const msg = await client.fetchOne(String(uid), { source: true, envelope: true, flags: true }, { uid: true });
        if (!msg || msg.flags?.has("$CACBounce") || msg.flags?.has("$CACReply")) continue;
        const src = msg.source?.toString("utf8") || "";
        const from = (msg.envelope?.from?.[0]?.address || "").toLowerCase(), subj = msg.envelope?.subject || "";
        const isDsn = /multipart\/report/i.test(src) && /report-type=["']?delivery-status/i.test(src) || /^(mailer-daemon|postmaster)@/.test(from) || /undeliver|delivery (status|failure|has failed)|returned mail|failure notice/i.test(subj);
        if (!isDsn) {
          // a normal email from someone we've contacted counts as a reply: it stops their follow-ups (left unread for you to answer)
          if (from && from !== user) {
            const { data: n } = await db.schema("site").rpc("outreach_reply", { p_token: token, p_email: from, p_subject: subj });
            if (Number(n || 0) > 0) { replies += Number(n); await client.messageFlagsAdd(String(uid), ["$CACReply"], { uid: true }).catch(() => {}); }
          }
          continue;
        }
        found++;
        const rcpts = new Set<string>();
        for (const m of src.matchAll(/^(?:Final-Recipient|Original-Recipient):\s*rfc822;\s*<?([^\s>]+@[^\s>]+)>?/gim)) rcpts.add(m[1].toLowerCase());
        for (const m of src.matchAll(/^X-Failed-Recipients:\s*(.+)$/gim)) m[1].split(",").forEach((x) => x.trim() && rcpts.add(x.trim().toLowerCase()));
        const status = (src.match(/^Status:\s*([245]\.\d{1,3}\.\d{1,3})/im) || [])[1] || "";
        const diag = ((src.match(/^Diagnostic-Code:\s*(?:smtp;)?\s*(.+(?:\r?\n[ \t].+)*)/im) || [])[1] || subj).replace(/\s+/g, " ").trim();
        const hard = !status.startsWith("4");
        for (const em of rcpts) {
          if (em === user) continue;
          const { data: n } = await db.schema("site").rpc("email_bounce", { p_token: token, p_email: em, p_reason: (status ? status + " " : "") + diag, p_hard: hard });
          marked += Number(n || 0);
        }
        await client.messageFlagsAdd(String(uid), ["\\Seen", "$CACBounce"], { uid: true }).catch(() => {});
      }
    } finally { lock.release(); }
  } catch (e) {
    return { error: "Couldn't check the mailbox for bounces: " + String((e as Error).message ?? e).slice(0, 200), found, marked, replies };
  } finally { try { await client.logout(); } catch { /* ignore */ } }
  return { found, marked, replies };
}
