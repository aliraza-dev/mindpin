// What both note editors share: the one on the phone's rich-text engine (RichNoteEditor.tsx)
// and the one built in the app (NoteEditor.tsx), used when the build has no such engine.

// A note longer than this is refused, so one note cannot fill the phone (design.md: limits).
export const NOTE_LIMIT = 20_000;

export type NoteEditorProps = {
  initialBody: string;
  // Opens with the keyboard up on the first line (R10.1).
  autoFocus: boolean;
  onChange: (body: string) => void;
  onBack: () => void;
  onLink: () => void;
  // When the note was last edited, shown above it; now, for a new note.
  editedAt: number;
  topInset?: number;
  bottomInset?: number;
};

// "28 November 2026 at 7:10 pm", in the phone's own language and clock.
export function editedText(time: number): string {
  return new Date(time).toLocaleString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
