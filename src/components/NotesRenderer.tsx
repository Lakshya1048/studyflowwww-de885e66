import ReactMarkdown from 'react-markdown';
import { BookOpen, Calculator, Table2, Zap, AlertTriangle, Brain, Trophy, Sparkles, FlaskConical, Lightbulb } from 'lucide-react';

/**
 * Parses a markdown string into "cards" split by `## ` headings.
 * The chapter `# H1` is kept as a hero title.
 * Each H2 section becomes a typed card based on the emoji / keyword prefix.
 */

type CardKind =
  | 'concept'
  | 'formula'
  | 'comparison'
  | 'quickfact'
  | 'exception'
  | 'trick'
  | 'revision'
  | 'reaction'
  | 'law'
  | 'definition'
  | 'generic';

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

function parse(md: string): { hero: string | null; sections: Section[] } {
  const lines = md.split(/\r?\n/);
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
    if (h1 && !hero && sections.length === 0 && !cur) {
      hero = h1[1].trim();
      continue;
    }
    if (h2) {
      flush();
      const title = h2[1].trim();
      cur = { kind: classify(title), title, body: '' };
      continue;
    }
    if (cur) buf.push(line);
    else if (line.trim()) {
      // pre-H2 content → throw into an intro concept card
      cur = { kind: 'concept', title: 'Overview', body: '' };
      buf.push(line);
    }
  }
  flush();
  return { hero, sections };
}

const KIND_STYLE: Record<CardKind, { ring: string; bg: string; icon: JSX.Element; label: string }> = {
  concept:    { ring: 'border-l-4 border-l-blue-500',     bg: 'bg-blue-500/5',     icon: <BookOpen className="w-4 h-4" />,         label: 'Concept' },
  formula:    { ring: 'border-l-4 border-l-violet-500',   bg: 'bg-violet-500/5',   icon: <Calculator className="w-4 h-4" />,       label: 'Formula' },
  comparison: { ring: 'border-l-4 border-l-cyan-500',     bg: 'bg-cyan-500/5',     icon: <Table2 className="w-4 h-4" />,           label: 'Comparison' },
  quickfact:  { ring: 'border-l-4 border-l-amber-500',    bg: 'bg-amber-500/10',   icon: <Zap className="w-4 h-4" />,              label: 'Quick Fact' },
  exception:  { ring: 'border-l-4 border-l-rose-500',     bg: 'bg-rose-500/10',    icon: <AlertTriangle className="w-4 h-4" />,    label: 'Exception' },
  trick:      { ring: 'border-l-4 border-l-fuchsia-500',  bg: 'bg-fuchsia-500/5',  icon: <Brain className="w-4 h-4" />,            label: 'Memory Trick' },
  revision:   { ring: 'border-l-4 border-l-emerald-500',  bg: 'bg-emerald-500/10', icon: <Trophy className="w-4 h-4" />,           label: 'Last-Minute Revision' },
  reaction:   { ring: 'border-l-4 border-l-orange-500',   bg: 'bg-orange-500/5',   icon: <FlaskConical className="w-4 h-4" />,     label: 'Reaction' },
  law:        { ring: 'border-l-4 border-l-indigo-500',   bg: 'bg-indigo-500/5',   icon: <Sparkles className="w-4 h-4" />,         label: 'Law / Principle' },
  definition: { ring: 'border-l-4 border-l-sky-500',      bg: 'bg-sky-500/5',      icon: <Lightbulb className="w-4 h-4" />,        label: 'Definition' },
  generic:    { ring: 'border-l-4 border-l-border',       bg: 'bg-card',           icon: <BookOpen className="w-4 h-4" />,         label: 'Section' },
};

function Card({ s }: { s: Section }) {
  const st = KIND_STYLE[s.kind];
  // Formula cards: render body in a monospace highlight if it looks like just formulas
  const isFormulaOnly = s.kind === 'formula' && s.body.split('\n').filter(Boolean).length <= 6 && !/\|/.test(s.body);
  return (
    <div className={`rounded-xl border border-border ${st.bg} ${st.ring} p-4 break-inside-avoid`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-background/70 text-foreground/80">
          {st.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{st.label}</p>
          <h3 className="text-sm font-bold text-foreground leading-tight truncate">{s.title.replace(/^[^\p{L}\p{N}]+/u, '')}</h3>
        </div>
      </div>
      <div
        className={`prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-table:text-foreground prose-table:my-2 prose-th:bg-muted prose-th:font-semibold prose-td:align-top prose-table:text-xs ${
          isFormulaOnly ? 'font-mono text-base text-center' : ''
        }`}
      >
        <ReactMarkdown>{s.body}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function NotesRenderer({ markdown }: { markdown: string }) {
  const { hero, sections } = parse(markdown || '');
  // Revision cards always rendered last & full-width
  const revision = sections.filter((s) => s.kind === 'revision');
  const rest = sections.filter((s) => s.kind !== 'revision');

  return (
    <div className="space-y-4">
      {hero && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold mb-1">Chapter</p>
          <h1 className="font-display text-2xl font-extrabold text-foreground leading-tight">{hero}</h1>
        </div>
      )}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rest.map((s, i) => <Card key={i} s={s} />)}
        </div>
      )}
      {revision.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-500" />
            <h2 className="font-display text-lg font-bold text-foreground">Last-Minute Revision</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {revision.map((s, i) => <Card key={i} s={s} />)}
          </div>
        </div>
      )}
      {!hero && sections.length === 0 && (
        <div className="text-sm text-muted-foreground italic">Streaming…</div>
      )}
    </div>
  );
}
