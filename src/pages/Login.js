import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '../lib/supabase'
import { useToast } from '../components/Toast'

export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !senha) { toast('Preencha e-mail e senha.', 'error'); return }
    setLoading(true)
    const { error } = await signIn(email, senha)
    setLoading(false)
    if (error) { toast('E-mail ou senha incorretos.', 'error'); return }
    navigate('/')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--g3)', letterSpacing: '-1px', lineHeight: 1 }}>
              Aunord<span style={{ color: 'var(--g5)' }}>MED</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--n5)', letterSpacing: '2px', marginTop: 4, textTransform: 'uppercase', fontWeight: 500 }}>
              Financeiro
            </div>
          </div>
          <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, var(--g5), var(--g7))', borderRadius: 1, margin: '0 auto' }} />
        </div>

        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--n1)', marginBottom: 4 }}>Bem-vindo de volta</h2>
        <p style={{ fontSize: 13, color: 'var(--n5)', marginBottom: 24 }}>Entre com suas credenciais para acessar</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoFocus style={{ height: 42, fontSize: 14 }} />
          </div>
          <div className="field">
            <label>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" style={{ height: 42, fontSize: 14 }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14, marginTop: 4, borderRadius: 'var(--radius-lg)' }} disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Entrando…</> : 'Entrar na conta'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--g10)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--g8)' }}>
          <div style={{ fontSize: 11, color: 'var(--g3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            🔒 Acesso restrito à equipe AunordMED
          </div>
          <div style={{ fontSize: 10, color: 'var(--n6)', marginTop: 3 }}>
            Em caso de dificuldades, contate o administrador do sistema
          </div>
        </div>
      </div>
    </div>
  )
}
