import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, Upload, FileText, Trash2, Eye,
  FolderPlus, ChevronRight, AlertCircle, Loader2, ExternalLink, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from '@/components/ui/dialog';

const BASE_DIR = 'D:\\StudyFlow';

// Module-level persistence — survives re-renders and effect chains
let _savedDirHandle: FileSystemDirectoryHandle | null = null;
let _savedActiveSubject: string | null = null;
let _savedSubjects: string[] = [];
let _savedPdfs: string[] = [];

const PdfManager = () => {
  const [subjects, _setSubjects] = useState<string[]>(_savedSubjects);
  const [activeSubject, _setActiveSubject] = useState<string | null>(_savedActiveSubject);
  const [pdfs, _setPdfs] = useState<string[]>(_savedPdfs);
  const [loading, setLoading] = useState(false);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [viewPdfUrl, setViewPdfUrl] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const api = typeof window !== 'undefined' ? window.api : undefined;
  const isElectron = !!api;

  // Wrap setters to also persist to module-level
  const setSubjects = useCallback((val: string[] | ((prev: string[]) => string[])) => {
    _setSubjects((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      _savedSubjects = next;
      return next;
    });
  }, []);

  const setPdfs = useCallback((val: string[] | ((prev: string[]) => string[])) => {
    _setPdfs((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      _savedPdfs = next;
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

  // ── Fallback for browser (File System Access API) ────────────────
  const [dirHandle, _setDirHandle] = useState<FileSystemDirectoryHandle | null>(_savedDirHandle);
  const [browserSupported] = useState(() => 'showDirectoryPicker' in window);

  const setDirHandle = useCallback((handle: FileSystemDirectoryHandle | null) => {
    _savedDirHandle = handle;
    _setDirHandle(handle);
  }, []);

  // Load subjects
  const loadSubjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isElectron && api) {
        const subs = await api.getSubjects();
        setSubjects(subs);
        setActiveSubject((prev) => (prev ? prev : subs.length > 0 ? subs[0] : null));
      } else if (dirHandle) {
        const folders: string[] = [];
        for await (const entry of (dirHandle as any).values()) {
          if (entry.kind === 'directory') folders.push(entry.name);
        }
        folders.sort((a, b) => a.localeCompare(b));
        setSubjects(folders);
        setActiveSubject((prev) => (prev ? prev : folders.length > 0 ? folders[0] : null));
      }
    } catch {
      setError('Could not load subjects.');
    }
    setLoading(false);
  }, [api, isElectron, dirHandle]);

  // Load PDFs for active subject
  const loadPdfs = useCallback(async () => {
    if (!activeSubject) { setPdfs([]); return; }
    setLoadingPdfs(true);
    try {
      if (isElectron && api) {
        const files = await api.getPdfs(activeSubject);
        setPdfs(files);
      } else if (dirHandle) {
        const subDir = await dirHandle.getDirectoryHandle(activeSubject);
        const files: string[] = [];
        for await (const entry of (subDir as any).values()) {
          if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
            files.push(entry.name);
          }
        }
        files.sort((a, b) => a.localeCompare(b));
        setPdfs(files);
      }
    } catch {
      setError(`Could not load PDFs for ${activeSubject}.`);
    }
    setLoadingPdfs(false);
  }, [activeSubject, api, isElectron, dirHandle]);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);
  useEffect(() => { loadPdfs(); }, [loadPdfs]);

  // ── Actions ──────────────────────────────────────────────────────
  const createSubject = async () => {
    const name = newSubjectName.trim();
    if (!name) return;
    try {
      if (isElectron && api) {
        await api.createSubject(name);
      } else if (dirHandle) {
        await dirHandle.getDirectoryHandle(name, { create: true });
      }
      setNewSubjectName('');
      setShowNewSubject(false);
      await loadSubjects();
      setActiveSubject(name);
    } catch {
      setError(`Could not create subject "${name}".`);
    }
  };

  const deleteSubject = async (name: string) => {
    if (!confirm(`Delete "${name}" and all its PDFs?`)) return;
    try {
      if (isElectron && api) {
        await api.deleteSubject(name);
      } else if (dirHandle) {
        await (dirHandle as any).removeEntry(name, { recursive: true });
      }
      if (activeSubject === name) setActiveSubject(null);
      await loadSubjects();
    } catch {
      setError(`Could not delete "${name}".`);
    }
  };

  // Handle file selection from the hidden input
  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeSubject || !dirHandle) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const subDir = await dirHandle.getDirectoryHandle(activeSubject, { create: true });
      for (const file of Array.from(files)) {
        const fh = await subDir.getFileHandle(file.name, { create: true });
        const writable = await (fh as any).createWritable();
        await writable.write(file);
        await writable.close();
      }
      await loadPdfs();
    } catch (err: any) {
      setError(`Could not save PDF: ${err?.message || 'unknown error'}`);
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [activeSubject, dirHandle, loadPdfs]);

  const addPdf = async () => {
    if (!activeSubject) return;
    setError('');
    try {
      if (isElectron && api) {
        const paths = await api.showOpenDialog({
          filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
          properties: ['openFile', 'multiSelections'],
        });
        for (const p of paths) {
          await api.addPdf(activeSubject, p);
        }
        await loadPdfs();
      } else if (dirHandle) {
        // Trigger the persistent hidden file input
        fileInputRef.current?.click();
      }
    } catch (err: any) {
      setError(`Could not add PDF: ${err?.message || 'unknown error'}`);
    }
  };

  const openPdf = async (fileName: string) => {
    if (!activeSubject) return;
    try {
      if (isElectron && api) {
        const fullPath = await api.getPdfPath(activeSubject, fileName);
        setViewingPdf(fileName);
        setViewPdfUrl(`file://${fullPath}`);
      } else if (dirHandle) {
        const subDir = await dirHandle.getDirectoryHandle(activeSubject);
        const fh = await subDir.getFileHandle(fileName);
        const file = await fh.getFile();
        const url = URL.createObjectURL(file);
        setViewingPdf(fileName);
        setViewPdfUrl(url);
      }
    } catch {
      setError(`Could not open ${fileName}.`);
    }
  };

  const deletePdf = async (fileName: string) => {
    if (!activeSubject) return;
    if (!confirm(`Delete "${fileName}"?`)) return;
    try {
      if (isElectron && api) {
        await api.deletePdf(activeSubject, fileName);
      } else if (dirHandle) {
        const subDir = await dirHandle.getDirectoryHandle(activeSubject);
        await (subDir as any).removeEntry(fileName);
      }
      await loadPdfs();
    } catch {
      setError(`Could not delete ${fileName}.`);
    }
  };

  const closeViewer = () => {
    if (viewPdfUrl && !isElectron) URL.revokeObjectURL(viewPdfUrl);
    setViewingPdf(null);
    setViewPdfUrl(null);
  };

  // ── Browser fallback: pick folder ────────────────────────────────
  const pickFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setDirHandle(handle);
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

  const filteredPdfs = pdfs.filter((p) =>
    p.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── No Electron + no folder picked ──────────────────────────────
  if (!isElectron && !dirHandle) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-foreground">PDF Manager</h2>
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
      {/* Hidden persistent file input for PDF uploads */}
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
          <h2 className="font-display text-xl font-bold text-foreground">PDF Manager</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isElectron ? BASE_DIR : 'Local folder'} &middot; {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!isElectron && (
          <Button size="sm" variant="outline" onClick={pickFolder} className="gap-1.5 text-xs">
            <FolderOpen className="w-3.5 h-3.5" />
            Change Folder
          </Button>
        )}
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
                    onClick={() => setActiveSubject(sub)}
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

        {/* ── Main: PDF Grid ──────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {!activeSubject ? (
            <div className="h-full flex items-center justify-center rounded-xl border-2 border-dashed border-border">
              <p className="text-sm text-muted-foreground">Select a subject to view PDFs</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg font-semibold text-foreground truncate">{activeSubject}</h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search PDFs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-36"
                    />
                  </div>
                  <Button size="sm" onClick={addPdf} className="gap-1.5 shrink-0">
                    <Upload className="w-4 h-4" />
                    Add PDF
                  </Button>
                </div>
              </div>

              {loadingPdfs ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : pdfs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 rounded-xl border-2 border-dashed border-border"
                >
                  <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">No PDFs in {activeSubject}</p>
                  <p className="text-xs text-muted-foreground mt-1">Click "Add PDF" to get started</p>
                </motion.div>
              ) : filteredPdfs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No PDFs match "{searchQuery}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <AnimatePresence>
                    {filteredPdfs.map((pdf) => (
                      <motion.div
                        key={pdf}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group relative bg-card border border-border rounded-xl p-4 card-shadow hover:shadow-md transition-shadow flex flex-col items-center text-center"
                      >
                        <div className="w-12 h-14 rounded-lg bg-destructive/10 flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6 text-destructive" />
                        </div>
                        <p className="text-xs font-medium text-foreground truncate w-full" title={pdf}>
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
            <DialogDescription>Create a new subject folder for your PDFs.</DialogDescription>
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
