import { getMinutesFromTimeString, groupOverlappingSlots, slotsForDay } from "./schedule";
import type { ScheduledSlot } from "@/types";

describe("getMinutesFromTimeString", () => {
  it("converts HH:MM to minutes since midnight", () => {
    expect(getMinutesFromTimeString("00:00")).toBe(0);
    expect(getMinutesFromTimeString("08:00")).toBe(480);
    expect(getMinutesFromTimeString("09:30")).toBe(570);
    expect(getMinutesFromTimeString("23:59")).toBe(1439);
  });
});

function slot(day: ScheduledSlot["day"], start: string, end: string, name = "X"): ScheduledSlot {
  return { day, start, end, name };
}

describe("groupOverlappingSlots", () => {
  it("puts non-overlapping slots into their own groups", () => {
    const slots = [slot("Mo", "08:00", "10:00"), slot("Mo", "10:00", "12:00")];
    const groups = groupOverlappingSlots(slots);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveLength(1);
    expect(groups[1]).toHaveLength(1);
  });

  it("puts overlapping slots into the same group", () => {
    const slots = [slot("Mo", "08:00", "10:00"), slot("Mo", "09:00", "11:00")];
    const groups = groupOverlappingSlots(slots);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });

  it("handles a chain that overlaps transitively through the group", () => {
    // A overlaps B, B overlaps C, but A and C don't directly overlap.
    // They should still end up in the same group since B links them.
    const a = slot("Mo", "08:00", "10:00");
    const b = slot("Mo", "09:00", "11:00");
    const c = slot("Mo", "10:30", "12:00");
    const groups = groupOverlappingSlots([c, a, b]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(3);
  });

  it("sorts each group by start time", () => {
    const early = slot("Mo", "08:00", "09:00");
    const late = slot("Mo", "10:00", "11:00");
    const groups = groupOverlappingSlots([late, early]);
    expect(groups.map((g) => g[0].start)).toEqual(["08:00", "10:00"]);
  });

  it("returns an empty array for no slots", () => {
    expect(groupOverlappingSlots([])).toEqual([]);
  });
});

describe("slotsForDay", () => {
  it("only includes slots for the requested day", () => {
    const slots = [slot("Mo", "08:00", "10:00"), slot("Di", "08:00", "10:00")];
    const groups = slotsForDay(slots, "Mo");
    expect(groups).toHaveLength(1);
    expect(groups[0][0].day).toBe("Mo");
  });
});
