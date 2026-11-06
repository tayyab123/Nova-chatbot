/*! Nova chat widget – embed with:
    <script src="http://127.0.0.1:5000/static/widget.js" defer></script>
   Optional attributes: data-api, data-owner, data-remind (seconds, default 120), data-theme */
(() => {
  if (window.__novaLoaded) return;
  window.__novaLoaded = true;

  const me = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const BASE = new URL(me.src, location.href).origin;
  const API = (me.dataset.api || BASE).replace(/\/$/, "");
  const OWNER = me.dataset.owner || "Muhammad";
  const REMIND_MS = (parseInt(me.dataset.remind, 10) || 120) * 1000;
  const THEMES = [
    ["ocean", "Ocean", "linear-gradient(135deg,#2f6bff,#22d3ee)"],
    ["aurora", "Aurora", "linear-gradient(135deg,#7c3aed,#ec4899)"],
    ["emerald", "Emerald", "linear-gradient(135deg,#059669,#a3e635)"],
    ["sunset", "Sunset", "linear-gradient(135deg,#f97316,#ec4899)"],
    ["gold", "Midnight Gold", "linear-gradient(135deg,#d99a1c,#f7e08a)"],
  ];
  const NUDGES = [
    `Hi, I’m Nova. Ask me about ${OWNER}’s projects.`,
    `Looking to hire? I can share ${OWNER}’s skills and contact details.`,
    `Curious about ${OWNER}’s experience? Just ask.`,
    "Need help finding something on this portfolio?",
  ];
  const CHIPS = ["Who is " + OWNER + "?", "What are his skills?", "Show me his projects", "His experience", "How can I contact him?"];
  const GREETING = `Hi, I’m **Nova**, the assistant for this portfolio. Ask me about ${OWNER}’s skills, projects, experience, education, or how to get in touch.`;

  const SPARK = '<svg viewBox="0 0 24 24" width="%s" height="%s" fill="none"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z" fill="#fff"/><circle cx="19" cy="18" r="1.6" fill="#fff" opacity=".8"/></svg>';
  const spark = (n) => SPARK.replace(/%s/g, n);

  // font (must live in the main document)
  if (!document.querySelector('link[data-nova-font]')) {
    const f = document.createElement("link");
    f.rel = "stylesheet"; f.dataset.novaFont = "1";
    f.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(f);
  }

  const host = document.createElement("div");
  host.style.visibility = "hidden";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  let theme = me.dataset.theme || "ocean";
  try { theme = localStorage.getItem("nova-theme") || theme; } catch (e) {}
  if (!THEMES.some((t) => t[0] === theme)) theme = "ocean";

  root.innerHTML = `
    <link rel="stylesheet" href="${BASE}/static/widget.css">
    <div class="nv" data-theme="${theme}">
      <div class="nudge" id="nudge"></div>
      <section class="panel" id="panel" role="dialog" aria-label="Chat with Nova" aria-modal="false">
        <div class="blobs" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="stars" aria-hidden="true"></div>
        <header>
          <div class="avatar" aria-hidden="true">${spark(22)}</div>
          <div class="title"><b>Nova</b><span>${OWNER}’s assistant</span></div>
          <div class="themes" id="themes" role="group" aria-label="Color theme">
            ${THEMES.map((t) => `<button type="button" data-t="${t[0]}" title="${t[1]}" aria-label="${t[1]} theme" style="background:${t[2]}" aria-pressed="${t[0] === theme}"></button>`).join("")}
          </div>
          <button class="x" id="close" type="button" aria-label="Close chat">✕</button>
        </header>
        <div class="msgs" id="msgs" aria-live="polite"></div>
        <div class="chips" id="chips"></div>
        <form class="composer" id="form" autocomplete="off">
          <textarea id="input" rows="1" maxlength="1000" placeholder="Ask Nova anything…" aria-label="Your message"></textarea>
          <button class="send" id="send" type="submit" aria-label="Send">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </form>
        <p class="foot">AI assistant. It can make mistakes, so contact ${OWNER} directly for anything important.</p>
      </section>
      <button class="launcher" id="launcher" type="button" aria-label="Open chat with Nova" aria-expanded="false">
        <span class="ring"></span><span class="ring2"></span>
        <svg class="i-chat" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 11h.01M12 11h.01M15 11h.01" stroke-width="2.6"/></svg>
        <svg class="i-close" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        <span class="badge"></span>
      </button>
    </div>`;

  const $ = (id) => root.getElementById(id);
  const nv = root.querySelector(".nv");
  const link = root.querySelector("link");
  link.addEventListener("load", () => (host.style.visibility = "visible"));
  setTimeout(() => (host.style.visibility = "visible"), 1500);

  const msgs = $("msgs"), form = $("form"), input = $("input"), sendBtn = $("send");
  const chipsEl = $("chips"), launcher = $("launcher"), nudge = $("nudge");
  let history = [], busy = false, open = false, nudgeTimer;

  /* ---------- safe mini-markdown ---------- */
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) => s
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  function block(text) {
    const out = []; let list = [], para = [];
    const fl = () => { if (list.length) { out.push("<ul>" + list.join("") + "</ul>"); list = []; } };
    const fp = () => { if (para.length) { out.push("<p>" + para.join("<br>") + "</p>"); para = []; } };
    for (const raw of text.split("\n")) {
      const line = raw.trimEnd(), li = line.match(/^\s*[-*•]\s+(.*)$/);
      if (li) { fp(); list.push("<li>" + inline(li[1]) + "</li>"); }
      else if (!line.trim()) { fl(); fp(); }
      else { fl(); para.push(inline(line)); }
    }
    fl(); fp(); return out.join("");
  }
  const render = (t) => esc(t).split(/(```[\s\S]*?```)/g)
    .map((p) => p.startsWith("```") ? "<pre><code>" + p.slice(3, -3).replace(/^\w*\n/, "").trim() + "</code></pre>" : block(p)).join("");

  /* ---------- UI ---------- */
  const down = () => { msgs.scrollTop = msgs.scrollHeight; };
  function add(role, text, cls = "", animate = false) {
    const m = document.createElement("div");
    m.className = `m ${role} ${cls}`.trim();
    if (role === "b") { const a = document.createElement("div"); a.className = "mini"; a.innerHTML = spark(15); m.appendChild(a); }
    const b = document.createElement("div"); b.className = "bubble";
    if (role === "u") b.textContent = text;
    else if (!animate) b.innerHTML = render(text);
    m.appendChild(b); msgs.appendChild(m); down();
    if (animate) typewriter(b, text);
    return m;
  }
  function typewriter(el, text) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.innerHTML = render(text); return; }
    const step = Math.max(2, Math.ceil(text.length / 110)); let i = 0;
    const t = setInterval(() => {
      i += step;
      el.innerHTML = render(text.slice(0, i)); down();
      if (i >= text.length) clearInterval(t);
    }, 22);
  }
  function setBusy(v) { busy = v; sendBtn.disabled = v; input.disabled = v; if (!v && open) input.focus(); }
  function grow() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 110) + "px"; }

  function setOpen(v) {
    open = v; nv.classList.toggle("open", v);
    launcher.setAttribute("aria-expanded", v);
    launcher.setAttribute("aria-label", v ? "Close chat" : "Open chat with Nova");
    if (v) { hideNudge(); launcher.classList.remove("unread", "wiggle"); setTimeout(() => input.focus(), 350); down(); }
  }

  async function send(text) {
    text = text.trim(); if (!text || busy) return;
    chipsEl.classList.add("hide");
    add("u", text); history.push({ role: "user", content: text });
    input.value = ""; grow(); setBusy(true);
    const typing = add("b", "");
    typing.querySelector(".bubble").innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    try {
      const res = await fetch(API + "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }) });
      const data = await res.json().catch(() => ({}));
      typing.remove();
      if (!res.ok || !data.reply) { history.pop(); add("b", data.error || "Something went wrong. Please try again.", "err"); }
      else { history.push({ role: "assistant", content: data.reply }); add("b", data.reply, "", true); }
    } catch (e) {
      typing.remove(); history.pop();
      add("b", "I can’t reach the server right now. Please try again in a moment.", "err");
    } finally { setBusy(false); }
  }

  function reset() {
    history = []; msgs.innerHTML = "";
    chipsEl.classList.remove("hide");
    add("b", GREETING);
  }

  /* ---------- reminder every 2 minutes (while closed) ---------- */
  function showNudge() {
    if (open) return;
    nudge.textContent = NUDGES[Math.floor(Math.random() * NUDGES.length)];
    nudge.classList.add("show"); launcher.classList.add("unread", "wiggle");
    clearTimeout(nudgeTimer); nudgeTimer = setTimeout(hideNudge, 9000);
    setTimeout(() => launcher.classList.remove("wiggle"), 1800);
  }
  function hideNudge() { nudge.classList.remove("show"); }
  setInterval(showNudge, REMIND_MS);

  /* ---------- events ---------- */
  launcher.addEventListener("click", () => setOpen(!open));
  nudge.addEventListener("click", () => setOpen(true));
  $("close").addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) setOpen(false); });
  form.addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
  input.addEventListener("input", grow);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); } });
  chipsEl.innerHTML = CHIPS.map((c) => `<button type="button" class="chip">${esc(c)}</button>`).join("");
  chipsEl.addEventListener("click", (e) => { if (e.target.classList.contains("chip")) send(e.target.textContent); });
  $("themes").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-t]"); if (!b) return;
    theme = b.dataset.t; nv.dataset.theme = theme;
    root.querySelectorAll("#themes button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    try { localStorage.setItem("nova-theme", theme); } catch (err) {}
  });

  reset();
})();
