import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { brl, pct, fmtMes, fmtData, uid } from '../lib/helpers'
import * as XLSX from 'xlsx'

const IMPOSTOS = 0.0615

function calcNota(bruto, medsSel) {
  const b = parseFloat(bruto) || 0
  const recebido = b * (1 - IMPOSTOS)
  let totalRepasse = 0
  const meds = medsSel.map(ms => {
    const ret = parseFloat(ms.ret) / 100
    const repasse = parseFloat(ms.valor || 0) * (1 - ret)
    totalRepasse += repasse
    return { ...ms, repasse }
  })
  const margem = recebido - totalRepasse
  const pctMargem = recebido > 0 ? margem / recebido : 0
  return { bruto: b, recebido, totalRepasse, margem, pct_margem: pctMargem, meds }
}

export function Notas({ notas, medicos, onRefresh }) {
  const { toast } = useToast()
  const [aba, setAba] = useState('lista') // lista | relatorio
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [fltStatus, setFltStatus] = useState('')
  const [fltComp, setFltComp] = useState('')
  const [fltMed, setFltMed] = useState('')
  const [medSel, setMedSel] = useState([])
  const [form, setForm] = useState({ nf: '', tomador: '', comp: '', emissao: '', status: 'Emitida', obs: '', bruto: '' })
  // Relatório
  const [relTipo, setRelTipo] = useState('mes')
  const [relMes, setRelMes] = useState(new Date().toISOString().substring(0, 7))
  const [relDe, setRelDe] = useState('')
  const [relAte, setRelAte] = useState('')

  const medicosOrdenados = useMemo(() => [...medicos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [medicos])
  const comps = useMemo(() => [...new Set(notas.map(n => n.comp).filter(Boolean))].sort(), [notas])

  const filtradas = useMemo(() => notas.filter(n =>
    (!busca || n.nf?.toLowerCase().includes(busca.toLowerCase()) || n.tomador?.toLowerCase().includes(busca.toLowerCase())) &&
    (!fltStatus || n.status === fltStatus) &&
    (!fltComp || n.comp === fltComp) &&
    (!fltMed || n.nomes_medicos?.includes(fltMed))
  ), [notas, busca, fltStatus, fltComp, fltMed])

  // Dados do relatório
  const notasRel = useMemo(() => {
    if (relTipo === 'todos') return notas
    if (relTipo === 'mes') return relMes ? notas.filter(n => n.comp === relMes) : notas
    return notas.filter(n => {
      if (!n.comp) return false
      if (relDe && n.comp < relDe) return false
      if (relAte && n.comp > relAte) return false
      return true
    })
  }, [notas, relTipo, relMes, relDe, relAte])

  const byComp = useMemo(() => {
    const m = {}
    notasRel.forEach(n => {
      const k = n.comp || 'S/D'
      if (!m[k]) m[k] = { comp: k, label: fmtMes(k), bruto: 0, recebido: 0, repasse: 0, margem: 0, count: 0 }
      m[k].bruto += n.bruto || 0
      m[k].recebido += n.recebido || 0
      m[k].repasse += n.total_repasse || 0
      m[k].margem += n.margem || 0
      m[k].count++
    })
    return Object.values(m).sort((a, b) => a.comp.localeCompare(b.comp))
  }, [notasRel])

  const totaisRel = useMemo(() => notasRel.reduce((a, n) => ({
    bruto: a.bruto + (n.bruto || 0),
    recebido: a.recebido + (n.recebido || 0),
    repasse: a.repasse + (n.total_repasse || 0),
    margem: a.margem + (n.margem || 0),
    count: a.count + 1
  }), { bruto: 0, recebido: 0, repasse: 0, margem: 0, count: 0 }), [notasRel])

  const v = calcNota(form.bruto, medSel)

  const abrirNova = () => {
    setEditando(null)
    setForm({ nf: '', tomador: '', comp: '', emissao: '', status: 'Emitida', obs: '', bruto: '' })
    setMedSel([])
    setModalOpen(true)
  }

  const abrirEditar = (nota) => {
    setEditando(nota)
    setForm({ nf: nota.nf || '', tomador: nota.tomador || '', comp: nota.comp || '', emissao: nota.emissao?.split('T')[0] || '', status: nota.status || 'Emitida', obs: nota.obs || '', bruto: nota.bruto || '' })
    setMedSel(nota.medicos_nota?.map(mn => ({ nome: mn.nome, crm: mn.crm || '', ret: mn.retencao_individual || 13, valor: mn.valor_bruto_medico || '' })) || [])
    setModalOpen(true)
  }

  const adicionarMed = (nome) => {
    if (!nome) return
    if (medSel.find(m => m.nome === nome)) { toast('Médico já adicionado.', 'error'); return }
    const med = medicos.find(m => m.nome === nome)
    if (!med) return
    setMedSel(prev => [...prev, { nome, crm: med?.crm || '', ret: med?.retencao || 13, valor: '' }])
  }

  const salvar = async () => {
    if (!form.nf || !form.tomador || !form.bruto) { toast('Preencha NF, tomador e valor bruto.', 'error'); return }
    if (!medSel.length) { toast('Adicione ao menos um médico.', 'error'); return }
    const soma = medSel.reduce((a, m) => a + (parseFloat(m.valor) || 0), 0)
    if (Math.abs(soma - parseFloat(form.bruto)) > 0.01) { toast('Soma dos valores deve ser igual ao bruto.', 'error'); return }
    const calc = calcNota(form.bruto, medSel)
    const medicos_nota = medSel.map(ms => ({
      nome: ms.nome, crm: ms.crm || '',
      valor_bruto_medico: parseFloat(ms.valor) || 0,
      retencao_individual: parseFloat(ms.ret) || 13,
      repasse: parseFloat(ms.valor || 0) * (1 - parseFloat(ms.ret || 13) / 100)
    }))
    const payload = { ...form, bruto: calc.bruto, recebido: calc.recebido, total_repasse: calc.totalRepasse, margem: calc.margem, pct_margem: calc.pct_margem, medicos_nota, nomes_medicos: medSel.map(m => m.nome).join(', ') }
    setLoading(true)
    try {
      if (editando) {
        await supabase.from('notas_fiscais').update(payload).eq('id', editando.id)
        toast('Nota atualizada!')
      } else {
        const { data: nova } = await supabase.from('notas_fiscais').insert(payload).select().single()
        for (const ms of medSel) {
          const med = medicos.find(m => m.nome === ms.nome)
          const repMed = parseFloat(ms.valor || 0) * (1 - parseFloat(ms.ret || 13) / 100)
          const existing = await supabase.from('comprovantes').select('id').eq('nf_id', nova?.id).eq('medico_nome', ms.nome).maybeSingle()
          if (!existing?.data) {
            await supabase.from('comprovantes').insert({ token: uid(), nf_id: nova?.id, medico_nome: ms.nome, medico_crm: med?.crm || null, tomador: form.tomador, valor_repasse: repMed, competencia: form.comp || null, dados_extras: { nf: form.nf, pix: med?.chave_pix, tipo_pix: med?.tipo_pix } })
          }
        }
        toast('Nota adicionada!')
      }
      setModalOpen(false)
      onRefresh()
    } catch (e) { toast('Erro: ' + e.message, 'error') }
    setLoading(false)
  }

  const excluir = async (id) => {
    if (!window.confirm('Excluir esta nota?')) return
    await supabase.from('notas_fiscais').delete().eq('id', id)
    toast('Nota removida.')
    onRefresh()
  }

  const alterarStatus = async (id, status) => {
    await supabase.from('notas_fiscais').update({ status }).eq('id', id)
    onRefresh()
  }

  const exportarRelatorio = () => {
    const rows = [['NF', 'Tomador', 'Médicos', 'Competência', 'Bruto', 'Recebido', 'Repasse', 'Margem', '% Margem', 'Status']]
    notasRel.forEach(n => rows.push([n.nf, n.tomador, n.nomes_medicos, fmtMes(n.comp), +(n.bruto||0).toFixed(2), +(n.recebido||0).toFixed(2), +(n.total_repasse||0).toFixed(2), +(n.margem||0).toFixed(2), +((n.pct_margem||0)*100).toFixed(2)+'%', n.status]))
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Notas')
    XLSX.writeFile(wb, `notas_${relTipo === 'mes' ? relMes : 'periodo'}.xlsx`)
    toast('Excel exportado!')
  }

  return (
    <div className="page-content">
      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[['lista', '📄 Notas fiscais'], ['relatorio', '📊 Relatório por período']].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)} style={{ padding: '8px 18px', border: 'none', borderBottom: aba === id ? '2px solid var(--g5)' : '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: aba === id ? 600 : 400, color: aba === id ? 'var(--g3)' : 'var(--n5)', fontFamily: 'var(--sans)' }}>
            {label}
          </button>
        ))}
        {aba === 'lista' && (
          <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={abrirNova}>+ Nova nota</button>
        )}
      </div>

      {/* ABA LISTA */}
      {aba === 'lista' && (
        <div className="card">
          <div className="table-toolbar">
            <span className="table-title">Notas fiscais</span>
            <input className="search-input" placeholder="🔍 Buscar NF ou tomador…" value={busca} onChange={e => setBusca(e.target.value)} />
            <select className="filter-select" value={fltStatus} onChange={e => setFltStatus(e.target.value)}>
              <option value="">Todos status</option>
              <option value="Emitida">Emitida</option>
              <option value="Recebida">Recebida</option>
              <option value="Paga ao médico">Paga ao médico</option>
            </select>
            <select className="filter-select" value={fltComp} onChange={e => setFltComp(e.target.value)}>
              <option value="">Competências</option>
              {comps.map(c => <option key={c} value={c}>{fmtMes(c)}</option>)}
            </select>
            <select className="filter-select" value={fltMed} onChange={e => setFltMed(e.target.value)}>
              <option value="">Todos médicos</option>
              {medicosOrdenados.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>#</th><th>Nº NF</th><th>Tomador</th><th>Médicos</th><th>Competência</th>
                <th>Bruto</th><th>Recebido</th><th>Repasse</th><th>Margem</th><th>Status</th><th>Ações</th>
              </tr></thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr><td colSpan={11}><div className="empty-state"><div className="empty-icon">📄</div><h4>Nenhuma nota</h4><p>Clique em "+ Nova nota" para registrar</p></div></td></tr>
                ) : filtradas.map((n, i) => (
                  <tr key={n.id} className={n.status === 'Emitida' ? 'row-alert' : ''}>
                    <td className="mono" style={{ color: 'var(--n6)' }}>{i + 1}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{n.nf || '—'}</td>
                    <td>{n.tomador || '—'}</td>
                    <td style={{ maxWidth: 180, whiteSpace: 'normal' }}>
                      {n.medicos_nota?.map(m => <span key={m.nome} className="tag" style={{ margin: 1 }}>{m.nome}</span>) || n.nomes_medicos || '—'}
                    </td>
                    <td className="mono">{fmtMes(n.comp)}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{brl(n.bruto)}</td>
                    <td className="mono" style={{ color: 'var(--blue)' }}>{brl(n.recebido)}</td>
                    <td className="mono" style={{ color: 'var(--n4)' }}>{brl(n.total_repasse || 0)}</td>
                    <td className="mono" style={{ color: 'var(--g3)', fontWeight: 600 }}>{brl(n.margem)}</td>
                    <td>
                      <select style={{ height: 26, fontSize: 11, width: 130, border: '1px solid var(--border)', borderRadius: 6, padding: '0 6px', fontFamily: 'var(--sans)' }}
                        value={n.status} onChange={e => alterarStatus(n.id, e.target.value)}>
                        <option value="Emitida">Emitida</option>
                        <option value="Recebida">Recebida</option>
                        <option value="Paga ao médico">Paga ao médico</option>
                      </select>
                    </td>
                    <td style={{ display: 'flex', gap: 4, paddingTop: 6 }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => abrirEditar(n)}>✏️</button>
                      <button className="btn btn-danger btn-xs" onClick={() => excluir(n.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA RELATÓRIO */}
      {aba === 'relatorio' && (
        <>
          {/* Filtros */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="field">
                  <label>Período</label>
                  <select style={{ height: 36 }} value={relTipo} onChange={e => setRelTipo(e.target.value)}>
                    <option value="mes">Mês específico</option>
                    <option value="intervalo">Intervalo</option>
                    <option value="todos">Todos os períodos</option>
                  </select>
                </div>
                {relTipo === 'mes' && (
                  <div className="field"><label>Mês/Ano</label><input type="month" style={{ height: 36 }} value={relMes} onChange={e => setRelMes(e.target.value)} /></div>
                )}
                {relTipo === 'intervalo' && (
                  <>
                    <div className="field"><label>De</label><input type="month" style={{ height: 36 }} value={relDe} onChange={e => setRelDe(e.target.value)} /></div>
                    <div className="field"><label>Até</label><input type="month" style={{ height: 36 }} value={relAte} onChange={e => setRelAte(e.target.value)} /></div>
                  </>
                )}
                <button className="btn btn-ghost btn-sm" onClick={exportarRelatorio}>⬇ Exportar Excel</button>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 14 }}>
            {[
              { bar: 'var(--g5)', ic: 'var(--g10)', icon: '📄', label: 'Notas no período', value: totaisRel.count, sub: '' },
              { bar: 'var(--g5)', ic: 'var(--g10)', icon: '💰', label: 'Total bruto', value: brl(totaisRel.bruto), sub: '' },
              { bar: 'var(--blue)', ic: 'var(--blue-l)', icon: '📥', label: 'Total recebido', value: brl(totaisRel.recebido), sub: 'Após impostos' },
              { bar: 'var(--g5)', ic: 'var(--g10)', icon: '📈', label: 'Margem empresa', value: brl(totaisRel.margem), sub: totaisRel.recebido > 0 ? pct(totaisRel.margem / totaisRel.recebido) : '—' },
            ].map((k, i) => (
              <div key={i} className="kpi">
                <div className="kpi-bar" style={{ background: k.bar }} />
                <div className="kpi-icon" style={{ background: k.ic }}>{k.icon}</div>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value">{k.value}</div>
                {k.sub && <div className="kpi-sub">{k.sub}</div>}
              </div>
            ))}
          </div>

          {/* Por mês */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-header"><h3>📅 Emitido por mês</h3></div>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Competência</th><th style={{ textAlign: 'right' }}>NFs</th><th style={{ textAlign: 'right' }}>Bruto</th><th style={{ textAlign: 'right' }}>Recebido</th><th style={{ textAlign: 'right' }}>Repasse</th><th style={{ textAlign: 'right' }}>Margem</th><th style={{ textAlign: 'right' }}>% Margem</th>
                </tr></thead>
                <tbody>
                  {byComp.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state" style={{ padding: '1.5rem' }}><p>Nenhuma nota no período</p></div></td></tr>
                  ) : byComp.map((m, i) => (
                    <tr key={m.comp} style={{ background: i % 2 === 0 ? '#fff' : 'var(--n10)' }}>
                      <td style={{ fontWeight: 600 }}>{m.label}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{m.count}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{brl(m.bruto)}</td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--blue)' }}>{brl(m.recebido)}</td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--n4)' }}>{brl(m.repasse)}</td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--g3)', fontWeight: 700 }}>{brl(m.margem)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{m.recebido > 0 ? pct(m.margem / m.recebido) : '—'}</td>
                    </tr>
                  ))}
                  {byComp.length > 0 && (
                    <tr style={{ background: 'var(--g1)' }}>
                      <td style={{ fontWeight: 700, color: '#fff' }}>TOTAL</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>{totaisRel.count}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>{brl(totaisRel.bruto)}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>{brl(totaisRel.recebido)}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>{brl(totaisRel.repasse)}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--g7)' }}>{brl(totaisRel.margem)}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--g7)' }}>{totaisRel.recebido > 0 ? pct(totaisRel.margem / totaisRel.recebido) : '—'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detalhado */}
          <div className="card">
            <div className="card-header"><h3>📋 Notas detalhadas no período</h3></div>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>NF</th><th>Tomador</th><th>Médicos</th><th>Competência</th><th style={{ textAlign: 'right' }}>Bruto</th><th style={{ textAlign: 'right' }}>Recebido</th><th style={{ textAlign: 'right' }}>Margem</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {notasRel.length === 0 ? (
                    <tr><td colSpan={8}><div className="empty-state" style={{ padding: '1.5rem' }}><p>Nenhuma nota no período</p></div></td></tr>
                  ) : notasRel.map(n => (
                    <tr key={n.id}>
                      <td className="mono" style={{ fontWeight: 600 }}>{n.nf || '—'}</td>
                      <td>{n.tomador || '—'}</td>
                      <td style={{ fontSize: 11 }}>{n.nomes_medicos || '—'}</td>
                      <td className="mono">{fmtMes(n.comp)}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{brl(n.bruto)}</td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--blue)' }}>{brl(n.recebido)}</td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--g3)', fontWeight: 600 }}>{brl(n.margem)}</td>
                      <td><span className={`badge ${n.status === 'Paga ao médico' ? 'badge-ok' : n.status === 'Recebida' ? 'badge-rec' : 'badge-emit'}`}>{n.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL NOTA */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar nota' : 'Nova nota fiscal'} size="wide"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar} disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Salvando…</> : 'Salvar nota'}
          </button>
        </>}>
        <div className="form-grid">
          {[['nf','Nº da NF *','text','00001'],['tomador','Tomador *','text','Unimed…'],['comp','Competência','month',''],['emissao','Data emissão','date',''],['obs','Observações','text','']].map(([k,l,t,p]) => (
            <div key={k} className="field">
              <label>{l}</label>
              <input type={t} value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} placeholder={p} />
            </div>
          ))}
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({...f,status:e.target.value}))}>
              <option value="Emitida">Emitida</option>
              <option value="Recebida">Recebida</option>
              <option value="Paga ao médico">Paga ao médico</option>
            </select>
          </div>
          <div className="field form-full">
            <label>Valor bruto total (R$) *</label>
            <input type="number" className="inp-money" value={form.bruto} onChange={e => setForm(f => ({...f,bruto:e.target.value}))} placeholder="0,00" min="0" step="0.01" />
          </div>
        </div>

        {/* Médicos */}
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--n4)', textTransform: 'uppercase', letterSpacing: .4 }}>Médicos vinculados</label>
          <div className="med-picker">
            <div className="med-picker-header">
              <span>Médico</span>
              <div style={{ display: 'flex', gap: 36, fontSize: 10, color: 'var(--n5)' }}>
                <span style={{ width: 100, textAlign: 'center' }}>Valor (R$)</span>
                <span style={{ width: 100, textAlign: 'center' }}>% Retenção</span>
                <span style={{ width: 30 }}></span>
              </div>
            </div>
            <div className="med-picker-list">
              {medSel.length === 0 && <div style={{ padding: 12, textAlign: 'center', color: 'var(--n6)', fontSize: 11 }}>Adicione ao menos um médico</div>}
              {medSel.map((ms, i) => (
                <div key={i} className="med-picker-row">
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{ms.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--n5)' }}>{ms.crm}</div>
                  </div>
                  <input type="number" value={ms.valor} placeholder="0,00" min="0" step="0.01"
                    style={{ height: 28, fontSize: 12, fontFamily: 'var(--mono)', textAlign: 'right', padding: '0 6px', border: '1px solid var(--border)', borderRadius: 6 }}
                    onChange={e => setMedSel(prev => prev.map((m, j) => j === i ? {...m, valor: e.target.value} : m))} />
                  <input type="number" value={ms.ret} min="0" max="100" step="0.01"
                    style={{ height: 28, fontSize: 12, fontFamily: 'var(--mono)', textAlign: 'right', padding: '0 6px', border: '1px solid var(--border)', borderRadius: 6 }}
                    onChange={e => setMedSel(prev => prev.map((m, j) => j === i ? {...m, ret: e.target.value} : m))} />
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n5)', fontSize: 14 }}
                    onClick={() => setMedSel(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            {/* Campo de busca com datalist */}
            <div className="med-picker-add">
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  list="med-datalist"
                  placeholder="🔍 Digite o nome do médico para adicionar..."
                  id="med-search-input"
                  autoComplete="off"
                  style={{ height: 34, fontSize: 12, width: '100%', border: '1px solid var(--border)', borderRadius: 6, padding: '0 10px', background: 'var(--n10)', fontFamily: 'var(--sans)' }}
                  onChange={e => {
                    const nome = e.target.value.trim()
                    const med = medicosOrdenados.find(m => m.nome === nome)
                    if (med) {
                      adicionarMed(nome)
                      setTimeout(() => { const el = document.getElementById('med-search-input'); if (el) el.value = '' }, 50)
                    }
                  }}
                />
                <datalist id="med-datalist">
                  {medicosOrdenados.map(m => (
                    <option key={m.id} value={m.nome}>{m.crm ? `${m.nome} (${m.crm})` : m.nome}</option>
                  ))}
                </datalist>
              </div>
            </div>
            {medSel.length > 0 && form.bruto && Math.abs(medSel.reduce((a,m)=>a+(parseFloat(m.valor)||0),0) - parseFloat(form.bruto)) > 0.01 && (
              <div className="pct-warn">⚠️ Soma dos valores deve ser igual ao valor bruto total</div>
            )}
          </div>
        </div>

        {/* Calculados */}
        <div className="computed-row">
          <div className="computed-box blue"><div className="computed-label">Recebido (−6,15%)</div><div className="computed-value">{brl(v.recebido)}</div></div>
          <div className="computed-box"><div className="computed-label">Total repasse</div><div className="computed-value">{brl(v.totalRepasse)}</div></div>
          <div className="computed-box highlight"><div className="computed-label">Margem empresa</div><div className="computed-value">{brl(v.margem)}</div></div>
          <div className="computed-box"><div className="computed-label">% Margem</div><div className="computed-value">{pct(v.pct_margem)}</div></div>
        </div>
      </Modal>
    </div>
  )
}
