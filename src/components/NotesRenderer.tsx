import ReactMarkdown from 'react-markdown';
import {
  BookOpen, Calculator, Table2, Zap, AlertTriangle, Brain, Trophy, Sparkles,
  FlaskConical, Lightbulb, ScrollText, Star,
} from 'lucide-react';

/**
 * Premium card-based notes renderer.
 * Parses an AI-generated markdown chapter into typed visual cards.
 * Every "## " heading becomes its own card (kind chosen by emoji/keyword).
 * The "# " heading becomes the hero chapter banner.
 */

type CardKind =
  | 'concept' | 'formula' | 'comparison' | 'quickfact' | 'exception'
  | 'trick' | 'revision' | 'reaction' | 'law' | 'definition' | 'generic';

type Section = { kind: CardKind; title: string; body: string };

const KIND_RULES: { kind: CardKind; test: RegExp }[] = [
  { kind: 'revision',  test: /last\s*minute|revision|golden|🏆|⭐/i },
  { kind: 'formula',   test: /formula|equation|🧮|🟰|∑|∫/i },
  { kind: 'comparison',test: /comparison|vs\.?\b|differen|📊|🆚/i },
  { kind: 'quickfact', test: /quick\s*fact|important\s*fact|fact|key\s*point|⚡|💡|📌/i },
  { kind: 'exception', test: /exception|common\s*mistake|caution|warning|⚠️|❗/i },
  { kind: 'trick',     test: /trick|mnemonic|memory|shortcut|hack|🧠|🪄/i },
  { kind: 'reaction',  test: /reaction|mechanism|🧪|⚗️/i },
  { kind: 'law',       test: /\blaw\b|principle|theorem|postulate|📜/i },
  { kind: 'definition',test: /definition|defn\.?|what is|📖/i },
  { kind: 'concept',   test: /concept|overview|introduction|📘|🔬/i },
];

function classify(title: string): CardKind {
  for (const r of KIND_RULES) if (r.test.test(title)) return r.kind;
  return 'generic';
}

export function parseNotes(md: string): { hero: string | null; sections: Section[] } {
  const lines = (md || '').split(/\r?\n/);
  let hero: string | null = null;
  const sections: Section[] = [];
  let cur: Section | null = null;
  const buf: string[] = [];

  const flush = () => {
    if (cur) {
      cur.body = buf.join('\n').trim();
      sections.push(cur);
      buf.length = 0;
    }
  };

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    if (h1 && !hero && sections.length === 0 && !cur) { hero = h1[1].trim(); continue; }
    if (h2) {
      flush();
      const title = h2[1].trim();
      cur = { kind: classify(title), title, body: '' };
      continue;
    }
    if (cur) buf.push(line);
    else if (line.trim()) {
      cur = { kind: 'concept', title: 'Overview', body: '' };
      buf.push(line);
    }
  }
  flush();
  return { hero, sections };
}

type Style = {
  ring: string;       // left bar tailwind class
  bg: string;         // card background
  chip: string;       // label chip bg
  icon: JSX.Element;
  label: string;
};

const STYLE: Record<CardKind, Style> = {
  concept:    { ring: 'border-l-[6px] border-l-blue-500',    bg: 'bg-blue-500/[0.06]',    chip: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',     icon: <BookOpen className="w-4 h-4" />,      label: 'Concept' },
  formula:    { ring: 'border-l-[6px] border-l-violet-500',  bg: 'bg-violet-500/[0.06]',  chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', icon: <Calculator className="w-4 h-4" />,    label: 'Formula' },
  comparison: { ring: 'border-l-[6px] border-l-cyan-500',    bg: 'bg-cyan-500/[0.06]',    chip: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',     icon: <Table2 className="w-4 h-4" />,        label: 'Comparison' },
  quickfact:  { ring: 'border-l-[6px] border-l-amber-500',   bg: 'bg-amber-500/[0.10]',   chip: 'bg-amber-500/20 text-amber-800 dark:text-amber-200',  icon: <Zap className="w-4 h-4" />,           label: 'Quick Fact' },
  exception:  { ring: 'border-l-[6px] border-l-rose-500',    bg: 'bg-rose-500/[0.08]',    chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',     icon: <AlertTriangle className="w-4 h-4" />, label: 'Exception' },
  trick:      { ring: 'border-l-[6px] border-l-fuchsia-500', bg: 'bg-fuchsia-500/[0.06]', chip: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300', icon: <Brain className="w-4 h-4" />,      label: 'Memory Trick' },
  revision:   { ring: 'border-l-[6px] border-l-emerald-500', bg: 'bg-emerald-500/[0.10]', chip: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200', icon: <Trophy className="w-4 h-4" />,     label: 'Revision' },
  reaction:   { ring: 'border-l-[6px] border-l-orange-500',  bg: 'bg-orange-500/[0.06]',  chip: 'bg-orange-500/15 text-orange-700 dark:text-orange-300', icon: <FlaskConical className="w-4 h-4" />, label: 'Reaction' },
  law:        { ring: 'border-l-[6px] border-l-indigo-500',  bg: 'bg-indigo-500/[0.06]',  chip: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300', icon: <ScrollText className="w-4 h-4" />,  label: 'Law / Principle' },
  definition: { ring: 'border-l-[6px] border-l-sky-500',     bg: 'bg-sky-500/[0.06]',     chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',        icon: <Lightbulb className="w-4 h-4" />,     label: 'Definition' },
  generic:    { ring: 'border-l-[6px] border-l-slate-400',   bg: 'bg-card',               chip: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',  icon: <Sparkles className="w-4 h-4" />,      label: 'Section' },
};

function cleanTitle(t: string) {
  return t.replace(/^[^\p{L}\p{N}]+/u, '').replace(/^(Concept|Formula|Comparison|Quick\s*Fact|Exception|Memory\s*Trick|Last[-\s]*Minute\s*Revision|Reaction|Law|Definition)\s*[—\-:]\s*/i, '');
}

function isFormulaOnly(s: Section) {
  if (s.kind !== 'formula') return false;
  const lines = s.body.split('\n').filter(Boolean);
  return lines.length <= 8 && !/\|/.test(s.body);
}

function Card({ s }: { s: Section }) {
  const st = STYLE[s.kind];
  const formulaOnly = isFormulaOnly(s);
  return (
    <div className={`rounded-xl border border-border/60 shadow-sm ${st.bg} ${st.ring} p-4 break-inside-avoid`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${st.chip}`}>
          {st.icon}
          {st.label}
        </span>
      </div>
      <h3 className="text-[15px] font-extrabold text-foreground leading-snug mb-2">{cleanTitle(s.title)}</h3>
      <div
        className={`prose prose-sm dark:prose-invert max-w-none
          prose-headings:font-display prose-headings:text-foreground
          prose-p:text-foreground prose-p:my-1.5
          prose-li:text-foreground prose-li:my-0.5
          prose-strong:text-foreground prose-strong:font-bold
          prose-em:text-muted-foreground
          prose-table:text-foreground prose-table:my-2 prose-table:text-xs
          prose-th:bg-muted prose-th:text-foreground prose-th:font-semibold prose-th:p-2
          prose-td:p-2 prose-td:align-top prose-td:border prose-td:border-border
          prose-th:border prose-th:border-border
          prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px]
          ${formulaOnly ? 'font-mono text-center [&_p]:text-base [&_strong]:text-primary [&_strong]:text-lg' : ''}`}
      >
        <ReactMarkdown>{s.body}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function NotesRenderer({ markdown }: { markdown: string }) {
  const { hero, sections } = parseNotes(markdown);
  const revision = sections.filter((s) => s.kind === 'revision');
  const rest = sections.filter((s) => s.kind !== 'revision');

  return (
    <div className="space-y-5">
      {hero && (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
          <p className="relative text-[10px] uppercase tracking-[0.25em] text-primary font-bold mb-1">Chapter</p>
          <h1 className="relative font-display text-3xl font-extrabold text-foreground leading-tight">{hero}</h1>
          <div className="relative mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>{sections.length} revision cards · {revision.length} last-minute</span>
          </div>
        </div>
      )}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rest.map((s, i) => <Card key={i} s={s} />)}
        </div>
      )}
      {revision.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-t-2 border-dashed border-emerald-500/40 pt-4">
            <Trophy className="w-5 h-5 text-emerald-500" />
            <h2 className="font-display text-xl font-extrabold text-foreground">Last-Minute Revision</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {revision.map((s, i) => <Card key={i} s={s} />)}
          </div>
        </div>
      )}
      {!hero && sections.length === 0 && (
        <div className="text-sm text-muted-foreground italic animate-pulse">Streaming notes…</div>
      )}
    </div>
  );
}
