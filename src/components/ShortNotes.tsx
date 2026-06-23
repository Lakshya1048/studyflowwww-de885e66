import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Sparkles, Loader2, Trash2, Download, X, BookOpen, FileDown, Calculator } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { extractPdfText, extractPdfPagesAsImages } from '@/lib/pdfExtract';
import NotesRenderer, { parseNotes } from './NotesRenderer';

// Print-only renderer: builds clean light-mode card markup the html2canvas exporter can capture.
const PDF_KIND_LABEL: Record<string, string> = {
  concept: 'Concept', formula: 'Formula', comparison: 'Comparison',
  quickfact: 'Quick Fact', exception: 'Exception', trick: 'Memory Trick',
  revision: 'Last-Minute Revision', reaction: 'Reaction', law: 'Law / Principle',
  definition: 'Definition', generic: 'Section',
};

function cleanPdfTitle(t: string) {
  return t.replace(/^[^\p{L}\p{N}]+/u, '').replace(/^(Concept|Formula|Comparison|Quick\s*Fact|Exception|Memory\s*Trick|Last[-\s]*Minute\s*Revision|Reaction|Law|Definition)\s*[—\-:]\s*/i, '');
}

function PdfCardsRender({ markdown }: { markdown: string }) {
  const { hero, sections } = parseNotes(markdown);
  const revision = sections.filter((s) => s.kind === 'revision');
  const rest = sections.filter((s) => s.kind !== 'revision');
  const renderCard = (s: { kind: string; title: string; body: string }, i: number) => (
    <div key={i} className={`pdf-card k-${s.kind}`}>
      <div className="pdf-card-label">{PDF_KIND_LABEL[s.kind] || 'Section'}</div>
      <div className="pdf-card-title">{cleanPdfTitle(s.title)}</div>
      <ReactMarkdown>{s.body}</ReactMarkdown>
    </div>
  );
  return (
    <div>
      {hero && (
        <div className="pdf-hero">
          <div className="pdf-hero-eyebrow">Chapter</div>
          <h1>{hero}</h1>
        </div>
      )}
      <div className="pdf-grid">{rest.map(renderCard)}</div>
      {revision.length > 0 && (
        <>
          <div className="pdf-revision-title">🏆 Last-Minute Revision</div>
          <div className="pdf-grid">{revision.map(renderCard)}</div>
        </>
      )}
    </div>
  );
}

type Intensity = 'quick' | 'standard' | 'detailed' | 'ultra';

const INTENSITY_LIST: { key: Intensity; label: string; desc: string }[] = [
  { key: 'quick', label: 'Quick Revision', desc: '~1 page · highest-yield only' },
  { key: 'standard', label: 'Standard Short Notes', desc: '2-4 pages · all key concepts' },
  { key: 'detailed', label: 'Detailed Exam Notes', desc: '5-8 pages · full coverage' },
  { key: 'ultra', label: 'Ultra-Detailed Notes', desc: 'Every point compressed' },
];

type Mode = 'shortnotes' | 'formula';

type SavedNote = {
  id: string;
  title: string;
  intensity: Intensity;
  mode?: Mode;
  content: string;
  createdAt: string;
};

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/short-notes`;

const ShortNotes = () => {
  const { toast } = useToast();
  const [chapterFile, setChapterFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>('shortnotes');
  const [intensityIdx, setIntensityIdx] = useState(1); // standard
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<{ p: number; t: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState('');
  const [history, setHistory] = useLocalStorage<SavedNote[]>('studyflow-short-notes', []);
  const [viewing, setViewing] = useState<SavedNote | null>(null);

  const chapterInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const intensity = INTENSITY_LIST[intensityIdx].key;

  const generate = async () => {
    if (!chapterFile) {
      toast({ title: 'Upload a chapter PDF first', variant: 'destructive' });
      return;
    }
    setGenerated('');
    setIsExtracting(true);
    setExtractProgress({ p: 0, t: 0 });

    let chapterText = '';
    let referenceText = '';
    let chapterImages: string[] = [];
    let referenceImages: string[] = [];
    try {
      chapterText = await extractPdfText(chapterFile, (p, t) => setExtractProgress({ p, t }));
      // Heuristic: if average chars/page < 80 → treat as scanned/handwritten → render images
      const pageCount = (chapterText.match(/--- Page /g) || []).length || 1;
      if (chapterText.trim().length / pageCount < 80) {
        chapterText = '';
        chapterImages = await extractPdfPagesAsImages(chapterFile, (p, t) => setExtractProgress({ p, t }));
      }
      if (referenceFile) {
        referenceText = await extractPdfText(referenceFile);
        const refPages = (referenceText.match(/--- Page /g) || []).length || 1;
        if (referenceText.trim().length / refPages < 80) {
          referenceText = '';
          referenceImages = await extractPdfPagesAsImages(referenceFile, undefined, { maxPages: 15 });
        }
      }
    } catch (e) {
      toast({ title: 'Could not read PDF', description: e instanceof Error ? e.message : 'Try another file', variant: 'destructive' });
      setIsExtracting(false);
      setExtractProgress(null);
      return;
    }
    setIsExtracting(false);
    setExtractProgress(null);

    if (!chapterText && chapterImages.length === 0) {
      toast({ title: 'Empty PDF', description: 'Could not extract anything from this file.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    let accumulated = '';
    try {
      const resp = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterText: chapterText || undefined,
          chapterImages: chapterImages.length ? chapterImages : undefined,
          referenceText: referenceText || undefined,
          referenceImages: referenceImages.length ? referenceImages : undefined,
          intensity,
          mode,
          chapterName: chapterFile.name.replace(/\.pdf$/i, ''),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed' }));
        if (resp.status === 429) toast({ title: 'Too many requests', description: 'Wait a moment and retry.', variant: 'destructive' });
        else if (resp.status === 402) toast({ title: 'AI limit reached', description: 'Please try again later.', variant: 'destructive' });
        else toast({ title: 'Generation failed', description: err.error || 'Try again', variant: 'destructive' });
        setIsGenerating(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const j = line.slice(6).trim();
          if (j === '[DONE]') break;
          try {
            const parsed = JSON.parse(j);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              accumulated += c;
              setGenerated(accumulated);
            }
          } catch {
            buf = line + '\n' + buf;
            break;
          }
        }
      }

      if (accumulated.trim()) {
        const saved: SavedNote = {
          id: crypto.randomUUID(),
          title: `${chapterFile.name.replace(/\.pdf$/i, '')}${mode === 'formula' ? ' — Formula Sheet' : ''}`,
          intensity,
          mode,
          content: accumulated,
          createdAt: new Date().toISOString(),
        };
        setHistory((prev) => [saved, ...prev].slice(0, 30));
        toast({ title: mode === 'formula' ? 'Formula sheet ready!' : 'Short notes ready!' });
      }
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const download = (note: { title: string; content: string }) => {
    const blob = new Blob([note.content], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title} - short notes.md`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadPdf = async (note: { title: string; content: string; mode?: Mode }) => {
    const isFormula = note.mode === 'formula';
    const { default: ReactDOM } = await import('react-dom/client');
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-99999px;top:0;width:820px;background:#ffffff;color:#0f172a;padding:36px 40px;font-family:Georgia,"Times New Roman",serif;font-size:13px;line-height:1.5;';
    container.className = 'short-notes-pdf-export';
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    root.render(
      <div style={{ color: '#0f172a' }}>
        <style>{`
          .short-notes-pdf-export h1{font-size:22px;font-weight:800;border-bottom:2px solid #0f172a;padding-bottom:6px;margin:0 0 14px;}
          .short-notes-pdf-export h2{font-size:16px;font-weight:700;color:#1e3a8a;margin:14px 0 6px;}
          .short-notes-pdf-export h3{font-size:14px;font-weight:700;color:#334155;margin:10px 0 4px;}
          .short-notes-pdf-export p{margin:4px 0;}
          .short-notes-pdf-export ul,.short-notes-pdf-export ol{margin:4px 0 4px 22px;}
          .short-notes-pdf-export li{margin:2px 0;}
          .short-notes-pdf-export strong{color:#7c2d12;}
          .short-notes-pdf-export blockquote{border-left:3px solid #f59e0b;background:#fffbeb;padding:5px 10px;margin:6px 0;color:#78350f;font-style:italic;}
          .short-notes-pdf-export table{border-collapse:collapse;width:100%;margin:6px 0;font-size:12px;}
          .short-notes-pdf-export th,.short-notes-pdf-export td{border:1px solid #cbd5e1;padding:4px 7px;text-align:left;vertical-align:top;}
          .short-notes-pdf-export th{background:#e2e8f0;font-weight:700;}
          .short-notes-pdf-export code{background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:12px;}
          .short-notes-pdf-export .pdf-card{break-inside:avoid;page-break-inside:avoid;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;margin:8px 0;background:#ffffff;}
          .short-notes-pdf-export .pdf-card .pdf-card-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;font-weight:700;}
          .short-notes-pdf-export .pdf-card .pdf-card-title{font-size:14px;font-weight:800;color:#0f172a;margin:0 0 4px;}
          .short-notes-pdf-export .pdf-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
          .short-notes-pdf-export .pdf-card.k-formula{background:#f5f3ff;border-left:4px solid #7c3aed;}
          .short-notes-pdf-export .pdf-card.k-concept{background:#eff6ff;border-left:4px solid #2563eb;}
          .short-notes-pdf-export .pdf-card.k-definition{background:#f0f9ff;border-left:4px solid #0ea5e9;}
          .short-notes-pdf-export .pdf-card.k-law{background:#eef2ff;border-left:4px solid #4f46e5;}
          .short-notes-pdf-export .pdf-card.k-reaction{background:#fff7ed;border-left:4px solid #ea580c;}
          .short-notes-pdf-export .pdf-card.k-comparison{background:#ecfeff;border-left:4px solid #06b6d4;}
          .short-notes-pdf-export .pdf-card.k-quickfact{background:#fffbeb;border-left:4px solid #f59e0b;}
          .short-notes-pdf-export .pdf-card.k-exception{background:#fff1f2;border-left:4px solid #f43f5e;}
          .short-notes-pdf-export .pdf-card.k-trick{background:#fdf4ff;border-left:4px solid #d946ef;}
          .short-notes-pdf-export .pdf-card.k-revision{background:#ecfdf5;border-left:4px solid #10b981;}
          .short-notes-pdf-export .pdf-hero{border:1px solid #cbd5e1;border-radius:12px;padding:14px 16px;margin-bottom:12px;background:linear-gradient(135deg,#eff6ff,#ffffff);}
          .short-notes-pdf-export .pdf-hero .pdf-hero-eyebrow{font-size:10px;letter-spacing:.2em;color:#2563eb;font-weight:700;text-transform:uppercase;}
          .short-notes-pdf-export .pdf-hero h1{border:none;margin:4px 0 0;padding:0;font-size:24px;}
          .short-notes-pdf-export .pdf-revision-title{display:flex;align-items:center;gap:6px;font-size:16px;font-weight:800;color:#065f46;margin:14px 0 6px;border-top:2px dashed #10b981;padding-top:8px;}
        `}</style>
        {isFormula ? (
          <ReactMarkdown>{note.content}</ReactMarkdown>
        ) : (
          <PdfCardsRender markdown={note.content} />
        )}
      </div>
    );

    await new Promise((r) => setTimeout(r, 300));

    try {
      await (html2pdf() as any)
        .set({
          margin: [8, 8, 10, 8],
          filename: `${note.title} - short notes.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: '.pdf-card' },
        })
        .from(container)
        .save();
    } finally {
      root.unmount();
      container.remove();
    }
  };


  const deleteNote = (id: string) => {
    setHistory((prev) => prev.filter((n) => n.id !== id));
  };

  // ====== Viewing a saved note ======
  if (viewing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => setViewing(null)} className="text-xs text-muted-foreground hover:text-foreground mb-1">← Back to Short Notes</button>
            <h2 className="font-display text-xl font-bold text-foreground">{viewing.title}</h2>
            <p className="text-xs text-muted-foreground">{INTENSITY_LIST.find((i) => i.key === viewing.intensity)?.label} · {new Date(viewing.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => downloadPdf(viewing)} className="gap-1.5">
              <FileDown className="w-4 h-4" /> PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => download(viewing)} className="gap-1.5">
              <Download className="w-4 h-4" /> .md
            </Button>
          </div>
        </div>
        {viewing.mode === 'formula' ? (
          <div className="rounded-xl border border-border bg-card p-5 prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-table:text-foreground">
            <ReactMarkdown>{viewing.content}</ReactMarkdown>
          </div>
        ) : (
          <NotesRenderer markdown={viewing.content} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Short Notes
        </h2>
        <p className="text-sm text-muted-foreground">Upload a chapter PDF — get exam-ready short notes or a complete formula sheet.</p>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border border-border bg-card">
        <button
          onClick={() => setMode('shortnotes')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'shortnotes' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <BookOpen className="w-4 h-4" /> Short Notes
        </button>
        <button
          onClick={() => setMode('formula')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'formula' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Calculator className="w-4 h-4" /> Formula Sheet
        </button>
      </div>


      {/* Upload cards */}
      <div className={`grid ${mode === 'shortnotes' ? 'sm:grid-cols-2' : 'grid-cols-1'} gap-3`}>
        {/* Chapter PDF */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chapter PDF *</p>
          {chapterFile ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground truncate">{chapterFile.name}</span>
              </div>
              <button onClick={() => setChapterFile(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => chapterInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-1.5 py-6 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 transition-colors"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Click to upload</span>
            </button>
          )}
          <input
            ref={chapterInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setChapterFile(f);
              e.target.value = '';
            }}
          />
        </div>

        {/* Reference PDF (short notes mode only) */}
        {mode === 'shortnotes' && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reference Style PDF (optional)</p>
          {referenceFile ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground truncate">{referenceFile.name}</span>
              </div>
              <button onClick={() => setReferenceFile(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => refInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-1.5 py-6 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 transition-colors"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Match this style</span>
            </button>
          )}
          <input
            ref={refInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setReferenceFile(f);
              e.target.value = '';
            }}
          />
        </div>
        )}
      </div>

      {/* Intensity slider (short notes mode only) */}
      {mode === 'shortnotes' && (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">Notes Intensity</p>
          <span className="text-xs text-muted-foreground">{INTENSITY_LIST[intensityIdx].desc}</span>
        </div>
        <Slider
          min={0}
          max={3}
          step={1}
          value={[intensityIdx]}
          onValueChange={(v) => setIntensityIdx(v[0])}
        />
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          {INTENSITY_LIST.map((i, idx) => (
            <span key={i.key} className={idx === intensityIdx ? 'text-primary font-semibold' : ''}>
              {i.label}
            </span>
          ))}
        </div>
      </div>
      )}

      <Button onClick={generate} disabled={!chapterFile || isExtracting || isGenerating} className="w-full gap-2">
        {isExtracting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Reading PDF{extractProgress ? ` (${extractProgress.p}/${extractProgress.t})` : '...'}</>
        ) : isGenerating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generating {mode === 'formula' ? 'formula sheet' : 'notes'}...</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Generate {mode === 'formula' ? 'Formula Sheet' : 'Short Notes'}</>
        )}
      </Button>

      {/* Live output */}
      {(isGenerating || generated) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Generated Notes</p>
            {generated && !isGenerating && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => downloadPdf({ title: chapterFile?.name.replace(/\.pdf$/i, '') || 'notes', content: generated, mode })} className="gap-1.5">
                  <FileDown className="w-3.5 h-3.5" /> PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => download({ title: chapterFile?.name.replace(/\.pdf$/i, '') || 'notes', content: generated })} className="gap-1.5">
                  <Download className="w-3.5 h-3.5" /> .md
                </Button>
              </div>
            )}
          </div>
          {mode === 'formula' ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-table:text-foreground">
              <ReactMarkdown>{generated || '_Streaming..._'}</ReactMarkdown>
            </div>
          ) : (
            <NotesRenderer markdown={generated} />
          )}
        </motion.div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground pt-2">Saved Notes</p>
          {history.map((n) => (
            <div key={n.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <button onClick={() => setViewing(n)} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground">{INTENSITY_LIST.find((i) => i.key === n.intensity)?.label} · {new Date(n.createdAt).toLocaleDateString()}</p>
              </button>
              <button onClick={() => downloadPdf(n)} title="Download PDF" className="p-1.5 text-muted-foreground hover:text-primary rounded">
                <FileDown className="w-4 h-4" />
              </button>
              <button onClick={() => download(n)} title="Download Markdown" className="p-1.5 text-muted-foreground hover:text-foreground rounded">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => deleteNote(n.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShortNotes;
