// banner.js - shows a small dismissible banner when local score is suspicious.
(function () {
  function levelColor(level) {
    if (level === "Critical") return "#7f1d1d";
    if (level === "High") return "#b45309";
    if (level === "Medium") return "#854d0e";
    return "#166534";
  }

  function showBanner(result) {
    try {
      if (!result || result.score < 26) return;
      if (document.getElementById("__scamwise_banner")) return;
      const bar = document.createElement("div");
      bar.id = "__scamwise_banner";
      bar.setAttribute("role", "alert");
      bar.style.cssText =
        "position:fixed;top:0;left:0;right:0;z-index:2147483647;" +
        "padding:10px 16px;font:14px/1.4 system-ui,sans-serif;color:#fff;" +
        "background:" + levelColor(result.level) + ";display:flex;gap:12px;align-items:center;";
      const label = document.createElement("span");
      label.textContent = "ScamWise: " + result.level + " risk (" + result.score + "/100).";
      const btn = document.createElement("button");
      btn.textContent = "Dismiss";
      btn.style.cssText = "margin-left:auto;background:#fff;border:0;border-radius:6px;padding:4px 10px;cursor:pointer;";
      btn.addEventListener("click", () => bar.remove());
      bar.appendChild(label);
      bar.appendChild(btn);
      document.documentElement.appendChild(bar);
    } catch (e) {
      // fail-open
    }
  }

  setTimeout(() => {
    try {
      if (window.__scamwiseLocal) showBanner(window.__scamwiseLocal);
    } catch (e) {
      // ignore
    }
  }, 1200);
})();
