import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { Eye, RotateCw, Layers, Compass, Info, Check, Shield, Sun, Moon, Play, Pause } from 'lucide-react'

// ─── Lobe Colors (High-contrast medical palette) ──────────────────────────────
const LOBE_COLORS = {
  Frontal:     '#3b82f6', // Vivid Blue
  Parietal:    '#a855f7', // Purple
  Temporal:    '#f59e0b', // Amber/Orange
  Occipital:   '#10b981', // Emerald
  Cerebellum:  '#ef4444', // Red
  Subcortical: '#06b6d4', // Cyan
}

// ─── Circuit Tract Colors ─────────────────────────────────────────────────────
const TRACT_COLORS = {
  DMN:            '#38bdf8', // Neon Sky Blue
  SocialBrain:    '#fb923c', // Neon Warm Amber
  CerebellarLoop: '#f43f5e', // Neon Rose/Red
  All:            '#818cf8', // Indigo
}

// ─── 3D Anatomical Glass Brain Parametric Surface Points (MNI-152 Outline) ───
// Real stereotaxic cortical landmarks sampled across MNI space
const CORTICAL_HULL_3D = [
  // Frontal Pole & Superior Cortex
  { x: 0,   y: 65,  z: 15 },
  { x: -25, y: 58,  z: 22 }, { x: 25, y: 58,  z: 22 },
  { x: -45, y: 40,  z: 30 }, { x: 45, y: 40,  z: 30 },
  { x: -55, y: 15,  z: 42 }, { x: 55, y: 15,  z: 42 },
  { x: -52, y: -20, z: 48 }, { x: 52, y: -20, z: 48 },
  // Parietal & Superior Sagittal
  { x: -40, y: -55, z: 48 }, { x: 40, y: -55, z: 48 },
  { x: -20, y: -80, z: 32 }, { x: 20, y: -80, z: 32 },
  // Occipital Pole
  { x: 0,   y: -100,z: 10 },
  // Cerebellar Rim
  { x: -35, y: -75, z: -28 }, { x: 35, y: -75, z: -28 },
  { x: -18, y: -65, z: -42 }, { x: 18, y: -65, z: -42 },
  // Temporal Lateral Bulges
  { x: -62, y: -15, z: -10 }, { x: 62, y: -15, z: -10 },
  { x: -58, y: 10,  z: -18 }, { x: 58, y: 10,  z: -18 },
  // Inferior Orbitofrontal
  { x: -22, y: 42,  z: -18 }, { x: 22, y: 42,  z: -18 },
]

export default function BiomarkerGraph({ nodes = [], edges = [] }) {
  const svgRef = useRef(null)

  // Display and interactive state
  const [viewMode, setViewMode] = useState('3d') // '3d' | 'triplanar' | 'axial' | 'sagittal' | 'topology'
  const [theme, setTheme] = useState('dark') // 'dark' (Neuro-Glow) | 'light' (Nilearn Paper)
  const [circuitFilter, setCircuitFilter] = useState('All')
  const [selectedNode, setSelectedNode] = useState(null)
  const [autoRotate, setAutoRotate] = useState(true)

  // 3D camera angles
  const [rotX, setRotX] = useState(14)  // Elevation angle
  const [rotY, setRotY] = useState(-32) // Azimuth angle
  const isDragging = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })
  const animFrameId = useRef(null)

  // Auto-rotation animation loop in 3D mode
  useEffect(() => {
    if (!autoRotate || viewMode !== '3d') {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
      return
    }
    const step = () => {
      setRotY(prev => (prev + 0.35) % 360)
      animFrameId.current = requestAnimationFrame(step)
    }
    animFrameId.current = requestAnimationFrame(step)
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
    }
  }, [autoRotate, viewMode])

  // Filter edges based on circuit
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

  // Mouse drag handlers for 3D Camera Rotation
  const handleMouseDown = (e) => {
    if (viewMode !== '3d') return
    isDragging.current = true
    setAutoRotate(false)
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current || viewMode !== '3d') return
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    setRotY(prev => (prev + dx * 0.5) % 360)
    setRotX(prev => Math.max(-75, Math.min(75, prev - dy * 0.5)))
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  // ─── MAIN D3 RENDERING PIPELINE ───────────────────────────────────────────
  useEffect(() => {
    if (!nodes || !nodes.length || !svgRef.current) return
    const W = 680, H = 450
    const CX = W / 2, CY = H / 2

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${W} ${H}`)

    const isDark = theme === 'dark'

    // Defs: Glow filters and tract gradients
    const defs = svg.append('defs')

    // Intense Bloom / Glow filter
    const glowFilter = defs.append('filter').attr('id', 'neon-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    glowFilter.append('feGaussianBlur').attr('stdDeviation', isDark ? '4' : '2.5').attr('result', 'coloredBlur')
    const feMerge = glowFilter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Subtle Glass Brain Mesh Shimmer Filter
    const glassFilter = defs.append('filter').attr('id', 'glass-shimmer')
    glassFilter.append('feGaussianBlur').attr('stdDeviation', '1.5').attr('result', 'blur')
    const glassMerge = glassFilter.append('feMerge')
    glassMerge.append('feMergeNode').attr('in', 'blur')
    glassMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Color definitions based on active theme
    const bgFill = isDark ? '#0b0f19' : '#f8fafc'
    const wireColor = isDark ? '#1e293b' : '#cbd5e1'
    const contourStroke = isDark ? '#38bdf8' : '#64748b'
    const contourOpacity = isDark ? 0.35 : 0.45
    const textMuted = isDark ? '#64748b' : '#94a3b8'

    // Background Canvas Rect
    svg.append('rect')
      .attr('width', W)
      .attr('height', H)
      .attr('fill', bgFill)
      .attr('rx', 16)

    // Deep Radial Background Glow (in dark mode)
    if (isDark) {
      const radGrad = defs.append('radialGradient').attr('id', 'bg-glow').attr('cx', '50%').attr('cy', '50%').attr('r', '50%')
      radGrad.append('stop').attr('offset', '0%').attr('stop-color', '#1e1b4b').attr('stop-opacity', '0.45')
      radGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0b0f19').attr('stop-opacity', '0')
      svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'url(#bg-glow)')
    }

    // ─── 3D PROJECTION MATH ────────────────────────────────────────────────
    const radX = (rotX * Math.PI) / 180
    const radY = (rotY * Math.PI) / 180

    const project3D = (x, y, z, scale = 2.4, cx = CX, cy = CY) => {
      // 1. Azimuth Rotation (Y axis)
      const x1 = x * Math.cos(radY) + y * Math.sin(radY)
      const y1 = -x * Math.sin(radY) + y * Math.cos(radY)
      const z1 = z

      // 2. Elevation Rotation (X axis)
      const x2 = x1
      const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX)
      const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX)

      // Perspective scale factor based on depth y2
      const fov = 420
      const pScale = fov / (fov - y2 * 0.8)

      return {
        x: cx + x2 * scale * pScale,
        y: cy - z2 * scale * pScale,
        depth: y2,
        scale: pScale
      }
    }

    // ─── VIEW MODE 1: 3D HOLOGRAPHIC GLASS BRAIN ───────────────────────────
    if (viewMode === '3d') {
      const gBrain = svg.append('g').attr('class', 'glass-brain-3d')

      // Draw 3D Translucent Glass Brain Wireframe Ribs (Sagittal & Axial Ribs)
      const ribAngles = [-60, -40, -20, 0, 20, 40, 60]
      const wireGroup = gBrain.append('g').attr('class', 'wireframe-mesh')

      // Longitudinal Elliptic Meridian Ribs
      ribAngles.forEach(phi => {
        const radPhi = (phi * Math.PI) / 180
        const pts = []
        for (let t = 0; t <= Math.PI * 2; t += Math.PI / 16) {
          const rx = 58 * Math.cos(radPhi) * Math.sin(t)
          const ry = 88 * Math.cos(t)
          const rz = 52 * Math.sin(radPhi) * Math.sin(t)
          pts.push(project3D(rx, ry, rz))
        }
        const lineGen = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveBasisClosed)
        wireGroup.append('path')
          .attr('d', lineGen(pts))
          .attr('fill', 'none')
          .attr('stroke', contourStroke)
          .attr('stroke-width', 0.8)
          .attr('stroke-dasharray', '3 4')
          .attr('opacity', contourOpacity * 0.7)
      })

      // Latitudinal Axial Rings
      const ringHeights = [-30, -15, 0, 20, 40]
      ringHeights.forEach(zLevel => {
        const pts = []
        const factor = Math.sqrt(Math.max(0, 1 - Math.pow(zLevel / 60, 2)))
        for (let a = 0; a <= Math.PI * 2; a += Math.PI / 18) {
          const rx = 58 * factor * Math.sin(a)
          const ry = 86 * factor * Math.cos(a)
          pts.push(project3D(rx, ry, zLevel))
        }
        const lineGen = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveBasisClosed)
        wireGroup.append('path')
          .attr('d', lineGen(pts))
          .attr('fill', 'none')
          .attr('stroke', contourStroke)
          .attr('stroke-width', 0.9)
          .attr('opacity', contourOpacity * 0.8)
          .attr('filter', 'url(#glass-shimmer)')
      })

      // Cortical Hull Silhouette Boundary
      const hullProj = CORTICAL_HULL_3D.map(p => project3D(p.x, p.y, p.z))
      const hullLine = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveCardinalClosed.tension(0.2))
      wireGroup.append('path')
        .attr('d', hullLine(hullProj))
        .attr('fill', isDark ? 'rgba(56, 189, 248, 0.03)' : 'rgba(203, 213, 225, 0.25)')
        .attr('stroke', contourStroke)
        .attr('stroke-width', 1.8)
        .attr('opacity', contourOpacity * 1.2)
        .attr('filter', 'url(#neon-glow)')

      // Map Projected Nodes
      const projectedNodes = nodes.map(n => {
        const [mx, my, mz] = n.mni
        const proj = project3D(mx, my, mz)
        return { ...n, px: proj.x, py: proj.y, depth: proj.depth, scale: proj.scale }
      })

      const nodeMap = new Map(projectedNodes.map(n => [n.id, n]))

      // Draw Neural Connectome Tracts (Curved 3D Arcs with Glow)
      const edgeGroup = gBrain.append('g').attr('class', 'edges-3d')
      
      // Sort edges by average depth for correct 3D occlusion
      const sortedEdges = [...filteredEdges].sort((a, b) => {
        const srcA = nodeMap.get(typeof a.source === 'object' ? a.source.id : a.source)
        const srcB = nodeMap.get(typeof b.source === 'object' ? b.source.id : b.source)
        return (srcA?.depth || 0) - (srcB?.depth || 0)
      })

      sortedEdges.forEach(e => {
        const sId = typeof e.source === 'object' ? e.source.id : e.source
        const tId = typeof e.target === 'object' ? e.target.id : e.target
        const src = nodeMap.get(sId)
        const tgt = nodeMap.get(tId)
        if (!src || !tgt) return

        const strokeColor = TRACT_COLORS[e.circuit] || TRACT_COLORS.All
        const isActive = activeNodeIds.has(sId) && activeNodeIds.has(tId)
        const isLongRange = e.type === 'long-range'

        // Compute curved midpoint bulging outwards
        const midX = (src.px + tgt.px) / 2
        const midY = (src.py + tgt.py) / 2 - (isLongRange ? 20 : 8)

        // Draw Curved Path
        const pathData = `M ${src.px} ${src.py} Q ${midX} ${midY} ${tgt.px} ${tgt.py}`
        
        edgeGroup.append('path')
          .attr('d', pathData)
          .attr('fill', 'none')
          .attr('stroke', strokeColor)
          .attr('stroke-width', (1.4 + e.weight * 2.5) * ((src.scale + tgt.scale) / 2))
          .attr('stroke-linecap', 'round')
          .attr('stroke-dasharray', isLongRange ? '6 3' : 'none')
          .attr('opacity', isActive ? (isDark ? 0.85 : 0.75) : 0.12)
          .attr('filter', isDark && isActive ? 'url(#neon-glow)' : 'none')
      })

      // Draw Neural Spheres (Nodes with Radial Gradient Shading)
      const nodeGroup = gBrain.append('g').attr('class', 'nodes-3d')
      
      // Sort nodes back-to-front
      projectedNodes.sort((a, b) => a.depth - b.depth).forEach(n => {
        const isActive = activeNodeIds.has(n.id)
        const isSelected = selectedNode?.id === n.id
        const baseRadius = 7 + n.salience * 12
        const r = Math.max(4, baseRadius * n.scale)
        const nodeColor = LOBE_COLORS[n.lobe] || '#38bdf8'

        const g = nodeGroup.append('g')
          .attr('transform', `translate(${n.px}, ${n.py})`)
          .style('cursor', 'pointer')
          .on('click', () => setSelectedNode(n))

        // Outer Halo for Selected Node
        if (isSelected) {
          g.append('circle')
            .attr('r', r + 6)
            .attr('fill', 'none')
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 2.5)
            .attr('stroke-dasharray', '4 2')
        }

        // Main Luminous Node Sphere
        g.append('circle')
          .attr('r', r)
          .attr('fill', isActive ? nodeColor : '#475569')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.8)
          .attr('opacity', isActive ? 0.95 : 0.25)
          .attr('filter', isDark && isActive ? 'url(#neon-glow)' : 'none')

        // Node Label
        g.append('text')
          .text(n.label)
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('font-size', Math.max(7, 8 * n.scale))
          .attr('font-weight', '700')
          .attr('fill', '#ffffff')
          .attr('pointer-events', 'none')
          .attr('opacity', isActive ? 1 : 0.3)
      })

    // ─── VIEW MODE 2: NILEARN TRI-PLANAR ORTHOGONAL DISPLAY ────────────────
    } else if (viewMode === 'triplanar') {
      const gTri = svg.append('g').attr('class', 'tri-planar-nilearn')
      const paneW = W / 3
      const scale2D = 1.4

      // Panel 1: SAGITTAL (Y, Z)
      const cx1 = paneW * 0.5, cy1 = CY
      // Panel 2: CORONAL (X, Z)
      const cx2 = paneW * 1.5, cy2 = CY
      // Panel 3: AXIAL (X, Y)
      const cx3 = paneW * 2.5, cy3 = CY

      const panes = [
        { name: 'Sagittal (Lateral)', cx: cx1, cy: cy1, xKey: 1, yKey: 2, xMult: 1, yMult: -1, u1: 'ANTERIOR', u2: 'POSTERIOR' },
        { name: 'Coronal (Frontal)',   cx: cx2, cy: cy2, xKey: 0, yKey: 2, xMult: 1, yMult: -1, u1: 'LEFT', u2: 'RIGHT' },
        { name: 'Axial (Horizontal)', cx: cx3, cy: cy3, xKey: 0, yKey: 1, xMult: 1, yMult: -1, u1: 'ANTERIOR', u2: 'POSTERIOR' },
      ]

      panes.forEach((p, idx) => {
        // Divider line
        if (idx > 0) {
          gTri.append('line')
            .attr('x1', p.cx - paneW / 2).attr('y1', 20)
            .attr('x2', p.cx - paneW / 2).attr('y2', H - 20)
            .attr('stroke', wireColor)
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4 4')
        }

        // Title
        gTri.append('text')
          .attr('x', p.cx).attr('y', 36)
          .attr('text-anchor', 'middle')
          .attr('class', `text-xs font-bold ${isDark ? 'fill-slate-300' : 'fill-slate-700'}`)
          .text(p.name)

        // Glass Brain Silhouette Contour
        gTri.append('ellipse')
          .attr('cx', p.cx).attr('cy', p.cy)
          .attr('rx', idx === 0 ? 82 : 72)
          .attr('ry', idx === 2 ? 86 : 68)
          .attr('fill', isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.7)')
          .attr('stroke', contourStroke)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5 4')
          .attr('opacity', contourOpacity)

        // Project and Render Edges
        filteredEdges.forEach(e => {
          const sNode = nodes.find(n => n.id === (typeof e.source === 'object' ? e.source.id : e.source))
          const tNode = nodes.find(n => n.id === (typeof e.target === 'object' ? e.target.id : e.target))
          if (!sNode || !tNode) return

          const x1 = p.cx + sNode.mni[p.xKey] * scale2D * p.xMult
          const y1 = p.cy + sNode.mni[p.yKey] * scale2D * p.yMult
          const x2 = p.cx + tNode.mni[p.xKey] * scale2D * p.xMult
          const y2 = p.cy + tNode.mni[p.yKey] * scale2D * p.yMult

          gTri.append('line')
            .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
            .attr('stroke', TRACT_COLORS[e.circuit] || TRACT_COLORS.All)
            .attr('stroke-width', 1.5 + e.weight * 2)
            .attr('stroke-dasharray', e.type === 'long-range' ? '4 3' : 'none')
            .attr('opacity', activeNodeIds.has(sNode.id) && activeNodeIds.has(tNode.id) ? 0.8 : 0.15)
        })

        // Project and Render Nodes
        nodes.forEach(n => {
          const nx = p.cx + n.mni[p.xKey] * scale2D * p.xMult
          const ny = p.cy + n.mni[p.yKey] * scale2D * p.yMult
          const isActive = activeNodeIds.has(n.id)

          const ng = gTri.append('g')
            .attr('transform', `translate(${nx}, ${ny})`)
            .style('cursor', 'pointer')
            .on('click', () => setSelectedNode(n))

          ng.append('circle')
            .attr('r', 5 + n.salience * 7)
            .attr('fill', isActive ? (LOBE_COLORS[n.lobe] || '#38bdf8') : '#475569')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.4)
            .attr('opacity', isActive ? 0.95 : 0.25)
        })
      })

    // ─── VIEW MODE 3: SINGLE ORTHOGONAL PLANES (Axial / Sagittal) ─────────
    } else if (viewMode === 'axial' || viewMode === 'sagittal') {
      const isAxial = viewMode === 'axial'
      const scale = 2.5

      // Detailed Anatomical Hull Silhouette
      if (isAxial) {
        svg.append('path')
          .attr('d', `
            M ${CX} ${CY - 180}
            C ${CX + 110} ${CY - 175}, ${CX + 175} ${CY - 110}, ${CX + 178} ${CY}
            C ${CX + 180} ${CY + 120}, ${CX + 125} ${CY + 185}, ${CX} ${CY + 195}
            C ${CX - 125} ${CY + 195}, ${CX - 180} ${CY + 120}, ${CX - 178} ${CY}
            C ${CX - 175} ${CY - 110}, ${CX - 110} ${CY - 175}, ${CX} ${CY - 180} Z
          `)
          .attr('fill', isDark ? 'rgba(30, 41, 59, 0.4)' : '#f1f5f9')
          .attr('stroke', contourStroke)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '6 4')

        // Inter-hemispheric fissure
        svg.append('line')
          .attr('x1', CX).attr('y1', CY - 175)
          .attr('x2', CX).attr('y2', CY + 190)
          .attr('stroke', contourStroke)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4 4')
          .attr('opacity', 0.6)

        // Orientation labels
        svg.append('text').attr('x', CX).attr('y', CY - 192).attr('text-anchor', 'middle').attr('class', 'text-xs font-bold fill-slate-400').text('ANTERIOR (Frontal)')
        svg.append('text').attr('x', CX).attr('y', CY + 215).attr('text-anchor', 'middle').attr('class', 'text-xs font-bold fill-slate-400').text('POSTERIOR (Occipital / Cerebellum)')
        svg.append('text').attr('x', CX - 200).attr('y', CY).attr('text-anchor', 'middle').attr('class', 'text-xs font-bold fill-slate-400').text('LEFT')
        svg.append('text').attr('x', CX + 200).attr('y', CY).attr('text-anchor', 'middle').attr('class', 'text-xs font-bold fill-slate-400').text('RIGHT')

      } else {
        // Sagittal Outline
        svg.append('path')
          .attr('d', `
            M ${CX + 155} ${CY}
            C ${CX + 155} ${CY - 110}, ${CX + 55} ${CY - 165}, ${CX - 35} ${CY - 155}
            C ${CX - 135} ${CY - 145}, ${CX - 180} ${CY - 45}, ${CX - 180} ${CY + 45}
            C ${CX - 170} ${CY + 125}, ${CX - 90} ${CY + 155}, ${CX - 45} ${CY + 125}
            C ${CX - 12} ${CY + 90}, ${CX + 55} ${CY + 80}, ${CX + 120} ${CY + 55}
            C ${CX + 150} ${CY + 45}, ${CX + 155} ${CY + 22}, ${CX + 155} ${CY} Z
          `)
          .attr('fill', isDark ? 'rgba(30, 41, 59, 0.4)' : '#f1f5f9')
          .attr('stroke', contourStroke)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '6 4')

        // Cerebellar Lobule Silhouette
        svg.append('ellipse')
          .attr('cx', CX - 105).attr('cy', CY + 100)
          .attr('rx', 50).attr('ry', 32)
          .attr('fill', isDark ? 'rgba(15, 23, 42, 0.6)' : '#e2e8f0')
          .attr('stroke', contourStroke)
          .attr('stroke-dasharray', '4 3')

        svg.append('text').attr('x', CX + 155).attr('y', CY - 170).attr('text-anchor', 'middle').attr('class', 'text-xs font-bold fill-slate-400').text('ANTERIOR')
        svg.append('text').attr('x', CX - 170).attr('y', CY - 170).attr('text-anchor', 'middle').attr('class', 'text-xs font-bold fill-slate-400').text('POSTERIOR')
      }

      // Draw Edges
      filteredEdges.forEach(e => {
        const sNode = nodes.find(n => n.id === (typeof e.source === 'object' ? e.source.id : e.source))
        const tNode = nodes.find(n => n.id === (typeof e.target === 'object' ? e.target.id : e.target))
        if (!sNode || !tNode) return

        const x1 = CX + (isAxial ? sNode.mni[0] : sNode.mni[1]) * scale
        const y1 = CY - (isAxial ? sNode.mni[1] : sNode.mni[2]) * scale
        const x2 = CX + (isAxial ? tNode.mni[0] : tNode.mni[1]) * scale
        const y2 = CY - (isAxial ? tNode.mni[1] : tNode.mni[2]) * scale

        svg.append('line')
          .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
          .attr('stroke', TRACT_COLORS[e.circuit] || TRACT_COLORS.All)
          .attr('stroke-width', 2 + e.weight * 2.8)
          .attr('stroke-linecap', 'round')
          .attr('stroke-dasharray', e.type === 'long-range' ? '6 3' : 'none')
          .attr('opacity', activeNodeIds.has(sNode.id) && activeNodeIds.has(tNode.id) ? 0.85 : 0.15)
          .attr('filter', isDark ? 'url(#neon-glow)' : 'none')
      })

      // Draw Nodes
      nodes.forEach(n => {
        const nx = CX + (isAxial ? n.mni[0] : n.mni[1]) * scale
        const ny = CY - (isAxial ? n.mni[1] : n.mni[2]) * scale
        const isActive = activeNodeIds.has(n.id)

        const g = svg.append('g')
          .attr('transform', `translate(${nx}, ${ny})`)
          .style('cursor', 'pointer')
          .on('click', () => setSelectedNode(n))

        g.append('circle')
          .attr('r', 7 + n.salience * 10)
          .attr('fill', isActive ? (LOBE_COLORS[n.lobe] || '#38bdf8') : '#475569')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2)
          .attr('opacity', isActive ? 0.95 : 0.25)
          .attr('filter', isDark && isActive ? 'url(#neon-glow)' : 'none')

        g.append('text')
          .text(n.label)
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('font-size', 8)
          .attr('font-weight', '700')
          .attr('fill', '#ffffff')
          .attr('pointer-events', 'none')
      })

    // ─── VIEW MODE 4: D3 FORCE TOPOLOGY ────────────────────────────────────
    } else if (viewMode === 'topology') {
      const simNodes = nodes.map(n => ({ ...n }))
      const simEdges = filteredEdges.map(e => ({
        ...e,
        source: typeof e.source === 'object' ? e.source.id : e.source,
        target: typeof e.target === 'object' ? e.target.id : e.target,
      }))

      const sim = d3.forceSimulation(simNodes)
        .force('link', d3.forceLink(simEdges).id(d => d.id).distance(d => d.type === 'long-range' ? 140 : 75))
        .force('charge', d3.forceManyBody().strength(-280))
        .force('center', d3.forceCenter(CX, CY))

      const edgeSel = svg.append('g').selectAll('line')
        .data(simEdges).join('line')
        .attr('stroke', d => TRACT_COLORS[d.circuit] || TRACT_COLORS.All)
        .attr('stroke-width', d => 1.5 + d.weight * 3)
        .attr('stroke-dasharray', d => d.type === 'intra-lobar' ? '4 3' : 'none')
        .attr('opacity', 0.8)

      const nodeSel = svg.append('g').selectAll('g')
        .data(simNodes).join('g')
        .style('cursor', 'pointer')
        .on('click', (event, d) => setSelectedNode(d))

      nodeSel.append('circle')
        .attr('r', d => 7 + d.salience * 12)
        .attr('fill', d => LOBE_COLORS[d.lobe] || '#38bdf8')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)

      nodeSel.append('text')
        .text(d => d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', 8)
        .attr('font-weight', '700')
        .attr('fill', '#ffffff')

      sim.on('tick', () => {
        edgeSel
          .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
        nodeSel.attr('transform', d => `translate(${d.x},${d.y})`)
      })

      return () => sim.stop()
    }
  }, [nodes, filteredEdges, viewMode, rotX, rotY, circuitFilter, selectedNode, activeNodeIds, theme])

  return (
    <div className={`relative w-full rounded-2xl shadow-xl overflow-hidden flex flex-col border ${theme === 'dark' ? 'bg-[#0b0f19] border-slate-800' : 'bg-white border-slate-200'}`}>
      
      {/* ─── Top Control Header (Nilearn & Glass Brain Toolkit) ──────────────── */}
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
        
        {/* View Mode Buttons */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs font-semibold ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === '3d' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <RotateCw className="w-3.5 h-3.5" /> 3D Glass Brain
          </button>
          <button
            onClick={() => setViewMode('triplanar')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'triplanar' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Layers className="w-3.5 h-3.5" /> Tri-Planar (Nilearn)
          </button>
          <button
            onClick={() => setViewMode('axial')}
            className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'axial' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Axial (Top-Down)
          </button>
          <button
            onClick={() => setViewMode('sagittal')}
            className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'sagittal' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sagittal (Side)
          </button>
          <button
            onClick={() => setViewMode('topology')}
            className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'topology' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Topology
          </button>
        </div>

        {/* Right Action Tools: Circuit Filter + Theme + Auto-rotate */}
        <div className="flex items-center gap-2">
          {/* Circuit Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Circuit:</span>
            <select
              value={circuitFilter}
              onChange={(e) => setCircuitFilter(e.target.value)}
              className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              <option value="All">All Biomarkers (14 Tracts)</option>
              <option value="DMN">Default Mode Network (mPFC ↔ Precun/PCC)</option>
              <option value="SocialBrain">Social Brain Circuit (STS ↔ IFG/Amyg)</option>
              <option value="Underconnected">Long-Range Underconnected (82.4%)</option>
              <option value="InterHemispheric">Inter-Hemispheric Bridges</option>
            </select>
          </div>

          {/* Auto-rotate Toggle (in 3D mode) */}
          {viewMode === '3d' && (
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              title={autoRotate ? "Pause 3D rotation" : "Auto-rotate 3D brain"}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-semibold ${autoRotate ? 'bg-blue-600 text-white border-blue-500' : theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{autoRotate ? 'Rotating' : 'Spin'}</span>
            </button>
          )}

          {/* Theme Switcher: Dark Neuro-Glow vs Light Clinical Paper */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle Neuro-Glow / Clinical Paper theme"
            className={`p-1.5 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── Main Interactive Canvas ────────────────────────────────────────── */}
      <div
        className="relative w-full flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg ref={svgRef} className="w-full h-[450px]" />

        {/* Anatomical Lobe Legend Overlay */}
        <div className={`absolute top-4 left-4 rounded-xl p-3 border shadow-lg text-xs space-y-1.5 backdrop-blur-md ${theme === 'dark' ? 'bg-slate-900/85 border-slate-800 text-slate-300' : 'bg-white/90 border-slate-200 text-slate-700'}`}>
          <div className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-1">AAL Anatomical Lobes</div>
          {Object.entries(LOBE_COLORS).map(([lobe, color]) => (
            <div key={lobe} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: color }} />
              <span className="text-[11px] font-medium">{lobe}</span>
            </div>
          ))}
        </div>

        {/* Functional Tract Legend Overlay */}
        <div className={`absolute bottom-4 left-4 rounded-xl p-3 border shadow-lg text-xs space-y-1 backdrop-blur-md ${theme === 'dark' ? 'bg-slate-900/85 border-slate-800 text-slate-300' : 'bg-white/90 border-slate-200 text-slate-700'}`}>
          <div className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-1">Tract Classification</div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 rounded-full bg-[#38bdf8]" />
            <span className="text-[11px]">Default Mode Network (DMN)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 rounded-full bg-[#fb923c]" />
            <span className="text-[11px]">Social Brain / Mirror Neuron</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 rounded-full bg-[#818cf8]" />
            <span className="text-[11px]">Inter-Hemispheric Commissural</span>
          </div>
        </div>

        {/* 3D Camera Angles Pill (only visible in 3D mode) */}
        {viewMode === '3d' && (
          <div className={`absolute top-4 right-4 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold border backdrop-blur-sm shadow-md flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
            <Compass className="w-3.5 h-3.5 text-blue-500" />
            <span>Elev: {Math.round(rotX)}°</span>
            <span className="text-slate-400">|</span>
            <span>Azim: {Math.round(rotY)}°</span>
          </div>
        )}
      </div>

      {/* ─── Bottom Anatomical Inspector Drawer ────────────────────────────── */}
      <div className={`p-4 border-t transition-colors ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
        {selectedNode ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-blue-400">{selectedNode.fullName}</span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    AAL-116 #{selectedNode.aalIndex}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded text-white shadow-sm" style={{ background: LOBE_COLORS[selectedNode.lobe] }}>
                    {selectedNode.lobe} Lobe
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{selectedNode.desc}</p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Clear Selection
              </button>
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl p-3 border text-xs ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">MNI-152 Stereotaxic Space</span>
                <span className="font-mono font-bold text-blue-400">[{selectedNode.mni?.join(', ')}] mm</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">GNNExplainer Salience</span>
                <span className="font-mono font-bold text-amber-400">{(selectedNode.salience * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Implicated Circuit</span>
                <span className="font-bold text-slate-200">{selectedNode.circuit}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Hemispheric Orientation</span>
                <span className="font-bold text-slate-200">{selectedNode.hemi === 'L' ? 'Left Hemisphere' : selectedNode.hemi === 'R' ? 'Right Hemisphere' : 'Medial Midline'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>Interactive Glass Brain: Drag canvas to rotate 3D camera. Click any node to inspect stereotaxic coordinates and clinical functional pathways.</span>
            </div>
            <span className="font-mono font-semibold text-slate-500">15 Salient Regions Active</span>
          </div>
        )}
      </div>
    </div>
  )
}
