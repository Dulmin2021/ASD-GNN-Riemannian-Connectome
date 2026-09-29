import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { Eye, RotateCw, Layers, Compass, Info, Check, Shield } from 'lucide-react'

const LOBE_COLORS = {
  Frontal:     '#2563eb', // Blue
  Parietal:    '#7c3aed', // Purple
  Temporal:    '#d97706', // Amber
  Occipital:   '#059669', // Emerald
  Cerebellum:  '#dc2626', // Red
  Subcortical: '#4b5563', // Slate
}

const CIRCUIT_COLORS = {
  DMN:            '#2563eb',
  SocialBrain:    '#ea580c',
  CerebellarLoop: '#dc2626',
  All:            '#002060',
}

export default function BiomarkerGraph({ nodes = [], edges = [] }) {
  const svgRef = useRef(null)
  
  // State for view controls
  const [viewMode, setViewMode] = useState('axial') // 'axial' | 'sagittal' | '3d' | 'topology'
  const [circuitFilter, setCircuitFilter] = useState('All') // 'All' | 'DMN' | 'SocialBrain' | 'Underconnected' | 'InterHemispheric'
  const [selectedNode, setSelectedNode] = useState(null)
  const [rotX, setRotX] = useState(15) // elevation angle in degrees
  const [rotY, setRotY] = useState(-25) // azimuth angle in degrees
  const isDragging = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  // Filter edges and active nodes based on circuit selection
  const filteredEdges = useMemo(() => {
    if (!edges) return []
    if (circuitFilter === 'All') return edges
    if (circuitFilter === 'DMN') return edges.filter(e => e.circuit === 'DMN')
    if (circuitFilter === 'SocialBrain') return edges.filter(e => e.circuit === 'SocialBrain')
    if (circuitFilter === 'Underconnected') return edges.filter(e => e.type === 'long-range')
    if (circuitFilter === 'InterHemispheric') return edges.filter(e => e.type === 'inter-hemispheric')
    return edges
  }, [edges, circuitFilter])

  const activeNodeIds = useMemo(() => {
    if (circuitFilter === 'All') return new Set(nodes.map(n => n.id))
    const ids = new Set()
    filteredEdges.forEach(e => {
      const sId = typeof e.source === 'object' ? e.source.id : e.source
      const tId = typeof e.target === 'object' ? e.target.id : e.target
      ids.add(sId)
      ids.add(tId)
    })
    return ids
  }, [nodes, filteredEdges, circuitFilter])

  // Mouse drag handlers for 3D rotation
  const handleMouseDown = (e) => {
    if (viewMode !== '3d') return
    isDragging.current = true
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current || viewMode !== '3d') return
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    setRotY(prev => (prev + dx * 0.6) % 360)
    setRotX(prev => Math.max(-80, Math.min(80, prev - dy * 0.6)))
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  useEffect(() => {
    if (!nodes || !nodes.length || !svgRef.current) return
    const W = 620, H = 420
    const CX = W / 2, CY = H / 2

    // Clone arrays to prevent D3 mutation
    const simNodes = nodes.map(n => ({ ...n }))
    const simEdges = filteredEdges.map(e => ({
      ...e,
      source: typeof e.source === 'object' ? e.source.id : e.source,
      target: typeof e.target === 'object' ? e.target.id : e.target,
    }))

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${W} ${H}`)

    // Create defs for gradients and glow
    const defs = svg.append('defs')
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // ─── 1. ANATOMICAL SILHOUETTES ──────────────────────────────────────────
    const bgGroup = svg.append('g').attr('class', 'background-silhouettes')

    if (viewMode === 'axial') {
      // Axial (Horizontal) Brain Outline (top is Anterior, bottom is Posterior)
      bgGroup.append('path')
        .attr('d', `
          M ${CX} ${CY - 170}
          C ${CX + 95} ${CY - 165}, ${CX + 155} ${CY - 110}, ${CX + 160} ${CY}
          C ${CX + 165} ${CY + 110}, ${CX + 115} ${CY + 165}, ${CX} ${CY + 180}
          C ${CX - 115} ${CY + 180}, ${CX - 165} ${CY + 110}, ${CX - 160} ${CY}
          C ${CX - 155} ${CY - 110}, ${CX - 95} ${CY - 165}, ${CX} ${CY - 170} Z
        `)
        .attr('fill', '#f1f5f9')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6 4')

      // Longitudinal Fissure (Inter-hemispheric midline)
      bgGroup.append('line')
        .attr('x1', CX).attr('y1', CY - 165)
        .attr('x2', CX).attr('y2', CY + 175)
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3 3')

      // Direction markers
      bgGroup.append('text').attr('x', CX).attr('y', CY - 180).attr('text-anchor', 'middle').attr('class', 'text-[11px] font-bold fill-slate-400').text('ANTERIOR (Frontal)')
      bgGroup.append('text').attr('x', CX).attr('y', CY + 200).attr('text-anchor', 'middle').attr('class', 'text-[11px] font-bold fill-slate-400').text('POSTERIOR (Occipital / Cerebellum)')
      bgGroup.append('text').attr('x', CX - 180).attr('y', CY).attr('text-anchor', 'middle').attr('class', 'text-[11px] font-bold fill-slate-400').text('LEFT')
      bgGroup.append('text').attr('x', CX + 180).attr('y', CY).attr('text-anchor', 'middle').attr('class', 'text-[11px] font-bold fill-slate-400').text('RIGHT')

    } else if (viewMode === 'sagittal') {
      // Sagittal Brain Outline (Left is Posterior, Right is Anterior)
      bgGroup.append('path')
        .attr('d', `
          M ${CX + 140} ${CY}
          C ${CX + 140} ${CY - 100}, ${CX + 50} ${CY - 150}, ${CX - 30} ${CY - 140}
          C ${CX - 120} ${CY - 130}, ${CX - 160} ${CY - 40}, ${CX - 160} ${CY + 40}
          C ${CX - 150} ${CY + 110}, ${CX - 80} ${CY + 140}, ${CX - 40} ${CY + 110}
          C ${CX - 10} ${CY + 80}, ${CX + 50} ${CY + 70}, ${CX + 110} ${CY + 50}
          C ${CX + 135} ${CY + 40}, ${CX + 140} ${CY + 20}, ${CX + 140} ${CY} Z
        `)
        .attr('fill', '#f1f5f9')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6 4')

      // Cerebellum sub-silhouette
      bgGroup.append('ellipse')
        .attr('cx', CX - 90).attr('cy', CY + 90)
        .attr('rx', 45).attr('ry', 30)
        .attr('fill', '#e2e8f0')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-dasharray', '4 3')

      bgGroup.append('text').attr('x', CX + 140).attr('y', CY - 150).attr('text-anchor', 'middle').attr('class', 'text-[11px] font-bold fill-slate-400').text('ANTERIOR')
      bgGroup.append('text').attr('x', CX - 150).attr('y', CY - 150).attr('text-anchor', 'middle').attr('class', 'text-[11px] font-bold fill-slate-400').text('POSTERIOR')
      bgGroup.append('text').attr('x', CX).attr('y', CY - 160).attr('text-anchor', 'middle').attr('class', 'text-[11px] font-bold fill-slate-400').text('DORSAL (Superior)')
      bgGroup.append('text').attr('x', CX).attr('y', CY + 160).attr('text-anchor', 'middle').attr('class', 'text-[11px] font-bold fill-slate-400').text('VENTRAL (Inferior)')

    } else if (viewMode === '3d') {
      // 3D Glass Brain Coordinate Axes & Spherical Ring
      bgGroup.append('ellipse')
        .attr('cx', CX).attr('cy', CY)
        .attr('rx', 180).attr('ry', 130)
        .attr('fill', '#f8fafc')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5 5')
        
      bgGroup.append('text')
        .attr('x', CX)
        .attr('y', CY + 170)
        .attr('text-anchor', 'middle')
        .attr('class', 'text-[11px] fill-slate-400 font-medium')
        .text('Drag canvas to orbit in 3D MNI coordinate space')
    }

    // ─── 2. COORDINATE PROJECTION LOGIC ─────────────────────────────────────
    const radX = (rotX * Math.PI) / 180
    const radY = (rotY * Math.PI) / 180

    const project = (mni) => {
      const [mx, my, mz] = mni
      if (viewMode === 'axial') {
        // Axial: X -> screen X, Y -> screen Y (inverted so anterior is up)
        return {
          x: CX + mx * 2.3,
          y: CY - my * 2.2,
          depth: mz
        }
      } else if (viewMode === 'sagittal') {
        // Sagittal: Y -> screen X, Z -> screen Y (inverted so superior is up)
        return {
          x: CX + my * 2.3,
          y: CY - mz * 2.3,
          depth: mx
        }
      } else if (viewMode === '3d') {
        // 3D Orthographic projection with Euler rotation around Y then X
        // 1. Rotate around Y axis (Azimuth)
        const x1 = mx * Math.cos(radY) + my * Math.sin(radY)
        const y1 = -mx * Math.sin(radY) + my * Math.cos(radY)
        const z1 = mz

        // 2. Rotate around X axis (Elevation)
        const x2 = x1
        const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX)
        const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX)

        return {
          x: CX + x2 * 2.2,
          y: CY - z2 * 2.2,
          depth: y2
        }
      }
      return { x: CX, y: CY, depth: 0 }
    }

    // ─── 3. SIMULATION / RENDERING ──────────────────────────────────────────
    const edgeGroup = svg.append('g').attr('class', 'edges')
    const nodeGroup = svg.append('g').attr('class', 'nodes')

    if (viewMode === 'topology') {
      // Force-directed simulation mode
      const sim = d3.forceSimulation(simNodes)
        .force('link', d3.forceLink(simEdges).id(d => d.id).distance(d => d.type === 'long-range' ? 140 : 75))
        .force('charge', d3.forceManyBody().strength(-280))
        .force('center', d3.forceCenter(CX, CY))
        .force('x', d3.forceX(CX).strength(0.06))
        .force('y', d3.forceY(CY).strength(0.06))

      const edgeSel = edgeGroup.selectAll('line')
        .data(simEdges).join('line')
        .attr('stroke', d => d.circuit === 'DMN' ? '#2563eb' : d.circuit === 'SocialBrain' ? '#ea580c' : '#7c3aed')
        .attr('stroke-width', d => 1.5 + d.weight * 3)
        .attr('stroke-dasharray', d => d.type === 'intra-lobar' ? '4 3' : 'none')
        .attr('opacity', 0.8)

      const nodeSel = nodeGroup.selectAll('g')
        .data(simNodes).join('g')
        .style('cursor', 'pointer')
        .call(
          d3.drag()
            .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
            .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y })
            .on('end',   (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
        )
        .on('click', (event, d) => setSelectedNode(d))

      nodeSel.append('circle')
        .attr('r', d => 7 + d.salience * 12)
        .attr('fill', d => LOBE_COLORS[d.lobe] || '#4b5563')
        .attr('stroke', d => selectedNode?.id === d.id ? '#f59e0b' : '#ffffff')
        .attr('stroke-width', d => selectedNode?.id === d.id ? 3 : 2)
        .attr('filter', 'url(#glow)')

      nodeSel.append('text')
        .text(d => d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', 8)
        .attr('font-weight', '700')
        .attr('fill', '#ffffff')
        .attr('pointer-events', 'none')

      sim.on('tick', () => {
        edgeSel
          .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
        nodeSel.attr('transform', d => `translate(${d.x},${d.y})`)
      })

      return () => sim.stop()

    } else {
      // Anatomical MNI Projected Modes (Axial, Sagittal, 3D)
      const projectedNodesMap = new Map()
      simNodes.forEach(n => {
        const proj = project(n.mni)
        projectedNodesMap.set(n.id, { ...n, px: proj.x, py: proj.y, depth: proj.depth })
      })

      // Sort nodes by depth for realistic 3D occlusion
      const sortedEdges = [...simEdges].sort((a, b) => {
        const srcA = projectedNodesMap.get(a.source)
        const srcB = projectedNodesMap.get(b.source)
        return (srcA?.depth || 0) - (srcB?.depth || 0)
      })

      // Render Edges
      edgeGroup.selectAll('line')
        .data(sortedEdges).join('line')
        .attr('x1', d => projectedNodesMap.get(d.source)?.px)
        .attr('y1', d => projectedNodesMap.get(d.source)?.py)
        .attr('x2', d => projectedNodesMap.get(d.target)?.px)
        .attr('y2', d => projectedNodesMap.get(d.target)?.py)
        .attr('stroke', d => d.circuit === 'DMN' ? '#2563eb' : d.circuit === 'SocialBrain' ? '#ea580c' : '#7c3aed')
        .attr('stroke-width', d => 1.8 + d.weight * 2.8)
        .attr('stroke-dasharray', d => d.type === 'intra-lobar' ? '4 3' : 'none')
        .attr('stroke-linecap', 'round')
        .attr('opacity', d => {
          const sActive = activeNodeIds.has(d.source)
          const tActive = activeNodeIds.has(d.target)
          return (sActive && tActive) ? 0.85 : 0.15
        })

      // Render Nodes
      const nodeSel = nodeGroup.selectAll('g')
        .data(Array.from(projectedNodesMap.values())).join('g')
        .attr('transform', d => `translate(${d.px},${d.py})`)
        .style('cursor', 'pointer')
        .on('click', (event, d) => setSelectedNode(d))

      nodeSel.append('circle')
        .attr('r', d => {
          const baseR = 7 + d.salience * 12
          const scale = viewMode === '3d' ? 0.75 + (d.depth + 100) / 300 : 1
          return Math.max(4, baseR * scale)
        })
        .attr('fill', d => activeNodeIds.has(d.id) ? (LOBE_COLORS[d.lobe] || '#4b5563') : '#cbd5e1')
        .attr('stroke', d => selectedNode?.id === d.id ? '#f59e0b' : '#ffffff')
        .attr('stroke-width', d => selectedNode?.id === d.id ? 3 : 2)
        .attr('filter', 'url(#glow)')
        .attr('opacity', d => activeNodeIds.has(d.id) ? 0.95 : 0.25)

      nodeSel.append('text')
        .text(d => d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', 8)
        .attr('font-weight', '700')
        .attr('fill', '#ffffff')
        .attr('pointer-events', 'none')
        .attr('opacity', d => activeNodeIds.has(d.id) ? 1 : 0.3)
    }
  }, [nodes, filteredEdges, viewMode, rotX, rotY, circuitFilter, selectedNode, activeNodeIds])

  return (
    <div className="relative w-full rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* ─── Top Control Bar ────────────────────────────────────────── */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* View Mode Selector */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setViewMode('axial')}
            className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'axial' ? 'bg-[#002060] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Axial (Top-Down)
          </button>
          <button
            onClick={() => setViewMode('sagittal')}
            className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'sagittal' ? 'bg-[#002060] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Sagittal (Lateral)
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === '3d' ? 'bg-[#002060] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <RotateCw className="w-3.5 h-3.5" /> 3D Glass Brain
          </button>
          <button
            onClick={() => setViewMode('topology')}
            className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'topology' ? 'bg-[#002060] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Network Topology
          </button>
        </div>

        {/* Circuit Filter Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">Circuit:</span>
          <select
            value={circuitFilter}
            onChange={(e) => setCircuitFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Biomarkers (14 Edges)</option>
            <option value="DMN">Default Mode Network (mPFC ↔ Precun/PCC)</option>
            <option value="SocialBrain">Social Brain Circuit (STS ↔ IFG/Amyg)</option>
            <option value="Underconnected">Long-Range Underconnected (82.4%)</option>
            <option value="InterHemispheric">Inter-Hemispheric Bridges</option>
          </select>
        </div>
      </div>

      {/* ─── Main SVG Canvas ────────────────────────────────────────── */}
      <div
        className="relative w-full flex-1 bg-slate-50/50 flex items-center justify-center cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg ref={svgRef} className="w-full h-[400px]" />

        {/* Anatomical Lobe Legend */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl p-2.5 border border-slate-200 shadow-sm text-xs space-y-1.5">
          <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-1">Anatomical Lobes</div>
          {Object.entries(LOBE_COLORS).map(([lobe, color]) => (
            <div key={lobe} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-slate-600 text-[11px] font-medium">{lobe}</span>
            </div>
          ))}
        </div>

        {/* Circuit Badge Legend */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl p-2.5 border border-slate-200 shadow-sm text-xs space-y-1">
          <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-1">Functional Circuits</div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 rounded-full bg-blue-600" />
            <span className="text-slate-600 text-[11px]">Default Mode Network (DMN)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 rounded-full bg-orange-600" />
            <span className="text-slate-600 text-[11px]">Social Brain (STS/IFG)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 rounded-full bg-purple-600" />
            <span className="text-slate-600 text-[11px]">Commissural / Cerebellar</span>
          </div>
        </div>

        {/* Hint banner for 3D */}
        {viewMode === '3d' && (
          <div className="absolute top-3 right-3 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 text-[11px] text-blue-700 font-medium flex items-center gap-1.5 shadow-sm">
            <RotateCw className="w-3 h-3 animate-spin text-blue-600" />
            Elevation: {Math.round(rotX)}° | Azimuth: {Math.round(rotY)}°
          </div>
        )}
      </div>

      {/* ─── Bottom Anatomical Inspector Drawer ────────────────────────── */}
      <div className="bg-white border-t border-slate-200 p-4">
        {selectedNode ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-slate-800">{selectedNode.fullName}</span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    AAL #{selectedNode.aalIndex}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded text-white" style={{ background: LOBE_COLORS[selectedNode.lobe] }}>
                    {selectedNode.lobe} Lobe
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selectedNode.desc}</p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Clear
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">MNI Coordinates (X, Y, Z)</span>
                <span className="font-mono font-bold text-slate-700">[{selectedNode.mni?.join(', ')}] mm</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">GNNExplainer Salience</span>
                <span className="font-mono font-bold text-blue-700">{(selectedNode.salience * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Circuit</span>
                <span className="font-bold text-slate-700">{selectedNode.circuit}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Hemisphere</span>
                <span className="font-bold text-slate-700">{selectedNode.hemi === 'L' ? 'Left' : selectedNode.hemi === 'R' ? 'Right' : 'Medial'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Click any brain region above to inspect its <strong>stereotaxic MNI coordinates</strong>, <strong>AAL index</strong>, and <strong>clinical functional pathway</strong>.</span>
            </div>
            <span className="font-mono text-slate-400 font-semibold">15 Salient Regions Active</span>
          </div>
        )}
      </div>
    </div>
  )
}
