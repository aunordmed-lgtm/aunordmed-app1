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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: 'var(--g3)', borderRadius: 16, marginBottom: 12 }}>
            <svg width="28" height="28" viewBox="0 0 80 80" fill="none">
              <polygon points="40,4 76,62 4,62" fill="#22994D" opacity=".8"/>
              <polygon points="40,18 66,62 14,62" fill="#145C30"/>
              <rect x="29" y="39" width="22" height="5" rx="2.5" fill="#fff" opacity=".9"/>
              <rect x="37.5" y="30" width="5" height="22" rx="2.5" fill="#fff" opacity=".9"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray0)' }}>
            Aunord<span style={{ color: 'var(--g3)' }}>MED</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray3)', marginTop: 4 }}>Gestão financeira médica</div>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-body">
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--gray1)' }}>Entrar na sua conta</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoFocus />
              </div>
              <div className="field">
                <label>Senha</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8, height: 40 }} disabled={loading}>
                {loading ? <><span className="spinner spinner-sm" /> Entrando…</> : 'Entrar'}
              </button>
            </form>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray3)', marginTop: 16 }}>
          Acesso restrito à equipe AunordMED
        </p>
      </div>
    </div>
  )
}
