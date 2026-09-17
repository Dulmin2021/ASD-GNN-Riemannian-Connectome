export default function RiskGauge({ score }) {
  // score: 0.0 – 1.0
  const pct   = Math.round(score * 100)
  const angle = -135 + pct * 2.7          // -135° → +135° sweep (270° total)
  const rad   = (angle * Math.PI) / 180
  const cx = 100, cy = 100, r = 75

  const needleX = cx + r * 0.82 * Math.cos(rad)
  const needleY = cy + r * 0.82 * Math.sin(rad)

  const color =
    pct >= 70 ? '#dc2626' :
    pct >= 45 ? '#d97706' : '#16a34a'

  // Arc helper
  function arcPath(startDeg, endDeg, color) {
    const s = ((startDeg - 90) * Math.PI) / 180
    const e = ((endDeg   - 90) * Math.PI) / 180
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e)
    return (
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
        stroke={color} strokeWidth="12" fill="none" strokeLinecap="round"
      />
    )
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 130" className="w-52">
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`}
          stroke="#e2e8f0" strokeWidth="12" fill="none" strokeLinecap="round"
        />
        {/* Colored zones */}
        {arcPath(-135, -45, '#16a34a')}
        {arcPath(-45,  45,  '#d97706')}
        {arcPath(45,   135, '#dc2626')}
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={needleX} y2={needleY}
          stroke={color} strokeWidth="3" strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="5" fill={color} />
        {/* Score text */}
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize="20" fontWeight="700" fill={color}>
          {pct}%
        </text>
        <text x={cx} y={cy + 36} textAnchor="middle" fontSize="7.5" fill="#64748b">
          ASD Risk Score
        </text>
      </svg>
      <div className="flex gap-4 text-xs mt-1">
        <span className="text-green-700 font-medium">Low ≤44%</span>
        <span className="text-amber-600 font-medium">Moderate 45–69%</span>
        <span className="text-red-600 font-medium">High ≥70%</span>
      </div>
    </div>
  )
}
