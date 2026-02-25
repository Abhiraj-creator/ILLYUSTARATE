import { useEffect, useRef, useCallback } from 'react'
import cytoscape from 'cytoscape'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import coseBilkent from 'cytoscape-cose-bilkent'
import type { CodeGraph, GraphNode, GraphEdge } from '@shared/types'
import { NODE_TYPE_COLORS } from '@shared/constants'
import { Loader2, ZoomIn, ZoomOut, Maximize, Download } from 'lucide-react'

cytoscape.use(coseBilkent)

interface GraphViewerProps {
  graph: CodeGraph | null
  isLoading: boolean
}

export function GraphViewer({ graph, isLoading }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  const initCytoscape = useCallback(() => {
    if (!containerRef.current || !graph) return

    // Destroy existing instance
    if (cyRef.current) {
      cyRef.current.destroy()
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...graph.nodes.map((node: GraphNode) => ({
          data: {
            ...node,
          },
        })),
        ...graph.edges.map((edge: GraphEdge) => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            label: edge.label,
          },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: cytoscape.NodeSingular) => {
              const type = ele.data('type') as string
              return NODE_TYPE_COLORS[type] || '#94a3b8'
            },
            'label': 'data(label)',
            'width': (ele: cytoscape.NodeSingular) => {
              const type = ele.data('type')
              return type === 'file' ? 40 : type === 'folder' ? 50 : 30
            },
            'height': (ele: cytoscape.NodeSingular) => {
              const type = ele.data('type')
              return type === 'file' ? 40 : type === 'folder' ? 50 : 30
            },
            'font-size': '12px',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 8,
            'color': '#f8fafc',
            'text-background-color': '#0f172a',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px 6px',
            'text-background-shape': 'roundrectangle',
            'border-width': 2,
            'border-color': '#1e293b',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 1,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
            'label': 'data(label)',
            'font-size': '10px',
            'color': '#94a3b8',
            'text-background-color': '#0f172a',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px 4px',
          },
        },
        {
          selector: ':selected',
          style: {
            'border-width': 3,
            'border-color': '#6366f1',
            'border-opacity': 1,
          },
        },
        {
          selector: '.highlighted',
          style: {
            'border-width': 3,
            'border-color': '#f59e0b',
          },
        },
      ],
      layout: {
        name: 'cose-bilkent',
        animate: true,
        animationDuration: 500,
        nodeDimensionsIncludeLabels: true,
        idealEdgeLength: 100,
        nodeRepulsion: 4500,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10,
        gravityRangeCompound: 1.5,
        gravityCompound: 1.0,
        gravityRange: 3.8,
        initialEnergyOnIncremental: 0.5,
      } as cytoscape.LayoutOptions,
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    })

    // Add click handler
    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      console.log('Clicked node:', node.data())
      // Here you could open a details panel or navigate to the file
    })

    // Add hover effects
    cy.on('mouseover', 'node', (evt) => {
      evt.target.addClass('highlighted')
      document.body.style.cursor = 'pointer'
    })

    cy.on('mouseout', 'node', (evt) => {
      evt.target.removeClass('highlighted')
      document.body.style.cursor = 'default'
    })

    cyRef.current = cy

    return () => {
      cy.destroy()
    }
  }, [graph])

  useEffect(() => {
    const cleanup = initCytoscape()
    return cleanup
  }, [initCytoscape])

  const handleZoomIn = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 1.2)
  }

  const handleZoomOut = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 0.8)
  }

  const handleFit = () => {
    cyRef.current?.fit()
  }

  const handleExport = () => {
    if (!cyRef.current) return
    const png = cyRef.current.png({
      bg: '#0f172a',
      full: true,
    })
    const link = document.createElement('a')
    link.download = 'graph.png'
    link.href = png
    link.click()
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading graph...</p>
        </div>
      </div>
    )
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">No graph data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-1 flex items-center gap-1">
          <button
            onClick={handleZoomIn}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={handleFit}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Fit to Screen"
          >
            <Maximize className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-slate-700 mx-1" />
          <button
            onClick={handleExport}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Export as PNG"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
        <h4 className="text-sm font-medium text-white mb-2">Node Types</h4>
        <div className="space-y-1.5">
          {Object.entries(NODE_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-slate-400 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph Container */}
      <div 
        ref={containerRef} 
        className="w-full h-full bg-slate-900"
        style={{ minHeight: '500px' }}
      />
    </div>
  )
}
