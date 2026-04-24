"use client";

import * as React from "react";
import type {
  ForceGraphMethods,
  NodeObject,
} from "react-force-graph-2d";
import { Loader2, Search, Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Note } from "@core/types/domain";
import {
  buildNotesGraphSummary,
  buildNotesTagGraph,
  type NotesGraphNode,
} from "@ui/web/lib/notesGraphData";
import { cn } from "@ui/web/lib/utils";

const NODE_COLORS = {
  note: "#2563eb",
  tag: "#059669",
  active: "#f59e0b",
} as const;

const GRAPH_COLORS = {
  link: "#94a3b8",
  label: "#334155",
  labelHalo: "rgba(255, 255, 255, 0.86)",
} as const;

const GRAPH_PHYSICS = {
  cooldownTicks: 120,
  alphaDecay: 0.025,
  velocityDecay: 0.35,
  linkWidth: 1,
} as const;

const LABEL_MIN_ZOOM = 1.25;
const LABEL_FONT_SIZE = 12;
const AUTO_FIT_DELAY_MS = 120;
const MAX_TAG_FILTERS = 12;

interface NotesGraphViewProps {
  notes: Note[];
  activeNoteId?: string | null;
  notesTotal?: number;
  onNodeClick?: (noteId: string) => void;
  onClose?: () => void;
  className?: string;
}

type RuntimeGraphNode = NotesGraphNode & {
  x?: number;
  y?: number;
};

type ForceGraph2DComponent = typeof import("react-force-graph-2d").default;

function matchesQuery(note: Note, query: string) {
  if (!query) return true;
  const haystack = [
    note.title,
    note.description,
    ...(note.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function filterNotes(notes: Note[], query: string, selectedTag: string | null) {
  return notes.filter((note) => {
    const normalizedTags = (note.tags ?? []).map((tag) => tag.trim().toLowerCase());
    const tagMatches = selectedTag ? normalizedTags.includes(selectedTag) : true;
    return tagMatches && matchesQuery(note, query);
  });
}

function drawNodeLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  nodeSize: number,
  globalScale: number,
) {
  const fontSize = LABEL_FONT_SIZE / globalScale;
  const labelY = y + nodeSize + fontSize;

  ctx.font = `${fontSize}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4 / globalScale;
  ctx.strokeStyle = GRAPH_COLORS.labelHalo;
  ctx.strokeText(label, x, labelY);
  ctx.fillStyle = GRAPH_COLORS.label;
  ctx.fillText(label, x, labelY);
}

export function NotesGraphView({
  notes,
  activeNoteId,
  notesTotal,
  onNodeClick,
  onClose,
  className,
}: NotesGraphViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const graphRef = React.useRef<ForceGraphMethods | undefined>(undefined);
  const [dimensions, setDimensions] = React.useState({
    width: 800,
    height: 600,
  });
  const [query, setQuery] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [ForceGraphComponent, setForceGraphComponent] =
    React.useState<ForceGraph2DComponent | null>(null);
  const normalizedQuery = query.trim().toLowerCase();

  const summary = React.useMemo(() => buildNotesGraphSummary(notes), [notes]);
  const filteredNotes = React.useMemo(
    () => filterNotes(notes, normalizedQuery, selectedTag),
    [notes, normalizedQuery, selectedTag],
  );
  const filteredSummary = React.useMemo(
    () => buildNotesGraphSummary(filteredNotes),
    [filteredNotes],
  );
  const graphData = React.useMemo(
    () => buildNotesTagGraph(filteredNotes),
    [filteredNotes],
  );
  const visibleTags = summary.topTags.slice(0, MAX_TAG_FILTERS);
  const hasFilters = Boolean(normalizedQuery || selectedTag);
  const loadedScopeCopy =
    typeof notesTotal === "number" && notesTotal > notes.length
      ? `${notes.length} of ${notesTotal}`
      : `${notes.length}`;

  const handleNodeClick = React.useCallback(
    (node: NodeObject) => {
      const graphNode = node as NotesGraphNode;
      if (graphNode.type === "note" && graphNode.noteId) {
        onNodeClick?.(graphNode.noteId);
      } else if (graphNode.type === "tag" && graphNode.tagName) {
        setSelectedTag((current) =>
          current === graphNode.tagName ? null : graphNode.tagName ?? null,
        );
      }
    },
    [onNodeClick],
  );

  const nodeCanvasObject = React.useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphNode = node as RuntimeGraphNode;
      const x = graphNode.x ?? 0;
      const y = graphNode.y ?? 0;
      const size =
        graphNode.noteId === activeNoteId ? graphNode.size + 2 : graphNode.size;
      const nodeColor =
        graphNode.noteId === activeNoteId
          ? NODE_COLORS.active
          : NODE_COLORS[graphNode.type];

      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      if (graphNode.type === "tag") {
        ctx.lineWidth = 1.5 / globalScale;
        ctx.strokeStyle = "rgba(15, 23, 42, 0.26)";
        ctx.stroke();
      }

      if (globalScale > LABEL_MIN_ZOOM || graphNode.noteId === activeNoteId) {
        drawNodeLabel(ctx, graphNode.label, x, y, size, globalScale);
      }
    },
    [activeNoteId],
  );

  const nodePointerAreaPaint = React.useCallback(
    (node: NodeObject, color: string, ctx: CanvasRenderingContext2D) => {
      const graphNode = node as RuntimeGraphNode;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(graphNode.x ?? 0, graphNode.y ?? 0, graphNode.size + 4, 0, 2 * Math.PI);
      ctx.fill();
    },
    [],
  );

  React.useEffect(() => {
    let cancelled = false;

    import("react-force-graph-2d").then((module) => {
      if (!cancelled) {
        setForceGraphComponent(() => module.default);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: Math.max(Math.round(width), 320),
        height: Math.max(Math.round(height), 320),
      });
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  React.useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) return;

    const timeoutId = window.setTimeout(() => {
      graphRef.current?.zoomToFit(400, 42);
    }, AUTO_FIT_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [graphData]);

  return (
    <section className={cn("flex h-full min-h-0 flex-col bg-background", className)}>
      <div className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-6">Notes graph</h2>
            <p className="text-xs text-muted-foreground">
              {filteredSummary.noteCount} notes, {filteredSummary.tagCount} tags,{" "}
              {filteredSummary.linkCount} links visible
            </p>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close notes graph"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Filter notes or tags"
              aria-label="Filter graph notes or tags"
            />
          </div>
          <div className="flex items-center gap-3 rounded-md border px-3 py-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
              Notes
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#059669]" />
              Tags
            </span>
            <span className="text-muted-foreground">{loadedScopeCopy} loaded</span>
          </div>
        </div>

        {visibleTags.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {visibleTags.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setSelectedTag((current) => (current === tag ? null : tag))
                }
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                  selectedTag === tag
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                )}
              >
                <Tag aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{tag}</span>
                <span
                  className={cn(
                    "rounded bg-muted px-1.5 text-[11px]",
                    selectedTag === tag && "bg-primary-foreground/20",
                  )}
                >
                  {count}
                </span>
              </button>
            ))}
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setSelectedTag(null);
                }}
              >
                Reset
              </Button>
            )}
          </div>
        )}
      </div>

      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        {notes.length === 0 ? (
          <EmptyGraphState
            title="No notes yet"
            description="Notes with tags will appear here."
          />
        ) : summary.tagCount === 0 ? (
          <EmptyGraphState
            title="No tags yet"
            description="Add tags to notes to build the graph."
          />
        ) : graphData.links.length === 0 ? (
          <EmptyGraphState
            title="No matches"
            description="Reset filters to return to the full graph."
          />
        ) : ForceGraphComponent ? (
          <ForceGraphComponent
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            nodeId="id"
            nodeLabel="label"
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={nodePointerAreaPaint}
            linkColor={() => GRAPH_COLORS.link}
            linkWidth={GRAPH_PHYSICS.linkWidth}
            onNodeClick={handleNodeClick}
            cooldownTicks={GRAPH_PHYSICS.cooldownTicks}
            d3AlphaDecay={GRAPH_PHYSICS.alphaDecay}
            d3VelocityDecay={GRAPH_PHYSICS.velocityDecay}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyGraphState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
