import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, FilePlus, Folder, FileText, Trash2, ChevronRight, ChevronDown, ArrowLeft, Edit3, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface NoteItem {
  id: string;
  type: 'folder' | 'note';
  name: string;
  parentId: string | null;
  content?: string;
  subject?: string;
  createdAt: string;
  updatedAt: string;
}

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Computer Science', 'General'];

const NotesManager = () => {
  const [items, setItems] = useLocalStorage<NoteItem[]>('studyflow-notes', []);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState(SUBJECTS[0]);
  const [noteContent, setNoteContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const currentItems = items.filter((i) => i.parentId === currentFolder);
  const folders = currentItems.filter((i) => i.type === 'folder');
  const notes = currentItems.filter((i) => i.type === 'note');

  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'My Notes' }];
    let folderId = currentFolder;
    while (folderId) {
      const folder = items.find((i) => i.id === folderId);
      if (folder) {
        crumbs.splice(1, 0, { id: folder.id, name: folder.name });
        folderId = folder.parentId;
      } else break;
    }
    return crumbs;
  };

  const addFolder = () => {
    if (!newName.trim()) return;
    const folder: NoteItem = {
      id: Date.now().toString(),
      type: 'folder',
      name: newName.trim(),
      parentId: currentFolder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, folder]);
    setNewName('');
    setShowAddFolder(false);
  };

  const addNote = () => {
    if (!newName.trim()) return;
    const note: NoteItem = {
      id: Date.now().toString(),
      type: 'note',
      name: newName.trim(),
      parentId: currentFolder,
      content: noteContent,
      subject: newSubject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, note]);
    setNewName('');
    setNoteContent('');
    setShowAddNote(false);
  };

  const deleteItem = (id: string) => {
    // Delete item and all children recursively
    const toDelete = new Set<string>();
    const findChildren = (parentId: string) => {
      toDelete.add(parentId);
      items.filter((i) => i.parentId === parentId).forEach((i) => findChildren(i.id));
    };
    findChildren(id);
    setItems((prev) => prev.filter((i) => !toDelete.has(i.id)));
  };

  const startEditNote = (note: NoteItem) => {
    setEditingNote(note.id);
    setEditContent(note.content || '');
  };

  const saveNote = (id: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, content: editContent, updatedAt: new Date().toISOString() } : i
      )
    );
    setEditingNote(null);
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Notes & Folders</h2>
          <p className="text-sm text-muted-foreground">
            {items.filter((i) => i.type === 'note').length} notes, {items.filter((i) => i.type === 'folder').length} folders
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setShowAddFolder(!showAddFolder); setShowAddNote(false); }} className="gap-1.5">
            <FolderPlus className="w-4 h-4" />
            Folder
          </Button>
          <Button size="sm" onClick={() => { setShowAddNote(!showAddNote); setShowAddFolder(false); }} className="gap-1.5">
            <FilePlus className="w-4 h-4" />
            Note
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.id ?? 'root'} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            <button
              onClick={() => setCurrentFolder(crumb.id)}
              className={`hover:underline ${
                crumb.id === currentFolder ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Add folder form */}
      <AnimatePresence>
        {showAddFolder && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="p-4 rounded-lg bg-card border border-border card-shadow space-y-3">
              <Input placeholder="Folder name..." value={newName} onChange={(e) => setNewName(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" onClick={addFolder}>Create Folder</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddFolder(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add note form */}
      <AnimatePresence>
        {showAddNote && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="p-4 rounded-lg bg-card border border-border card-shadow space-y-3">
              <Input placeholder="Note title..." value={newName} onChange={(e) => setNewName(e.target.value)} />
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Textarea
                placeholder="Write your note here..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addNote}>Add Note</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddNote(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back button */}
      {currentFolder && (
        <button
          onClick={() => {
            const parent = items.find((i) => i.id === currentFolder);
            setCurrentFolder(parent?.parentId ?? null);
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      {/* Folders */}
      {folders.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Folders</p>
          {folders.map((folder) => {
            const childCount = items.filter((i) => i.parentId === folder.id).length;
            return (
              <motion.div
                key={folder.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border card-shadow cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setCurrentFolder(folder.id)}
              >
                <Folder className="w-5 h-5 text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">{childCount} items</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteItem(folder.id); }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Notes */}
      {notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</p>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-card border border-border card-shadow"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{note.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {note.subject && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{note.subject}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => (editingNote === note.id ? saveNote(note.id) : startEditNote(note))}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {editingNote === note.id ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteItem(note.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {editingNote === note.id ? (
                <Textarea
                  className="mt-3"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={5}
                  autoFocus
                />
              ) : note.content ? (
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{note.content}</p>
              ) : null}
            </motion.div>
          ))}
        </div>
      )}

      {currentItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Folder className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">This folder is empty</p>
          <p className="text-xs">Create a folder or add a note</p>
        </div>
      )}
    </div>
  );
};

export default NotesManager;
