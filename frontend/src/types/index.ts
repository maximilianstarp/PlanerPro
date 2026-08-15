// Shared domain types for the scheduling app. Kept as plain interfaces
// (matching the JSON shapes the Flask API sends/receives) rather than
// classes, since nothing here carries behavior.

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface TimeSlot {
  day: Weekday;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export interface ColorPreset {
  name: string;
  bg: string;
  border: string;
  text: string;
}

// One module (course) as entered by the user: a set of mandatory
// lecture/lab slots, plus zero or more mutually-exclusive tutorial group
// options (the optimizer picks exactly one group per module).
export interface Module {
  id: string;
  name: string;
  color: ColorPreset;
  lectures: TimeSlot[];
  labs: TimeSlot[];
  tutorials: TimeSlot[][];
}

// A slot as it comes back from /api/optimize, annotated with which
// module/color it belongs to for rendering.
export interface ScheduledSlot extends TimeSlot {
  name: string;
  color?: ColorPreset;
}

export interface Plan {
  score: number;
  conflicts: number;
  slots: ScheduledSlot[];
}

export interface ProjectSummary {
  id: number;
  name: string;
  created_at: string;
}

export interface ProjectDetail {
  id: number;
  name: string;
  input_modules: Module[];
  updated_at: string | null;
}

export interface AuthUser {
  username: string;
}
