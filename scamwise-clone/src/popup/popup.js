// popup.js - shows current tab verdict from storage/history + live re-scan via backend.
(function () {
  const $ = (id) => document.getElementById(id);

  async function currentTabUrl() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs[0] ? tabs[0].url || "" : "";
  }

  function render(url, result) {
    $("url").textContent = url || "(no url)";
    $("verdict").textContent = result.level + " risk — " + result.score + "/100" + (result.source ? " (" + result.source + ")" : "");
    const ul = $("reasons");
    ul.innerHTML = "";
    for (const r of result.reasons || []) {
      const li = document.createElement("li");
      li.textContent = r;
      ul.appendChild(li);
    }
    if (!(result.reasons || []).length) {
      const li = document.createElement("li");
      li.textContent = "No threat signals found.";
      ul.appendChild(li);
    }
  }

  async function historyLookup(url) {
    try {
      const data = await chrome.storage.local.get("history");
      const h = Array.isArray(data.history) ? data.history : [];
      const found = h.find((x) => x.url === url);
      if (found) return found;
      let host = "";
      try {
        host = new URL(url).hostname;
      } catch (e) {
        host = "";
      }
      return h.find((x) => x.host === host) || null;
    } catch (e) {
      return null;
    }
  }

  async function remoteScan(url, text) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    try {
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, text: (text || "").slice(0, 8000) }),
        signal: ctrl.signal
      });
      if (!res.ok) return null;
      const data = await res.json();
      // backend returns {verdict:{score,level,reasons}, signals:{...}} - unwrap, never hardcode
      const v = data && data.verdict ? data.verdict : data;
      if (v && typeof v.score === "number") return { score: v.score, level: v.level || v.band || "Low", reasons: v.reasons || [], breakdown: v.breakdown, signals: data.signals || null };
      return null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  async function pageText() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs && tabs[0];
      if (!tab || !tab.id || /^chrome:|^chrome-extension:|^about:/.test(tab.url || "")) return "";
      const inj = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => (document.body ? document.body.innerText : "").slice(0, 8000) });
      return (inj && inj[0] && inj[0].result) || "";
    } catch (e) { return ""; }
  }

  async function scan(url) {
    $("verdict").textContent = "Scanning live site…";
    const text = await pageText();
    const remote = await remoteScan(url, text);
    if (remote && typeof remote.score === "number") {
      render(url, { score: remote.score, level: remote.level || "Low", reasons: remote.reasons || [], source: "backend" });
      return;
    }
    const cached = await historyLookup(url);
    if (cached) {
      render(url, cached);
      return;
    }
    render(url, { score: 0, level: "Low", reasons: [], source: "none" });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const url = await currentTabUrl();
    await scan(url);

    $("rescan").addEventListener("click", async () => {
      const u = await currentTabUrl();
      await scan(u);
    });

    $("whitelist").addEventListener("click", async () => {
      try {
        const u = await currentTabUrl();
        const host = new URL(u).hostname;
        await chrome.storage.local.set({ ["wl_" + host]: Date.now() + 86400000 });
        $("verdict").textContent = "Trusted for 24h: " + host;
      } catch (e) {
        $("verdict").textContent = "Could not whitelist.";
      }
    });

    $("dashboard").addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard/dashboard.html") });
    });
  });
})();
