import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { brl, fmtMes } from '../lib/helpers'

export function Solicitacoes({ solicitacoes = [], medicos = [], tomadores = [], onRefresh }) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [fltStatus, setFltStatus] = useState('ativas') // ativas | todas | concluidas
  const [expandido, setExpandido] = useState(null)
  const [form, setForm] = useState({ medico_nome: '', tomador: '', competencia: '', canal: 'whatsapp', valor_informado: '', observacoes: '' })

  const medicosOrdenados = useMemo(() => [...medicos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [medicos])
  const tomadoresLista = useMemo(() => [...new Set(tomadores.map(t => t.nome).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [tomadores])

  const filtradas = useMemo(() => solicitacoes.filter(s => {
    if (busca && !s.medico_nome?.toLowerCase().includes(busca.toLowerCase())) return false
    if (fltStatus === 'ativas') return s.status !== 'Concluído'
    if (fltStatus === 'concluidas') return s.status === 'Concluído'
    return true
  }), [solicitacoes, busca, fltStatus])

  const grupos = useMemo(() => {
    const g = {}
    filtradas.forEach(s => {
      const key = `${s.tomador || '—'}|||${s.competencia || '—'}`
      if (!g[key]) g[key] = { tomador: s.tomador || '—', competencia: s.competencia, itens: [], totalInformado: 0, pendentes: 0 }
      g[key].itens.push(s)
      g[key].totalInformado += s.valor_informado || 0
      if (s.status === 'Pendente') g[key].pendentes++
    })
    return Object.values(g).sort((a, b) => b.pendentes - a.pendentes || (b.competencia || '').localeCompare(a.competencia || ''))
  }, [filtradas])

  const totalPendentes = solicitacoes.filter(s => s.status === 'Pendente').length
  const totalNotaEmitida = solicitacoes.filter(s => s.status === 'Nota emitida').length

  function abrirNova() {
    setForm({ medico_nome: '', tomador: '', competencia: '', canal: 'whatsapp', valor_informado: '', observacoes: '' })
    setModalOpen(true)
  }

  async function salvar() {
    if (!form.medico_nome || !form.tomador || !form.competencia) {
      toast('Preencha médico, tomador e competência.', 'error')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.from('solicitacoes_medicos').insert({
        medico_nome: form.medico_nome,
        tomador: form.tomador,
        competencia: form.competencia,
        canal: form.canal,
        valor_informado: form.valor_informado ? parseFloat(form.valor_informado) : null,
        observacoes: form.observacoes || null,
        status: 'Pendente',
      })
      if (error) throw error
      toast('Solicitação registrada!')
      setModalOpen(false)
      onRefresh()
    } catch (e) {
      toast('Erro ao salvar: ' + e.message, 'error')
    }
    setLoading(false)
  }

  async function marcarConcluido(id) {
    await supabase.from('solicitacoes_medicos').update({ status: 'Concluído' }).eq('id', id)
    onRefresh()
  }

  async function excluir(id) {
    if (!window.confirm('Excluir esta solicitação?')) return
    await supabase.from('solicitacoes_medicos').delete().eq('id', id)
    toast('Solicitação removida.')
    onRefresh()
  }

  function gerarNotaConsolidada(grupo) {
    const payload = {
      tomador: grupo.tomador,
      comp: grupo.competencia,
      medicos: grupo.itens.map(s => ({ nome: s.medico_nome, valor: s.valor_informado || '' })),
      solicitacaoIds: grupo.itens.map(s => s.id),
    }
    localStorage.setItem('aunordmed_prefill_nota', JSON.stringify(payload))
    toast(`Levando ${grupo.itens.length} médico(s) para uma nova nota...`)
    navigate('/notas')
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 16, fontWeight: 700, padding: '8px 0' }}>📨 Solicitações de médicos</span>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={abrirNova}>+ Nova solicitação</button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 14 }}>
        {[
          { bar: 'var(--orange)', ic: 'var(--orange-l)', icon: '⏳', label: 'Pendentes', value: totalPendentes },
          { bar: 'var(--blue)', ic: 'var(--blue-l)', icon: '📄', label: 'Nota emitida (aguardando conclusão)', value: totalNotaEmitida },
          { bar: 'var(--g5)', ic: 'var(--g10)', icon: '📦', label: 'Grupos prontos p/ nota', value: grupos.filter(g => g.pendentes > 0).length },
        ].map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-bar" style={{ background: k.bar }} />
            <div className="kpi-icon" style={{ background: k.ic }}>{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="table-toolbar">
          <span className="table-title">Agrupado por tomador + competência</span>
          <input className="search-input" placeholder="🔍 Buscar médico…" value={busca} onChange={e => setBusca(e.target.value)} />
          <select className="filter-select" value={fltStatus} onChange={e => setFltStatus(e.target.value)}>
            <option value="ativas">Ativas (não concluídas)</option>
            <option value="concluidas">Concluídas</option>
            <option value="todas">Todas</option>
          </select>
        </div>

        {grupos.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📨</div><h4>Nenhuma solicitação</h4><p>Clique em "+ Nova solicitação" para registrar um pedido de médico</p></div>
        ) : grupos.map((g, gi) => {
          const key = `${g.tomador}|||${g.competencia}`
          const aberto = expandido === key
          return (
            <div key={key} style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer', background: g.pendentes > 0 ? '#FFFBEB' : 'transparent' }}
                onClick={() => setExpandido(aberto ? null : key)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--n1)' }}>{g.tomador} · {fmtMes(g.competencia)}</div>
                  <div style={{ fontSize: 11, color: 'var(--n5)', marginTop: 2 }}>
                    {g.itens.length} médico(s) · {g.pendentes} pendente(s)
                    {g.totalInformado > 0 && <> · valor informado: <strong>{brl(g.totalInformado)}</strong></>}
                  </div>
                </div>
                {g.pendentes > 0 && (
                  <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); gerarNotaConsolidada(g) }}>
                    🧾 Gerar nota consolidada
                  </button>
                )}
                <span style={{ fontSize: 12, color: 'var(--n5)' }}>{aberto ? '▲' : '▼'}</span>
              </div>

              {aberto && (
                <div style={{ padding: '0 18px 14px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead><tr style={{ color: 'var(--n5)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Médico</th>
                      <th style={{ padding: '6px 8px' }}>Canal</th>
                      <th style={{ padding: '6px 8px' }}>Data pedido</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Valor informado</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '6px 8px' }}></th>
                    </tr></thead>
                    <tbody>
                      {g.itens.map(s => (
                        <tr key={s.id} style={{ borderTop: '1px solid var(--n10)' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 500 }}>{s.medico_nome}</td>
                          <td style={{ padding: '6px 8px' }}>{s.canal === 'email' ? '✉️ E-mail' : '💬 WhatsApp'}</td>
                          <td className="mono" style={{ padding: '6px 8px' }}>{s.data_solicitacao ? new Date(s.data_solicitacao + 'T00:00').toLocaleDateString('pt-BR') : '—'}</td>
                          <td className="mono" style={{ padding: '6px 8px', textAlign: 'right' }}>{s.valor_informado ? brl(s.valor_informado) : '—'}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            <span className={`badge ${s.status === 'Concluído' ? 'badge-ok' : s.status === 'Nota emitida' ? 'badge-rec' : 'badge-emit'}`}>{s.status}</span>
                          </td>
                          <td style={{ padding: '6px 8px', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            {s.status !== 'Concluído' && (
                              <button className="btn btn-ghost btn-xs" onClick={() => marcarConcluido(s.id)} title="Marcar como concluído">✓</button>
                            )}
                            <button className="btn btn-danger btn-xs" onClick={() => excluir(s.id)}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova solicitação de médico"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar} disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Salvando…</> : 'Registrar solicitação'}
          </button>
        </>}>
        <div className="form-grid">
          <div className="field">
            <label>Médico *</label>
            <input type="text" list="solic-med-datalist" value={form.medico_nome} onChange={e => setForm(f => ({ ...f, medico_nome: e.target.value }))} placeholder="Nome do médico" />
            <datalist id="solic-med-datalist">
              {medicosOrdenados.map(m => <option key={m.id} value={m.nome} />)}
            </datalist>
          </div>
          <div className="field">
            <label>Tomador *</label>
            <input type="text" list="solic-tom-datalist" value={form.tomador} onChange={e => setForm(f => ({ ...f, tomador: e.target.value }))} placeholder="Ex: UPA Imbiribeira" />
            <datalist id="solic-tom-datalist">
              {tomadoresLista.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div className="field">
            <label>Competência *</label>
            <input type="month" value={form.competencia} onChange={e => setForm(f => ({ ...f, competencia: e.target.value }))} />
          </div>
          <div className="field">
            <label>Canal</label>
            <select value={form.canal} onChange={e => setForm(f => ({ ...f, canal: e.target.value }))}>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="email">✉️ E-mail</option>
            </select>
          </div>
          <div className="field">
            <label>Valor informado (R$) — opcional</label>
            <input type="number" min="0" step="0.01" value={form.valor_informado} onChange={e => setForm(f => ({ ...f, valor_informado: e.target.value }))} placeholder="0,00" />
          </div>
          <div className="field form-full">
            <label>Observações</label>
            <input type="text" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Detalhes do plantão, se o médico mandou..." />
          </div>
        </div>
      </Modal>
    </div>
  )
}
