document.getElementById("go").onclick = () => {
  const url = document.getElementById("url").value, txt = document.getElementById("txt").value;
  const r = PhishRules.analyze(url, txt);
  const o = document.getElementById("out");
  o.style.display = "block";
  o.className = r.score >= 76 ? "crit" : r.score >= 51 ? "high" : r.score >= 26 ? "med" : "low";
  o.textContent = r.level + " (" + r.score + "/100) - " + (r.reasons.length ? r.reasons.join(" | ") : "No suspicious patterns found.");
};
chrome.storage.local.get("history", (d) => {
  const h = (d.history || []).slice(0, 5);
  document.getElementById("hist").textContent = h.length ? h.map((x) => x.level + " " + x.score + " - " + x.host).join(" | ") : "No scans yet.";
});
