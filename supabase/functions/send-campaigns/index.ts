// send-campaigns: sends queued email marketing (site.email_sends) through the TrekMail mailbox over SMTP.
// Called every 5 minutes by the pg_cron job "send-campaigns" (only while something is queued), plus "test" sends from admin.
// Auth: x-outbox-token must match the Vault secret "outbox_cron_token" (checked in the database). Test sends use the admin's own token instead.
// Secrets (Supabase → Edge Functions → Secrets): MARKETING_SMTP_USER (e.g. hello@carsandcoffee.uk), MARKETING_SMTP_PASS (an app password for that mailbox),
// optional MARKETING_SMTP_HOST (default smtp.consensusmedia.co.uk), MARKETING_FOOTER (your business name and postal address for the footer).
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SITE = "https://carsandcoffee.uk";
const ADMIN = "https://admin.carsandcoffee.uk";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const s = (v: unknown) => String(v ?? "").trim();
type C = { id: string; kind: string; subject: string; preheader?: string; heading?: string; body_html: string; cta_label?: string; cta_url?: string; from_name: string; reply_to?: string };
type R = { send_id: number; email: string; name?: string; business?: string; listing_slug?: string; token: string; campaign: C };

const OURS = /^https:\/\/(carsandcoffee\.uk|club\.carsandcoffee\.uk|admin\.carsandcoffee\.uk)(\/|$)/;
function track(url: string, token: string) { return OURS.test(url) ? `${SITE}/r/${token}?u=${encodeURIComponent(url)}` : url; }

function merge(text: string, r: R, html: boolean) {
  const first = s(r.name).split(/\s+/)[0] || "";
  const listing = r.listing_slug ? `${SITE}/directory/${r.listing_slug}` : `${SITE}/directory`;
  const claim = `${ADMIN}/?email=${encodeURIComponent(r.email)}`;
  const v: Record<string, string> = { name: s(r.name) || "there", first_name: first || "there", business: s(r.business) || "your business", email: r.email, listing_url: listing, claim_url: claim };
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (k in v ? (html ? esc(v[k]) : v[k]) : ""));
}

function render(r: R) {
  const c = r.campaign, unsub = `${SITE}/unsubscribe/${r.token}`;
  const footer = s(Deno.env.get("MARKETING_FOOTER")) || "Cars and Coffee UK";
  let body = merge(c.body_html || "", r, false);
  body = body.replace(/href="([^"]+)"/g, (_, u) => `href="${esc(track(u.replace(/&amp;/g, "&"), r.token))}"`);
  const ctaUrl = c.cta_url ? track(merge(c.cta_url, r, false), r.token) : "";
  const reason = c.kind === "newsletter" ? "You're getting this because you signed up for the Cars and Coffee UK newsletter."
    : c.kind === "business_outreach" ? `You're getting this because ${esc(s(r.business) || "your business")} is listed in the Cars and Coffee UK directory, using the contact address on your business's website.`
    : `You're getting this because you manage ${esc(s(r.business) || "a business")} on Cars and Coffee UK.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(merge(c.subject, r, false))}</title></head>
<body style="margin:0;padding:0;background:#efe6da"><span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(merge(c.preheader || "", r, false))}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe6da"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:#1d130f;padding:20px 28px"><a href="${SITE}"><img src="${SITE}/logo.png" width="64" height="62" alt="Cars and Coffee UK" style="display:block;border:0;width:64px;height:62px"></a></td></tr>
<tr><td style="padding:30px 28px 10px;font:16px/1.6 Arial,sans-serif;color:#241712">
${c.heading ? `<h1 style="font:900 26px/1.15 Arial Black,Arial,sans-serif;margin:0 0 16px;text-transform:uppercase;color:#1d130f">${esc(merge(c.heading, r, false))}</h1>` : ""}
<div style="font:16px/1.6 Arial,sans-serif;color:#241712">${body}</div>
${ctaUrl && c.cta_label ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0"><tr><td style="background:#c00d0d;border-radius:6px"><a href="${esc(ctaUrl)}" style="display:inline-block;padding:14px 26px;font:700 16px Arial,sans-serif;color:#ffffff;text-decoration:none">${esc(merge(c.cta_label, r, false))}</a></td></tr></table>` : ""}
</td></tr>
<tr><td style="padding:10px 28px 28px;font:13px/1.5 Arial,sans-serif;color:#7a6a60;border-top:1px solid #eadfd2">
<p style="margin:14px 0 6px">${reason}</p>
<p style="margin:0 0 6px"><a href="${unsub}" style="color:#7a6a60">Unsubscribe</a> · or just reply to this email and we'll take you off our list.</p>
<p style="margin:0">${esc(footer)} · <a href="${SITE}" style="color:#7a6a60">carsandcoffee.uk</a> · <a href="${SITE}/privacy" style="color:#7a6a60">Privacy</a></p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${c.heading ? merge(c.heading, r, false) + "\n\n" : ""}${merge(c.body_html || "", r, false).replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|h\d|li|div)>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim()}${ctaUrl && c.cta_label ? `\n\n${merge(c.cta_label, r, false)}: ${ctaUrl}` : ""}\n\n--\n${reason.replace(/<[^>]+>/g, "")}\nUnsubscribe: ${unsub}\n${footer} · ${SITE}`;
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
  if (body.test) {
    // test send from admin: the caller must be on the team
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
    const { data: team } = await asUser.schema("site").rpc("am_i_team");
    const { data: { user: me } } = await asUser.auth.getUser();
    if (team !== true || !me?.email) return reply({ error: "Team only." }, 403);
    const { data: c } = await db.schema("site").from("email_campaigns").select("*").eq("id", body.campaign).maybeSingle();
    if (!c) return reply({ error: "Campaign not found" }, 404);
    rows = [{ send_id: 0, email: me.email, name: "Test Recipient", business: "Example Motors Ltd", listing_slug: "", token: crypto.randomUUID(), campaign: c }];
    isTest = true;
  } else {
    token = req.headers.get("x-outbox-token") ?? "";
    const { data, error } = await db.schema("site").rpc("campaign_claim", { p_token: token, p_limit: 25 });
    if (error) return reply({ error: "not allowed" }, 401);
    rows = (data ?? []) as R[];
  }
  if (!rows.length) return reply({ sent: 0 });

  const client = new SMTPClient({ connection: { hostname: Deno.env.get("MARKETING_SMTP_HOST") || "smtp.consensusmedia.co.uk", port: 465, tls: true, auth: { username: user, password: pass } } });
  const results: { id: number; ok: boolean; error?: string }[] = [];
  for (const r of rows) {
    let ok = false, err = "";
    try {
      const m = render(r);
      await client.send({
        from: `${r.campaign.from_name || "Cars and Coffee UK"} <${user}>`, to: r.email, replyTo: r.campaign.reply_to || user,
        subject: (isTest ? "[Test] " : "") + m.subject, content: m.text, html: m.html,
        headers: { "List-Unsubscribe": `<${m.unsub}>, <mailto:${user}?subject=unsubscribe>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click", "X-CAC-Campaign": r.campaign.id },
      });
      ok = true;
    } catch (e) { err = String((e as Error).message ?? e).slice(0, 500); }
    if (!isTest) await db.schema("site").rpc("campaign_mark", { p_token: token, p_id: r.send_id, p_ok: ok, p_error: ok ? null : err });
    results.push({ id: r.send_id, ok, ...(ok ? {} : { error: err }) });
    await new Promise((res) => setTimeout(res, 1500)); // gentle pace: about 40 a minute at most
  }
  try { await client.close(); } catch { /* already closed */ }
  if (isTest && !results[0]?.ok) {
    const host = Deno.env.get("MARKETING_SMTP_HOST") || "smtp.consensusmedia.co.uk";
    const masked = user.replace(/^(.{2}).*(@.*)$/, "$1…$2");
    return reply({ error: `The mailbox refused the test: ${results[0]?.error || "unknown error"}. Logging in to ${host}:465 as "${masked}" with a ${pass.length}-character password${/\s/.test(pass) ? " that contains a space" : ""}.` }, 502);
  }
  return reply({ sent: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).length, results });
}
