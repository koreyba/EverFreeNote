"use client";

import * as React from "react";
import { useMemo, useCallback, useEffect, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type {
  ForceGraphMethods,
  NodeObject,
  LinkObject,
} from "react-force-graph-2d";
import { Loader2 } from "lucide-react";

import type { Note } from "@core/types/domain";
import { cn } from "@ui/web/lib/utils";

// Visual constants for graph rendering
const NODE_COLORS = {
  note: "#10b981", // emerald-500 - notes are green for visual distinction
  tag: "#3b82f6", // blue-500 - tags are blue to differentiate from notes
} as const;

const NODE_SIZES = {
  note: 8,
  tagBase: 6,
  tagMin: 6,
  tagMax: 16,
  tagScaleFactor: 2, // Tags grow by 2px per connection
} as const;

const GRAPH_COLORS = {
  link: "#d1d5db", // gray-300 - subtle links between nodes
  label: "#374151", // gray-700 - readable text color
} as const;

// Graph physics parameters for smooth simulation
const GRAPH_PHYSICS = {
  cooldownTicks: 100,
  alphaDecay: 0.02,
  velocityDecay: 0.3,
  linkParticles: 2,
  linkParticleWidth: 2,
  linkParticleSpeed: 0.005,
  linkWidth: 1,
} as const;

// Auto-fit viewport settings
const AUTO_FIT = {
  duration: 400, // milliseconds for zoom transition
  padding: 50, // pixels of padding around graph
  delay: 100, // milliseconds to wait for initial render
} as const;

// Label visibility threshold - only show labels when zoomed in enough to read them
const LABEL_MIN_ZOOM = 1.5;
const LABEL_FONT_SIZE = 12;

interface GraphNode extends NodeObject {
  id: string;
  label: string;
  type: "note" | "tag";
  noteId?: string;
  tagName?: string;
  size?: number;
}

interface GraphLink extends LinkObject {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface NotesGraphViewProps {
  notes: Note[];
  onNodeClick?: (noteId: string) => void;
  className?: string;
}

/**
 * Add a note node to the graph.
 */
function addNoteNode(note: Note, nodes: GraphNode[]): void {
  nodes.push({
    id: `note-${note.id}`,
    label: note.title || "Untitled",
    type: "note",
    noteId: note.id,
    size: NODE_SIZES.note,
  });
}

/**
 * Process tags for a note, creating tag nodes and links as needed.
 */
function processNoteTags(
  note: Note,
  tagNodeMap: Map<string, GraphNode>,
  nodes: GraphNode[],
  links: GraphLink[],
): void {
  if (!note.tags || note.tags.length === 0) return;

  note.tags.forEach((tag) => {
    // Create tag node if it doesn't exist
    if (!tagNodeMap.has(tag)) {
      const tagNode: GraphNode = {
        id: `tag-${tag}`,
        label: tag,
        type: "tag",
        tagName: tag,
        size: NODE_SIZES.tagBase,
      };
      tagNodeMap.set(tag, tagNode);
      nodes.push(tagNode);
    }

    // Create link between note and tag
    links.push({
      source: `note-${note.id}`,
      target: `tag-${tag}`,
    });
  });
}

/**
 * Count the number of connections to a specific tag node.
 */
function countTagConnections(links: GraphLink[], tagId: string): number {
  return links.filter((link) => link.target === tagId).length;
}

/**
 * Calculate tag node size based on connection count.
 * More popular tags are rendered larger (clamped to min/max bounds).
 */
function calculateTagSize(connectionCount: number): number {
  return Math.max(
    NODE_SIZES.tagMin,
    Math.min(connectionCount * NODE_SIZES.tagScaleFactor, NODE_SIZES.tagMax),
  );
}

/**
 * Draw a text label below a node on the canvas.
 * Font size is scaled inversely with zoom to keep labels readable.
 */
function drawNodeLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  nodeSize: number,
  globalScale: number,
): void {
  const fontSize = LABEL_FONT_SIZE / globalScale;
  ctx.font = `${fontSize}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = GRAPH_COLORS.label;
  ctx.fillText(label, x, y + nodeSize + fontSize);
}

/**
 * Transform notes into graph data structure.
 *
 * Creates a bipartite graph with:
 * - Note nodes (green circles) representing individual notes
 * - Tag nodes (blue circles) representing tags, sized by connection count
 * - Links connecting notes to their tags
 *
 * Tags shared across multiple notes become visual hubs, making it easy to
 * identify common themes and connections between notes.
 *
 * @param notes - Array of notes to visualize
 * @returns Graph data with nodes and links ready for force-directed layout
 */
function buildGraphData(notes: Note[]): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const tagNodeMap = new Map<string, GraphNode>();

  // Create note nodes and tag nodes
  notes.forEach((note) => {
    addNoteNode(note, nodes);
    processNoteTags(note, tagNodeMap, nodes, links);
  });

  // Scale tag sizes based on connections - more connected tags are visually larger
  // This provides a quick visual indicator of which tags are most commonly used
  tagNodeMap.forEach((tagNode) => {
    const connectionCount = countTagConnections(links, tagNode.id);
    tagNode.size = calculateTagSize(connectionCount);
  });

  return { nodes, links };
}

/**
 * Interactive force-directed graph visualization of notes and their tag relationships.
 *
 * Features:
 * - Notes rendered as green nodes, tags as blue nodes (sized by popularity)
 * - Click note nodes to navigate to that note
 * - Auto-zoom to fit all nodes in viewport on load
 * - Labels appear when zoomed in for readability
 * - Responsive to container size changes
 *
 * @param notes - Array of notes to visualize
 * @param onNodeClick - Callback fired when a note node is clicked (not tags)
 * @param className - Optional CSS classes for the container
 */
export function NotesGraphView({
  notes,
  onNodeClick,
  className,
}: NotesGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [dimensions, setDimensions] = React.useState({
    width: 800,
    height: 600,
  });

  // Build graph data from notes
  const graphData = useMemo(() => buildGraphData(notes), [notes]);

  // Handle node click - only trigger callback for note nodes, not tag nodes
  const handleNodeClick = useCallback(
    (node: NodeObject) => {
      const graphNode = node as GraphNode;
      if (graphNode.type === "note" && graphNode.noteId && onNodeClick) {
        onNodeClick(graphNode.noteId);
      }
    },
    [onNodeClick],
  );

  // Custom node rendering - draws circles with labels that appear on zoom
  const nodeCanvasObject = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphNode = node as GraphNode;
      const label = graphNode.label;
      const size = graphNode.size || 5;
      const nodeColor = NODE_COLORS[graphNode.type];

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      // Only show labels when zoomed in to avoid visual clutter
      // This prevents overlapping text when viewing the full graph
      if (globalScale > LABEL_MIN_ZOOM) {
        drawNodeLabel(ctx, label, node.x || 0, node.y || 0, size, globalScale);
      }
    },
    [],
  );

  // Define pointer area for node interaction - slightly larger than visual size for easier clicking
  const nodePointerAreaPaint = useCallback(
    (node: NodeObject, color: string, ctx: CanvasRenderingContext2D) => {
      const graphNode = node as GraphNode;
      const size = graphNode.size || 5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, size + 2, 0, 2 * Math.PI, false);
      ctx.fill();
    },
    [],
  );

  // Track container size for responsive graph rendering
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Auto-fit graph to viewport after initial render for optimal view
  // Slight delay ensures the graph has finished its initial layout
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(AUTO_FIT.duration);
      }, AUTO_FIT.delay);
    }
  }, [graphData]);

  if (notes.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No notes to visualize</p>
          <p className="text-xs mt-1">
            Create some notes with tags to see connections
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full bg-background", className)}
    >
      {graphData.nodes.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeId="id"
          nodeLabel="label"
          nodeCanvasObject={nodeCanvasObject}
          linkColor={() => GRAPH_COLORS.link}
          linkWidth={GRAPH_PHYSICS.linkWidth}
          linkDirectionalParticles={GRAPH_PHYSICS.linkParticles}
          linkDirectionalParticleWidth={GRAPH_PHYSICS.linkParticleWidth}
          linkDirectionalParticleSpeed={GRAPH_PHYSICS.linkParticleSpeed}
          onNodeClick={handleNodeClick}
          nodePointerAreaPaint={nodePointerAreaPaint}
          cooldownTicks={GRAPH_PHYSICS.cooldownTicks}
          d3AlphaDecay={GRAPH_PHYSICS.alphaDecay}
          d3VelocityDecay={GRAPH_PHYSICS.velocityDecay}
        />
      )}
    </div>
  );
}
