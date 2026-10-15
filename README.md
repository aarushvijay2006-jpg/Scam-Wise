# PhishGuard — SKIT025: AI-Based Phishing, Scam Message and Malicious URL Detection

IEEE-IGNITE Hackathon | 14–15th Oct, 2026

## 1. Problem Statement (in simple words)

Build an AI system that looks at an **email / SMS / social-media message + any URLs inside it** and tells the user:

> Is this phishing / scam / malicious? Why?

Expected by judges:
1. **Analyze message text and URLs** — accept paste text + link.
2. **Identify suspicious linguistic patterns** — urgency, prize, threat, fake sender, grammar tricks.
3. **Extract and analyze URLs, domains and metadata** — short links, lookalike domains, new domain age, http vs https, many redirects, IP-based host.
4. **Give a verdict with confidence score + reason** — Safe / Suspicious / Malicious + explanation + source refs.

Optional winning extras: risk score bar, highlighted trigger words, URL breakdown, scan history, breach check hint.

## 2. Recommended Simple Stack (hackathon-friendly)

Goal: **simple to build in 2 days + responsive on mobile/desktop.**

| Layer | Choice | Why |
|---|---|---|
| Frontend | HTML + Tailwind CSS (CDN) + Vanilla JS | No build step, responsive utilities out of the box |
| Backend | Python + FastAPI | Simple REST API, easy ML integration |
| ML (text) | scikit-learn TF-IDF + Logistic Regression | Trains in seconds, explainable |
| ML (URL) | Rule engine + tldextract + optional XGBoost | Catches lookalike/shortened/suspicious TLDs |
| Explainability | Keyword highlights + SHAP-style weights (simple version) | Satisfies "why flagged" |
| DB | SQLite | Zero setup, scan history |
| Charts | Plain CSS bars (no lib needed) | Keeps UI light and responsive |

> If your team knows React, swap frontend to React + Vite + Tailwind. API stays the same.

## 3. How This Stack Keeps It Simple and Responsive

- **One API, any screen:** `POST /api/scan { text, url }` returns JSON. Same API serves mobile, desktop, and demo.
- **Tailwind for responsiveness:** `flex flex-col md:flex-row`, `grid grid-cols-1 md:grid-cols-3`, `max-w-3xl mx-auto px-4`. No custom media queries.
- **Mobile-first UI:** single input card on phone → 2-column (input + result) on desktop.
- **Fast demo:** rule + ML hybrid works offline; no GPU / API key needed for judges.
- **Modular pipeline:** `ingest → NLP analyzer → URL extractor → risk classifier → explainer → alert UI`. Each file is independent, so teammates can work in parallel.

## 4. Project Structure

```
phishguard/
├── README.md
├── backend/
│   ├── main.py            # FastAPI app + /api/scan
│   ├── text_model.py      # TF-IDF + LogisticRegression
│   ├── url_analyzer.py    # domain, TLD, shortening, punycode checks
│   ├── explainer.py       # trigger words + confidence
│   └── db.py              # SQLite scan history
├── frontend/
│   └── index.html         # Tailwind responsive UI
├── data/
│   └── samples.csv        # phishing / legit examples
└── requirements.txt
```

## 5. Quick Start

```bash
# 1. Backend
pip install fastapi uvicorn scikit-learn tldextract pydantic
uvicorn backend.main:app --reload

# 2. Frontend (option A: simplest)
# just open frontend/index.html, set API_URL = http://localhost:8000

# 3. Test scan
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"text":"URGENT! Your account blocked. Verify at http://paypa1-secure.top/login","url":"http://paypa1-secure.top/login"}'
```

`requirements.txt`:
```
fastapi
uvicorn
scikit-learn
tldextract
pydantic
```

## 6. Minimal API Contract

`POST /api/scan`
```json
{ "text": "message body", "url": "https://..." }
```
Response:
```json
{
  "verdict": "Malicious",
  "score": 0.92,
  "signals": ["lookalike domain: paypa1", "urgency words: URGENT, blocked", "http + new TLD .top"],
  "url_info": { "domain": "paypa1-secure.top", "shortened": false, "https": false },
  "explanation": "Domain mimics paypal + urgency language. Do not click."
}
```

## 7. Detection Logic (simple but effective)

Text signals: `urgent, immediately, blocked, verify, prize, lottery, free, click, login, otp, bank, kyc`.
URL signals:
- URL shortener (`bit.ly`, `tinyurl`, `t.co`)
- `@`, many subdomains, long hex strings
- Punycode / lookalike (`paypa1`, `arnazon`, `0` vs `o`)
- Free / risky TLD (`.top`, `.xyz`, `.tk`)
- `http://` login page, IP host (`http://192.168...`)
- Domain age < 30 days (if WHOIS available, else flag unknown)

Score = `0.6 * text_model_prob + 0.4 * url_risk`. Thresholds: `<0.35 Safe`, `0.35–0.7 Suspicious`, `>0.7 Malicious`.

## 8. Responsive UI Checklist

- [ ] `meta viewport` tag
- [ ] One column on mobile, two on `md:`+
- [ ] Big tap targets, min text `text-base`
- [ ] Result card: color-coded (green / amber / red) + score bar + reasons list
- [ ] Works without JS framework — plain fetch to FastAPI

## 9. Demo Script (3 min)

1. Paste legit mail → Safe (low score).
2. Paste phishing SMS + malicious URL → Malicious + highlighted words + URL breakdown.
3. Show history + responsive resize (mobile view).
4. Close with "confidence + source refs".

## 10. Team Split (4 people)

- Member 1: frontend `index.html` responsive UI
- Member 2: `text_model.py` + training data
- Member 3: `url_analyzer.py` + explainer
- Member 4: `main.py` API + DB + README/demo
