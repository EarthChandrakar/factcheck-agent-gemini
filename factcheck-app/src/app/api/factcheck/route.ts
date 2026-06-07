import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 120;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface Claim {
  id: number;
  claim: string;
  context: string;
}

interface VerificationResult {
  id: number;
  claim: string;
  context: string;
  verdict: 'VERIFIED' | 'INACCURATE' | 'FALSE';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  real_fact: string;
  source: string;
}

// Step 1: Extract claims from PDF using Gemini native PDF support
async function extractClaims(pdfBase64: string): Promise<Claim[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            text: `You are a precise fact-extraction engine. Read this PDF and extract EVERY specific, verifiable claim. Focus on:
- Statistics and percentages (e.g. "70% of users prefer X")
- Financial figures (e.g. "market worth $5B", "revenue of $2M")
- Dates and timeframes (e.g. "launched in 2019", "as of 2024")
- Named quantities (e.g. "over 1 million users", "3 billion devices")
- Technical specifications with specific numbers
- Named events or achievements with specific verifiable details
- Growth rates, rankings, market share claims

Return ONLY a valid JSON array. No explanation, no markdown code fences, no backticks. Just the raw JSON array:
[
  {"id": 1, "claim": "exact quote or close paraphrase of the specific claim", "context": "1-2 sentences of surrounding context from the document"},
  {"id": 2, "claim": "...", "context": "..."}
]

Extract ALL verifiable claims — even ones that seem obvious. Minimum 8 claims, maximum 20.`,
          },
        ],
      },
    ],
  });

  const text = response.text ?? '';
  // Strip any accidental markdown fences
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const claims: Claim[] = JSON.parse(cleaned);
  return claims;
}

// Step 2: Verify a single claim using Google Search grounding
// NOTE: Search grounding and JSON response mode are mutually exclusive in Gemini API
// So we use grounding to get the answer, then parse it from natural language
async function verifyClaim(claim: Claim): Promise<VerificationResult> {
  // Call 1: Use Google Search grounding to research the claim
  const groundedResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You are a ruthless fact-checker. Use Google Search to verify this specific claim:

CLAIM: "${claim.claim}"
CONTEXT: ${claim.context}

Search for the most current, authoritative data on this claim. Then respond in this EXACT format (no deviations):

VERDICT: [VERIFIED or INACCURATE or FALSE]
CONFIDENCE: [HIGH or MEDIUM or LOW]
EXPLANATION: [1-2 sentences explaining your verdict based on what you found]
REAL_FACT: [The actual correct figure/fact if different from the claim, or write "Claim is accurate" if verified]
SOURCE: [The name or URL of the most authoritative source you found]

Verdict rules:
- VERIFIED: Current data confirms the claim is accurate
- INACCURATE: The claim is outdated or has wrong numbers but the topic is real
- FALSE: The claim is fabricated, wildly wrong, or no credible evidence exists`,
          },
        ],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const responseText = groundedResponse.text ?? '';

  // Parse the structured text response
  const verdictMatch = responseText.match(/VERDICT:\s*(VERIFIED|INACCURATE|FALSE)/i);
  const confidenceMatch = responseText.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i);
  const explanationMatch = responseText.match(/EXPLANATION:\s*([\s\S]+?)(?=\n[A-Z_]+:|$)/);
  const realFactMatch = responseText.match(/REAL_FACT:\s*([\s\S]+?)(?=\n[A-Z_]+:|$)/);
  const sourceMatch = responseText.match(/SOURCE:\s*([\s\S]+?)(?=\n[A-Z_]+:|$)/);

  // Also extract grounding sources if available
  const groundingChunks = groundedResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const groundingSource =
    groundingChunks.length > 0
      ? (groundingChunks[0] as { web?: { title?: string; uri?: string } }).web?.title ||
        (groundingChunks[0] as { web?: { title?: string; uri?: string } }).web?.uri ||
        'Google Search'
      : null;

  return {
    id: claim.id,
    claim: claim.claim,
    context: claim.context,
    verdict: (verdictMatch?.[1]?.toUpperCase() as 'VERIFIED' | 'INACCURATE' | 'FALSE') ?? 'FALSE',
    confidence: (confidenceMatch?.[1]?.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW') ?? 'LOW',
    explanation: explanationMatch?.[1]?.trim() ?? 'Could not determine.',
    real_fact: realFactMatch?.[1]?.trim() ?? 'No data found.',
    source: groundingSource ?? sourceMatch?.[1]?.trim() ?? 'N/A',
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured. Add it to your environment variables.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json({ error: 'No PDF uploaded.' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF.' }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 20MB.' }, { status: 400 });
    }

    // Convert to base64 for Gemini
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Step 1: Extract claims
    let claims: Claim[] = [];
    try {
      claims = await extractClaims(base64);
    } catch (e) {
      console.error('Claim extraction failed:', e);
      return NextResponse.json(
        { error: 'Could not extract claims from this PDF. Make sure it contains text (not scanned images).' },
        { status: 422 }
      );
    }

    if (!claims || claims.length === 0) {
      return NextResponse.json(
        { error: 'No verifiable claims found in this document.' },
        { status: 422 }
      );
    }

    // Step 2: Verify claims in parallel (but rate-limit to avoid 429s)
    // Free tier: 10 RPM — process in batches of 5 with a delay
    const batchSize = 5;
    const allResults: VerificationResult[] = [];

    for (let i = 0; i < claims.length; i += batchSize) {
      const batch = claims.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (claim) => {
          try {
            return await verifyClaim(claim);
          } catch (e) {
            console.error(`Failed to verify claim ${claim.id}:`, e);
            return {
              id: claim.id,
              claim: claim.claim,
              context: claim.context,
              verdict: 'FALSE' as const,
              confidence: 'LOW' as const,
              explanation: 'Verification failed. Could not reach web search.',
              real_fact: 'Unable to retrieve data.',
              source: 'N/A',
            };
          }
        })
      );
      allResults.push(...batchResults);

      // Small delay between batches to stay within rate limits
      if (i + batchSize < claims.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const summary = {
      total: allResults.length,
      verified: allResults.filter((r) => r.verdict === 'VERIFIED').length,
      inaccurate: allResults.filter((r) => r.verdict === 'INACCURATE').length,
      false: allResults.filter((r) => r.verdict === 'FALSE').length,
    };

    return NextResponse.json({ results: allResults, summary });
  } catch (error: unknown) {
    console.error('API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
