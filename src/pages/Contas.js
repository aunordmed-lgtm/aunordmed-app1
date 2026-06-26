import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { brl, fmtData, hoje } from '../lib/helpers'

const CATEGORIAS = ['Aluguel','Contador','Imposto','Repasse médico','Honorário','Material','Serviço','Outro']

export function Contas({ contas = [], onRefresh }) {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fltTipo, setFltTipo] = useState('')
  const [fltStatus, setFltStatus] = useState('pendente')
  const [form, setForm] = useState({ tipo:'pagar', descricao:'', valor:'', vencimento:'', competencia:'', categoria:'', medico_nome:'', tomador:'', obs:'' })

  const hoje_ = hoje()

  const filtradas = useMemo(() => contas.filter(c =>
    (!fltTipo || c.tipo === fltTipo) && (!fltStatus || c.status === fltStatus)
  ), [contas, fltTipo, fltStatus])

  const totPagar = useMemo(() => contas.filter(c=>c.tipo==='pagar'&&c.status==='pendente').reduce((a,c)=>a+c.valor,0), [contas])
  const totReceber = useMemo(() => contas.filter(c=>c.tipo==='receber'&&c.status==='pendente').reduce((a,c)=>a+c.valor,0), [contas])
  const vencidas = useMemo(() => contas.filter(c=>c.status==='pendente'&&c.vencimento<hoje_).length, [contas, hoje_])

  const abrir = (c=null) => {
    setEditando(c)
    setForm(c ? { tipo:c.tipo||'pagar', descricao:c.descricao||'', valor:c.valor||'', vencimento:c.vencimento||'', competencia:c.competencia||'', categoria:c.categoria||'', medico_nome:c.medico_nome||'', tomador:c.tomador||'', obs:c.obs||'' }
      : { tipo:'pagar', descricao:'', valor:'', vencimento:'', competencia:'', categoria:'', medico_nome:'', tomador:'', obs:'' })
    setModalOpen(true)
  }

  const salvar = async () => {
    if (!form.descricao || !form.valor || !form.vencimento) { toast('Preencha descrição, valor e vencimento.', 'error'); return }
    const payload = { ...form, valor: parseFloat(form.valor) }
    setLoading(true)
    try {
      if (editando) { await supabase.from('contas_pagar_receber').update(payload).eq('id', editando.id); toast('Conta atualizada!') }
      else { await supabase.from('contas_pagar_receber').insert(payload); toast('Conta cadastrada!') }
      setModalOpen(false); onRefresh()
    } catch(e) { toast('Erro: '+e.message, 'error') }
    setLoading(false)
  }

  const marcarPago = async (id) => {
    await supabase.from('contas_pagar_receber').update({ status:'pago', data_pagamento: hoje_ }).eq('id', id)
    toast('Marcado como pago!'); onRefresh()
  }

  const excluir = async (id) => {
    if (!window.confirm('Excluir esta conta?')) return
    await supabase.from('contas_pagar_receber').delete().eq('id', id)
    toast('Removido.'); onRefresh()
  }

  return (
    <div className="page-content">
      <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:14 }}>
        {[
          { bar:'var(--red)', ic:'var(--red-l)', icon:'📤', label:'A pagar', value:brl(totPagar), sub:'Pendente' },
          { bar:'var(--g3)', ic:'var(--g7)', icon:'📥', label:'A receber', value:brl(totReceber), sub:'Pendente' },
          { bar:'var(--orange)', ic:'var(--orange-l)', icon:'⚠️', label:'Vencidas', value:vencidas, sub:'Ação necessária' },
        ].map((k,i) => (
          <div key={i} className="kpi">
            <div className="kpi-bar" style={{ background:k.bar }} />
            <div className="kpi-icon" style={{ background:k.ic }}>{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="table-toolbar">
          <span className="table-title">Contas a pagar / receber</span>
          <select className="filter-select" value={fltTipo} onChange={e=>setFltTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            <option value="pagar">A pagar</option>
            <option value="receber">A receber</option>
          </select>
          <select className="filter-select" value={fltStatus} onChange={e=>setFltStatus(e.target.value)}>
            <option value="">Todos status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={()=>abrir()}>+ Nova conta</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {filtradas.length===0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">📅</div><h4>Nenhuma conta</h4><p>Cadastre contas a pagar e receber</p></div></td></tr>
              ) : filtradas.map(c => {
                const vencida = c.status==='pendente' && c.vencimento < hoje_
                const hoje__ = c.vencimento === hoje_
                return (
                  <tr key={c.id} className={vencida?'row-alert':''}>
                    <td><span className={`badge ${c.tipo==='pagar'?'badge-danger':'badge-ok'}`}>{c.tipo==='pagar'?'📤 Pagar':'📥 Receber'}</span></td>
                    <td style={{ fontWeight:500 }}>{c.descricao}</td>
                    <td style={{ color:'var(--gray2)' }}>{c.categoria||'—'}</td>
                    <td className="mono" style={{ color: vencida?'var(--red-d)':hoje__?'var(--orange)':'inherit', fontWeight: vencida||hoje__?600:400 }}>
                      {fmtData(c.vencimento)}{vencida?' ⚠️':hoje__?' 📅':''}
                    </td>
                    <td className="mono" style={{ fontWeight:700, color:c.tipo==='pagar'?'var(--red-d)':'var(--g2)' }}>{brl(c.valor)}</td>
                    <td><span className={`badge ${c.status==='pago'?'badge-ok':c.status==='cancelado'?'badge-danger':'badge-emit'}`}>{c.status==='pago'?'✓ Pago':c.status==='cancelado'?'Cancelado':'Pendente'}</span></td>
                    <td style={{ display:'flex', gap:4, paddingTop:6 }}>
                      {c.status==='pendente' && <button className="btn btn-primary btn-xs" onClick={()=>marcarPago(c.id)}>✓ Pago</button>}
                      <button className="btn btn-ghost btn-xs" onClick={()=>abrir(c)}>✏️</button>
                      <button className="btn btn-danger btn-xs" onClick={()=>excluir(c.id)}>✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editando?'Editar conta':'Nova conta'}
        footer={<><button className="btn btn-ghost" onClick={()=>setModalOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={salvar} disabled={loading}>{loading?<><span className="spinner spinner-sm"/> Salvando…</>:'Salvar'}</button></>}>
        <div className="form-grid">
          <div className="field"><label>Tipo *</label>
            <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
              <option value="pagar">A pagar</option><option value="receber">A receber</option>
            </select>
          </div>
          <div className="field"><label>Categoria</label>
            <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
              <option value="">— selecione —</option>
              {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field form-full"><label>Descrição *</label><input type="text" value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Ex: Aluguel sala julho"/></div>
          <div className="field"><label>Valor (R$) *</label><input type="number" className="inp-money" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} placeholder="0,00" step="0.01"/></div>
          <div className="field"><label>Vencimento *</label><input type="date" value={form.vencimento} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))}/></div>
          <div className="field"><label>Competência</label><input type="month" value={form.competencia} onChange={e=>setForm(f=>({...f,competencia:e.target.value}))}/></div>
          <div className="field"><label>Médico</label><input type="text" value={form.medico_nome} onChange={e=>setForm(f=>({...f,medico_nome:e.target.value}))} placeholder="Opcional"/></div>
          <div className="field"><label>Tomador</label><input type="text" value={form.tomador} onChange={e=>setForm(f=>({...f,tomador:e.target.value}))} placeholder="Opcional"/></div>
          <div className="field form-full"><label>Observações</label><textarea value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} rows={2}/></div>
        </div>
      </Modal>
    </div>
  )
}
