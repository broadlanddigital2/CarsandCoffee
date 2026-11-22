// send-emails: sends queued rows from public.email_outbox through SendGrid.
// Called every minute by the pg_cron job "send-queued-emails" (only when something is queued).
// Auth: the x-outbox-token header must match the Vault secret "outbox_cron_token" (checked in the database).
// Secrets: SENDGRID_API_KEY (Edge Function secret). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const FROM = { email: "club@carsandcoffee.uk", name: "Cars and Coffee Club" };
const CLUB = "https://club.carsandcoffee.uk";
const SITE = "https://carsandcoffee.uk";

type Row = { id: number; to_email: string; template: string; data: Record<string, unknown> };

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const s = (v: unknown) => String(v ?? "").trim();
const hi = (name: unknown) => (s(name) ? `Hi ${esc(s(name))},` : "Hi there,");

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background:#c00d0d;border-radius:6px">
  <a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font:700 16px Arial,sans-serif;color:#ffffff;text-decoration:none">${esc(label)}</a></td></tr></table>`;
}
function quote(text: unknown) {
  return s(text)
    ? `<div style="margin:18px 0;padding:14px 18px;background:#f6efe6;border-left:4px solid #f2a93b;border-radius:4px;font:16px/1.5 Arial,sans-serif;color:#241712;white-space:pre-line">${esc(s(text))}</div>`
    : "";
}
function layout(preheader: string, body: string, footerNote = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cars and Coffee Club</title></head>
<body style="margin:0;padding:0;background:#efe6da">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe6da"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:#1d130f;padding:20px 28px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
  <td style="vertical-align:middle"><a href="${CLUB}"><img src="${CLUB}/email/logo.png" width="64" height="62" alt="Cars and Coffee UK" style="display:block;border:0;width:64px;height:62px"></a></td>
  <td style="vertical-align:middle;padding-left:14px;font:900 22px Arial Black,Arial,sans-serif;color:#f6ece0;letter-spacing:1px">CLUB</td>
  </tr></table>
</td></tr>
<tr><td style="padding:28px 28px 8px;font:16px/1.6 Arial,sans-serif;color:#241712">${body}</td></tr>
<tr><td style="padding:8px 28px 28px;font:13px/1.5 Arial,sans-serif;color:#7a6a60">${footerNote}
  <p style="margin:16px 0 0">Cars and Coffee UK · Norfolk and Suffolk's car community<br><a href="${SITE}" style="color:#7a6a60">carsandcoffee.uk</a> · <a href="${CLUB}/guidelines" style="color:#7a6a60">Community guidelines</a> · <a href="${SITE}/privacy" style="color:#7a6a60">Privacy</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

function gbp(p: unknown) { const n = Number(p) || 0; return "£" + (n / 100).toFixed(2); }
function itemsTable(items: unknown, showSeller = true) {
  const list = Array.isArray(items) ? items as Record<string, unknown>[] : [];
  const opt = (o: unknown) => { const e = Object.entries((o && typeof o === "object") ? o as Record<string, unknown> : {}); return e.length ? `<br><span style="color:#7a6a60;font-size:13px">${e.map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(" · ")}</span>` : ""; };
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;font:15px/1.4 Arial,sans-serif">${list.map((i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eadfd2">${esc(i.qty)} × <strong>${esc(i.name)}</strong>${opt(i.options)}${showSeller ? `<br><span style="color:#7a6a60;font-size:13px">Sold by ${esc(i.seller)}</span>` : ""}</td><td style="padding:10px 0;border-bottom:1px solid #eadfd2;text-align:right;white-space:nowrap">${gbp(i.line)}</td></tr>`).join("")}</table>`;
}
const itemsText = (items: unknown) => (Array.isArray(items) ? items as Record<string, unknown>[] : []).map((i) => `${i.qty} x ${i.name}${Object.keys((i.options as object) || {}).length ? ` (${Object.entries(i.options as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(", ")})` : ""} - ${gbp(i.line)} - ${i.seller}`).join("\n");

function render(t: string, d: Record<string, unknown>): { subject: string; html: string; text: string; replyTo?: string } | null {
  switch (t) {
    case "member_invite": {
      const who = s(d.inviter_name) || "A member";
      const url = s(d.invite_url) || `${CLUB}/apply`;
      return {
        subject: `${who} has invited you to the Cars and Coffee Club`,
        html: layout(`${who} thinks you'd love the club.`,
          `<h1 style="font:900 26px/1.15 Arial Black,Arial,sans-serif;margin:0 0 16px;text-transform:uppercase">You're invited</h1>
          <p>${hi(d.friend_name)}</p>
          <p><strong>${esc(who)}</strong> has invited you to join the Cars and Coffee Club, the members' club for car enthusiasts across Norfolk and Suffolk.</p>
          ${quote(d.note) ? `<p style="margin-bottom:0">${esc(who)} says:</p>${quote(d.note)}` : ""}
          <p>Share your builds, find your next meet and connect with people who love cars as much as you do. Because you've been recommended by a member, your application is fast-tracked.</p>
          ${button(url, "Accept your invite")}
          <p style="font-size:14px;color:#7a6a60">Or copy this link: <a href="${esc(url)}" style="color:#c00d0d">${esc(url)}</a></p>`,
          `You're getting this because ${esc(who)} entered your email address to invite you. We won't email you again unless you join.`),
        text: `${s(d.friend_name) ? `Hi ${s(d.friend_name)},` : "Hi there,"}\n\n${who} has invited you to join the Cars and Coffee Club, the members' club for car enthusiasts across Norfolk and Suffolk.\n${s(d.note) ? `\n${who} says: "${s(d.note)}"\n` : ""}\nYour application is fast-tracked. Accept your invite: ${url}\n\nYou're getting this because ${who} invited you. We won't email you again unless you join.`,
      };
    }
    case "application_received":
      return {
        subject: "We've got your application",
        html: layout("Thanks for applying to the Cars and Coffee Club.",
          `<p>${hi(d.first_name)}</p><p>Thanks for applying to the Cars and Coffee Club. ${d.fast_track ? "You were recommended by a member, so you're <strong>fast-tracked</strong>: we'll look at your application first." : "Our team checks every application, usually within 24 hours."}</p>
          <p>We'll email you as soon as we've made a decision.</p>${button(`${CLUB}/status`, "Check your status")}`),
        text: `Thanks for applying to the Cars and Coffee Club. We'll email you when we've made a decision. Check your status: ${CLUB}/status`,
      };
    case "application_approved":
      return {
        subject: "Welcome to the Cars and Coffee Club",
        html: layout("You're in. Welcome to the club.",
          `<h1 style="font:900 26px/1.15 Arial Black,Arial,sans-serif;margin:0 0 16px;text-transform:uppercase">You're in</h1><p>${hi(d.first_name)}</p>
          <p>Your application has been approved. Welcome to the Cars and Coffee Club!</p>${quote(d.message)}
          <p>Set up your profile, add your car to your garage and invite your mates.</p>${button(`${CLUB}/home`, "Go to the club")}`),
        text: `Your application has been approved. Welcome to the Cars and Coffee Club! ${s(d.message)}\n\nGo to the club: ${CLUB}/home`,
      };
    case "application_more_info":
      return {
        subject: "We need a bit more information",
        html: layout("A quick question about your application.",
          `<p>${hi(d.first_name)}</p><p>Thanks for applying. Before we can approve you, our team has a quick question:</p>${quote(d.message)}${button(`${CLUB}/status`, "Update your application")}`),
        text: `Before we can approve your application, our team has a question: ${s(d.message)}\n\nUpdate your application: ${CLUB}/status`,
      };
    case "application_rejected":
      return {
        subject: "About your Cars and Coffee Club application",
        html: layout("An update on your application.",
          `<p>${hi(d.first_name)}</p><p>Thanks for your interest in the Cars and Coffee Club. We're not able to approve your application this time.</p>${quote(d.message)}
          <p>You're welcome to apply again after 90 days. In the meantime you can still come along to our public meets: see what's on at <a href="${SITE}/events" style="color:#c00d0d">carsandcoffee.uk</a>.</p>`),
        text: `We're not able to approve your application this time. ${s(d.message)}\n\nYou can apply again after 90 days. Public meets: ${SITE}/events`,
      };
    case "recommendation_approved":
      return {
        subject: `${s(d.friend_first_name) || "Your mate"} has joined the club`,
        html: layout("Someone you recommended has been approved.",
          `<p>Good news: <strong>${esc(s(d.friend_first_name) || "your mate")}</strong>, who you recommended, has been approved and is now a member. You're connected as friends.</p>${button(`${CLUB}/home`, "Say hello")}`),
        text: `${s(d.friend_first_name) || "Your mate"}, who you recommended, is now a member. ${CLUB}/home`,
      };
    case "team_new_enquiry": {
      const topic = s(d.topic) || "general";
      return {
        subject: `Website enquiry (${topic}): ${s(d.name)}`,
        html: layout(`New enquiry from ${s(d.name)}.`,
          `<p><strong>${esc(d.name)}</strong> (<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>) sent an enquiry about <strong>${esc(topic)}</strong>${s(d.page) ? ` from ${esc(d.page)}` : ""}:</p>
          <blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #c00d0d;background:#faf3ea;white-space:pre-wrap">${esc(d.message)}</blockquote>
          <p>Reply to them directly at <a href="mailto:${esc(d.email)}">${esc(d.email)}</a>.</p>${button("https://admin.carsandcoffee.uk/content/enquiries", "Open enquiries in admin")}`,
          "You're getting this because you're an admin of Cars and Coffee UK."),
        text: `New enquiry from ${s(d.name)} <${s(d.email)}> about ${topic}:\n\n${s(d.message)}\n\nhttps://admin.carsandcoffee.uk/content/enquiries`,
        replyTo: s(d.email),
      };
    }
    case "order_received":
      return {
        subject: `Order ${s(d.ref)} received – Cars and Coffee UK`,
        html: layout(`Thanks for your order ${s(d.ref)}.`,
          `<p>${hi(d.name)}</p><p>Thanks for your order <strong>${esc(d.ref)}</strong>. Here's what you ordered:</p>${itemsTable(d.items)}
          <p style="font-size:18px"><strong>Total: ${gbp(d.total)}</strong> <span style="color:#7a6a60;font-size:14px">(delivery confirmed by the seller)</span></p>
          <p><strong>What happens next:</strong> the seller checks stock and delivery, then we email you a secure link to pay. Nothing is charged until then.</p>
          <p>Questions? Just reply to this email and quote <strong>${esc(d.ref)}</strong>.</p>`,
          `You're getting this because you placed an order on <a href="${SITE}/shop" style="color:#7a6a60">carsandcoffee.uk</a>.`),
        text: `Thanks for your order ${s(d.ref)}.\n\n${itemsText(d.items)}\n\nTotal: ${gbp(d.total)} (delivery confirmed by the seller)\n\nThe seller checks stock and delivery, then we email you a secure link to pay. Nothing is charged until then.`,
      };
    case "team_new_order":
      return {
        subject: `New shop order ${s(d.ref)}: ${gbp(d.total)} from ${s(d.name)}`,
        html: layout(`New order ${s(d.ref)}.`,
          `<p><strong>${esc(d.name)}</strong> (<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>) placed order <strong>${esc(d.ref)}</strong>:</p>${itemsTable(d.items)}
          <p><strong>Total: ${gbp(d.total)}</strong>${Number(d.commission) ? ` · Commission: ${gbp(d.commission)}` : ""}</p>${button(`https://admin.carsandcoffee.uk/content/orders/${s(d.id)}`, "Open the order in admin")}`,
          "You're getting this because you're an admin of Cars and Coffee UK."),
        text: `New order ${s(d.ref)} from ${s(d.name)} <${s(d.email)}>\n\n${itemsText(d.items)}\n\nTotal: ${gbp(d.total)}\nhttps://admin.carsandcoffee.uk/content/orders/${s(d.id)}`,
        replyTo: s(d.email),
      };
    case "shop_new_order":
      return {
        subject: `New order ${s(d.ref)} for ${s(d.shop)}`,
        html: layout(`You have a new order through Cars and Coffee UK.`,
          `<p>Good news: <strong>${esc(d.customer)}</strong> ordered from <strong>${esc(d.shop)}</strong> (order <strong>${esc(d.ref)}</strong>):</p>${itemsTable(d.items, false)}
          <p>Please confirm stock and delivery in your shop admin. We'll take payment from the customer and let you know when to send.</p>${button("https://admin.carsandcoffee.uk/content/my_orders", "See your orders")}`,
          `You're getting this because you manage ${esc(s(d.shop))} on Cars and Coffee UK.`),
        text: `New order ${s(d.ref)} for ${s(d.shop)} from ${s(d.customer)}:\n\n${itemsText(d.items)}\n\nhttps://admin.carsandcoffee.uk/content/my_orders`,
      };
    case "business_lead": {
      const url = `${SITE}/directory/${s(d.slug)}`;
      return {
        subject: `${d.team_copy ? "[Copy] " : ""}New enquiry for ${s(d.business)} from ${s(d.name)}`,
        html: layout(`${s(d.name)} sent ${s(d.business)} an enquiry through Cars and Coffee UK.`,
          `${d.no_business_email ? `<p style="background:#fff4e5;padding:10px 14px;border-radius:6px"><strong>Team note:</strong> this business has no enquiry email set, so this came to you. Forward it to them, and add their email in Admin → Directory.</p>` : ""}
          <p><strong>${esc(d.name)}</strong> sent <strong>${esc(d.business)}</strong> an enquiry from its page on <a href="${esc(url)}">Cars and Coffee UK</a>:</p>
          ${quote(d.message)}
          <p><strong>Email:</strong> <a href="mailto:${esc(d.email)}">${esc(d.email)}</a>${s(d.phone) ? `<br><strong>Phone:</strong> ${esc(d.phone)}` : ""}</p>
          <p>Just press reply to answer them.</p>`,
          `You're getting this because ${esc(s(d.business))} is listed in the Cars and Coffee UK directory. To change where enquiries go, contact us at ${SITE}/contact.`),
        text: `New enquiry for ${s(d.business)} from ${s(d.name)} <${s(d.email)}>${s(d.phone) ? `, ${s(d.phone)}` : ""}:\n\n${s(d.message)}\n\nJust reply to answer them. Listing: ${url}`,
        replyTo: s(d.email),
      };
    }
    case "team_new_application":
      return {
        subject: `${d.fast_track ? "[Fast-track] " : ""}New application: ${s(d.applicant)}`,
        html: layout("A new application is waiting.",
          `<p><strong>${esc(d.applicant)}</strong>${s(d.location) ? ` from ${esc(d.location)}` : ""} has applied to join.${d.fast_track ? " They were recommended by a member (fast-track)." : ""}</p>${button(`${CLUB}/admin`, "Open the approval queue")}`,
          "You're getting this because you're on the club team."),
        text: `New application from ${s(d.applicant)}${s(d.location) ? ` (${s(d.location)})` : ""}. ${CLUB}/admin`,
      };
  }
  return null;
}

Deno.serve(async (req) => {
  const token = req.headers.get("x-outbox-token") ?? "";
  const key = Deno.env.get("SENDGRID_API_KEY");
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: rows, error } = await db.rpc("outbox_claim", { p_token: token, p_limit: 20 });
  if (error) return new Response(JSON.stringify({ error: "not allowed" }), { status: 401 });
  const results: { id: number; ok: boolean; error?: string }[] = [];
  for (const r of (rows ?? []) as Row[]) {
    let ok = false, err = "";
    try {
      if (!key) throw new Error("SENDGRID_API_KEY is not set");
      const msg = render(r.template, r.data ?? {});
      if (!msg) throw new Error(`Unknown template ${r.template}`);
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: r.to_email }] }],
          from: FROM,
          ...(msg.replyTo && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(msg.replyTo) ? { reply_to: { email: msg.replyTo } } : {}),
          subject: msg.subject,
          content: [{ type: "text/plain", value: msg.text }, { type: "text/html", value: msg.html }],
          categories: ["club", r.template],
          tracking_settings: { click_tracking: { enable: false } },
        }),
      });
      ok = res.status === 202;
      if (!ok) err = `SendGrid ${res.status}: ${(await res.text()).slice(0, 500)}`;
    } catch (e) { err = String((e as Error).message ?? e); }
    await db.rpc("outbox_mark", { p_token: token, p_id: r.id, p_ok: ok, p_error: ok ? null : err });
    results.push({ id: r.id, ok, ...(ok ? {} : { error: err }) });
  }
  return new Response(JSON.stringify({ sent: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
