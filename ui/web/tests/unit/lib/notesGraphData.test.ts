import type { Note } from "@core/types/domain";
import {
  buildNotesGraphSummary,
  buildNotesTagGraph,
  getNoteTags,
} from "@ui/web/lib/notesGraphData";

function makeNote(overrides: Partial<Note>): Note {
  return {
    id: "note-1",
    title: "Note",
    description: "",
    tags: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user_id: "user-1",
    ...overrides,
  };
}

describe("notes graph data", () => {
  it("normalizes duplicate and mixed-case note tags", () => {
    const note = makeNote({
      tags: [" Work ", "work", "Deep  Work", ""],
    });

    expect(getNoteTags(note)).toEqual(["work", "deep work"]);
  });

  it("builds note nodes, tag nodes, and note-to-tag links", () => {
    const notes = [
      makeNote({
        id: "a",
        title: "Alpha",
        tags: ["work", "ideas"],
      }),
      makeNote({
        id: "b",
        title: "Beta",
        tags: ["work"],
      }),
    ];

    const graph = buildNotesTagGraph(notes);

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "note:a", type: "note", label: "Alpha" }),
        expect.objectContaining({ id: "note:b", type: "note", label: "Beta" }),
        expect.objectContaining({
          id: "tag:work",
          type: "tag",
          label: "work",
          connectionCount: 2,
        }),
        expect.objectContaining({
          id: "tag:ideas",
          type: "tag",
          label: "ideas",
          connectionCount: 1,
        }),
      ]),
    );
    expect(graph.links).toEqual(
      expect.arrayContaining([
        { source: "note:a", target: "tag:work" },
        { source: "note:a", target: "tag:ideas" },
        { source: "note:b", target: "tag:work" },
      ]),
    );
  });

  it("summarizes graph density and sorts top tags by count", () => {
    const notes = [
      makeNote({ id: "a", tags: ["work", "ideas"] }),
      makeNote({ id: "b", tags: ["work"] }),
      makeNote({ id: "c", tags: [] }),
    ];

    expect(buildNotesGraphSummary(notes)).toEqual({
      noteCount: 3,
      taggedNoteCount: 2,
      tagCount: 2,
      linkCount: 3,
      topTags: [
        { tag: "work", count: 2 },
        { tag: "ideas", count: 1 },
      ],
    });
  });
});

