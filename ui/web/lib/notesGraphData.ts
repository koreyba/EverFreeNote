import type { Note } from "@core/types/domain";
import { normalizeTagList } from "@ui/web/lib/tags";

export type NotesGraphNodeType = "note" | "tag";

export interface NotesGraphNode {
  id: string;
  label: string;
  type: NotesGraphNodeType;
  noteId?: string;
  tagName?: string;
  size: number;
  connectionCount: number;
}

export interface NotesGraphLink {
  source: string;
  target: string;
}

export interface NotesGraphData {
  nodes: NotesGraphNode[];
  links: NotesGraphLink[];
}

export interface NotesGraphSummary {
  noteCount: number;
  taggedNoteCount: number;
  tagCount: number;
  linkCount: number;
  topTags: Array<{
    tag: string;
    count: number;
  }>;
}

const NOTE_NODE_SIZE = 7;
const TAG_MIN_SIZE = 7;
const TAG_MAX_SIZE = 18;
const TAG_SIZE_STEP = 2.5;

function makeNoteNodeId(noteId: string) {
  return `note:${noteId}`;
}

function makeTagNodeId(tagName: string) {
  return `tag:${encodeURIComponent(tagName)}`;
}

function titleForNote(note: Note) {
  return note.title?.trim() || "Untitled";
}

function sizeForTag(connectionCount: number) {
  return Math.min(
    TAG_MAX_SIZE,
    Math.max(TAG_MIN_SIZE, TAG_MIN_SIZE + (connectionCount - 1) * TAG_SIZE_STEP),
  );
}

export function getNoteTags(note: Note) {
  return normalizeTagList(note.tags ?? []);
}

export function buildNotesGraphSummary(notes: Note[]): NotesGraphSummary {
  const counts = new Map<string, number>();
  let taggedNoteCount = 0;
  let linkCount = 0;

  for (const note of notes) {
    const tags = getNoteTags(note);
    if (tags.length > 0) taggedNoteCount += 1;
    linkCount += tags.length;

    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const topTags = Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));

  return {
    noteCount: notes.length,
    taggedNoteCount,
    tagCount: counts.size,
    linkCount,
    topTags,
  };
}

export function buildNotesTagGraph(notes: Note[]): NotesGraphData {
  const nodes: NotesGraphNode[] = [];
  const links: NotesGraphLink[] = [];
  const tagCounts = new Map<string, number>();
  const tagNodes = new Map<string, NotesGraphNode>();

  for (const note of notes) {
    const noteId = makeNoteNodeId(note.id);
    const tags = getNoteTags(note);

    nodes.push({
      id: noteId,
      label: titleForNote(note),
      type: "note",
      noteId: note.id,
      size: NOTE_NODE_SIZE,
      connectionCount: tags.length,
    });

    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);

      if (!tagNodes.has(tag)) {
        const tagNode: NotesGraphNode = {
          id: makeTagNodeId(tag),
          label: tag,
          type: "tag",
          tagName: tag,
          size: TAG_MIN_SIZE,
          connectionCount: 0,
        };
        tagNodes.set(tag, tagNode);
        nodes.push(tagNode);
      }

      links.push({
        source: noteId,
        target: makeTagNodeId(tag),
      });
    }
  }

  for (const [tag, node] of tagNodes) {
    const connectionCount = tagCounts.get(tag) ?? 0;
    node.connectionCount = connectionCount;
    node.size = sizeForTag(connectionCount);
  }

  return { nodes, links };
}

