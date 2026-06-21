import { create } from 'zustand';
import type { NoteItem } from '../api/notes';
import * as notesApi from '../api/notes';

interface NoteStore {
  notes: NoteItem[];
  loading: boolean;
  editingNoteId: string | null;

  loadNotes: (workspaceId: string) => Promise<void>;
  createNote: (workspaceId: string, content: string) => Promise<NoteItem>;
  updateNote: (noteId: string, data: { content?: string; topic?: string; difficulty?: string; importance?: number }) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  setEditingNoteId: (id: string | null) => void;
}

export const useNoteStore = create<NoteStore>()((set, get) => ({
  notes: [],
  loading: false,
  editingNoteId: null,

  loadNotes: async (workspaceId) => {
    set({ loading: true });
    try {
      const notes = await notesApi.fetchNotes(workspaceId);
      set({ notes, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createNote: async (workspaceId, content) => {
    const note = await notesApi.createNote(workspaceId, content);
    const { notes } = get();
    set({ notes: [note, ...notes] });
    return note;
  },

  updateNote: async (noteId, data) => {
    const updated = await notesApi.updateNote(noteId, data);
    const { notes } = get();
    set({
      notes: notes.map((n) => (n.id === noteId ? updated : n)),
    });
  },

  deleteNote: async (noteId) => {
    await notesApi.deleteNote(noteId);
    const { notes, editingNoteId } = get();
    set({
      notes: notes.filter((n) => n.id !== noteId),
      editingNoteId: editingNoteId === noteId ? null : editingNoteId,
    });
  },

  setEditingNoteId: (id) => set({ editingNoteId: id }),
}));
