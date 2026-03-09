import { useEffect, useRef, useCallback, useState } from 'react'
import cytoscape from 'cytoscape'
import coseBilkent from 'cytoscape-cose-bilkent'
import { useGraphStore } from '@application/stores/GraphStore'
import type { CodeGraph, GraphNode, GraphEdge } from '@shared/types'
import { Loader2, ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react'

cytoscape.use(coseBilkent)

interface GraphViewerProps {
  graph: CodeGraph | null
  isLoading: boolean
}

// Node type -> tint used for the label dot in legend only; the actual nodes are white/near-white
const NODE_CONFIG: Record<string, { color: string; size: number; border: string }> = {
  file: { color: '#e2e8f0', size: 22, border: '#94a3b8' },
  folder: { color: '#f1f5f9', size: 30, border: '#cbd5e1' },
  function: { color: '#cffafe', size: 16, border: '#22d3ee' },
  class: { color: '#fce7f3', size: 18, border: '#f472b6' },
  import: { color: '#fef9c3', size: 12, border: '#fbbf24' },
  export: { color: '#d1fae5', size: 12, border: '#34d399' },
}

const EDGE_COLOR = '#C084FC'  // Match lavender-accent

export function GraphViewer({ graph, isLoading }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [stats, setStats] = useState({ nodes: 0, edges: 0, files: 0 })

  const { visibleNodeTypes, searchQuery, getFilteredNodes, getFilteredEdges } = useGraphStore()

  const initCytoscape = useCallback(() => {
    if (!containerRef.current || !graph) return

    const nodes = getFilteredNodes()
    const edges = getFilteredEdges()

    if (nodes.length === 0) {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
      return
    }

    if (cyRef.current) {
      cyRef.current.destroy()
      cyRef.current = null
    }

    // Compute degree/connectivity for each node to size hubs larger
    const degree: Record<string, number> = {}
    edges.forEach((edge: GraphEdge) => {
      degree[edge.source] = (degree[edge.source] || 0) + 1
      degree[edge.target] = (degree[edge.target] || 0) + 1
    })

    const getNodeSize = (node: GraphNode) => {
      const base = NODE_CONFIG[node.type]?.size ?? 18
      const connections = degree[node.id] || 0
      // Hub nodes scale up. Max 3x the base size.
      const scale = Math.min(1 + connections * 0.15, 3)
      return Math.round(base * scale)
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...nodes.map((node: GraphNode) => ({
          data: { ...node },
        })),
        ...edges.map((edge: GraphEdge) => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
          },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: cytoscape.NodeSingular) =>
              NODE_CONFIG[ele.data('type')]?.color ?? '#e2e8f0',
            'border-width': 1.5,
            'border-color': (ele: cytoscape.NodeSingular) =>
              NODE_CONFIG[ele.data('type')]?.border ?? '#94a3b8',
            'border-opacity': 0.7,
            'width': (ele: cytoscape.NodeSingular) => getNodeSize(ele.data()),
            'height': (ele: cytoscape.NodeSingular) => getNodeSize(ele.data()),
            'shape': 'ellipse',
            'label': 'data(label)',
            'font-size': 9,
            'font-family': '"Geist Mono", "Fira Code", monospace',
            'font-weight': 400,
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 4,
            'color': '#94a3b8',
            'text-max-width': '80px',
            'text-wrap': 'ellipsis',
            // shadow for glow effect matching reference
            'shadow-blur': 8,
            'shadow-color': (ele: cytoscape.NodeSingular) =>
              NODE_CONFIG[ele.data('type')]?.border ?? '#94a3b8',
            'shadow-opacity': 0.4,
            'shadow-offset-x': 0,
            'shadow-offset-y': 0,
          } as any,
        },
        {
          // Hub nodes (high degree) get stronger glow
          selector: 'node[?highlighted]',
          style: { 'shadow-blur': 20, 'shadow-opacity': 0.9 } as any,
        },
        {
          selector: 'edge',
          style: {
            'width': 0.8,
            'line-color': EDGE_COLOR,
            'line-opacity': 0.35,
            'target-arrow-color': EDGE_COLOR,
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.6,
            'curve-style': 'haystack', // faster than bezier for large graphs
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#6366f1',
            'border-opacity': 1,
            'shadow-blur': 24,
            'shadow-color': '#6366f1',
            'shadow-opacity': 0.8,
          } as any,
        },
        {
          selector: 'node.hover-highlight',
          style: {
            'border-width': 2.5,
            'border-color': '#22d3ee',
            'border-opacity': 1,
            'shadow-color': '#22d3ee',
            'shadow-blur': 18,
            'shadow-opacity': 0.7,
          } as any,
        },
        {
          selector: 'edge.hover-highlight',
          style: {
            'line-color': '#22d3ee',
            'line-opacity': 0.9,
            'width': 1.5,
          },
        },
        {
          // Dim unconnected nodes during hover
          selector: 'node.dimmed',
          style: { 'opacity': 0.15 },
        },
        {
          selector: 'edge.dimmed',
          style: { 'opacity': 0.05 },
        },
      ],
      layout: {
        name: 'cose-bilkent',
        animate: false, // Don't animate - too slow with many nodes
        randomize: true,
        idealEdgeLength: 80,
        nodeRepulsion: 6500,
        edgeElasticity: 0.4,
        nestingFactor: 0.1,
        gravity: 0.3,
        numIter: 1500,
        tile: false,
        gravityRange: 3.8,
      } as cytoscape.LayoutOptions,
      minZoom: 0.05,
      maxZoom: 4,
      wheelSensitivity: 0.25,
      // Performance optimizations
      textureOnViewport: true,
      hideEdgesOnViewport: false,
      motionBlur: false,
    })

    setStats({
      nodes: nodes.length,
      edges: edges.length,
      files: nodes.filter((n: GraphNode) => n.type === 'file').length,
    })

    // Hover: highlight neighbours, dim rest
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target
      const neighbourhood = node.closedNeighborhood()
      cy.elements().not(neighbourhood).addClass('dimmed')
      neighbourhood.addClass('hover-highlight')
      document.body.style.cursor = 'pointer'
    })

    cy.on('mouseout', 'node', () => {
      cy.elements().removeClass('dimmed hover-highlight')
      document.body.style.cursor = 'default'
    })

    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      setSelectedNode(node.data() as GraphNode)
    })

    cy.on('tap', (evt) => {
      if (evt.target === cy) setSelectedNode(null)
    })

    cyRef.current = cy

    return () => { cy.destroy() }
  }, [graph, visibleNodeTypes, searchQuery])

  useEffect(() => {
    const cleanup = initCytoscape()
    return cleanup
  }, [initCytoscape])

  const handleZoomIn = () => cyRef.current?.zoom({ level: (cyRef.current.zoom() || 1) * 1.25, renderedPosition: { x: containerRef.current!.clientWidth / 2, y: containerRef.current!.clientHeight / 2 } })
  const handleZoomOut = () => cyRef.current?.zoom({ level: (cyRef.current.zoom() || 1) * 0.8, renderedPosition: { x: containerRef.current!.clientWidth / 2, y: containerRef.current!.clientHeight / 2 } })
  const handleFit = () => cyRef.current?.fit(undefined, 40)

  const handleExport = () => {
    if (!cyRef.current) return
    const png = cyRef.current.png({ bg: '#0d1117', full: true, scale: 2 })
    const link = document.createElement('a')
    link.download = 'dependency-graph.png'
    link.href = png
    link.click()
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-transparent relative z-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-teal-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-teal-500/40 animate-ping" style={{ animationDelay: '0.3s' }} />
            <Loader2 className="w-16 h-16 text-teal-400 animate-spin absolute inset-0" />
          </div>
          <p className="text-slate-400 font-mono text-sm">Building dependency graph...</p>
          <p className="text-slate-600 text-xs mt-1">This may take a moment</p>
        </div>
      </div>
    )
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-transparent">
        <p className="text-slate-500 font-mono text-sm">No graph data. Run analysis to generate the graph.</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full bg-transparent">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl p-1.5 shadow-xl">
          <ToolButton onClick={handleZoomIn} title="Zoom In"><ZoomIn className="w-4 h-4" /></ToolButton>
          <ToolButton onClick={handleZoomOut} title="Zoom Out"><ZoomOut className="w-4 h-4" /></ToolButton>
          <ToolButton onClick={handleFit} title="Fit to Screen"><Maximize2 className="w-4 h-4" /></ToolButton>
          <div className="w-px h-5 bg-slate-700 mx-0.5" />
          <ToolButton onClick={handleExport} title="Export PNG"><Download className="w-4 h-4" /></ToolButton>
        </div>
      </div>

      {/* Stats Badge */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <StatBadge label="Nodes" value={stats.nodes} />
        <StatBadge label="Edges" value={stats.edges} />
        <StatBadge label="Files" value={stats.files} />
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur border border-slate-700/50 rounded-xl p-3 shadow-xl">
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Node Types</p>
        <div className="space-y-1.5">
          {Object.entries(NODE_CONFIG).map(([type, cfg]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: cfg.color, borderColor: cfg.border }} />
              <span className="text-[11px] text-slate-400 capitalize font-mono">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Node Detail Panel */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-20 w-64 bg-slate-900/95 backdrop-blur border border-teal-500/30 rounded-xl p-4 shadow-2xl">
          <div className="flex items-start justify-between mb-2">
            <div
              className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
              style={{ backgroundColor: NODE_CONFIG[selectedNode.type]?.color ?? '#e2e8f0' }}
            />
            <button onClick={() => setSelectedNode(null)} className="text-slate-600 hover:text-slate-300 text-xs">✕</button>
          </div>
          <p className="text-white font-mono text-sm font-semibold leading-tight break-all">{selectedNode.label}</p>
          <p className="text-teal-400 text-[10px] uppercase mt-1 font-bold">{selectedNode.type}</p>
          {selectedNode.path && (
            <p className="text-slate-500 text-[10px] mt-2 leading-relaxed break-all font-mono">{selectedNode.path}</p>
          )}
          {selectedNode.language && (
            <span className="inline-block mt-2 px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded-md uppercase">
              {selectedNode.language}
            </span>
          )}
          {selectedNode.metrics?.linesOfCode && (
            <p className="text-slate-500 text-[10px] mt-1">{selectedNode.metrics.linesOfCode} lines</p>
          )}
        </div>
      )}

      {/* Cytoscape Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}

function ToolButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-all duration-150"
    >
      {children}
    </button>
  )
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-lg px-3 py-1.5 text-center shadow-lg">
      <p className="text-base font-bold text-white font-mono tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[10px] text-slate-500 uppercase">{label}</p>
    </div>
  )
}
