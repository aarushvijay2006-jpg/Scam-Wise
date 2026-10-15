// warning.js - no inline scripts; reads query params set by orchestrator.
(function () {
  function qs(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const url = qs("url");
    const score = qs("score");
    const level = qs("level") || "High";
    let reasons = [];
    try {
      reasons = JSON.parse(qs("reasons") || "[]");
    } catch (e) {
      reasons = [];
    }

    document.getElementById("subtitle").textContent =
      "ScamWise blocked this page: " + level + " risk (" + score + "/100).";
    document.getElementById("url").textContent = url;

    const ul = document.getElementById("reasons");
    for (const r of reasons) {
      const li = document.createElement("li");
      li.textContent = String(r);
      ul.appendChild(li);
    }
    if (!reasons.length) {
      const li = document.createElement("li");
      li.textContent = "Suspicious signals detected.";
      ul.appendChild(li);
    }

    document.getElementById("back").addEventListener("click", () => {
      window.history.back();
      setTimeout(() => window.close(), 300);
    });

    document.getElementById("proceed").addEventListener("click", async () => {
      try {
        const host = new URL(url).hostname;
        await chrome.storage.local.set({ ["wl_" + host]: Date.now() + 86400000 });
      } catch (e) {
        // ignore
      }
      window.location.href = url;
    });
  });
})();
