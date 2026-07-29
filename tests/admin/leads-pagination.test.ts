import { describe, it, expect } from "vitest";
import { paginate, clampPage, DEFAULT_LEAD_PAGE_SIZE, LEAD_PAGE_SIZES } from "@/lib/admin/pagination";

function items(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1); // [1..n]
}

describe("LEAD_PAGE_SIZES / DEFAULT_LEAD_PAGE_SIZE", () => {
  it("offers exactly 10, 25, 50, 100", () => {
    expect(LEAD_PAGE_SIZES).toEqual([10, 25, 50, 100]);
  });
  it("defaults to 25", () => {
    expect(DEFAULT_LEAD_PAGE_SIZE).toBe(25);
  });
});

describe("clampPage", () => {
  it("clamps below 1 up to 1", () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(-3, 5)).toBe(1);
  });
  it("clamps beyond the end down to the last page", () => {
    expect(clampPage(99, 5)).toBe(5);
  });
  it("leaves an in-range page untouched", () => {
    expect(clampPage(3, 5)).toBe(3);
  });
  it("clamps to 1 when totalPages is 0 (empty list)", () => {
    expect(clampPage(1, 0)).toBe(1);
    expect(clampPage(5, 0)).toBe(1);
  });
  it("truncates a non-integer page into range", () => {
    expect(clampPage(2.9, 5)).toBe(2);
  });
});

describe("paginate: exact page boundaries", () => {
  it("splits an exact multiple of pageSize into full pages with none left over", () => {
    const result = paginate(items(50), 1, 25);
    expect(result.totalPages).toBe(2);
    expect(result.pageItems).toEqual(items(25));
    expect(result.from).toBe(1);
    expect(result.to).toBe(25);
    expect(result.total).toBe(50);

    const page2 = paginate(items(50), 2, 25);
    expect(page2.pageItems).toEqual(items(50).slice(25, 50));
    expect(page2.from).toBe(26);
    expect(page2.to).toBe(50);
  });
});

describe("paginate: final partial page", () => {
  it("the last page holds only the remainder", () => {
    // 96 leads (matches the real import), page size 25 -> pages of 25,25,25,21
    const result = paginate(items(96), 4, 25);
    expect(result.totalPages).toBe(4);
    expect(result.pageItems).toHaveLength(21);
    expect(result.from).toBe(76);
    expect(result.to).toBe(96);
    expect(result.total).toBe(96);
  });
});

describe("paginate: empty input", () => {
  it("returns an empty page, totalPages 1, and from/to/total of 0", () => {
    const result = paginate([], 1, 25);
    expect(result.pageItems).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.from).toBe(0);
    expect(result.to).toBe(0);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
  });
});

describe("paginate: page beyond the end clamps to the last page", () => {
  it("requesting page 999 on 96 items at pageSize 25 returns page 4", () => {
    const result = paginate(items(96), 999, 25);
    expect(result.page).toBe(4);
    expect(result.totalPages).toBe(4);
    expect(result.from).toBe(76);
    expect(result.to).toBe(96);
    expect(result.pageItems).toHaveLength(21);
  });
});

describe("paginate: page below 1 clamps to 1", () => {
  it("requesting page 0 or negative returns page 1", () => {
    const result = paginate(items(96), 0, 25);
    expect(result.page).toBe(1);
    expect(result.from).toBe(1);
    expect(result.to).toBe(25);

    const negative = paginate(items(96), -5, 25);
    expect(negative.page).toBe(1);
  });
});

describe("paginate: page size changes recompute total pages", () => {
  it("recomputes totalPages and slice when pageSize changes for the same data", () => {
    const at10 = paginate(items(96), 1, 10);
    expect(at10.totalPages).toBe(10);
    expect(at10.pageItems).toHaveLength(10);

    const at50 = paginate(items(96), 1, 50);
    expect(at50.totalPages).toBe(2);
    expect(at50.pageItems).toHaveLength(50);

    const at100 = paginate(items(96), 1, 100);
    expect(at100.totalPages).toBe(1);
    expect(at100.pageItems).toHaveLength(96);
  });
});

describe("paginate: Showing X to Y of Z numbers", () => {
  it("first page", () => {
    const result = paginate(items(96), 1, 25);
    expect([result.from, result.to, result.total]).toEqual([1, 25, 96]);
  });
  it("middle page", () => {
    const result = paginate(items(96), 2, 25);
    expect([result.from, result.to, result.total]).toEqual([26, 50, 96]);
  });
  it("last (partial) page", () => {
    const result = paginate(items(96), 4, 25);
    expect([result.from, result.to, result.total]).toEqual([76, 96, 96]);
  });
  it("total of 0 reports 0 to 0 of 0", () => {
    const result = paginate([], 1, 25);
    expect([result.from, result.to, result.total]).toEqual([0, 0, 0]);
  });
});
