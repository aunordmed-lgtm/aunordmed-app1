import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'

const navItems = [
  { section: 'Principal' },
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/notas', icon: '📄', label: 'Notas fiscais', badge: 'nf' },
  { section: 'Pendências' },
  { path: '/pendencias', icon: '🔔', label: 'Pendências', badge: 'pend' },
  { section: 'Financeiro' },
  { path: '/fluxo-caixa', icon: '💰', label: 'Fluxo de caixa' },
  { path: '/contas', icon: '📅', label: 'Contas', badge: 'contas' },
  { path: '/adiantamentos', icon: '💵', label: 'Adiantamentos', badge: 'adt', badgeColor: 'orange' },
  { path: '/cashback', icon: '🎁', label: 'Cashback', badge: 'cb', badgeColor: 'purple' },
  { section: 'Fiscal' },
  { path: '/impostos', icon: '🧾', label: 'Impostos' },
  { path: '/dre', icon: '📑', label: 'DRE' },
  { section: 'Cadastros' },
  { path: '/medicos', icon: '👨‍⚕️', label: 'Médicos', badge: 'med', badgeColor: 'ok' },
  { path: '/tomadores', icon: '🏥', label: 'Tomadores' },
  { section: 'Relatórios' },
  { path: '/comprovantes', icon: '🧾', label: 'Comprovantes', badge: 'comp', badgeColor: 'ok' },
  { path: '/relatorios', icon: '📈', label: 'Relatórios' },
  { section: 'Sistema' },
  { path: '/configuracoes', icon: '⚙️', label: 'Configurações' },
]

export function Sidebar({ badges = {} }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast('Sessão encerrada.')
    navigate('/login')
  }

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-name">Aunord<span>MED</span></div>
        <div className="logo-sub">FINANCEIRO v2.0</div>
      </div>

      <nav style={{ padding: '8px 6px', flex: 1 }}>
        {navItems.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-section">{item.section}</div>
          }
          const count = badges[item.badge]
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {count > 0 && (
                <span className={`nav-badge ${item.badgeColor || ''}`}>{count}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--g4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', fontSize: 14 }} title="Sair">⏻</button>
        </div>
        <div className="sidebar-ver">AunordMED Financeiro v2.0</div>
      </div>
    </div>
  )
}
