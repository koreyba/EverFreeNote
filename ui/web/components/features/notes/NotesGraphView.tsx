"use client"

import * as React from "react"
import { useMemo, useCallback, useEffect, useRef } from "react"
import ForceGraph2D from "react-force-graph-2d"
import type { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-2d"
import { Loader2 } from "lucide-react"

import type { Note } from "@core/types/domain"
import { cn } from "@ui/web/lib/utils"

interface GraphNode extends NodeObject {
  id: string
  label: string
  type: "note" | "tag"
  noteId?: string
  tagName?: string
  size?: number
}

interface GraphLink extends LinkObject {
  source: string
  target: string
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface NotesGraphViewProps {
  notes: Note[]
  onNodeClick?: (noteId: string) => void
  className?: string
}

/**
 * Transform notes into graph data structure
 * Creates nodes for notes and tags, and links between them
 */
function buildGraphData(notes: Note[]): GraphData {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const tagNodeMap = new Map<string, GraphNode>()

  // Create note nodes and tag nodes
  notes.forEach((note) => {
    // Add note node
    nodes.push({
      id: `note-${note.id}`,
      label: note.title || "Untitled",
      type: "note",
      noteId: note.id,
      size: 8,
    })

    // Process tags
    if (note.tags && note.tags.length > 0) {
      note.tags.forEach((tag) => {
        // Create tag node if it doesn't exist
        if (!tagNodeMap.has(tag)) {
          const tagNode: GraphNode = {
            id: `tag-${tag}`,
            label: tag,
            type: "tag",
            tagName: tag,
            size: 6,
          }
          tagNodeMap.set(tag, tagNode)
          nodes.push(tagNode)
        }

        // Create link between note and tag
        links.push({
          source: `note-${note.id}`,
          target: `tag-${tag}`,
        })
      })
    }
  })

  // Calculate tag node sizes based on number of connections
  tagNodeMap.forEach((tagNode) => {
    const connectionCount = links.filter((link) => link.target === tagNode.id).length
    tagNode.size = Math.max(6, Math.min(connectionCount * 2, 16))
  })

  return { nodes, links }
}

export function NotesGraphView({ notes, onNodeClick, className }: NotesGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraphMethods>()
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 })

  // Build graph data from notes
  const graphData = useMemo(() => buildGraphData(notes), [notes])

  // Handle node click
  const handleNodeClick = useCallback(
    (node: NodeObject) => {
      const graphNode = node as GraphNode
      if (graphNode.type === "note" && graphNode.noteId && onNodeClick) {
        onNodeClick(graphNode.noteId)
      }
    },
    [onNodeClick]
  )

  // Render node with custom styling
  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const graphNode = node as GraphNode
    const label = graphNode.label
    const size = graphNode.size || 5

    // Set color based on node type
    const nodeColor = graphNode.type === "note" ? "#10b981" : "#3b82f6" // emerald-500 for notes, blue-500 for tags
    
    // Draw node circle
    ctx.beginPath()
    ctx.arc(node.x || 0, node.y || 0, size, 0, 2 * Math.PI, false)
    ctx.fillStyle = nodeColor
    ctx.fill()

    // Draw label if zoom is sufficient
    if (globalScale > 1.5) {
      const fontSize = 12 / globalScale
      ctx.font = `${fontSize}px Inter, sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "#374151" // gray-700
      ctx.fillText(label, node.x || 0, (node.y || 0) + size + fontSize)
    }
  }, [])

  // Measure container dimensions
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    updateDimensions()

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Auto-fit graph to viewport after initial render
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50)
      }, 100)
    }
  }, [graphData])

  if (notes.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No notes to visualize</p>
          <p className="text-xs mt-1">Create some notes with tags to see connections</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn("relative w-full h-full bg-background", className)}>
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
          linkColor={() => "#d1d5db"} // gray-300
          linkWidth={1}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.005}
          onNodeClick={handleNodeClick}
          nodePointerAreaPaint={(node, color, ctx) => {
            const graphNode = node as GraphNode
            const size = graphNode.size || 5
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(node.x || 0, node.y || 0, size + 2, 0, 2 * Math.PI, false)
            ctx.fill()
          }}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      )}
    </div>
  )
}
