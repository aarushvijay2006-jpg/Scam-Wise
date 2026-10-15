const q = new URLSearchParams(location.search);
const url = q.get("url") || "";
const score = q.get("score") || "?";
const level = q.get("level") || "High";
let reasons = [];
try { reasons = JSON.parse(q.get("reasons") || "[]"); } catch (e) { reasons = []; }
document.getElementById("url").textContent = url;
document.getElementById("score").textContent = score;
document.getElementById("level").textContent = level + " risk";
const ul = document.getElementById("reasons");
ul.innerHTML = "";
for (const r of reasons) {
  const li = document.createElement("li");
  li.textContent = r;
  ul.appendChild(li);
}
if (!reasons.length) {
  const li = document.createElement("li");
  li.textContent = "Suspicious pattern";
  ul.appendChild(li);
}
document.getElementById("back").onclick = () => history.back();
let armed = false;
document.getElementById("go").onclick = async () => {
  if (!armed) { armed = true; document.getElementById("confirm").style.display = "block"; return; }
  try {
    const host = new URL(url).hostname;
    const o = {};
    o["wl_" + host] = Date.now() + 24 * 3600 * 1000;
    await chrome.storage.local.set(o);
  } catch (e) { /* ignore */ }
  location.href = url;
};
