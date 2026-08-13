import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./ToastContext";

function TriggerButton({ message = "Something happened", variant }: { message?: string; variant?: "success" | "error" | "info" }) {
  const { showToast } = useToast();
  return <button onClick={() => showToast(message, variant)}>trigger</button>;
}

describe("ToastProvider / useToast", () => {
  it("renders a toast with the given message after showToast is called", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TriggerButton message="Saved successfully" variant="success" />
      </ToastProvider>
    );

    expect(screen.queryByText("Saved successfully")).not.toBeInTheDocument();

    await user.click(screen.getByText("trigger"));

    expect(await screen.findByText("Saved successfully")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("dismisses a toast when its close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TriggerButton message="Dismiss me" />
      </ToastProvider>
    );

    await user.click(screen.getByText("trigger"));
    expect(await screen.findByText("Dismiss me")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Dismiss"));
    expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument();
  });

  it("throws when useToast is used outside a ToastProvider", () => {
    // Suppress the expected React error boundary console noise for this case.
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    function Broken() {
      useToast();
      return null;
    }
    expect(() => render(<Broken />)).toThrow(
      "useToast must be used within ToastProvider"
    );
    spy.mockRestore();
  });
});
