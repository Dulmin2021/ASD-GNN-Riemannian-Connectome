import { Link, useLocation } from 'react-router-dom'
import { Brain, Upload, BarChart2, Network } from 'lucide-react'
import clsx from 'clsx'

const links = [
  { to: '/upload',    label: 'Upload Scan',  icon: Upload   },
  { to: '/dashboard', label: 'Dashboard',    icon: BarChart2 },
]

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[#002060] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/upload" className="flex items-center gap-2.5 text-white font-bold text-lg tracking-tight">
          <Brain className="w-7 h-7 text-blue-300" />
          <span className="hidden sm:block">ASD <span className="text-blue-300">Connectome</span></span>
        </Link>
        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                pathname.startsWith(to)
                  ? 'bg-blue-500/30 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <span className="ml-3 px-2 py-0.5 text-xs bg-amber-400 text-amber-900 rounded font-semibold">
            Research Prototype
          </span>
        </div>
      </div>
    </nav>
  )
}
