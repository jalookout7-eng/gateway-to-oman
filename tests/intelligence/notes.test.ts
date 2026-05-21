// tests/intelligence/notes.test.ts
import { describe, it, expect } from "vitest";
import { makeTestDb } from "./helpers";
import { createNote, listNotes, updateNote, deleteNote } from "@/lib/intelligence/notes";

describe("intelligence notes CRUD", () => {
  it("creates, lists, updates and deletes", async () => {
    const db = await makeTestDb();
    const id = await createNote(db, { kind: "hypothesis", title: "Referrals score higher", body: "watch month 1" });
    let all = await listNotes(db);
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Referrals score higher");
    expect(all[0].status).toBe("open");

    await updateNote(db, id, { status: "confirmed", title: "Referrals DO score higher" });
    all = await listNotes(db);
    expect(all[0].status).toBe("confirmed");
    expect(all[0].title).toBe("Referrals DO score higher");

    await deleteNote(db, id);
    expect(await listNotes(db)).toHaveLength(0);
  });
});
