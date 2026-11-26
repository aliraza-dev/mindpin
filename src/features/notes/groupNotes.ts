// The order and sections of the Notes list (R10.6, R10.7). Pure: the caller supplies the notes
// and the current time, and turns each section into a translated heading.

export type NoteSection<T> =
  | { kind: 'pinned' | 'today' | 'previous7' | 'previous30'; notes: T[] }
  // month is 1 to 12.
  | { kind: 'month'; year: number; month: number; notes: T[] };

type Groupable = { pinned: boolean; updatedAt: number };

// Whole calendar days between two moments, in the phone's time zone. Counting calendar dates
// rather than hours keeps this right across daylight-saving changes.
function calendarDaysBetween(earlier: Date, later: Date): number {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day(later) - day(earlier)) / 86_400_000);
}

// Pinned notes first, then Today, Previous 7 days (1 to 7 days ago), Previous 30 days (8 to 30
// days ago), then one section per month, newest first. Notes within a section are ordered by
// last edit, newest first. Empty sections are left out.
export function groupNotes<T extends Groupable>(notes: T[], now: number): NoteSection<T>[] {
  const today = new Date(now);
  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  const pinned: T[] = [];
  const recent: Record<'today' | 'previous7' | 'previous30', T[]> = {
    today: [],
    previous7: [],
    previous30: [],
  };
  const months: Extract<NoteSection<T>, { kind: 'month' }>[] = [];

  for (const note of sorted) {
    if (note.pinned) {
      pinned.push(note);
      continue;
    }
    const edited = new Date(note.updatedAt);
    const daysAgo = calendarDaysBetween(edited, today);
    if (daysAgo <= 0) recent.today.push(note);
    else if (daysAgo <= 7) recent.previous7.push(note);
    else if (daysAgo <= 30) recent.previous30.push(note);
    else {
      const year = edited.getFullYear();
      const month = edited.getMonth() + 1;
      const last = months[months.length - 1];
      // Notes arrive newest first, so a note either joins the latest month or starts an older one.
      if (last && last.year === year && last.month === month) last.notes.push(note);
      else months.push({ kind: 'month', year, month, notes: [note] });
    }
  }

  const sections: NoteSection<T>[] = [
    { kind: 'pinned', notes: pinned },
    { kind: 'today', notes: recent.today },
    { kind: 'previous7', notes: recent.previous7 },
    { kind: 'previous30', notes: recent.previous30 },
    ...months,
  ];
  return sections.filter((section) => section.notes.length > 0);
}
