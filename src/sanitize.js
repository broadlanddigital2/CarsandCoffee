// Cleans HTML written in the admin's visual editor before it goes on the website.
import { E } from "./home.js";

// ---------- safe HTML for text written in the admin's visual editor ----------
// Only simple formatting survives; everything else (scripts, styles, event handlers, unknown tags) is removed.
const ALLOWED = { p: [], h2: [], h3: [], h4: [], strong: [], b: [], em: [], i: [], u: [], s: [], ul: [], ol: [], li: [], blockquote: [], br: [], hr: [], a: ["href"], img: ["src", "alt", "width", "height"], figure: [], figcaption: [] };
const VOID = new Set(["br", "hr", "img"]);
const decode = (s) => s.replace(/&#(\d+);?/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);?/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
export const safeUrl = (u, isImg) => {
  const v = decode(u).replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
  if (/^(https?:)?\/\//i.test(v) || /^\/(?!\/)/.test(v)) return v;
  if (!isImg && (/^(mailto|tel):/i.test(v) || v.startsWith("#"))) return v;
  if (isImg && /^[a-z0-9][a-z0-9/_.-]*\.(webp|jpe?g|png|avif|gif|svg)$/i.test(v)) return "/" + v;
  return null;
};
export function sanitize(html) {
  if (!html) return "";
  let s = String(html).replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style|iframe|object|embed|noscript|template|svg|math|form|textarea|select|button)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math|form|textarea|select|button|input|link|meta|base)\b[^>]*>/gi, "");
  const out = []; const open = [];
  let last = 0;
  const re = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g; let m;
  const text = (t) => t.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  while ((m = re.exec(s))) {
    out.push(text(s.slice(last, m.index))); last = re.lastIndex;
    const closing = !!m[1], tag = m[2].toLowerCase();
    if (!(tag in ALLOWED)) continue;
    if (closing) { const i = open.lastIndexOf(tag); if (i === -1) continue; while (open.length > i) out.push(`</${open.pop()}>`); continue; }
    const attrs = []; const are = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g; let a;
    while ((a = are.exec(m[3]))) {
      const name = a[1].toLowerCase(), val = a[3] ?? a[4] ?? a[5] ?? "";
      if (!ALLOWED[tag].includes(name)) continue;
      if (name === "href" || name === "src") { const u = safeUrl(val, name === "src"); if (!u) continue; attrs.push(`${name}="${E(u)}"`); }
      else if (name === "width" || name === "height") { if (/^\d{1,4}$/.test(val)) attrs.push(`${name}="${val}"`); }
      else attrs.push(`${name}="${E(decode(val))}"`);
    }
    if (tag === "a") { if (!attrs.some((x) => x.startsWith("href="))) continue; if (/href="(https?:)?\/\/(?!(?:www\.)?carsandcoffee\.uk|club\.carsandcoffee\.uk)/.test(attrs.join(" "))) attrs.push('rel="noopener"', 'target="_blank"'); }
    if (tag === "img") { if (!attrs.some((x) => x.startsWith("src="))) continue; if (!attrs.some((x) => x.startsWith("alt="))) attrs.push('alt=""'); attrs.push('loading="lazy"'); }
    out.push(`<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`);
    if (!VOID.has(tag)) open.push(tag);
  }
  out.push(text(s.slice(last)));
  while (open.length) out.push(`</${open.pop()}>`);
  return out.join("").replace(/<p>\s*(<br>)?\s*<\/p>/g, "").trim();
}
