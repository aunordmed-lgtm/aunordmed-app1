import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'

const navItems = [
  { section: 'Principal' },
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/notas', icon: '📄', label: 'Notas fiscais', badge: 'nf', badgeColor: 'ok' },
  { section: 'Pendências' },
  { path: '/pendencias', icon: '🔔', label: 'Pendências', badge: 'pend' },
  { section: 'Financeiro' },
  { path: '/fluxo-caixa', icon: '💰', label: 'Fluxo de caixa' },
  { path: '/contas', icon: '📅', label: 'Contas', badge: 'contas', badgeColor: 'blue' },
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
      {/* LOGO - só texto, sem triângulo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>
            Aunord<span style={{ color: 'var(--g5)' }}>MED</span>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', letterSpacing: '2px', marginTop: 4, textTransform: 'uppercase' }}>
            Financeiro
          </div>
        </div>
      </div>

      <nav style={{ padding: '8px 8px', flex: 1, overflowY: 'auto' }}>
        {navItems.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-section">{item.section}</div>
          }
          const count = badges[item.badge] || 0
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--g4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.35)', fontSize: 16, padding: '2px' }} title="Sair">⏻</button>
        </div>
        <div className="sidebar-ver">AunordMED Financeiro v2.0</div>
      </div>
    </div>
  )
}
