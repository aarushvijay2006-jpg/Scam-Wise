export async function checkSafeBrowsing(url, key) {
  if (!url || !key) return { match: false, threats: [], skipped: true };
  try {
    const r = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client: { clientId: "scamwise", clientVersion: "1.0" }, threatInfo: { threatTypes: ["MALWARE","SOCIAL_ENGINEERING","UNWANTED_SOFTWARE"], platformTypes: ["ANY_PLATFORM"], threatEntryTypes: ["URL"], threatEntries: [{ url }] } }),
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) return { match: false, threats: [], error: `SB ${r.status}`, skipped: r.status === 401 };
    const j = await r.json();
    return { match: !!(j.matches?.length), threats: j.matches || [] };
  } catch (e) { return { match: false, threats: [], error: String(e).slice(0,120) }; }
}

export async function checkVirusTotal(url, key) {
  if (!url || !key) return { positives: 0, total: 0, skipped: true };
  try {
    const b64 = Buffer.from(url).toString("base64url").replace(/=+$/, "");
    const r = await fetch(`https://www.virustotal.com/api/v3/urls/${b64}`, { headers: { "x-apikey": key }, signal: AbortSignal.timeout(10000) });
    if (r.status === 404) return { positives: 0, total: 0, clean: true, note: "not previously scanned" };
    if (!r.ok) return { positives: 0, total: 0, error: `VT ${r.status}` };
    const j = await r.json();
    const s = j.data?.attributes?.last_analysis_stats || {};
    return { positives: (s.malicious || 0) + (s.suspicious || 0), total: Object.values(s).reduce((a,b)=>a+b,0), stats: s };
  } catch (e) { return { positives: 0, total: 0, error: String(e).slice(0,120) }; }
}

export function fuse(local = {}, sb = {}, vt = {}) {
  const reasons = [...(local.reasons || [])];
  let vtScore = 50, vtReason = null;
  if (!vt.skipped && !vt.error) {
    if (vt.positives >= 5) { vtScore = 95; vtReason = `VirusTotal ${vt.positives}/${vt.total} flag malicious`; }
    else if (vt.positives >= 2) { vtScore = 80; vtReason = `VirusTotal ${vt.positives}/${vt.total} flag`; }
    else if (vt.positives === 1) { vtScore = 65; vtReason = "VirusTotal 1 engine flag"; }
    else if (vt.total > 0 || vt.clean) { vtScore = 15; vtReason = "VirusTotal clean (0 detections)"; }
  }
  if (vtReason) reasons.push(vtReason);
  // weights: local .6, vt .25, sb veto; missing signals down-weighted
  let final = local.score * 0.7 + vtScore * 0.3;
  if (sb.match) { reasons.unshift(`SafeBrowsing MATCH (${sb.threats?.[0]?.threatType || "UNSAFE"}) - floor HIGH`); final = Math.max(final, 75); }
  if ((vt.positives || 0) >= 5) { final = Math.max(final, 85); reasons.unshift("Veto: 5+ VT engines -> floor CRITICAL"); }
  const score = Math.round(Math.max(0, Math.min(100, final)));
  const band = score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 35 ? "MED" : "LOW";
  return { score, band, level: band, reasons: reasons.slice(0,20), breakdown: { local: local.score, virustotal: vtScore } };
}
