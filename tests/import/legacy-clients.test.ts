import { describe, it, expect } from "vitest";
import {
  parseCsv,
  toRecords,
  mapRow,
  dedupe,
  normaliseTimeline,
  parseLegacyDate,
} from "@/lib/import/legacy-clients";

const HEADER =
  "id,name,email,Phone,country,Country,status,Status,purpose_short,Purpose,timeline_short,Timeline,added,Source,Preferred Location,Residency Interest,Services Needed,Notes,page,Email,Form Submitted,Additional Comments,Created,Last Updated";

const ROW =
  '"3c686db2","Abdul Aliym","a@b.com","7188407282","USA","USA","New","New","Real Estate / ITC Property","Real Estate / ITC Property","1 year or more","1 year or more","Feb 26, 2026","csv import","Salalah (Coastal, peaceful, retirement-friendly)","Yes, including spouse and dependents","Real Estate Property Search; Retirement Planning","No notes yet.","6","a@b.com","Mar 29, 2025","None","Feb 26, 2026","Feb 26, 2026"';

describe("parseCsv", () => {
  it("keeps commas that live inside quoted fields", () => {
    const rows = parseCsv('a,b\n"Salalah (Coastal, peaceful, retirement-friendly)","x"');
    expect(rows[1]).toEqual(["Salalah (Coastal, peaceful, retirement-friendly)", "x"]);
  });

  it("strips the surrounding quotes rather than storing them", () => {
    const rows = parseCsv('a\n"Abdul Aliym"');
    expect(rows[1][0]).toBe("Abdul Aliym");
  });

  it("handles doubled quotes inside a quoted field", () => {
    const rows = parseCsv('a\n"He said ""hello"" loudly"');
    expect(rows[1][0]).toBe('He said "hello" loudly');
  });

  it("handles a newline inside a quoted field", () => {
    const rows = parseCsv('a,b\n"line one\nline two",z');
    expect(rows.length).toBe(2);
    expect(rows[1][0]).toBe("line one\nline two");
  });

  it("reads a final row that has no trailing newline", () => {
    const rows = parseCsv("a,b\n1,2");
    expect(rows[1]).toEqual(["1", "2"]);
  });

  it("tolerates CRLF line endings", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n");
    expect(rows).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("drops blank trailing lines", () => {
    const rows = parseCsv("a,b\n1,2\n\n\n");
    expect(rows.length).toBe(2);
  });
});

describe("normaliseTimeline", () => {
  it("converts the export's en dash to our banned-dash-free wording", () => {
    expect(normaliseTimeline("Within 1–3 months")).toBe("Within 1 to 3 months");
  });

  it("leaves values that already match the allowlist alone", () => {
    expect(normaliseTimeline("Within 6 months")).toBe("Within 6 months");
    expect(normaliseTimeline("Exploring options, no fixed timeline")).toBe(
      "Exploring options, no fixed timeline",
    );
  });

  it("passes null through", () => {
    expect(normaliseTimeline(null)).toBeNull();
  });
});

describe("parseLegacyDate", () => {
  it("converts the export format to SQLite datetime text", () => {
    expect(parseLegacyDate("Jun 8, 2026")).toBe("2026-06-08 00:00:00");
    expect(parseLegacyDate("Mar 29, 2025")).toBe("2025-03-29 00:00:00");
  });

  it("returns null for junk rather than an Invalid Date string", () => {
    expect(parseLegacyDate("not a date")).toBeNull();
    expect(parseLegacyDate(null)).toBeNull();
  });
});

describe("mapRow", () => {
  const rec = toRecords(`${HEADER}\n${ROW}`)[0];

  it("maps every intake field", () => {
    const m = mapRow(rec)!;
    expect(m.name).toBe("Abdul Aliym");
    expect(m.email).toBe("a@b.com");
    expect(m.phone).toBe("7188407282");
    expect(m.countryOfResidence).toBe("USA");
    expect(m.investmentTimeline).toBe("1 year or more");
    expect(m.investmentPurpose).toBe("Real Estate / ITC Property");
    expect(m.preferredLocation).toBe("Salalah (Coastal, peaceful, retirement-friendly)");
    expect(m.residencyInterest).toBe("Yes, including spouse and dependents");
    expect(m.servicesNeeded).toEqual(["Real Estate Property Search", "Retirement Planning"]);
  });

  it("derives segment and interests from the purpose, as the live route does", () => {
    const m = mapRow(rec)!;
    expect(m.segment).toBe("investor");
    expect(m.interests).toBe("Real Estate / ITC Property");
  });

  it("uses Form Submitted as the created date, not the CRM row date", () => {
    const m = mapRow(rec)!;
    expect(m.createdAt).toBe("2025-03-29 00:00:00");
    expect(m.updatedAt).toBe("2026-02-26 00:00:00");
  });

  it("treats the old CRM's placeholder strings as empty", () => {
    const m = mapRow(rec)!;
    expect(m.adminNotes).toBeNull();
    expect(m.additionalComments).toBeNull();
  });

  it("prefers the full Purpose column over the truncated purpose_short", () => {
    const truncated = { ...rec, purpose_short: "Exploring Investment Opportu…", Purpose: "Exploring Investment Opportunities" };
    expect(mapRow(truncated)!.investmentPurpose).toBe("Exploring Investment Opportunities");
  });

  it("keeps off-allowlist answers verbatim instead of rewriting them", () => {
    const odd = { ...rec, "Preferred Location": "I dont know", "Services Needed": "Startup echo system" };
    const m = mapRow(odd)!;
    expect(m.preferredLocation).toBe("I dont know");
    expect(m.servicesNeeded).toEqual(["Startup echo system"]);
  });

  it("rejects a row with no id, name or email", () => {
    expect(mapRow({ ...rec, id: "" })).toBeNull();
    expect(mapRow({ ...rec, name: "", })).toBeNull();
    expect(mapRow({ ...rec, email: "", Email: "" })).toBeNull();
  });
});

describe("dedupe", () => {
  it("collapses repeated scrapes of the same legacy id", () => {
    const recs = toRecords(`${HEADER}\n${ROW}\n${ROW}\n${ROW}`);
    const r = dedupe(recs);
    expect(r.totalRows).toBe(3);
    expect(r.leads.length).toBe(1);
    expect(r.duplicateRowsDropped).toBe(2);
  });

  it("keeps records that share an email but have different ids", () => {
    const second = ROW.replace('"3c686db2"', '"other-id"').replace('"Abdul Aliym"', '"Abdul A"');
    const r = dedupe(toRecords(`${HEADER}\n${ROW}\n${second}`));
    expect(r.leads.length).toBe(2);
    expect(r.sharedEmails).toEqual([{ email: "a@b.com", names: ["Abdul Aliym", "Abdul A"] }]);
  });

  it("counts rows it had to skip", () => {
    const broken = ROW.replace('"a@b.com","7188407282"', '"","7188407282"').replace('"a@b.com","Mar 29, 2025"', '"","Mar 29, 2025"');
    const r = dedupe(toRecords(`${HEADER}\n${broken}`));
    expect(r.leads.length).toBe(0);
    expect(r.skippedIncomplete).toBe(1);
  });
});

describe("test-record exclusion", () => {
  const HDR = "id,name,email,Phone,Country,Purpose,Timeline,Preferred Location,Residency Interest,Services Needed,Notes,Email,Form Submitted,Additional Comments,Created,Last Updated";
  function row(id: string, name: string, email: string) {
    return `"${id}","${name}","${email}","1","UK","Business Setup","Within 6 months","Other","No","","","${email}","Jun 8, 2026","","Jun 8, 2026","Jun 8, 2026"`;
  }

  it("drops the known test record and reports it", () => {
    const csv = [HDR, row("a", "Jane Smith", "test@testmail.com"), row("b", "Real Person", "real@example.org")].join("\n");
    const r = dedupe(toRecords(csv));
    expect(r.leads.map((l) => l.email)).toEqual(["real@example.org"]);
    expect(r.skippedTestRecords).toEqual(["Jane Smith <test@testmail.com>"]);
  });

  it("matches the skip list case-insensitively", () => {
    const r = dedupe(toRecords([HDR, row("a", "Jane", "TEST@TestMail.com")].join("\n")));
    expect(r.leads.length).toBe(0);
  });

  it("does not drop a real person whose name merely contains 'test'", () => {
    const r = dedupe(toRecords([HDR, row("a", "Testa Aigbedion", "testa@realdomain.com")].join("\n")));
    expect(r.leads.length).toBe(1);
  });
});
