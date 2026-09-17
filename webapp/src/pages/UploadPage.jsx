import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, Brain, FileCheck, AlertCircle, Loader2 } from 'lucide-react'
import { runDiagnosis } from '../api/client'

const SITES = [
  'CALTECH','CMU','KKI','LEUVEN','MAX_MUN','NYU','OHSU',
  'OLIN','PITT','SBL','SDSU','STANFORD','TRINITY','UCLA_1','UCLA_2','UM_1','YALE',
]

export default function UploadPage() {
  const navigate = useNavigate()
  const [file, setFile]       = useState(null)
  const [site, setSite]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const onDrop = useCallback(accepted => {
    if (accepted[0]) { setFile(accepted[0]); setError(null) }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/octet-stream': ['.nii', '.gz'] },
    maxFiles: 1,
    maxSize: 600 * 1024 * 1024,   // 600 MB
  })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!site)  { setError('Please select an acquisition site.'); return }
    setLoading(true)
    setError(null)
    try {
      const result = await runDiagnosis(file, site)
      navigate(`/results/${result.job_id}`, { state: { result } })
    } catch (err) {
      setError(err.message || 'Diagnosis request failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#002060] mb-4">
          <Brain className="w-8 h-8 text-blue-300" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">ASD Connectome Diagnosis</h1>
        <p className="mt-2 text-slate-500 text-sm max-w-md mx-auto">
          Upload a resting-state fMRI NIfTI scan to receive a calibrated ASD risk score
          using our dual-paradigm GAT + Riemannian pipeline.
        </p>
        <span className="inline-block mt-3 px-3 py-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
          Demo Mode Active — no backend required
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
            ${isDragActive
              ? 'border-blue-500 bg-blue-50'
              : file
                ? 'border-green-400 bg-green-50'
                : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
            }
          `}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileCheck className="w-10 h-10 text-green-500" />
              <p className="font-semibold text-green-700">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB — click to replace</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-10 h-10 text-slate-400" />
              <p className="font-medium text-slate-600">
                {isDragActive ? 'Drop the NIfTI file here…' : 'Drag & drop NIfTI scan'}
              </p>
              <p className="text-xs text-slate-400">.nii or .nii.gz — max 600 MB</p>
              <button type="button" className="mt-2 text-xs text-blue-600 underline">
                or browse files
              </button>
            </div>
          )}
        </div>

        {/* Site selector */}
        <div className="card">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Acquisition Site <span className="text-red-500">*</span>
          </label>
          <select
            value={site}
            onChange={e => setSite(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Select ABIDE site —</option>
            {SITES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <p className="text-xs text-slate-400 mt-2">
            Site metadata is used by the ComBat harmonization module to correct scanner bias.
          </p>
        </div>

        {/* Pipeline info */}
        <div className="card bg-slate-50 border-slate-100">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pipeline Steps</h3>
          <ol className="space-y-1.5 text-xs text-slate-600 list-decimal list-inside">
            <li>AAL-116 atlas parcellation & BOLD time-series extraction</li>
            <li>Higher-order temporal moment engineering (6 features/ROI)</li>
            <li>Sparse connectome graph construction (80th percentile threshold)</li>
            <li>Riemannian tangent space projection (Fréchet mean vectorization)</li>
            <li>Empirical Bayes ComBat site harmonization</li>
            <li>Dual-paradigm inference (GAT × 0.60 + Riemannian SVM × 0.40)</li>
            <li>GNNExplainer 15-node biomarker subgraph extraction</li>
          </ol>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !file || !site}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing scan…</>
            : <><Brain className="w-4 h-4" /> Run Diagnosis</>
          }
        </button>
      </form>
    </div>
  )
}
