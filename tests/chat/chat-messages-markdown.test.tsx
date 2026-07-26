import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ChatMessages } from "@/components/chat/ChatMessages";

afterEach(cleanup);

describe("ChatMessages markdown", () => {
  it("renders **bold** as a <strong>, not literal asterisks", () => {
    render(
      <ChatMessages
        messages={[{ role: "assistant", content: "are you looking to **move** or not" }]}
        isTyping={false}
      />,
    );
    const strong = screen.getByText("move");
    expect(strong.tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  it("renders visitor messages as plain text without parsing", () => {
    render(
      <ChatMessages messages={[{ role: "user", content: "2 * 3 = 6" }]} isTyping={false} />,
    );
    expect(screen.getByText("2 * 3 = 6")).toBeTruthy();
  });
});
