import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
})

// ─── Demo / Mock mode ────────────────────────────────────────────────────────
// When no backend is running, the app returns realistic demo data so the UI
// can be evaluated without a live FastAPI server.
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false'

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

const DEMO_RESULT = {
  job_id: 'JOB_DEMO_001',
  classification: 'Autism Spectrum Disorder (ASD)',
  risk_score: 0.814,
  confidence_lower: 0.742,
  confidence_upper: 0.886,
  report_download_url: '/reports/JOB_DEMO_001_DICOM_SR.dcm',
}

const DEMO_EXPLANATION = {
  job_id: 'JOB_DEMO_001',
  num_salient_nodes: 15,
  long_range_underconnectivity_ratio: 0.824,
  primary_subgraphs: [
    'Prefrontal–Precuneus Default Mode Network Disconnection',
    'Inter-Hemispheric Superior Temporal Sulcus Disconnection',
  ],
  nodes: [
    { id: 1,  label: 'mPFC.L',    lobe: 'Frontal',   salience: 0.94 },
    { id: 2,  label: 'mPFC.R',    lobe: 'Frontal',   salience: 0.91 },
    { id: 3,  label: 'PCC',       lobe: 'Parietal',  salience: 0.88 },
    { id: 4,  label: 'Precun.L',  lobe: 'Parietal',  salience: 0.86 },
    { id: 5,  label: 'Precun.R',  lobe: 'Parietal',  salience: 0.83 },
    { id: 6,  label: 'STS.L',     lobe: 'Temporal',  salience: 0.81 },
    { id: 7,  label: 'STS.R',     lobe: 'Temporal',  salience: 0.79 },
    { id: 8,  label: 'IFG.L',     lobe: 'Frontal',   salience: 0.76 },
    { id: 9,  label: 'IFG.R',     lobe: 'Frontal',   salience: 0.74 },
    { id: 10, label: 'Amyg.L',    lobe: 'Temporal',  salience: 0.71 },
    { id: 11, label: 'Amyg.R',    lobe: 'Temporal',  salience: 0.69 },
    { id: 12, label: 'Cereb.L',   lobe: 'Cerebellum',salience: 0.67 },
    { id: 13, label: 'Cereb.R',   lobe: 'Cerebellum',salience: 0.64 },
    { id: 14, label: 'TPJ.L',     lobe: 'Parietal',  salience: 0.62 },
    { id: 15, label: 'TPJ.R',     lobe: 'Parietal',  salience: 0.59 },
  ],
  edges: [
    { source: 1, target: 3,  weight: 0.91, type: 'long-range' },
    { source: 2, target: 4,  weight: 0.88, type: 'long-range' },
    { source: 3, target: 5,  weight: 0.85, type: 'long-range' },
    { source: 6, target: 7,  weight: 0.82, type: 'inter-hemispheric' },
    { source: 1, target: 6,  weight: 0.79, type: 'long-range' },
    { source: 2, target: 7,  weight: 0.76, type: 'long-range' },
    { source: 8, target: 9,  weight: 0.73, type: 'inter-hemispheric' },
    { source: 4, target: 14, weight: 0.70, type: 'intra-lobar' },
    { source: 5, target: 15, weight: 0.67, type: 'intra-lobar' },
    { source: 10,target: 11, weight: 0.64, type: 'inter-hemispheric' },
    { source: 1, target: 8,  weight: 0.61, type: 'long-range' },
    { source: 3, target: 14, weight: 0.58, type: 'long-range' },
    { source: 6, target: 10, weight: 0.55, type: 'intra-lobar' },
    { source: 12,target: 13, weight: 0.52, type: 'inter-hemispheric' },
  ],
  ig_attributions: [
    { feature: 'Signal Variance (σ²)',  importance: 0.312 },
    { feature: 'Mean Intensity (μ)',     importance: 0.241 },
    { feature: 'Kurtosis (γ₂)',          importance: 0.184 },
    { feature: 'Skewness (γ₁)',          importance: 0.127 },
    { feature: 'Signal Power (P)',        importance: 0.093 },
    { feature: 'Std Dev (σ)',             importance: 0.043 },
  ],
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export async function runDiagnosis(file, siteId) {
  if (DEMO_MODE) {
    await sleep(2400)
    return DEMO_RESULT
  }
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post(`/api/v1/diagnose?site_id=${siteId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getExplanation(jobId) {
  if (DEMO_MODE) {
    await sleep(1200)
    return DEMO_EXPLANATION
  }
  const { data } = await api.get(`/api/v1/explain/${jobId}`)
  return data
}

export async function getHealth() {
  if (DEMO_MODE) {
    return { status: 'healthy (demo mode)', model_loaded: 'true', torch_backend: 'PyTorch-Geometric' }
  }
  const { data } = await api.get('/api/v1/health')
  return data
}
