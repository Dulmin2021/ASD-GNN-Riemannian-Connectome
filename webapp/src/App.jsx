import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'
import ExplainabilityPage from './pages/ExplainabilityPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16">
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/results/:jobId" element={<ResultsPage />} />
            <Route path="/explain/:jobId" element={<ExplainabilityPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </main>
        <footer className="bg-white border-t border-slate-100 py-4 text-center text-xs text-slate-400">
          ASD Connectome Diagnostic Platform &mdash; Explainable GAT + Riemannian Harmonization &mdash; Research Prototype
        </footer>
      </div>
    </BrowserRouter>
  )
}
