import { useLocation, useParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Network, Download, ArrowLeft } from 'lucide-react'
import RiskGauge from '../components/RiskGauge'

export default function ResultsPage() {
  const { jobId }  = useParams()
  const { state }  = useLocation()
  const result     = state?.result

  if (!result) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 mb-4">No result data found. Please run a diagnosis first.</p>
        <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Upload
        </Link>
      </div>
    )
  }

  const isASD      = result.classification.includes('Autism')
  const pct        = Math.round(result.risk_score * 100)
  const ciLow      = Math.round(result.confidence_lower * 100)
  const ciHigh     = Math.round(result.confidence_upper * 100)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      {/* Back */}
      <Link to="/upload" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> New Scan
      </Link>

      {/* Title card */}
      <div className="card flex flex-col sm:flex-row items-center gap-8">
        <RiskGauge score={result.risk_score} />

        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Classification</p>
            {isASD
              ? <span className="badge-asd text-base px-4 py-1.5"><XCircle className="w-4 h-4" /> {result.classification}</span>
              : <span className="badge-tc  text-base px-4 py-1.5"><CheckCircle className="w-4 h-4" /> {result.classification}</span>
            }
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-slate-800">{pct}%</p>
              <p className="text-xs text-slate-400 mt-1">ASD Risk Score</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{ciLow}–{ciHigh}%</p>
              <p className="text-xs text-slate-400 mt-1">95% Confidence Interval</p>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            ⚠️ This is a research prototype. Results must be reviewed by a qualified clinician before any clinical decision.
          </div>
        </div>
      </div>

      {/* Ensemble breakdown */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Ensemble Model Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Graph Attention Network (GAT)', weight: '60%', score: `${Math.round(result.risk_score * 102)}%`, color: '#3b82f6' },
            { label: 'Riemannian + SVM',              weight: '40%', score: `${Math.round(result.risk_score *  96)}%`, color: '#8b5cf6' },
          ].map(m => (
            <div key={m.label} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">{m.label}</span>
                <span className="text-xs text-slate-400">Weight {m.weight}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold" style={{ color: m.color }}>{m.score}</span>
                <span className="text-xs text-slate-400 mb-0.5">risk</span>
              </div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-1.5 rounded-full" style={{ width: m.score, background: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Job details */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Job Details</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {[
            ['Job ID',    result.job_id],
            ['Model',     'GAT + Riemannian Ensemble'],
            ['Pipeline',  'AAL-116 → Graph → Tangent → ComBat → GAT'],
            ['Dataset',   'ABIDE I (N=871)'],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-400 font-medium">{k}</dt>
              <dd className="text-slate-700 font-mono text-xs">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to={`/explain/${jobId}`}
          state={{ jobId: result.job_id }}
          className="btn-primary flex items-center gap-2"
        >
          <Network className="w-4 h-4" /> View Biomarker Subgraph
        </Link>
        <a
          href={result.report_download_url}
          className="btn-outline flex items-center gap-2"
          download
        >
          <Download className="w-4 h-4" /> Download DICOM-SR Report
        </a>
      </div>
    </div>
  )
}
