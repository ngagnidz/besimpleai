import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
  }`

function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <span className="text-lg font-semibold tracking-tight text-slate-900">AI Judge</span>
        <nav className="flex items-center gap-8">
          <NavLink to="/upload" className={linkClass} end>
            Upload
          </NavLink>
          <NavLink to="/queues" className={linkClass}>
            Queues
          </NavLink>
          <NavLink to="/judges" className={linkClass}>
            Judges
          </NavLink>
          <NavLink to="/results" className={linkClass}>
            Results
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
