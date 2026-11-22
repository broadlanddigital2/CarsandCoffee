// Shared page widgets: share bar and photo gallery with a full-screen viewer.
import { E } from "./home.js";
import { safeUrl } from "./sanitize.js";
const enc = encodeURIComponent;

const SI = {
  fb: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v6h4v-6h3l1-4h-4V8z" fill="currentColor" stroke="none"/>',
  x: '<path d="M4 4l16 16M20 4L4 20" />',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.3 2.2 2.3 4.2 4.5 4.5l1.2-1.2 1.8.8v1.4c-3.8.3-8-3.9-7.7-7.7h1.4l.8 1.8z" fill="currentColor" stroke="none"/>',
  li: '<rect x="4" y="9" width="3.5" height="11" fill="currentColor" stroke="none"/><circle cx="5.75" cy="5.5" r="2" fill="currentColor" stroke="none"/><path d="M11 20v-11h3.3v1.6c.7-1.2 2-1.9 3.4-1.9 2.6 0 3.3 1.7 3.3 4.3v7h-3.5v-6.2c0-1.3-.3-2.3-1.6-2.3-1.4 0-1.9 1-1.9 2.4V20z" fill="currentColor" stroke="none"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
};
const si = (k) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SI[k]}</svg>`;
let shareN = 0;
export function shareBar(url, title, opts = {}) {
  const u = enc(url), t = enc(title), id = "sh" + ++shareN;
  const a = (href, k, label) => `<a class="sh-b sh-${k}" href="${E(href)}" target="_blank" rel="noopener" aria-label="Share on ${label}" title="${label}">${si(k)}</a>`;
  return `<div class="sh${opts.light ? " sh-light" : ""}" id="${id}"><span class="sh-l">${opts.label || "Share"}</span>
    <button type="button" class="sh-b sh-native" hidden aria-label="Share" title="Share">${si("share")}</button>
    ${a(`https://www.facebook.com/sharer/sharer.php?u=${u}`, "fb", "Facebook")}${a(`https://twitter.com/intent/tweet?url=${u}&text=${t}`, "x", "X")}${a(`https://wa.me/?text=${t}%20${u}`, "wa", "WhatsApp")}${a(`https://www.linkedin.com/sharing/share-offsite/?url=${u}`, "li", "LinkedIn")}
    <a class="sh-b sh-mail" href="mailto:?subject=${t}&body=${t}%0A%0A${u}" aria-label="Share by email" title="Email">${si("mail")}</a>
    <button type="button" class="sh-b sh-copy" aria-label="Copy link" title="Copy link">${si("link")}<span class="sh-done" role="status"></span></button>
    <script>(function(){var r=document.getElementById('${id}'),url=${JSON.stringify(url).replace(/</g, "\\u003c")},title=${JSON.stringify(title).replace(/</g, "\\u003c")};
      var n=r.querySelector('.sh-native');if(navigator.share){n.hidden=false;n.onclick=function(){navigator.share({title:title,url:url}).catch(function(){});};}
      r.querySelector('.sh-copy').onclick=function(){var d=r.querySelector('.sh-done');function ok(){d.textContent='Link copied';setTimeout(function(){d.textContent='';},2000);}
        if(navigator.clipboard){navigator.clipboard.writeText(url).then(ok,function(){prompt('Copy this link',url);});}else{prompt('Copy this link',url);}};})();</script></div>`;
}
export const galleryOf = (g) => (Array.isArray(g) ? g : []).filter((x) => x && x.src && safeUrl(String(x.src), true)).map((x) => ({ src: safeUrl(String(x.src), true), alt: String(x.alt || ""), caption: String(x.caption || "") }));
export function galleryHTML(items, title) {
  if (!items.length) return "";
  return `<section class="agal" aria-labelledby="gal-h"><h2 id="gal-h">Gallery <span>${items.length} photo${items.length === 1 ? "" : "s"}</span></h2>
    <div class="agal-grid${items.length < 3 ? " few" : ""}">${items.map((x, i) => `<button type="button" class="agal-t${i === 0 && items.length > 4 ? " big" : ""}" data-i="${i}" aria-label="Open photo ${i + 1} of ${items.length}${x.alt ? ": " + E(x.alt) : ""}"><img src="${E(x.src)}" alt="${E(x.alt)}" loading="lazy"></button>`).join("")}</div>
    <dialog class="lb" aria-label="Photo viewer"><div class="lb-in"><button type="button" class="lb-x" aria-label="Close">×</button>
      <button type="button" class="lb-p" aria-label="Previous photo">‹</button><figure><img alt=""><figcaption><span class="lb-c"></span><span class="lb-n"></span></figcaption></figure><button type="button" class="lb-nx" aria-label="Next photo">›</button></div></dialog>
    <script>(function(){var items=${JSON.stringify(items).replace(/</g, "\\u003c")},s=document.currentScript.parentNode,d=s.querySelector('.lb'),im=d.querySelector('img'),c=d.querySelector('.lb-c'),n=d.querySelector('.lb-n'),i=0,x0=null;
      function show(k){i=(k+items.length)%items.length;var it=items[i];im.src=it.src;im.alt=it.alt;c.textContent=it.caption||it.alt||'';n.textContent=(i+1)+' / '+items.length;}
      s.querySelectorAll('.agal-t').forEach(function(b){b.onclick=function(){show(+b.dataset.i);d.showModal?d.showModal():d.setAttribute('open','');};});
      d.querySelector('.lb-x').onclick=function(){d.close();};d.querySelector('.lb-p').onclick=function(){show(i-1);};d.querySelector('.lb-nx').onclick=function(){show(i+1);};
      d.addEventListener('click',function(e){if(e.target===d||e.target.classList.contains('lb-in'))d.close();});
      d.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1);});
      d.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});d.addEventListener('touchend',function(e){if(x0==null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>50)show(i+(dx<0?1:-1));x0=null;});})();</script></section>`;
}
