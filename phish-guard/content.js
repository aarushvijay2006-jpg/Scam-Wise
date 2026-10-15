// content.js - inline banner on Gmail / WhatsApp / any page. Runs after load, never blocks.
(function () {
  if (document.getElementById("phishguard-banner")) return;
  const text = document.body ? document.body.innerText.slice(0, 20000) : "";
  const links = [...document.querySelectorAll("a[href]")].map(a => a.href).slice(0, 5).join(" ");
  const r = PhishRules.analyze(links, text);
  if (r.score < 26) return;

  const bar = document.createElement("div");
  bar.id = "phishguard-banner";
  bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:999999;padding:10px 16px;font:14px sans-serif;color:#111;text-align:center;border-bottom:2px solid;";
  const color = r.score >= 76 ? "#ff6b6b" : r.score >= 51 ? "#ffa94d" : "#ffd43b";
  bar.style.background = color;
  bar.innerHTML = "<b>PhishGuard: " + r.level + " risk (" + r.score + "/100).</b> "
    + r.reasons.slice(0, 2).join(" | ")
    + ' <button id="pg-why" style="margin-left:8px">Why?</button> '
    + '<button id="pg-x" style="margin-left:4px">Dismiss</button>';
  document.documentElement.appendChild(bar);
  document.getElementById("pg-x").onclick = () => bar.remove();
  document.getElementById("pg-why").onclick = () => alert("PhishGuard reasons:\n- " + r.reasons.join("\n- "));
})();
