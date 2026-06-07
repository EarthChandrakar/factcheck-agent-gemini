'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, RotateCcw,
  CheckCircle2, AlertTriangle, XCircle, Zap
} from 'lucide-react';

interface ClaimResult {
  id: number;
  claim: string;
  context: string;
  verdict: 'VERIFIED' | 'INACCURATE' | 'FALSE';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  real_fact: string;
  source: string;
}

interface Summary {
  total: number;
  verified: number;
  inaccurate: number;
  false: number;
}

const STEPS = [
  'Reading PDF with Gemini…',
  'Extracting verifiable claims…',
  'Running Google Search on each claim…',
  'Cross-referencing live web data…',
  'Computing verdicts…',
];

function VerdictIcon({ v }: { v: string }) {
  if (v === 'VERIFIED')   return <CheckCircle2 size={11} />;
  if (v === 'INACCURATE') return <AlertTriangle size={11} />;
  return <XCircle size={11} />;
}

export default function Home() {
  const [file, setFile]       = useState<File | null>(null);
  const [over, setOver]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState(0);
  const [results, setResults] = useState<ClaimResult[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ticker   = useRef<ReturnType<typeof setInterval> | null>(null);

  const pick = (f: File) => {
    if (f.type !== 'application/pdf') { setError('Please upload a PDF file.'); return; }
    if (f.size > 20 * 1024 * 1024)   { setError('File too large. Max 20 MB.'); return; }
    setError(null); setFile(f); setResults(null); setSummary(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) pick(f);
  }, []);

  const analyze = async () => {
    if (!file) return;
    setLoading(true); setStep(0); setError(null); setResults(null); setSummary(null);

    let s = 0;
    ticker.current = setInterval(() => {
      s = Math.min(s + 1, STEPS.length - 1);
      setStep(s);
    }, 5000);

    try {
      const fd = new FormData();
      fd.append('pdf', file);
      const res  = await fetch('/api/factcheck', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Something went wrong.'); }
      else { setResults(data.results); setSummary(data.summary); }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      if (ticker.current) clearInterval(ticker.current);
      setLoading(false);
    }
  };

  const reset = () => { setFile(null); setResults(null); setSummary(null); setError(null); };

  const fmt = (b: number) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="header">
        <div className="badge">
          <span className="badge-dot" />
          Live Web Verification
        </div>

        <h1>
          Fact<span className="grad">Check</span>
          <br />Agent
        </h1>

        <p className="subtitle">
          Upload any PDF. Gemini AI extracts every verifiable claim and
          cross-references it against live Google Search results — flagging
          inaccuracies instantly.
        </p>

        <div className="powered">
          Powered by&nbsp;<span>Gemini 2.5 Flash</span>&nbsp;+&nbsp;<span>Google Search Grounding</span>
        </div>
      </header>

      {/* ── Upload phase ── */}
      {!results && !loading && (
        <>
          <div
            className={`drop-zone${over ? ' over' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
          >
            <input
              ref={inputRef} type="file" accept=".pdf"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && pick(e.target.files[0])}
            />
            <div className="drop-icon"><Upload size={22} /></div>
            <div className="drop-title">{over ? 'Drop it!' : 'Drop your PDF here'}</div>
            <div className="drop-sub">or <strong>click to browse</strong> · max 20 MB · PDF only</div>
          </div>

          {file && (
            <div className="file-pill">
              <FileText size={17} />
              <span className="file-name">{file.name}</span>
              <span className="file-size">{fmt(file.size)}</span>
            </div>
          )}

          {error && <div className="error">{error}</div>}

          <button className="btn-run" onClick={analyze} disabled={!file}>
            <Zap size={15} />
            Analyze &amp; Fact-Check
          </button>
        </>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="loading">
          <div className="spinner" />
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`step${i < step ? ' done' : i === step ? ' active' : ''}`}
            >
              {i < step ? '✓' : i === step ? '▸' : '○'} {s}
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {results && summary && (
        <>
          <button className="btn-reset" onClick={reset}>
            <RotateCcw size={13} /> Analyze another document
          </button>

          {/* Summary cards */}
          <div className="summary">
            <div className="sum-card v">
              <div className="sum-num">{summary.verified}</div>
              <div className="sum-label">✓ Verified</div>
            </div>
            <div className="sum-card i">
              <div className="sum-num">{summary.inaccurate}</div>
              <div className="sum-label">⚠ Inaccurate</div>
            </div>
            <div className="sum-card f">
              <div className="sum-num">{summary.false}</div>
              <div className="sum-label">✕ False</div>
            </div>
          </div>

          <div className="res-header">
            {summary.total} claims analyzed · {file?.name}
          </div>

          {/* Claim cards */}
          {results.map(r => (
            <div key={r.id} className={`card ${r.verdict}`}>
              <div className="card-top">
                <span className={`verdict-pill ${r.verdict}`}>
                  <VerdictIcon v={r.verdict} />
                  {r.verdict}
                </span>
                <div className="claim-text">"{r.claim}"</div>
              </div>

              <div className="card-body">
                <div className="row">
                  <span className="lbl">Finding</span>
                  <span className="val">{r.explanation}</span>
                </div>

                {r.real_fact && r.real_fact !== 'Claim is accurate' && (
                  <div className="row">
                    <span className="lbl">Real fact</span>
                    <span className="val highlight">{r.real_fact}</span>
                  </div>
                )}

                <div className="row">
                  <span className="lbl">Source</span>
                  <span className="val">
                    {r.source.startsWith('http') ? (
                      <a href={r.source} target="_blank" rel="noopener noreferrer">{r.source}</a>
                    ) : r.source}
                  </span>
                </div>

                <div className="row">
                  <span className="lbl">Confidence</span>
                  <span className={`chip ${r.confidence}`}>{r.confidence}</span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      <footer className="footer">
        <span>FactCheck Agent · Gemini 2.5 Flash + Google Search</span>
        <span>Built for CogCulture Assessment</span>
      </footer>
    </div>
  );
}
