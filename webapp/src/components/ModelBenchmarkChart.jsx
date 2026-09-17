import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'

const MODELS = [
  { model: 'GCN',          acc: 0.703, auc: 0.748, f1: 0.698 },
  { model: 'GAT (basic)',  acc: 0.741, auc: 0.783, f1: 0.736 },
  { model: 'Riemannian+SVM', acc: 0.769, auc: 0.812, f1: 0.764 },
  { model: 'Heinsfeld DNN', acc: 0.700, auc: 0.731, f1: 0.695 },
  { model: 'ASD-DiagNet',  acc: 0.748, auc: 0.790, f1: 0.743 },
  { model: 'GAT+Riemann (Ours)', acc: 0.823, auc: 0.871, f1: 0.819 },
]

const COLORS = {
  acc: '#3b82f6',
  auc: '#8b5cf6',
  f1:  '#10b981',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name.toUpperCase()}: {(p.value * 100).toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

export default function ModelBenchmarkChart() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={MODELS} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="model"
          tick={{ fontSize: 10, fill: '#475569' }}
          angle={-28}
          textAnchor="end"
          interval={0}
          height={70}
        />
        <YAxis
          domain={[0.6, 1]}
          tickFormatter={v => `${(v * 100).toFixed(0)}%`}
          tick={{ fontSize: 10, fill: '#475569' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />

        <Bar dataKey="acc" name="Accuracy" fill={COLORS.acc} radius={[4,4,0,0]}>
          {MODELS.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.model.includes('Ours') ? '#002060' : COLORS.acc}
              opacity={entry.model.includes('Ours') ? 1 : 0.75}
            />
          ))}
        </Bar>
        <Bar dataKey="auc" name="AUC"      fill={COLORS.auc} radius={[4,4,0,0]} opacity={0.85} />
        <Bar dataKey="f1"  name="F1 Score" fill={COLORS.f1}  radius={[4,4,0,0]} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  )
}
