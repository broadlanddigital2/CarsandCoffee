// Visual (word-processor style) editor for event, news and guide write-ups.
// Writes simple, clean HTML: headings, bold, italic, lists, quotes, links, images and dividers.
// The website cleans it again before showing it, so nothing harmful can get through.

const ALLOWED = { P: [], H2: [], H3: [], H4: [], STRONG: [], B: [], EM: [], I: [], U: [], S: [], UL: [], OL: [], LI: [], BLOCKQUOTE: [], BR: [], HR: [], A: ["href"], IMG: ["src", "alt"], FIGURE: [], FIGCAPTION: [] };
const RENAME = { B: "strong", I: "em", DIV: "p", H1: "h2", H5: "h4", H6: "h4" };
const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "NOSCRIPT", "TEMPLATE", "SVG", "MATH", "FORM", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "META", "LINK", "TITLE", "HEAD"]);
const okUrl = (u, img) => { const v = String(u || "").trim(); return /^(https?:)?\/\//i.test(v) || /^\/(?!\/)/.test(v) || (!img && (/^(mailto|tel):/i.test(v) || v.startsWith("#"))); };

export function cleanHTML(html) {
  const doc = new DOMParser().parseFromString(`<body>${html || ""}</body>`, "text/html");
  const walk = (node, out) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) { out.appendChild(out.ownerDocument.createTextNode(n.nodeValue.replace(/ /g, " "))); continue; }
      if (n.nodeType !== 1 || DROP.has(n.tagName)) continue;
      let tag = n.tagName;
      if (RENAME[tag]) tag = RENAME[tag].toUpperCase();
      // Word / Google Docs paste: bold or italic spans
      if (tag === "SPAN") { const st = n.getAttribute("style") || ""; if (/font-weight:\s*(bold|[6-9]00)/.test(st)) tag = "STRONG"; else if (/font-style:\s*italic/.test(st)) tag = "EM"; }
      if (!ALLOWED[tag]) { walk(n, out); continue; }
      const el = out.ownerDocument.createElement(tag.toLowerCase());
      for (const a of ALLOWED[tag]) { const v = n.getAttribute(a); if (v == null) continue; if ((a === "href" || a === "src") && !okUrl(v, a === "src")) continue; el.setAttribute(a, v); }
      if (tag === "A" && !el.getAttribute("href")) { walk(n, out); continue; }
      if (tag === "IMG" && !el.getAttribute("src")) continue;
      walk(n, el); out.appendChild(el);
    }
  };
  const out = document.implementation.createHTMLDocument("").body;
  walk(doc.body, out);
  // Loose text and inline bits at the top level go into paragraphs
  const blocks = new Set(["P", "H2", "H3", "H4", "UL", "OL", "BLOCKQUOTE", "HR", "FIGURE", "IMG"]);
  const final = out.ownerDocument.createElement("div"); let para = null;
  for (const n of [...out.childNodes]) {
    if (n.nodeType === 1 && blocks.has(n.tagName)) { para = null; final.appendChild(n); continue; }
    if (n.nodeType === 3 && !n.nodeValue.trim() && !para) continue;
    if (n.nodeType === 1 && n.tagName === "BR" && !para) continue;
    if (!para) { para = out.ownerDocument.createElement("p"); final.appendChild(para); }
    para.appendChild(n);
  }
  return final.innerHTML.replace(/<p>(\s|<br>)*<\/p>/g, "").replace(/(<br>)+<\/p>/g, "</p>").trim();
}

const B = (cmd, label, title, val = "") => `<button type="button" class="btn btn-sm rte-b" data-cmd="${cmd}" data-val="${val}" title="${title}" aria-label="${title}">${label}</button>`;
const SVG = (d) => `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export function richField(id, value, esc, opts = {}) {
  return `<div class="rte${opts.compact ? " rte-compact" : ""}" data-rte="${id}">
    <div class="rte-bar" role="toolbar" aria-label="Formatting">
      <select class="form-select form-select-sm rte-block" aria-label="Text style"><option value="p">Paragraph</option><option value="h2">Heading</option><option value="h3">Subheading</option></select>
      <span class="rte-sep"></span>
      ${B("bold", "<b>B</b>", "Bold (Ctrl+B)")}${B("italic", "<i>I</i>", "Italic (Ctrl+I)")}
      <span class="rte-sep"></span>
      ${B("insertUnorderedList", SVG('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'), "Bulleted list")}
      ${B("insertOrderedList", SVG('<path d="M10 6h10M10 12h10M10 18h10M4 4v4M3 18h3l-3 3h3M3 11c1-1 3-1 3 1l-3 3h3" stroke-width="1.7"/>'), "Numbered list")}
      ${B("quote", SVG('<path d="M7 7h4v6c0 2-1 4-4 4M15 7h4v6c0 2-1 4-4 4"/>'), "Quote")}
      <span class="rte-sep"></span>
      ${B("link", SVG('<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>'), "Add link")}
      ${B("unlink", SVG('<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1M4 4l16 16"/>'), "Remove link")}
      <label class="btn btn-sm rte-b mb-0" title="Add photo" aria-label="Add photo">${SVG('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>')}<input type="file" accept="image/webp,image/jpeg,image/png,image/avif" data-rteimg hidden></label>
      ${B("insertHorizontalRule", SVG('<path d="M4 12h16"/>'), "Divider")}
      <span class="rte-sep"></span>
      ${B("undo", SVG('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'), "Undo")}${B("redo", SVG('<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'), "Redo")}
      ${B("removeFormat", SVG('<path d="M6 4h12M10 4 7 20M14 4l-1.5 7M4 20l16-16" />'), "Clear formatting")}
      <span class="ms-auto rte-words small text-body-secondary"></span>
    </div>
    <div class="rte-pop" hidden><input class="form-control form-control-sm" placeholder="Paste a web address, e.g. /events or https://…"><button type="button" class="btn btn-sm btn-primary" data-pop-ok>Add link</button><button type="button" class="btn btn-sm btn-outline-secondary" data-pop-cancel>Cancel</button></div>
    <div class="rte-pop rte-alt" hidden><input class="form-control form-control-sm" data-alt placeholder="Describe the photo (for people who can't see it)" aria-label="Photo description"><input class="form-control form-control-sm" data-cap placeholder="Caption (optional, shown under the photo)" aria-label="Photo caption"><button type="button" class="btn btn-sm btn-primary" data-alt-ok>Save</button><button type="button" class="btn btn-sm btn-outline-danger" data-img-rm>Remove photo</button></div>
    <div class="rte-area form-control" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Write-up" id="${id}_area">${cleanHTML(value || "") || "<p><br></p>"}</div>
    <input type="hidden" id="${id}" value="${esc(value || "")}">
    <div class="form-text">Write as you would in Word. Paste from Word or Google Docs and the formatting is tidied up for you. Use Heading for section titles.</div>
  </div>`;
}

export function wireRich(root, { upload, onChange }) {
  for (const box of root.querySelectorAll("[data-rte]")) {
    const area = box.querySelector(".rte-area"), hidden = box.querySelector('input[type="hidden"]');
    const [linkPop, altPop] = box.querySelectorAll(".rte-pop");
    const blockSel = box.querySelector(".rte-block"), words = box.querySelector(".rte-words");
    let saved = null, lastImg = null;
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch {}
    const sync = () => { hidden.value = cleanHTML(area.innerHTML); const n = (area.innerText.trim().match(/\S+/g) || []).length; words.textContent = `${n} word${n === 1 ? "" : "s"}`; onChange && onChange(); };
    const keep = () => { const s = getSelection(); if (s.rangeCount && area.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); };
    const restore = () => { area.focus(); if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); } };
    const blockOf = () => { let n = getSelection().anchorNode; while (n && n !== area) { if (n.nodeType === 1 && /^(P|H2|H3|H4|BLOCKQUOTE|LI)$/.test(n.tagName)) return n; n = n.parentNode; } return null; };
    const refresh = () => {
      const b = blockOf(); blockSel.value = b && /^H[23]$/.test(b.tagName) ? b.tagName.toLowerCase() : "p";
      for (const btn of box.querySelectorAll("[data-cmd]")) { const c = btn.dataset.cmd; if (["bold", "italic", "insertUnorderedList", "insertOrderedList"].includes(c)) { let on = false; try { on = document.queryCommandState(c); } catch {} btn.classList.toggle("on", on); } }
      box.querySelector('[data-cmd="quote"]').classList.toggle("on", !!(b && b.closest && b.closest("blockquote")));
    };
    area.addEventListener("input", sync);
    area.addEventListener("keyup", () => { keep(); refresh(); });
    area.addEventListener("mouseup", () => { keep(); refresh(); });
    area.addEventListener("blur", keep);
    area.addEventListener("paste", (e) => {
      e.preventDefault();
      const html = e.clipboardData.getData("text/html"), text = e.clipboardData.getData("text/plain");
      const clean = html ? cleanHTML(html) : text.split(/\n\s*\n/).map((p) => `<p>${p.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])).replace(/\n/g, "<br>")}</p>`).join("");
      document.execCommand("insertHTML", false, clean); sync();
    });
    const capOf = (im) => { const f = im.closest("figure"); return f ? (f.querySelector("figcaption")?.textContent || "") : ""; };
    const openAlt = (im) => { lastImg = im; altPop.hidden = false; altPop.querySelector("[data-alt]").value = im.alt || ""; altPop.querySelector("[data-cap]").value = capOf(im); altPop.querySelector("[data-alt]").focus(); };
    area.addEventListener("click", (e) => { if (e.target.tagName === "IMG") openAlt(e.target); });
    blockSel.onchange = () => { restore(); document.execCommand("formatBlock", false, `<${blockSel.value}>`); sync(); };
    box.querySelector(".rte-bar").addEventListener("mousedown", (e) => { if (e.target.closest("button")) e.preventDefault(); });
    box.querySelector(".rte-bar").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cmd]"); if (!btn) return;
      const c = btn.dataset.cmd; area.focus();
      if (c === "link") { keep(); linkPop.hidden = false; const a = getSelection().anchorNode?.parentElement?.closest("a"); linkPop.querySelector("input").value = a ? a.getAttribute("href") : ""; linkPop.querySelector("input").focus(); return; }
      if (c === "quote") { const b = blockOf(); document.execCommand("formatBlock", false, b && b.closest("blockquote") ? "<p>" : "<blockquote>"); }
      else document.execCommand(c, false, btn.dataset.val || null);
      sync(); refresh();
    });
    const addLink = () => {
      let url = linkPop.querySelector("input").value.trim(); if (!url) return (linkPop.hidden = true);
      if (!/^(https?:|mailto:|tel:|\/|#)/i.test(url)) url = (/^[^\s@]+@[^\s@]+$/.test(url) ? "mailto:" : "https://") + url;
      restore();
      if (getSelection().isCollapsed) document.execCommand("insertHTML", false, `<a href="${url.replace(/"/g, "&quot;")}">${url.replace(/[&<>]/g, "")}</a>`);
      else document.execCommand("createLink", false, url);
      linkPop.hidden = true; sync();
    };
    linkPop.querySelector("[data-pop-ok]").onclick = addLink;
    linkPop.querySelector("input").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } if (e.key === "Escape") linkPop.hidden = true; };
    linkPop.querySelector("[data-pop-cancel]").onclick = () => { linkPop.hidden = true; area.focus(); };
    altPop.querySelector("[data-alt-ok]").onclick = () => {
      if (lastImg) {
        lastImg.alt = altPop.querySelector("[data-alt]").value.trim();
        const cap = altPop.querySelector("[data-cap]").value.trim();
        let fig = lastImg.closest("figure");
        if (cap) {
          if (!fig) { fig = document.createElement("figure"); lastImg.replaceWith(fig); fig.appendChild(lastImg); }
          let fc = fig.querySelector("figcaption"); if (!fc) { fc = document.createElement("figcaption"); fig.appendChild(fc); } fc.textContent = cap;
        } else if (fig) { fig.replaceWith(lastImg); }
      }
      altPop.hidden = true; sync();
    };
    altPop.querySelector("[data-img-rm]").onclick = () => { if (lastImg) (lastImg.closest("figure") || lastImg).remove(); lastImg = null; altPop.hidden = true; sync(); };
    for (const inp of altPop.querySelectorAll("input")) inp.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); altPop.querySelector("[data-alt-ok]").click(); } };
    const fi = box.querySelector("[data-rteimg]");
    fi.addEventListener("mousedown", keep);
    fi.onchange = async () => {
      const f = fi.files[0]; fi.value = ""; if (!f) return;
      words.textContent = "Uploading photo…";
      try {
        const url = await upload(f);
        restore(); document.execCommand("insertHTML", false, `<img src="${url.replace(/"/g, "&quot;")}" alt=""><p><br></p>`);
        const im = [...area.querySelectorAll("img")].find((i) => i.getAttribute("src") === url); if (im) openAlt(im); sync();
      } catch (err) { words.textContent = "Upload failed: " + (err.message || err); }
    };
    sync();
  }
}
