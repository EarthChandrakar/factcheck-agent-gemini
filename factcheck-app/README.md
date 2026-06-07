# FactCheck Agent 🔍

AI-powered PDF fact-checker using **Gemini 2.5 Flash** + **Google Search Grounding** — 100% free.

**Live Demo:** add your Vercel URL here after deployment

---

## What It Does

1. **Upload** any PDF
2. **Extract** — Gemini identifies every verifiable claim (stats, dates, figures)
3. **Verify** — Each claim is searched live via Google Search grounding
4. **Report** — Every claim flagged as:
   - ✅ **VERIFIED** — matches current data
   - ⚠️ **INACCURATE** — outdated or wrong numbers
   - ❌ **FALSE** — fabricated or no evidence found

---

## Free API Setup (2 minutes, no credit card)

### Get your Gemini API Key
1. Go to **https://aistudio.google.com/apikey**
2. Sign in with any Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIza...`)

**Free tier:** 10 requests/min · 250 requests/day · Completely free, no card needed

---

## Deploy to Vercel (Free)

### Step 1: Push to GitHub
```bash
# In the factcheck-app folder:
git init
git add .
git commit -m "Initial commit — FactCheck Agent"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/factcheck-agent.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to **https://vercel.com** → sign up with GitHub (free)
2. Click **"Add New Project"** → import `factcheck-agent`
3. Under **Environment Variables**, add:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** `AIza...` (your key from above)
4. Click **Deploy**
5. ✅ Your app is live at `https://your-project.vercel.app`

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create your .env.local file
cp .env.local.example .env.local
# Edit .env.local → paste your GEMINI_API_KEY

# 3. Run locally
npm run dev
# Open http://localhost:3000
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 + TypeScript |
| AI Model | Gemini 2.5 Flash (Google) |
| Web Search | Google Search Grounding (built-in) |
| PDF Reading | Gemini native PDF support |
| Deployment | Vercel (free tier) |
| Cost | $0 — fully free |

---

## How It Works

```
PDF Upload
    │
    ▼
Gemini reads full PDF natively (no parsing library needed)
    │
    ▼
Extracts 8–20 specific verifiable claims as structured JSON
    │
    ▼
For each claim (parallel batches of 5):
    Gemini 2.5 Flash + Google Search Grounding
    → Searches live web for current data
    → Compares claim vs. real-world facts
    → Returns: VERIFIED / INACCURATE / FALSE
    │
    ▼
Results rendered with verdict + real fact + source
```

---

## Catching the Trap Document

Designed to flag:
- **Fabricated stats** → FALSE (no web evidence found)
- **Outdated figures** → INACCURATE (correct current number shown)
- **Wrong attributions** → FALSE (cross-referenced against named sources)
- **Hallucinated events** → FALSE (Google Search finds no record)

---

## Project Structure

```
factcheck-app/
├── src/app/
│   ├── api/factcheck/route.ts   # Gemini AI fact-checking engine
│   ├── page.tsx                 # Main UI
│   ├── layout.tsx               # Root layout + fonts
│   └── globals.css              # All styles
├── vercel.json                  # Deployment config
├── .env.local.example           # API key template
├── package.json
└── README.md
```
