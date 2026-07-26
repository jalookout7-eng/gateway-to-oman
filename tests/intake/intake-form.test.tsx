import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IntakeForm } from "@/components/intake/IntakeForm";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ success: true, id: "lead-1" }),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function fillRequired() {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane Smith" } });
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: "jane@example.com" },
  });
}

describe("IntakeForm", () => {
  it("renders every option list", () => {
    render(<IntakeForm variant="page" />);
    expect(screen.getByLabelText(/investment timeline/i)).toBeTruthy();
    expect(screen.getByLabelText(/purpose/i)).toBeTruthy();
    expect(screen.getByLabelText(/preferred location/i)).toBeTruthy();
    expect(screen.getByLabelText(/residency/i)).toBeTruthy();
    expect(screen.getByText(/services needed/i)).toBeTruthy();
  });

  it("keeps the honeypot hidden from assistive tech", () => {
    const { container } = render(<IntakeForm variant="page" />);
    const trap = container.querySelector('input[name="_trap"]');
    expect(trap).not.toBeNull();
    expect(trap?.getAttribute("aria-hidden")).toBe("true");
    expect(trap?.getAttribute("tabindex")).toBe("-1");
  });

  it("posts the collected answers to /api/intake", async () => {
    render(<IntakeForm variant="page" />);
    fillRequired();
    fireEvent.change(screen.getByLabelText(/investment timeline/i), {
      target: { value: "Within 6 months" },
    });
    fireEvent.click(screen.getByLabelText("Retirement Planning"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/intake");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.name).toBe("Jane Smith");
    expect(body.email).toBe("jane@example.com");
    expect(body.investmentTimeline).toBe("Within 6 months");
    expect(body.servicesNeeded).toEqual(["Retirement Planning"]);
  });

  it("shows a thank-you state and calls onSubmitted after success", async () => {
    const onSubmitted = vi.fn();
    render(<IntakeForm variant="page" onSubmitted={onSubmitted} />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(screen.getByText(/thank you/i)).toBeTruthy());
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it("surfaces a server error instead of pretending to succeed", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "A valid email address is required" }),
    });
    render(<IntakeForm variant="page" />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() =>
      expect(screen.getByText(/a valid email address is required/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/thank you/i)).toBeNull();
  });

  it("does not double-submit while a request is in flight", async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((r) => { resolveFetch = r; }));
    render(<IntakeForm variant="page" />);
    fillRequired();
    const button = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch({ ok: true, status: 201, json: async () => ({ success: true, id: "x" }) });
  });

  it("uses 16px inputs on mobile so iOS does not auto-zoom", () => {
    const { container } = render(<IntakeForm variant="page" />);
    const fields = container.querySelectorAll(
      'input:not([type=checkbox]):not([aria-hidden="true"]), select, textarea',
    );
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => {
      expect(f.className).toContain("text-base");
    });
  });

  it("contains no em dashes or en dashes in its rendered copy", () => {
    const { container } = render(<IntakeForm variant="page" />);
    expect(container.textContent ?? "").not.toMatch(/[–—]/);
  });
});
