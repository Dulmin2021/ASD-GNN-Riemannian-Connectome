import React, { useState } from 'react'
import {
  TRIPLANAR_CONTOURS,
  projectSagittal,
  projectCoronal,
  projectAxial
} from './triplanarContours'

export default function TriPlanarView({
  nodes = [],
  filteredEdges = [],
  activeNodeIds = new Set(),
  selectedNode = null,
  onSelectNode = () => {},
  theme = 'dark',
  lobeColors = {},
  tractColors = {}
}) {
  const [hoveredNode, setHoveredNode] = useState(null)
  const isDark = theme === 'dark'

  const planes = [
    {
      id: 'sagittal',
      name: 'Sagittal (Lateral View)',
      axesLabel: '[P] Posterior ↔ Anterior [A]',
      viewBox: '0 0 240 200',
      contour: TRIPLANAR_CONTOURS.sagittal,
      project: projectSagittal,
      width: 240,
      height: 200,
      crosshairX: selectedNode ? projectSagittal(selectedNode.mni).x : null,
      crosshairY: selectedNode ? projectSagittal(selectedNode.mni).y : null,
      topLabel: 'S',
      bottomLabel: 'I',
      leftLabel: 'P',
      rightLabel: 'A'
    },
    {
      id: 'coronal',
      name: 'Coronal (Frontal View)',
      axesLabel: '[L] Left ↔ Right [R]',
      viewBox: '0 0 220 200',
      contour: TRIPLANAR_CONTOURS.coronal,
      project: projectCoronal,
      width: 220,
      height: 200,
      crosshairX: selectedNode ? projectCoronal(selectedNode.mni).x : null,
      crosshairY: selectedNode ? projectCoronal(selectedNode.mni).y : null,
      topLabel: 'S',
      bottomLabel: 'I',
      leftLabel: 'L',
      rightLabel: 'R'
    },
    {
      id: 'axial',
      name: 'Axial (Horizontal View)',
      axesLabel: '[A] Anterior ↔ Posterior [P]',
      viewBox: '0 0 220 200',
      contour: TRIPLANAR_CONTOURS.axial,
      project: projectAxial,
      width: 220,
      height: 200,
      crosshairX: selectedNode ? projectAxial(selectedNode.mni).x : null,
      crosshairY: selectedNode ? projectAxial(selectedNode.mni).y : null,
      topLabel: 'A',
      bottomLabel: 'P',
      leftLabel: 'L',
      rightLabel: 'R'
    }
  ]

  return (
    <div className="w-full h-full p-4 flex flex-col justify-center items-center">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl">
        {planes.map((plane) => (
          <div
            key={plane.id}
            className={`rounded-xl border p-3 flex flex-col items-center justify-between transition-all ${
              isDark
                ? 'bg-slate-900/70 border-slate-800 shadow-lg'
                : 'bg-white border-slate-200 shadow-md'
            }`}
          >
            {/* Plane Header */}
            <div className="w-full flex items-center justify-between mb-2 pb-1.5 border-b border-slate-700/50">
              <span className="font-bold text-xs text-blue-400">{plane.name}</span>
              <span className="text-[10px] font-mono text-slate-400">{plane.axesLabel}</span>
            </div>

            {/* SVG Viewport */}
            <div className="relative w-full aspect-[11/10] flex items-center justify-center">
              <svg
                viewBox={plane.viewBox}
                className="w-full h-full select-none overflow-visible"
              >
                <defs>
                  <linearGradient id={`grad-${plane.id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={isDark ? "0.15" : "0.08"} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={isDark ? "0.05" : "0.02"} />
                  </linearGradient>
                  <filter id={`glow-${plane.id}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Coordinate Grid axes (Origin 0,0) */}
                <line
                  x1={plane.width / 2}
                  y1="10"
                  x2={plane.width / 2}
                  y2={plane.height - 10}
                  stroke={isDark ? "#334155" : "#e2e8f0"}
                  strokeDasharray="3,3"
                  strokeWidth="0.8"
                />
                <line
                  x1="10"
                  y1={plane.height / 2}
                  x2={plane.width - 10}
                  y2={plane.height / 2}
                  stroke={isDark ? "#334155" : "#e2e8f0"}
                  strokeDasharray="3,3"
                  strokeWidth="0.8"
                />

                {/* Anatomical MNI-152 2D Glass Brain Boundary */}
                <path
                  d={plane.contour}
                  fill={`url(#grad-${plane.id})`}
                  stroke={isDark ? "#38bdf8" : "#0284c7"}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />

                {/* Selected Node Crosshairs */}
                {plane.crosshairX !== null && plane.crosshairY !== null && (
                  <g opacity="0.65">
                    <line
                      x1={plane.crosshairX}
                      y1="15"
                      x2={plane.crosshairX}
                      y2={plane.height - 15}
                      stroke="#f59e0b"
                      strokeDasharray="2,2"
                      strokeWidth="1"
                    />
                    <line
                      x1="15"
                      y1={plane.crosshairY}
                      x2={plane.width - 15}
                      y2={plane.crosshairY}
                      stroke="#f59e0b"
                      strokeDasharray="2,2"
                      strokeWidth="1"
                    />
                  </g>
                )}

                {/* Connectome Tract Connections */}
                {filteredEdges.map((edge, idx) => {
                  const sId = typeof edge.source === 'object' ? edge.source.id : edge.source
                  const tId = typeof edge.target === 'object' ? edge.target.id : edge.target
                  const sNode = nodes.find(n => n.id === sId)
                  const tNode = nodes.find(n => n.id === tId)
                  if (!sNode || !tNode) return null

                  const p1 = plane.project(sNode.mni)
                  const p2 = plane.project(tNode.mni)
                  const isActive = activeNodeIds.has(sId) && activeNodeIds.has(tId)
                  const tractColor = tractColors[edge.circuit] || tractColors.All || '#38bdf8'

                  return (
                    <line
                      key={`edge-${plane.id}-${idx}`}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={tractColor}
                      strokeWidth={isActive ? 1.5 + edge.weight * 1.5 : 0.8}
                      strokeOpacity={isActive ? (isDark ? 0.85 : 0.7) : 0.15}
                      strokeLinecap="round"
                    />
                  )
                })}

                {/* Connectome Biomarker Nodes */}
                {nodes.map((node) => {
                  const pt = plane.project(node.mni)
                  const isActive = activeNodeIds.has(node.id)
                  const isSelected = selectedNode?.id === node.id
                  const isHovered = hoveredNode?.id === node.id
                  const lobeColor = lobeColors[node.lobe] || '#38bdf8'
                  const radius = 3.5 + node.salience * 3.5

                  return (
                    <g
                      key={`node-${plane.id}-${node.id}`}
                      className="cursor-pointer"
                      onClick={() => onSelectNode(node)}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      {/* Active Outer Glow */}
                      {isActive && isDark && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={radius * 1.8}
                          fill={lobeColor}
                          opacity="0.25"
                        />
                      )}

                      {/* Selection Ring */}
                      {(isSelected || isHovered) && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={radius * 1.9}
                          fill="none"
                          stroke={isSelected ? "#f59e0b" : "#ffffff"}
                          strokeWidth="1.5"
                          strokeDasharray={isSelected ? "none" : "2,2"}
                        />
                      )}

                      {/* Node Core */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={radius}
                        fill={isActive ? lobeColor : (isDark ? "#475569" : "#94a3b8")}
                        stroke={isDark ? "#090d16" : "#ffffff"}
                        strokeWidth="1"
                        className="transition-transform duration-150"
                      />
                    </g>
                  )
                })}

                {/* Anatomical Landmark Corner Badges */}
                <text x="14" y="24" fill={isDark ? "#64748b" : "#94a3b8"} fontSize="9" fontWeight="bold" fontFamily="monospace">{plane.leftLabel}</text>
                <text x={plane.width - 20} y="24" fill={isDark ? "#64748b" : "#94a3b8"} fontSize="9" fontWeight="bold" fontFamily="monospace">{plane.rightLabel}</text>
                <text x="14" y={plane.height - 14} fill={isDark ? "#64748b" : "#94a3b8"} fontSize="9" fontWeight="bold" fontFamily="monospace">{plane.bottomLabel}</text>
                <text x={plane.width - 20} y={plane.height - 14} fill={isDark ? "#64748b" : "#94a3b8"} fontSize="9" fontWeight="bold" fontFamily="monospace">{plane.topLabel}</text>
              </svg>

              {/* Floating Tooltip when Hovered */}
              {hoveredNode && (
                <div className="absolute top-2 right-2 pointer-events-none z-10 px-2 py-1 rounded bg-slate-900/90 text-[10px] text-white border border-slate-700 font-mono shadow-md backdrop-blur-sm">
                  <span className="font-bold text-blue-400">{hoveredNode.fullName}</span>
                  <div className="text-[9px] text-slate-300">MNI: [{hoveredNode.mni?.join(', ')}]</div>
                </div>
              )}
            </div>

            {/* Plane Footer Info */}
            <div className="w-full flex items-center justify-between mt-2 pt-1 border-t border-slate-800/40 text-[10px] font-mono text-slate-400">
              <span>MNI-152 Contour</span>
              <span className="text-blue-400">
                {plane.id === 'sagittal' && (selectedNode ? `X = ${selectedNode.mni[0]} mm` : 'Sagittal Plane')}
                {plane.id === 'coronal' && (selectedNode ? `Y = ${selectedNode.mni[1]} mm` : 'Coronal Plane')}
                {plane.id === 'axial' && (selectedNode ? `Z = ${selectedNode.mni[2]} mm` : 'Axial Plane')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
