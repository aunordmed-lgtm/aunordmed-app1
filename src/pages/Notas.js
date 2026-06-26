import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { brl, pct, fmtMes, fmtData, uid, avatarColor } from '../lib/helpers'

const IMPOSTOS = 0.0615

function calcNota(bruto, medsSel, retPadrao) {
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
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [fltStatus, setFltStatus] = useState('')
  const [fltComp, setFltComp] = useState('')
  const [fltMed, setFltMed] = useState('')
  const [medSel, setMedSel] = useState([])
  const [form, setForm] = useState({ nf: '', tomador: '', comp: '', emissao: '', status: 'Emitida', obs: '', bruto: '' })

  const comps = useMemo(() => [...new Set(notas.map(n => n.comp).filter(Boolean))].sort(), [notas])

  const filtradas = useMemo(() => notas.filter(n =>
    (!busca || n.nf?.toLowerCase().includes(busca.toLowerCase()) || n.tomador?.toLowerCase().includes(busca.toLowerCase())) &&
    (!fltStatus || n.status === fltStatus) &&
    (!fltComp || n.comp === fltComp) &&
    (!fltMed || n.nomes_medicos?.includes(fltMed))
  ), [notas, busca, fltStatus, fltComp, fltMed])

  const v = calcNota(form.bruto, medSel, 13)

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

  const adicionarMed = (e) => {
    const nome = e.target.value
    if (!nome) return
    if (medSel.find(m => m.nome === nome)) { toast('Médico já adicionado.', 'error'); e.target.value = ''; return }
    const med = medicos.find(m => m.nome === nome)
    setMedSel(prev => [...prev, { nome, crm: med?.crm || '', ret: med?.retencao || 13, valor: '' }])
    e.target.value = ''
  }

  const salvar = async () => {
    if (!form.nf || !form.tomador || !form.bruto) { toast('Preencha NF, tomador e valor bruto.', 'error'); return }
    if (!medSel.length) { toast('Adicione ao menos um médico.', 'error'); return }
    const soma = medSel.reduce((a, m) => a + (parseFloat(m.valor) || 0), 0)
    if (Math.abs(soma - parseFloat(form.bruto)) > 0.01) { toast('Soma dos valores deve ser igual ao bruto.', 'error'); return }
    const calc = calcNota(form.bruto, medSel, 13)
    const medicos_nota = medSel.map(ms => ({ nome: ms.nome, crm: ms.crm || '', valor_bruto_medico: parseFloat(ms.valor) || 0, retencao_individual: parseFloat(ms.ret) || 13, repasse: parseFloat(ms.valor || 0) * (1 - parseFloat(ms.ret || 13) / 100) }))
    const payload = { ...form, bruto: calc.bruto, recebido: calc.recebido, total_repasse: calc.totalRepasse, margem: calc.margem, pct_margem: calc.pct_margem, medicos_nota, nomes_medicos: medSel.map(m => m.nome).join(', ') }
    setLoading(true)
    try {
      if (editando) {
        await supabase.from('notas_fiscais').update(payload).eq('id', editando.id)
        toast('Nota atualizada!')
      } else {
        const { data: nova } = await supabase.from('notas_fiscais').insert(payload).select().single()
        // Gerar comprovantes
        for (const ms of medSel) {
          const med = medicos.find(m => m.nome === ms.nome)
          const repMed = parseFloat(ms.valor || 0) * (1 - parseFloat(ms.ret || 13) / 100)
          await supabase.from('comprovantes').insert({ token: uid(), nf_id: nova?.id, medico_nome: ms.nome, medico_crm: med?.crm || null, tomador: form.tomador, valor_repasse: repMed, competencia: form.comp || null, dados_extras: { nf: form.nf, pix: med?.chave_pix, tipo_pix: med?.tipo_pix } })
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

  return (
    <div className="page-content">
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
            {medicos.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={abrirNova}>+ Nova nota</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>Nº NF</th><th>Tomador</th><th>Médicos</th><th>Competência</th>
              <th>Bruto</th><th>Recebido</th><th>Repasse</th><th>Margem</th><th>% Margem</th><th>Status</th><th>Ações</th>
            </tr></thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr><td colSpan={12}>
                  <div className="empty-state"><div className="empty-icon">📄</div><h4>Nenhuma nota</h4><p>Clique em "+ Nova nota" para registrar</p></div>
                </td></tr>
              ) : filtradas.map((n, i) => (
                <tr key={n.id} className={n.status === 'Emitida' ? 'row-alert' : ''}>
                  <td className="mono" style={{ color: 'var(--gray3)' }}>{i + 1}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>{n.nf || '—'}</td>
                  <td>{n.tomador || '—'}</td>
                  <td style={{ maxWidth: 180, whiteSpace: 'normal' }}>
                    {n.medicos_nota?.map(m => <span key={m.nome} className="tag" style={{ margin: 1 }}>{m.nome}</span>) || n.nomes_medicos || '—'}
                  </td>
                  <td className="mono">{fmtMes(n.comp)}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>{brl(n.bruto)}</td>
                  <td className="mono" style={{ color: 'var(--blue)' }}>{brl(n.recebido)}</td>
                  <td className="mono" style={{ color: 'var(--gray2)' }}>{brl(n.total_repasse || 0)}</td>
                  <td className="mono" style={{ color: 'var(--g3)', fontWeight: 600 }}>{brl(n.margem)}</td>
                  <td className="mono">{pct(n.pct_margem)}</td>
                  <td>
                    <select style={{ height: 26, fontSize: 11, width: 130, border: '1px solid var(--border)', borderRadius: 6, padding: '0 6px' }}
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
            <span className="field-hint">Divida o valor entre os médicos abaixo</span>
          </div>
        </div>

        {/* Médicos */}
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: .4 }}>Médicos vinculados</label>
          <div className="med-picker">
            <div className="med-picker-header">
              <span>Médico</span>
              <div style={{ display: 'flex', gap: 36, fontSize: 10, color: 'var(--gray3)' }}>
                <span style={{ width: 100, textAlign: 'center' }}>Valor (R$)</span>
                <span style={{ width: 100, textAlign: 'center' }}>% Retenção</span>
                <span style={{ width: 30 }}></span>
              </div>
            </div>
            <div className="med-picker-list">
              {medSel.length === 0 && <div style={{ padding: 12, textAlign: 'center', color: 'var(--gray3)', fontSize: 11 }}>Adicione ao menos um médico</div>}
              {medSel.map((ms, i) => (
                <div key={i} className="med-picker-row">
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{ms.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--gray3)' }}>{ms.crm}</div>
                  </div>
                  <input type="number" value={ms.valor} placeholder="0,00" min="0" step="0.01"
                    style={{ height: 28, fontSize: 12, fontFamily: 'var(--mono)', textAlign: 'right', padding: '0 6px', border: '1px solid var(--border)', borderRadius: 6 }}
                    onChange={e => setMedSel(prev => prev.map((m, j) => j === i ? {...m, valor: e.target.value} : m))} />
                  <input type="number" value={ms.ret} min="0" max="100" step="0.01"
                    style={{ height: 28, fontSize: 12, fontFamily: 'var(--mono)', textAlign: 'right', padding: '0 6px', border: '1px solid var(--border)', borderRadius: 6 }}
                    onChange={e => setMedSel(prev => prev.map((m, j) => j === i ? {...m, ret: e.target.value} : m))} />
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray3)', fontSize: 14 }}
                    onClick={() => setMedSel(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            <div className="med-picker-add">
              <select style={{ height: 32, fontSize: 12, width: '100%', border: '1px solid var(--border)', borderRadius: 6, padding: '0 8px', background: 'var(--gray7)' }} onChange={adicionarMed} defaultValue="">
                <option value="">+ Adicionar médico à nota…</option>
                {medicos.map(m => <option key={m.id} value={m.nome}>{m.nome}{m.crm ? ` (${m.crm})` : ''}</option>)}
              </select>
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
