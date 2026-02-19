import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Upload, FileText, Trash2, ExternalLink, FolderCog, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfMeta {
  name: string;
  size: number;
  lastModified: number;
}

const PdfManager = () => {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [pdfs, setPdfs] = useState<PdfMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supported] = useState(() => 'showDirectoryPicker' in window);

  // Try to restore saved directory handle from IndexedDB
  useEffect(() => {
    if (!supported) return;
    restoreHandle();
  }, [supported]);

  const restoreHandle = async () => {
    try {
      const db = await openDB();
      const tx = db.transaction('handles', 'readonly');
      const store = tx.objectStore('handles');
      const req = store.get('pdf-folder');
      req.onsuccess = async () => {
        const handle = req.result as FileSystemDirectoryHandle | undefined;
        if (handle) {
          // Verify permission
          const perm = await (handle as any).queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            setDirHandle(handle);
            loadPdfs(handle);
          }
        }
      };
    } catch {
      // IndexedDB not available or handle expired
    }
  };

  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('studyflow-fs', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('handles');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };

  const saveHandle = async (handle: FileSystemDirectoryHandle) => {
    try {
      const db = await openDB();
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, 'pdf-folder');
    } catch {
      // ignore
    }
  };

  const pickFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setDirHandle(handle);
      await saveHandle(handle);
      await loadPdfs(handle);
      setError('');
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError('Could not access folder. Please try again.');
      }
    }
  };

  const loadPdfs = async (handle: FileSystemDirectoryHandle) => {
    setLoading(true);
    const files: PdfMeta[] = [];
    try {
      for await (const entry of (handle as any).values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
          const file: File = await entry.getFile();
          files.push({ name: file.name, size: file.size, lastModified: file.lastModified });
        }
      }
      files.sort((a, b) => b.lastModified - a.lastModified);
      setPdfs(files);
    } catch {
      setError('Could not read folder. Please re-select it.');
      setDirHandle(null);
    }
    setLoading(false);
  };

  const uploadPdf = async () => {
    if (!dirHandle) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files) return;
      setLoading(true);
      for (const file of Array.from(input.files)) {
        try {
          const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
          const writable = await (fileHandle as any).createWritable();
          await writable.write(file);
          await writable.close();
        } catch {
          setError(`Failed to save ${file.name}`);
        }
      }
      await loadPdfs(dirHandle);
    };
    input.click();
  };

  const openPdf = async (name: string) => {
    if (!dirHandle) return;
    try {
      const fileHandle = await dirHandle.getFileHandle(name);
      const file = await fileHandle.getFile();
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
      // Revoke after a delay so the tab can load
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setError(`Could not open ${name}`);
    }
  };

  const deletePdf = async (name: string) => {
    if (!dirHandle) return;
    try {
      await (dirHandle as any).removeEntry(name);
      await loadPdfs(dirHandle);
    } catch {
      setError(`Could not delete ${name}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!supported) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-foreground">PDF Manager</h2>
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Browser Not Supported</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your browser doesn't support local folder access. Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">PDF Manager</h2>
          <p className="text-sm text-muted-foreground">
            {dirHandle ? `${pdfs.length} PDF${pdfs.length !== 1 ? 's' : ''} in folder` : 'Select a folder to get started'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={pickFolder} className="gap-1.5">
            <FolderCog className="w-4 h-4" />
            {dirHandle ? 'Change' : 'Pick'} Folder
          </Button>
          {dirHandle && (
            <Button size="sm" onClick={uploadPdf} className="gap-1.5">
              <Upload className="w-4 h-4" />
              Add PDF
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-xs underline">dismiss</button>
        </div>
      )}

      {!dirHandle && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 border-2 border-dashed border-border rounded-xl"
        >
          <FolderOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground mb-1">No folder selected</p>
          <p className="text-xs text-muted-foreground mb-4">Pick a folder on your PC to store and manage PDFs</p>
          <Button onClick={pickFolder} className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Select Folder
          </Button>
        </motion.div>
      )}

      {dirHandle && !loading && pdfs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No PDFs in this folder</p>
          <p className="text-xs">Click "Add PDF" to save PDFs here</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading PDFs...</div>
      )}

      <AnimatePresence>
        {pdfs.map((pdf) => (
          <motion.div
            key={pdf.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border card-shadow hover:bg-muted/30 transition-colors"
          >
            <FileText className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{pdf.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{formatSize(pdf.size)}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(pdf.lastModified).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => openPdf(pdf.name)}
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Open PDF"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={() => deletePdf(pdf.name)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Delete PDF"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {dirHandle && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          PDFs are saved directly to your PC — not in the browser.
        </p>
      )}
    </div>
  );
};

export default PdfManager;
