import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const LOBE_COLORS = {
  Frontal:     '#3b82f6',
  Parietal:    '#8b5cf6',
  Temporal:    '#f59e0b',
  Occipital:   '#10b981',
  Cerebellum:  '#ef4444',
  Subcortical: '#6b7280',
}

const EDGE_COLORS = {
  'long-range':         '#dc2626',
  'inter-hemispheric':  '#d97706',
  'intra-lobar':        '#94a3b8',
}

export default function BiomarkerGraph({ nodes, edges }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!nodes || !edges) return
    const W = 560, H = 400
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`)

    // Legend
    const legendData = Object.entries(EDGE_COLORS)
    const lg = svg.append('g').attr('transform', 'translate(10,10)')
    legendData.forEach(([type, color], i) => {
      const g = lg.append('g').attr('transform', `translate(0,${i * 18})`)
      g.append('line').attr('x1', 0).attr('y1', 7).attr('x2', 20).attr('y2', 7)
        .attr('stroke', color).attr('stroke-width', 2.5).attr('stroke-dasharray', type === 'intra-lobar' ? '4,3' : '0')
      g.append('text').attr('x', 26).attr('y', 11).text(type)
        .attr('font-size', 9).attr('fill', '#475569')
    })

    // Force simulation
    const sim = d3.forceSimulation(nodes)
      .force('link',   d3.forceLink(edges).id(d => d.id).distance(d => d.type === 'long-range' ? 130 : 70))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('x',      d3.forceX(W / 2).strength(0.04))
      .force('y',      d3.forceY(H / 2).strength(0.04))

    const edgeG = svg.append('g')
    const edgeSel = edgeG.selectAll('line')
      .data(edges).join('line')
      .attr('stroke', d => EDGE_COLORS[d.type] || '#94a3b8')
      .attr('stroke-width', d => 1 + d.weight * 3)
      .attr('stroke-dasharray', d => d.type === 'intra-lobar' ? '5,4' : '0')
      .attr('opacity', 0.75)

    const nodeG = svg.append('g')
    const nodeSel = nodeG.selectAll('g')
      .data(nodes).join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end',   (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    nodeSel.append('circle')
      .attr('r', d => 6 + d.salience * 14)
      .attr('fill', d => LOBE_COLORS[d.lobe] || '#6b7280')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.88)

    nodeSel.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', 7.5)
      .attr('font-weight', '600')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')

    // Tooltip
    const tooltip = d3.select(svgRef.current.parentNode)
      .append('div')
      .attr('class', 'absolute bg-white text-slate-700 text-xs rounded-lg shadow-lg px-3 py-2 pointer-events-none opacity-0 border border-slate-200')
      .style('z-index', 99)

    nodeSel
      .on('mouseover', (event, d) => {
        tooltip.style('opacity', 1).html(
          `<strong>${d.label}</strong><br/>Lobe: ${d.lobe}<br/>Salience: ${(d.salience * 100).toFixed(1)}%`
        )
      })
      .on('mousemove', event => {
        const rect = svgRef.current.parentNode.getBoundingClientRect()
        tooltip
          .style('left', (event.clientX - rect.left + 12) + 'px')
          .style('top',  (event.clientY - rect.top  - 10) + 'px')
      })
      .on('mouseout', () => tooltip.style('opacity', 0))

    sim.on('tick', () => {
      edgeSel
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => {
      sim.stop()
      tooltip.remove()
    }
  }, [nodes, edges])

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-200">
      <svg ref={svgRef} className="w-full" style={{ minHeight: 360 }} />
      {/* Lobe legend */}
      <div className="absolute bottom-3 right-3 bg-white/90 rounded-lg p-2 border border-slate-100 text-xs space-y-1">
        {Object.entries(LOBE_COLORS).map(([lobe, color]) => (
          <div key={lobe} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-slate-600">{lobe}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
