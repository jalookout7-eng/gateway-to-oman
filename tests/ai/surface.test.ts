import { describe, it, expect } from "vitest";
import { resolveSurface } from "@/lib/ai/surface";

describe("resolveSurface", () => {
  it("homepage → main / default", () => {
    expect(resolveSurface("/")).toEqual({ surface: "main", page: "default" });
  });
  it("main sub-pages keep their greeting key", () => {
    expect(resolveSurface("/opportunities")).toEqual({ surface: "main", page: "opportunities" });
    expect(resolveSurface("/services")).toEqual({ surface: "main", page: "services" });
    expect(resolveSurface("/contact")).toEqual({ surface: "main", page: "contact" });
  });
  it("businesses landing → businesses / businesses", () => {
    expect(resolveSurface("/businesses")).toEqual({ surface: "businesses", page: "businesses" });
  });
  it("listings + listing detail → businesses-listings", () => {
    expect(resolveSurface("/businesses/listings")).toEqual({ surface: "businesses", page: "businesses-listings" });
    expect(resolveSurface("/businesses/listing/some-slug")).toEqual({ surface: "businesses", page: "businesses-listings" });
  });
  it("unknown path → main / default", () => {
    expect(resolveSurface("/anything-else")).toEqual({ surface: "main", page: "default" });
  });
});
