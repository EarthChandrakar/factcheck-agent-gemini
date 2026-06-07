# FactCheck Agent 🔍

### Live Application

🔗 [[ Vercel URL](https://factcheck-agent-gemini.vercel.app/)]
🔗 [[DEmo][(https://drive.google.com/file/d/1jDEkzjl8Fnhu15HgRt3eUWBtfJ1FHxWW/view?usp=sharing)

---

## Overview

FactCheck Agent is an AI-powered web application that automatically verifies claims contained in PDF documents.

The application extracts factual claims such as statistics, dates, financial figures, and technical statements, then cross-checks them against live web information to determine their accuracy.

---

## What It Does

### Upload

Users upload any PDF document.

### Extract

Gemini identifies verifiable claims including:

* Statistics
* Dates
* Financial figures
* Technical statements

### Verify

Each claim is validated using live web search and grounding.

### Report

Claims are classified as:

✅ **Verified** — Matches current information

⚠️ **Inaccurate** — Outdated or partially incorrect

❌ **False** — Unsupported or fabricated

---

## Key Features

* Automated PDF claim extraction
* Live web verification
* Evidence-backed fact checking
* Claim classification (Verified, Inaccurate, False)
* Source-supported verification results

---

## Tech Stack

| Layer          | Technology                |
| -------------- | ------------------------- |
| Framework      | Next.js 15 + TypeScript   |
| AI Model       | Gemini 2.5 Flash          |
| Verification   | Google Search Grounding   |
| PDF Processing | Gemini Native PDF Support |
| Deployment     | Vercel                    |

---

## How It Works

PDF Upload

↓

Claim Extraction

↓

Live Web Verification

↓

Fact Validation

↓

Verification Report

---

## Designed to Detect

* Fabricated statistics
* Outdated figures
* Incorrect attributions
* Hallucinated events
* Unsupported claims

---

## Outcome

FactCheck Agent helps marketers, researchers, and business professionals validate information before publication, reducing the risk of sharing inaccurate or outdated content.
