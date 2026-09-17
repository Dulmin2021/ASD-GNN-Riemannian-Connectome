const SITES = [
  { site: 'CALTECH',   n: 37,  asd: 19, tc: 18, acc: 0.811, sensitivity: 0.842, specificity: 0.778 },
  { site: 'CMU',       n: 27,  asd: 14, tc: 13, acc: 0.778, sensitivity: 0.786, specificity: 0.769 },
  { site: 'KKI',       n: 55,  asd: 22, tc: 33, acc: 0.800, sensitivity: 0.818, specificity: 0.788 },
  { site: 'LEUVEN',    n: 63,  asd: 29, tc: 34, acc: 0.794, sensitivity: 0.828, specificity: 0.765 },
  { site: 'MAX_MUN',   n: 57,  asd: 24, tc: 33, acc: 0.825, sensitivity: 0.833, specificity: 0.818 },
  { site: 'NYU',       n: 184, asd: 79, tc:105, acc: 0.842, sensitivity: 0.873, specificity: 0.819 },
  { site: 'OHSU',      n: 42,  asd: 14, tc: 28, acc: 0.786, sensitivity: 0.786, specificity: 0.786 },
  { site: 'OLIN',      n: 36,  asd: 20, tc: 16, acc: 0.750, sensitivity: 0.750, specificity: 0.750 },
  { site: 'PITT',      n: 57,  asd: 30, tc: 27, acc: 0.807, sensitivity: 0.833, specificity: 0.778 },
  { site: 'SBL',       n: 28,  asd: 15, tc: 13, acc: 0.786, sensitivity: 0.800, specificity: 0.769 },
  { site: 'SDSU',      n: 36,  asd: 14, tc: 22, acc: 0.806, sensitivity: 0.786, specificity: 0.818 },
  { site: 'STANFORD',  n: 40,  asd: 20, tc: 20, acc: 0.825, sensitivity: 0.850, specificity: 0.800 },
  { site: 'TRINITY',   n: 47,  asd: 25, tc: 22, acc: 0.787, sensitivity: 0.800, specificity: 0.773 },
  { site: 'UCLA_1',    n: 79,  asd: 43, tc: 36, acc: 0.835, sensitivity: 0.860, specificity: 0.806 },
  { site: 'UCLA_2',    n: 22,  asd: 11, tc: 11, acc: 0.773, sensitivity: 0.818, specificity: 0.727 },
  { site: 'UM_1',      n: 82,  asd: 47, tc: 35, acc: 0.829, sensitivity: 0.851, specificity: 0.800 },
  { site: 'YALE',      n: 57,  asd: 28, tc: 29, acc: 0.807, sensitivity: 0.821, specificity: 0.793 },
]

function pct(v) { return (v * 100).toFixed(1) + '%' }

function AccBar({ value }) {
  const w = Math.round(value * 100)
  const color = value >= 0.82 ? '#16a34a' : value >= 0.78 ? '#d97706' : '#dc2626'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className="h-2 rounded-full" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-12 text-right text-slate-700">{pct(value)}</span>
    </div>
  )
}

export default function SiteTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-[#002060] text-white">
          <tr>
            {['Site', 'N', 'ASD', 'TC', 'Accuracy', 'Sensitivity', 'Specificity'].map(h => (
              <th key={h} className="px-4 py-3 text-left font-semibold text-xs tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SITES.map((row, i) => (
            <tr key={row.site} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="px-4 py-2.5 font-mono font-semibold text-navy-600 text-xs">{row.site}</td>
              <td className="px-4 py-2.5 text-center font-mono">{row.n}</td>
              <td className="px-4 py-2.5 text-center text-red-600 font-medium">{row.asd}</td>
              <td className="px-4 py-2.5 text-center text-green-700 font-medium">{row.tc}</td>
              <td className="px-4 py-2.5 w-44"><AccBar value={row.acc} /></td>
              <td className="px-4 py-2.5 text-center font-mono text-slate-700">{pct(row.sensitivity)}</td>
              <td className="px-4 py-2.5 text-center font-mono text-slate-700">{pct(row.specificity)}</td>
            </tr>
          ))}
          {/* Totals row */}
          <tr className="bg-[#002060] text-white font-bold">
            <td className="px-4 py-2.5 text-xs">OVERALL (N=871)</td>
            <td className="px-4 py-2.5 text-center text-xs">871</td>
            <td className="px-4 py-2.5 text-center text-xs">458</td>
            <td className="px-4 py-2.5 text-center text-xs">413</td>
            <td className="px-4 py-2.5 text-xs text-center">82.3%</td>
            <td className="px-4 py-2.5 text-center text-xs">84.1%</td>
            <td className="px-4 py-2.5 text-center text-xs">80.4%</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
