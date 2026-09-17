import { Link } from 'react-router-dom'
import { Upload, TrendingUp, Users, Activity } from 'lucide-react'
import SiteTable from '../components/SiteTable'
import ModelBenchmarkChart from '../components/ModelBenchmarkChart'

const STATS = [
  { label: 'Total Subjects',     value: '871',    sub: 'ABIDE I Consortium',      icon: Users,     color: 'text-blue-600'  },
  { label: 'Overall Accuracy',   value: '82.3%',  sub: 'GAT + Riemannian Ensemble', icon: TrendingUp, color: 'text-green-600' },
  { label: 'AUC-ROC',           value: '0.871',  sub: 'Calibrated Ensemble',      icon: Activity,  color: 'text-purple-600'},
  { label: 'Imaging Sites',      value: '17',     sub: 'Multi-site Harmonised',   icon: Users,     color: 'text-amber-600' },
]

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Research Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            ABIDE I benchmark results — Explainable GAT + Riemannian Geometric Harmonization pipeline
          </p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2 text-sm">
          <Upload className="w-4 h-4" /> New Diagnosis
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATS.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card flex items-start gap-4">
            <div className={`p-2 rounded-xl bg-slate-100 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">{label}</p>
              <p className="text-xs text-slate-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Model benchmark chart */}
      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-1">6-Model Benchmark Comparison</h2>
        <p className="text-xs text-slate-400 mb-4">
          Accuracy, AUC-ROC and F1-Score across all N = 871 subjects. Our model (GAT + Riemannian) shown in navy.
        </p>
        <ModelBenchmarkChart />
      </div>

      {/* Site-by-site table */}
      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-1">Site-by-Site Classification Performance</h2>
        <p className="text-xs text-slate-400 mb-4">
          Accuracy, sensitivity, and specificity across all 17 ABIDE I acquisition sites after
          Riemannian Tangent ComBat harmonization.
        </p>
        <SiteTable />
      </div>

      {/* Method summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            title: 'Graph Attention Network',
            body:  '3-layer GATConv hierarchy with K=4 heads, DropEdge (p=0.20), and dual mean+max global pooling. Ingests 116-node brain connectome graphs with 6 dynamic BOLD temporal features per node.',
            badge: 'GAT',
            color: 'bg-blue-50 border-blue-100 text-blue-800',
          },
          {
            title: 'Riemannian Harmonization',
            body:  'Ledoit-Wolf shrinkage covariance estimation → Fréchet geometric mean → tangent space projection with √2 isometric scaling. Reduces 17-site scanner variance by 68% (ΔRMSE).',
            badge: 'SPD Manifold',
            color: 'bg-purple-50 border-purple-100 text-purple-800',
          },
          {
            title: 'GNNExplainer XAI',
            body:  'Mutual information maximisation over edge mask and node feature mask (200 steps, λ=0.01). Extracts 15-node salient subgraph revealing 82.4% long-range underconnectivity signature.',
            badge: 'XAI',
            color: 'bg-amber-50 border-amber-100 text-amber-800',
          },
        ].map(c => (
          <div key={c.title} className={`rounded-2xl border p-5 ${c.color}`}>
            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-3 bg-white/60`}>{c.badge}</span>
            <h3 className="font-semibold text-sm mb-2">{c.title}</h3>
            <p className="text-xs leading-relaxed opacity-80">{c.body}</p>
          </div>
        ))}
      </div>

      {/* Citation */}
      <div className="card bg-slate-50 border-slate-100 text-xs text-slate-500">
        <strong className="text-slate-700">Citation:</strong>{' '}
        Dulmin et al. (2026). Explainable Graph Attention Networks and Riemannian Geometric Harmonization
        for Multi-Site Autism Spectrum Disorder Classification and Functional Biomarker Discovery.
        Master's Thesis, Department of Computer Science &amp; Engineering.
      </div>
    </div>
  )
}
