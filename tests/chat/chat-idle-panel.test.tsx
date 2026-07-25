import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ChatIdlePanel, STARTER_CHIPS } from "@/components/chat/ChatIdlePanel";

afterEach(cleanup);

describe("ChatIdlePanel", () => {
  it("shows the title, subtitle and the AI-advisor badge", () => {
    render(<ChatIdlePanel onStart={() => {}} onMinimize={() => {}} />);
    expect(screen.getByText("Ask Omar")).toBeTruthy();
    expect(screen.getByText(/AI advisor/i)).toBeTruthy();
    expect(screen.getByText(/guidance on investing, relocating/i)).toBeTruthy();
  });

  it("renders exactly three starter chips with the approved copy", () => {
    render(<ChatIdlePanel onStart={() => {}} onMinimize={() => {}} />);
    expect(STARTER_CHIPS).toHaveLength(3);
    STARTER_CHIPS.forEach((chip) => {
      expect(screen.getByRole("button", { name: chip })).toBeTruthy();
    });
  });

  it("sends the chip text through onStart when a chip is clicked", () => {
    const onStart = vi.fn();
    render(<ChatIdlePanel onStart={onStart} onMinimize={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: STARTER_CHIPS[1] }));
    expect(onStart).toHaveBeenCalledWith(STARTER_CHIPS[1]);
  });

  it("sends typed text on submit and clears the field", () => {
    const onStart = vi.fn();
    render(<ChatIdlePanel onStart={onStart} onMinimize={() => {}} />);
    const input = screen.getByPlaceholderText("Ask a question") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Can I get residency?" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(onStart).toHaveBeenCalledWith("Can I get residency?");
    expect(input.value).toBe("");
  });

  it("ignores an empty or whitespace-only submit", () => {
    const onStart = vi.fn();
    render(<ChatIdlePanel onStart={onStart} onMinimize={() => {}} />);
    const input = screen.getByPlaceholderText("Ask a question");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(onStart).not.toHaveBeenCalled();
  });

  it("calls onMinimize from the minimize control", () => {
    const onMinimize = vi.fn();
    render(<ChatIdlePanel onStart={() => {}} onMinimize={onMinimize} />);
    fireEvent.click(screen.getByRole("button", { name: /minimi[sz]e/i }));
    expect(onMinimize).toHaveBeenCalledOnce();
  });

  it("links the disclaimer to /terms", () => {
    render(<ChatIdlePanel onStart={() => {}} onMinimize={() => {}} />);
    const link = screen.getByRole("link", { name: /disclaimer/i });
    expect(link.getAttribute("href")).toBe("/terms");
  });
});
