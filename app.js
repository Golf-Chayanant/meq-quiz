(function () {
  "use strict";

  const ICONS = {
    lark: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 34h36"/><path d="M14 34a10 10 0 0 1 20 0"/><path d="M24 12v5M11 19l3.5 3.5M37 19l-3.5 3.5M5 27h4M39 27h4"/><path d="M12 40h24"/></svg>',
    middle: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="24" cy="24" r="8"/><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M11.3 36.7l3.5-3.5M33.2 14.8l3.5-3.5"/></svg>',
    owl: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M30 8a15 15 0 1 0 10 25A13 13 0 0 1 30 8z"/><path d="M38 9v4M36 11h4M41 19v3M39.5 20.5h3"/></svg>',
  };

  const $ = (id) => document.getElementById(id);
  const answers = new Array(QUESTIONS.length).fill(null);
  let current = 0;
  let result = null;
  let advancing = false;

  // ---------- helpers ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
    window.scrollTo(0, 0);
  }
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2400);
  }
  function siteUrl() {
    return CONFIG.SITE_URL || location.origin + location.pathname.replace(/[^/]*$/, "");
  }
  function utm() {
    try {
      const p = new URLSearchParams(location.search);
      return p.get("utm_source") || p.get("from") || "";
    } catch (e) { return ""; }
  }
  function post(payload) {
    if (!CONFIG.ENDPOINT) return Promise.resolve(false);
    // text/plain เพื่อเลี่ยง CORS preflight ของ Apps Script
    return fetch(CONFIG.ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    }).then(() => true).catch(() => false);
  }

  document.querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = ICONS[el.dataset.icon]; });

  // ---------- quiz ----------
  function renderQuestion() {
    const q = QUESTIONS[current];
    $("qnum").textContent = "ข้อ " + (current + 1);
    $("qtext").textContent = q.q;
    $("count").textContent = current + 1 + "/" + QUESTIONS.length;
    $("bar").style.width = (current / QUESTIONS.length) * 100 + "%";
    $("back").disabled = false;
    const box = $("options");
    box.innerHTML = "";
    q.o.forEach(([label], i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "opt" + (answers[current] === i ? " selected" : "");
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", answers[current] === i ? "true" : "false");
      b.textContent = label;
      b.addEventListener("click", () => choose(i, b));
      box.appendChild(b);
    });
    advancing = false;
  }

  function choose(i, btn) {
    if (advancing) return;
    advancing = true;
    answers[current] = i;
    $("options").querySelectorAll(".opt").forEach((o) => { o.classList.remove("selected"); o.setAttribute("aria-checked", "false"); });
    btn.classList.add("selected");
    btn.setAttribute("aria-checked", "true");
    setTimeout(() => {
      if (current < QUESTIONS.length - 1) { current++; renderQuestion(); }
      else finish();
    }, 260);
  }

  $("start").addEventListener("click", () => { current = 0; renderQuestion(); show("quiz"); });
  $("back").addEventListener("click", () => {
    if (current === 0) { show("intro"); return; }
    current--; renderQuestion();
  });

  // ---------- result ----------
  function finish() {
    const score = answers.reduce((sum, a, qi) => sum + QUESTIONS[qi].o[a][1], 0);
    const type = scoreToType(score);
    result = { score, type };
    renderResult();
    show("result");
    post({ kind: "result", score, type: type.id, answers: answers.map((a) => a + 1), src: utm() });
  }

  function renderResult() {
    const { score, type } = result;
    const root = document.documentElement.style;
    root.setProperty("--accent", type.color);
    root.setProperty("--accent-tint", type.tint);
    $("r-icon").innerHTML = ICONS[type.group];
    $("r-group").textContent = "คุณคือ " + GROUPS[type.group].name;
    $("r-name").textContent = type.name;
    $("r-en").textContent = type.en + " · " + GROUPS[type.group].en;
    $("r-score").textContent = "คะแนน " + score + " (ช่วง " + type.band + ")";
    $("r-tagline").textContent = type.tagline;
    $("r-wake").textContent = type.wake;
    $("r-bed").textContent = type.bed;
    $("r-golden").textContent = type.golden + " น.";

    $("r-day").innerHTML = "";
    type.day.forEach(([title, time, text]) => {
      const li = document.createElement("li");
      if (title.startsWith("ช่วงเวลาทอง")) li.className = "gold";
      li.innerHTML = '<span class="t"></span><b></b><p></p>';
      li.querySelector(".t").textContent = time + " น.";
      li.querySelector("b").textContent = title;
      li.querySelector("p").textContent = text;
      $("r-day").appendChild(li);
    });
    $("r-rules").innerHTML = "";
    type.rules.forEach((r) => {
      const li = document.createElement("li");
      li.textContent = r;
      $("r-rules").appendChild(li);
    });

    $("mail").hidden = !CONFIG.ENDPOINT;
    $("mailmsg").textContent = "";
    if (CONFIG.POST_URL) { $("comment").href = CONFIG.POST_URL; $("comment").hidden = false; }
  }

  $("retake").addEventListener("click", () => {
    answers.fill(null);
    current = 0;
    document.documentElement.style.removeProperty("--accent");
    document.documentElement.style.removeProperty("--accent-tint");
    renderQuestion();
    show("quiz");
  });

  // ---------- share ----------
  $("share").addEventListener("click", async () => {
    const url = siteUrl() + "r/" + result.type.id + ".html";
    const text = "ได้ผลเป็น " + result.type.name + " (" + GROUPS[result.type.group].name + ") ลองทำดูว่าคุณเป็นนกแบบไหน";
    if (navigator.share) {
      try { await navigator.share({ title: "คุณเป็นนกแบบไหน?", text, url }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(url); toast("คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย"); }
    catch (e) { window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url), "_blank", "noopener"); }
  });

  // ---------- save image ----------
  function wrap(ctx, text, maxWidth) {
    let parts;
    if (window.Intl && Intl.Segmenter) {
      parts = Array.from(new Intl.Segmenter("th", { granularity: "word" }).segment(text), (s) => s.segment);
    } else {
      parts = text.split(/(\s+)/);
    }
    const lines = [];
    let line = "";
    parts.forEach((p) => {
      const test = line + p;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line.trim()); line = p.trimStart(); }
      else line = test;
    });
    if (line.trim()) lines.push(line.trim());
    return lines;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function loadSvg(svg, color) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace(/currentColor/g, color).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" '));
    });
  }

  async function drawImage() {
    const { score, type } = result;
    const W = 1080, H = 1350, F = '"IBM Plex Sans Thai", sans-serif';
    try { await document.fonts.ready; } catch (e) { /* ใช้ฟอนต์สำรอง */ }
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = type.color;
    ctx.fillRect(0, 0, W, H);

    const icon = await loadSvg(ICONS[type.group], "#ffffff");
    if (icon) ctx.drawImage(icon, W / 2 - 70, 80, 140, 140);

    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.font = "600 44px " + F;
    ctx.fillText("ฉันคือ " + GROUPS[type.group].name, W / 2, 290);
    ctx.fillStyle = "#fff";
    ctx.font = "700 92px " + F;
    ctx.fillText(type.name, W / 2, 400);
    ctx.font = "500 36px " + F;
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillText(type.en + " · คะแนน MEQ " + score, W / 2, 460);

    // การ์ดขาว
    ctx.fillStyle = "#fff";
    roundRect(ctx, 60, 520, W - 120, 690, 40);
    ctx.fill();

    ctx.fillStyle = "#1F2328";
    ctx.font = "500 40px " + F;
    const lines = wrap(ctx, type.tagline, W - 220).slice(0, 3);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 600 + i * 56));
    let y = 600 + lines.length * 56 + 30;

    // ตื่น / นอน
    const boxW = (W - 120 - 80 - 30) / 2;
    [["เวลาตื่นที่ใช่", type.wake], ["เวลานอนที่ใช่", type.bed]].forEach(([label, val], i) => {
      const x = 100 + i * (boxW + 30);
      ctx.fillStyle = type.tint;
      roundRect(ctx, x, y, boxW, 150, 24);
      ctx.fill();
      ctx.fillStyle = "#5F6670";
      ctx.font = "500 32px " + F;
      ctx.fillText(label, x + boxW / 2, y + 58);
      ctx.fillStyle = "#1F2328";
      ctx.font = "700 46px " + F;
      ctx.fillText(val, x + boxW / 2, y + 118);
    });
    y += 190;

    // ช่วงเวลาทอง
    ctx.strokeStyle = type.color;
    ctx.lineWidth = 5;
    ctx.setLineDash([18, 12]);
    roundRect(ctx, 100, y, W - 200, 200, 28);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#5F6670";
    ctx.font = "500 34px " + F;
    ctx.fillText("ช่วงเวลาทองของฉัน", W / 2, y + 62);
    ctx.fillStyle = type.color;
    ctx.font = "700 76px " + F;
    ctx.fillText(type.golden + " น.", W / 2, y + 154);

    // ท้ายรูป
    ctx.fillStyle = "#fff";
    ctx.font = "600 38px " + F;
    ctx.fillText("คุณเป็นนกแบบไหน? ลองทำแบบทดสอบ MEQ", W / 2, 1270);
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.font = "500 32px " + F;
    ctx.fillText("กอล์ฟนอน 100", W / 2, 1318);
    return c;
  }

  $("save").addEventListener("click", async () => {
    const btn = $("save");
    btn.disabled = true;
    try {
      const canvas = await drawImage();
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      const file = new File([blob], "meq-" + result.type.id + ".png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; }
        catch (e) { if (e && e.name === "AbortError") return; }
      }
      // สำรอง: โชว์รูปให้กดค้างบันทึก (ใช้ได้ในเบราว์เซอร์ของแอป Facebook)
      const url = canvas.toDataURL("image/png");
      $("sheetimg").src = url;
      $("dl").href = url;
      $("sheet").hidden = false;
    } catch (e) {
      toast("บันทึกรูปไม่สำเร็จ ลองแคปหน้าจอแทนได้เลย");
    } finally {
      btn.disabled = false;
    }
  });
  $("sheetclose").addEventListener("click", () => { $("sheet").hidden = true; });
  $("sheet").addEventListener("click", (e) => { if (e.target.id === "sheet") $("sheet").hidden = true; });

  // ---------- email ----------
  $("mailform").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("email").value.trim();
    const msg = $("mailmsg");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      msg.className = "mailmsg err";
      msg.textContent = "รูปแบบอีเมลไม่ถูกต้อง ลองเช็กอีกครั้งนะครับ";
      return;
    }
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    const ok = await post({
      kind: "email", email, consent: $("consent").checked,
      score: result.score, type: result.type.id, answers: answers.map((a) => a + 1), src: utm(),
    });
    btn.disabled = false;
    if (ok) {
      msg.className = "mailmsg ok";
      msg.textContent = "ส่งแล้ว ถ้าไม่เห็นในกล่องจดหมาย ลองดูในโฟลเดอร์สแปมหรือโปรโมชัน (ช่วงคนทำเยอะ อาจได้รับในวันถัดไป)";
      $("email").value = "";
    } else {
      msg.className = "mailmsg err";
      msg.textContent = "ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะครับ";
    }
  });
})();
