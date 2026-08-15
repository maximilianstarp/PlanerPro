import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimeSlotList from "./TimeSlotList";
import type { TimeSlot } from "@/types";

describe("TimeSlotList", () => {
  it("renders one row per slot", () => {
    const slots: TimeSlot[] = [
      { day: "Mon", start: "08:00", end: "10:00" },
      { day: "Tue", start: "12:00", end: "14:00" },
    ];
    render(<TimeSlotList slots={slots} onChange={jest.fn()} />);

    expect(screen.getAllByDisplayValue("08:00")).toHaveLength(1);
    expect(screen.getAllByDisplayValue("12:00")).toHaveLength(1);
  });

  it("calls onChange with an appended default slot when adding one", async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(<TimeSlotList slots={[]} onChange={handleChange} />);

    await user.click(screen.getByText(/Add time slot/i));

    expect(handleChange).toHaveBeenCalledWith([{ day: "Mon", start: "08:00", end: "10:00" }]);
  });

  it("calls onChange without the removed slot when its delete button is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    const slots: TimeSlot[] = [
      { day: "Mon", start: "08:00", end: "10:00" },
      { day: "Tue", start: "12:00", end: "14:00" },
    ];
    render(<TimeSlotList slots={slots} onChange={handleChange} />);

    // Delete buttons don't have accessible names beyond the icon; grab them
    // by role and use the first one (the Monday row).
    const deleteButtons = screen.getAllByRole("button").filter((b) => !b.textContent?.includes("Add time slot"));
    await user.click(deleteButtons[0]);

    expect(handleChange).toHaveBeenCalledWith([slots[1]]);
  });
});
