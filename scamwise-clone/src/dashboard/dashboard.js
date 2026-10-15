// dashboard.js - renders chrome.storage.local history.
(function () {
  async function load() {
    const tbody = document.getElementById("rows");
    tbody.innerHTML = "";
    let history = [];
    try {
      const data = await chrome.storage.local.get("history");
      history = Array.isArray(data.history) ? data.history : [];
    } catch (e) {
      history = [];
    }
    for (const h of history) {
      const tr = document.createElement("tr");
      const cells = [
        new Date(h.ts).toLocaleString(),
        h.host || "",
        String(h.score),
        h.level || "",
        h.url || ""
      ];
      for (const c of cells) {
        const td = document.createElement("td");
        td.textContent = c;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    if (!history.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.textContent = "No scans yet.";
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    load();
    document.getElementById("refresh").addEventListener("click", load);
    document.getElementById("clear").addEventListener("click", async () => {
      await chrome.storage.local.set({ history: [] });
      await load();
    });
  });
})();
