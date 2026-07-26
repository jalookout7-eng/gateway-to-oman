import { describe, it, expect } from "vitest";
import { parseInline } from "@/lib/chat/markdown";

describe("parseInline", () => {
  it("returns a single text node for plain text", () => {
    expect(parseInline("hello world")).toEqual([{ type: "text", value: "hello world" }]);
  });

  it("parses **bold**", () => {
    expect(parseInline("are you looking to **move and start a business**?")).toEqual([
      { type: "text", value: "are you looking to " },
      { type: "bold", value: "move and start a business" },
      { type: "text", value: "?" },
    ]);
  });

  it("parses *italic*", () => {
    expect(parseInline("that is *important* here")).toEqual([
      { type: "text", value: "that is " },
      { type: "italic", value: "important" },
      { type: "text", value: " here" },
    ]);
  });

  it("parses multiple bold spans", () => {
    const out = parseInline("**one** and **two**");
    expect(out.filter((n) => n.type === "bold").map((n) => n.value)).toEqual(["one", "two"]);
  });

  it("turns newlines into break nodes", () => {
    expect(parseInline("line one\nline two")).toEqual([
      { type: "text", value: "line one" },
      { type: "break", value: "" },
      { type: "text", value: "line two" },
    ]);
  });

  it("linkifies bare urls", () => {
    expect(parseInline("see https://gatewaytooman.com now")).toEqual([
      { type: "text", value: "see " },
      { type: "link", value: "https://gatewaytooman.com", href: "https://gatewaytooman.com" },
      { type: "text", value: " now" },
    ]);
  });

  it("leaves an unclosed ** as literal text", () => {
    expect(parseInline("this **never closes")).toEqual([
      { type: "text", value: "this **never closes" },
    ]);
  });

  it("does not treat a bare asterisk as markup", () => {
    expect(parseInline("2 * 3 = 6")).toEqual([{ type: "text", value: "2 * 3 = 6" }]);
  });

  it("never emits an html node type for embedded markup", () => {
    const out = parseInline("<img src=x onerror=alert(1)>");
    expect(out).toEqual([{ type: "text", value: "<img src=x onerror=alert(1)>" }]);
  });

  it("handles empty string", () => {
    expect(parseInline("")).toEqual([]);
  });
});
