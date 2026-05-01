import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, Upload, FileText, Trash2, Eye,
  FolderPlus, ChevronRight, AlertCircle, Loader2, ExternalLink, Search, Folder, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { saveFolderHandle, loadFolderHandle } from '@/lib/folderDb';

// Module-level persistence — survives re-renders and effect chains
let _savedDirHandle: FileSystemDirectoryHandle | null = null;
let _savedActiveSubject: string | null = null;
let _savedSubjects: string[] = [];
let _savedPath: string[] = [];
let _restoredFromIdb = false;

const PdfManager = () => {
  const [subjects, _setSubjects] = useState<string[]>(_savedSubjects);
  const [activeSubject, _setActiveSubject] = useState<string | null>(_savedActiveSubject);
  // path = nested folder names BELOW the active subject
  const [path, _setPath] = useState<string[]>(_savedPath);
  const [folders, setFolders] = useState<string[]>([]);
  const [pdfs, setPdfs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingContents, setLoadingContents] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [viewPdfUrl, setViewPdfUrl] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(!_restoredFromIdb && !_savedDirHandle);

  // Move dialog state
  const [movingPdf, setMovingPdf] = useState<string | null>(null);
  const [moveTargets, setMoveTargets] = useState<{ subject: string; path: string[]; label: string }[]>([]);
  const [loadingMoveTargets, setLoadingMoveTargets] = useState(false);

  const [browserSupported] = useState(() => 'showDirectoryPicker' in window);

  const setSubjects = useCallback((val: string[] | ((prev: string[]) => string[])) => {
    _setSubjects((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      _savedSubjects = next;
      return next;
    });
  }, []);

  const setActiveSubject = useCallback((val: string | null | ((prev: string | null) => string | null)) => {
    _setActiveSubject((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      _savedActiveSubject = next;
      return next;
    });
  }, []);

  const setPath = useCallback((val: string[] | ((prev: string[]) => string[])) => {
    _setPath((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      _savedPath = next;
      return next;
    });
  }, []);

  const [dirHandle, _setDirHandle] = useState<FileSystemDirectoryHandle | null>(_savedDirHandle);

  const setDirHandle = useCallback((handle: FileSystemDirectoryHandle | null) => {
    _savedDirHandle = handle;
    _setDirHandle(handle);
    if (handle) saveFolderHandle(handle);
  }, []);

  // Restore folder handle from IndexedDB on first mount
  useEffect(() => {
    if (_restoredFromIdb || _savedDirHandle) {
      setRestoring(false);
      return;
    }
    _restoredFromIdb = true;
    (async () => {
      try {
        const handle = await loadFolderHandle();
        if (handle) {
          const perm = await (handle as any).requestPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            setDirHandle(handle);
          }
        }
      } catch {
        // permission denied or handle expired
      }
      setRestoring(false);
    })();
  }, [setDirHandle]);

  // Resolve a directory handle by walking subject + path segments
  const resolveDir = useCallback(async (
    subject: string,
    segs: string[],
    create = false
  ): Promise<FileSystemDirectoryHandle | null> => {
    if (!dirHandle) return null;
    try {
      let cur = await dirHandle.getDirectoryHandle(subject, { create });
      for (const seg of segs) {
        cur = await cur.getDirectoryHandle(seg, { create });
      }
      return cur;
    } catch {
      return null;
    }
  }, [dirHandle]);

  // Load subjects (top-level folders)
  const loadSubjects = useCallback(async () => {
    if (!dirHandle) return;
    setLoading(true);
    setError('');
    try {
      const list: string[] = [];
      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === 'directory') list.push(entry.name);
      }
      list.sort((a, b) => a.localeCompare(b));
      setSubjects(list);
      setActiveSubject((prev) => (prev && list.includes(prev) ? prev : list.length > 0 ? list[0] : null));
    } catch {
      setError('Could not load subjects.');
    }
    setLoading(false);
  }, [dirHandle, setSubjects, setActiveSubject]);

  // Load folders + pdfs at current location
  const loadContents = useCallback(async () => {
    if (!activeSubject || !dirHandle) {
      setFolders([]); setPdfs([]);
      return;
    }
    setLoadingContents(true);
    try {
      const cur = await resolveDir(activeSubject, path);
      if (!cur) { setFolders([]); setPdfs([]); setLoadingContents(false); return; }
      const fs: string[] = [];
      const ps: string[] = [];
      for await (const entry of (cur as any).values()) {
        if (entry.kind === 'directory') fs.push(entry.name);
        else if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) ps.push(entry.name);
      }
      fs.sort((a, b) => a.localeCompare(b));
      ps.sort((a, b) => a.localeCompare(b));
      setFolders(fs);
      setPdfs(ps);
    } catch {
      setError(`Could not load contents.`);
    }
    setLoadingContents(false);
  }, [activeSubject, dirHandle, path, resolveDir]);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);
  useEffect(() => { loadContents(); }, [loadContents]);

  // Reset path when switching subjects
  const switchSubject = (sub: string) => {
    setActiveSubject(sub);
    setPath([]);
    setSearchQuery('');
  };

  // ── Actions ──────────────────────────────────────────────────────
  const createSubject = async () => {
    const name = newSubjectName.trim();
    if (!name || !dirHandle) return;
    try {
      await dirHandle.getDirectoryHandle(name, { create: true });
      setNewSubjectName('');
      setShowNewSubject(false);
      await loadSubjects();
      setActiveSubject(name);
      setPath([]);
    } catch {
      setError(`Could not create subject "${name}".`);
    }
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name || !activeSubject) return;
    if (/[\\/]/.test(name)) { setError('Folder name cannot contain / or \\'); return; }
    try {
      const cur = await resolveDir(activeSubject, path, true);
      if (!cur) throw new Error('no parent');
      await cur.getDirectoryHandle(name, { create: true });
      setNewFolderName('');
      setShowNewFolder(false);
      await loadContents();
    } catch {
      setError(`Could not create folder "${name}".`);
    }
  };

  const deleteSubject = async (name: string) => {
    if (!confirm(`Delete "${name}" and all its contents?`)) return;
    if (!dirHandle) return;
    try {
      await (dirHandle as any).removeEntry(name, { recursive: true });
      if (activeSubject === name) { setActiveSubject(null); setPath([]); }
      await loadSubjects();
    } catch {
      setError(`Could not delete "${name}".`);
    }
  };

  const deleteFolder = async (name: string) => {
    if (!activeSubject) return;
    if (!confirm(`Delete folder "${name}" and all its contents?`)) return;
    try {
      const cur = await resolveDir(activeSubject, path);
      if (!cur) throw new Error('no parent');
      await (cur as any).removeEntry(name, { recursive: true });
      await loadContents();
    } catch {
      setError(`Could not delete "${name}".`);
    }
  };

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeSubject || !dirHandle) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const cur = await resolveDir(activeSubject, path, true);
      if (!cur) throw new Error('no parent');
      for (const file of Array.from(files)) {
        const fh = await cur.getFileHandle(file.name, { create: true });
        const writable = await (fh as any).createWritable();
        await writable.write(file);
        await writable.close();
      }
      await loadContents();
    } catch (err: any) {
      setError(`Could not save PDF: ${err?.message || 'unknown error'}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [activeSubject, dirHandle, path, resolveDir, loadContents]);

  const addPdf = async () => {
    if (!activeSubject || !dirHandle) return;
    setError('');
    fileInputRef.current?.click();
  };

  const openPdf = async (fileName: string) => {
    if (!activeSubject) return;
    try {
      const cur = await resolveDir(activeSubject, path);
      if (!cur) throw new Error('no parent');
      const fh = await cur.getFileHandle(fileName);
      const file = await fh.getFile();
      const url = URL.createObjectURL(file);
      setViewingPdf(fileName);
      setViewPdfUrl(url);
    } catch {
      setError(`Could not open ${fileName}.`);
    }
  };

  const deletePdf = async (fileName: string) => {
    if (!activeSubject) return;
    if (!confirm(`Delete "${fileName}"?`)) return;
    try {
      const cur = await resolveDir(activeSubject, path);
      if (!cur) throw new Error('no parent');
      await (cur as any).removeEntry(fileName);
      await loadContents();
    } catch {
      setError(`Could not delete ${fileName}.`);
    }
  };

  const closeViewer = () => {
    if (viewPdfUrl) URL.revokeObjectURL(viewPdfUrl);
    setViewingPdf(null);
    setViewPdfUrl(null);
  };

  const pickFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setDirHandle(handle);
      setPath([]);
      setError('');
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      if (e.name === 'SecurityError') {
        setError('iframe_blocked');
      } else {
        setError(`Could not access folder: ${e.message || 'unknown error'}`);
      }
    }
  };

  // ── Move PDF ─────────────────────────────────────────────────
  const openMoveDialog = async (fileName: string) => {
    if (!dirHandle) return;
    setMovingPdf(fileName);
    setLoadingMoveTargets(true);
    try {
      const targets: { subject: string; path: string[]; label: string }[] = [];
      const walk = async (dir: FileSystemDirectoryHandle, subject: string, segs: string[]) => {
        const label = segs.length === 0 ? subject : `${subject} / ${segs.join(' / ')}`;
        targets.push({ subject, path: segs, label });
        for await (const entry of (dir as any).values()) {
          if (entry.kind === 'directory') {
            const child = await dir.getDirectoryHandle(entry.name);
            await walk(child, subject, [...segs, entry.name]);
          }
        }
      };
      for (const sub of subjects) {
        try {
          const sh = await dirHandle.getDirectoryHandle(sub);
          await walk(sh, sub, []);
        } catch { /* skip */ }
      }
      // Exclude the current location
      const currentLabel = path.length === 0 ? activeSubject : `${activeSubject} / ${path.join(' / ')}`;
      setMoveTargets(targets.filter((t) => t.label !== currentLabel));
    } catch {
      setError('Could not list destination folders.');
    }
    setLoadingMoveTargets(false);
  };

  const closeMoveDialog = () => {
    setMovingPdf(null);
    setMoveTargets([]);
  };

  const movePdfTo = async (target: { subject: string; path: string[] }) => {
    if (!movingPdf || !activeSubject) return;
    try {
      const src = await resolveDir(activeSubject, path);
      const dst = await resolveDir(target.subject, target.path, true);
      if (!src || !dst) throw new Error('resolve failed');
      const srcFh = await src.getFileHandle(movingPdf);
      const file = await srcFh.getFile();
      const dstFh = await dst.getFileHandle(movingPdf, { create: true });
      const writable = await (dstFh as any).createWritable();
      await writable.write(file);
      await writable.close();
      await (src as any).removeEntry(movingPdf);
      closeMoveDialog();
      await loadContents();
    } catch (e: any) {
      setError(`Could not move file: ${e?.message || 'unknown error'}`);
    }
  };

  const filteredPdfs = pdfs.filter((p) =>
    p.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFolders = folders.filter((f) =>
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Restoring from IDB ─────────────────────────────────────────
  if (restoring) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-foreground">Study Materials</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Restoring folder…</span>
        </div>
      </div>
    );
  }

  // ── No folder picked yet ────────────────────────────────────────
  if (!dirHandle) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-foreground">Study Materials</h2>
        {!browserSupported ? (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Browser Not Supported</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>, or run this app as a desktop executable.
              </p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="text-sm font-medium text-foreground mb-1">Select your StudyFlow folder</p>
              <p className="text-xs text-muted-foreground mb-5">
                Choose a custom folder to organize and store your study materials
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                <Button onClick={pickFolder} className="gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Select Folder
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // ── Main UI ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Study Materials</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Local folder &middot; {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={pickFolder} className="gap-1.5 text-xs">
          <FolderOpen className="w-3.5 h-3.5" />
          Change Folder
        </Button>
      </div>

      {error && error !== 'iframe_blocked' && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-xs underline">dismiss</button>
        </div>
      )}

      {error === 'iframe_blocked' && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            Folder picker is blocked inside the preview iframe.{' '}
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium inline-flex items-center gap-0.5"
            >
              Open in new tab <ExternalLink className="w-3 h-3" />
            </a>{' '}
            and try again.
          </div>
          <button onClick={() => setError('')} className="text-xs underline ml-auto shrink-0">dismiss</button>
        </div>
      )}

      <div className="flex gap-4 min-h-[420px]">
        {/* ── Sidebar: Subjects ────────────────────────────────── */}
        <div className="w-48 shrink-0 rounded-xl bg-card border border-border card-shadow overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subjects</span>
            <button
              onClick={() => setShowNewSubject(true)}
              className="text-muted-foreground hover:text-primary transition-colors"
              title="New subject"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : subjects.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No subjects yet</p>
            ) : (
              subjects.map((sub) => (
                <div key={sub} className="group flex items-center">
                  <button
                    onClick={() => switchSubject(sub)}
                    className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left truncate ${
                      activeSubject === sub
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{sub}</span>
                    {activeSubject === sub && <ChevronRight className="w-3 h-3 ml-auto shrink-0" />}
                  </button>
                  <button
                    onClick={() => deleteSubject(sub)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                    title="Delete subject"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Main: Folder + PDF Grid ─────────────────────────── */}
        <div className="flex-1 min-w-0">
          {!activeSubject ? (
            <div className="h-full flex items-center justify-center rounded-xl border-2 border-dashed border-border">
              <p className="text-sm text-muted-foreground">Select a subject to view contents</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 text-sm flex-wrap">
                <button
                  onClick={() => setPath([])}
                  className={`hover:underline truncate ${path.length === 0 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
                >
                  {activeSubject}
                </button>
                {path.map((seg, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <button
                      onClick={() => setPath(path.slice(0, i + 1))}
                      className={`hover:underline truncate ${i === path.length - 1 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
                    >
                      {seg}
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {path.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 text-xs"
                      onClick={() => setPath(path.slice(0, -1))}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-36"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowNewFolder(true)} className="gap-1.5 shrink-0">
                    <FolderPlus className="w-4 h-4" />
                    New Folder
                  </Button>
                  <Button size="sm" onClick={addPdf} className="gap-1.5 shrink-0">
                    <Upload className="w-4 h-4" />
                    Add PDF
                  </Button>
                </div>
              </div>

              {loadingContents ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : folders.length === 0 && pdfs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 rounded-xl border-2 border-dashed border-border"
                >
                  <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">This folder is empty</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a sub-folder or add a PDF</p>
                </motion.div>
              ) : filteredFolders.length === 0 && filteredPdfs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No matches for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AnimatePresence>
                    {filteredFolders.map((folder) => (
                      <motion.div
                        key={`folder-${folder}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onDoubleClick={() => setPath([...path, folder])}
                        className="group relative bg-card border border-border rounded-xl p-4 card-shadow hover:shadow-md transition-shadow flex flex-col items-center text-center cursor-pointer"
                      >
                        <div className="w-12 h-14 rounded-lg bg-accent/15 flex items-center justify-center mb-3">
                          <Folder className="w-6 h-6 text-accent" />
                        </div>
                        <p className="text-sm font-medium text-foreground break-words w-full" title={folder}>
                          {folder}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">folder</p>

                        <div className="flex gap-1.5 mt-3 w-full">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs gap-1"
                            onClick={() => setPath([...path, folder])}
                          >
                            <FolderOpen className="w-3 h-3" />
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteFolder(folder)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}

                    {filteredPdfs.map((pdf) => (
                      <motion.div
                        key={`pdf-${pdf}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group relative bg-card border border-border rounded-xl p-4 card-shadow hover:shadow-md transition-shadow flex flex-col items-center text-center"
                      >
                        <div className="w-12 h-14 rounded-lg bg-destructive/10 flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6 text-destructive" />
                        </div>
                        <p className="text-sm font-medium text-foreground break-words w-full" title={pdf}>
                          {pdf.replace(/\.pdf$/i, '')}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">.pdf</p>

                        <div className="flex gap-1.5 mt-3 w-full">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs gap-1"
                            onClick={() => openPdf(pdf)}
                          >
                            <Eye className="w-3 h-3" />
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                            onClick={() => openMoveDialog(pdf)}
                            title="Move"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deletePdf(pdf)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── New Subject Dialog ─────────────────────────────────── */}
      <Dialog open={showNewSubject} onOpenChange={setShowNewSubject}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Subject</DialogTitle>
            <DialogDescription>Create a new top-level subject folder.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. Chemistry"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createSubject()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSubject(false)}>Cancel</Button>
            <Button onClick={createSubject} disabled={!newSubjectName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Folder Dialog ─────────────────────────────────── */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>
              Create a sub-folder inside {path.length === 0 ? activeSubject : path[path.length - 1]}.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. DPP, Notes, Lectures"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>Cancel</Button>
            <Button onClick={createFolder} disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Move PDF Dialog ───────────────────────────────────── */}
      <Dialog open={!!movingPdf} onOpenChange={(open) => !open && closeMoveDialog()}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate">Move "{movingPdf}"</DialogTitle>
            <DialogDescription>Choose a destination folder.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {loadingMoveTargets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : moveTargets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No other folders available</p>
            ) : (
              <div className="space-y-1">
                {moveTargets.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => movePdfTo(t)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors"
                  >
                    <Folder className="w-4 h-4 text-accent shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeMoveDialog}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PDF Viewer Modal ──────────────────────────────────── */}
      <Dialog open={!!viewingPdf} onOpenChange={(open) => !open && closeViewer()}>
        <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 py-3 border-b border-border shrink-0">
            <DialogTitle className="text-sm truncate pr-8">{viewingPdf}</DialogTitle>
            <DialogDescription className="sr-only">PDF Viewer</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {viewPdfUrl && (
              <iframe
                src={viewPdfUrl}
                className="w-full h-full border-0 rounded-b-lg"
                title={viewingPdf || 'PDF Viewer'}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PdfManager;
