import type { ScheduledSlot, Weekday } from "@/types";

/** Minutes since 00:00, e.g. "09:30" -> 570. */
export function getMinutesFromTimeString(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Group a day's slots into clusters of mutually-overlapping slots, each
 * cluster sorted by start time. Used by the weekly calendar view to lay
 * overlapping slots side by side instead of stacking them.
 */
export function groupOverlappingSlots(slots: ScheduledSlot[]): ScheduledSlot[][] {
  const sorted = [...slots].sort(
    (a, b) => getMinutesFromTimeString(a.start) - getMinutesFromTimeString(b.start)
  );

  const groups: ScheduledSlot[][] = [];
  let currentGroup: ScheduledSlot[] = [];

  for (const slot of sorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(slot);
      continue;
    }

    const overlapsGroup = currentGroup.some((groupSlot) => {
      const s1Start = getMinutesFromTimeString(slot.start);
      const s1End = getMinutesFromTimeString(slot.end);
      const s2Start = getMinutesFromTimeString(groupSlot.start);
      const s2End = getMinutesFromTimeString(groupSlot.end);
      return s1Start < s2End && s2Start < s1End;
    });

    if (overlapsGroup) {
      currentGroup.push(slot);
    } else {
      groups.push(currentGroup);
      currentGroup = [slot];
    }
  }

  if (currentGroup.length > 0) groups.push(currentGroup);
  return groups;
}

/** All slots for a single weekday, grouped for side-by-side rendering. */
export function slotsForDay(slots: ScheduledSlot[], day: Weekday): ScheduledSlot[][] {
  return groupOverlappingSlots(slots.filter((s) => s.day === day));
}
