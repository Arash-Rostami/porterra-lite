export interface Reminder {
  id: string;
  custKey: string | null;
  company: string | null;
  dueDate: string | null;
  dueTime: string | null;
  forAgent: string | null;
  text: string | null;
  createdAt: number | null;
  done: boolean;
}
