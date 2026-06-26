import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { brl, fmtData, fmtMes, hoje, mesAtual } from '../lib/helpers'

const TIPOS_IMP = ['IRPJ','CSLL','PIS','COFINS','ISS','INSS','Outro']
const ALIQUOTAS = { IRPJ:15, CSLL:9, PIS:0.65, COFINS:3, ISS:5, INSS:11 }

export function Impostos({ impostos=[], notas, onRefresh }) {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ competencia:mesAtual(), tipo:'ISS', base_calculo:'', aliquota:'5', valor:'', vencimento:'', obs:'' })

  const totalPendente = useMemo(() => impostos.filter(i=>i.status==='pendente').reduce((a,i)=>a+i.valor,0), [impostos])
  const totalPago = useMemo(() => impostos.filter(i=>i.status==='pago').reduce((a,i)=>a+i.valor,0), [impostos])

  const calcularAutomatico = () => {
    const mes = form.competencia
    const notasMes = notas.filter(n=>n.comp===mes)
    const totalBruto = notasMes.reduce((a,n)=>a+n.bruto,0)
    const aliq = parseFloat(form.aliquota)||0
    const base = totalBruto
    const valor = base * aliq / 100
    setForm(f=>({...f, base_calculo:base.toFixed(2), valor:valor.toFixed(2)}))
    toast(`Calculado automaticamente com base em ${notasMes.length} nota(s) de ${fmtMes(mes)}`)
  }

  const abrir = (i=null) => {
    setEditando(i)
    setForm(i ? { competencia:i.competencia||mesAtual(), tipo:i.tipo||'ISS', base_calculo:i.base_calculo||'', aliquota:i.aliquota||'5', valor:i.valor||'', vencimento:i.vencimento||'', obs:i.obs||'' }
      : { competencia:mesAtual(), tipo:'ISS', base_calculo:'', aliquota:'5', valor:'', vencimento:'', obs:'' })
    setModalOpen(true)
  }

  const salvar = async () => {
    if (!form.competencia||!form.tipo||!form.valor) { toast('Preencha competência, tipo e valor.','error'); return }
    const payload = { ...form, valor:parseFloat(form.valor), base_calculo:form.base_calculo?parseFloat(form.base_calculo):null, aliquota:form.aliquota?parseFloat(form.aliquota):null }
    setLoading(true)
    try {
      if(editando) { await supabase.from('impostos').update(payload).eq('id',editando.id); toast('Imposto atualizado!') }
      else { await supabase.from('impostos').insert(payload); toast('Imposto cadastrado!') }
      setModalOpen(false); onRefresh()
    } catch(e) { toast('Erro: '+e.message,'error') }
    setLoading(false)
  }

  const marcarPago = async (id) => {
    await supabase.from('impostos').update({ status:'pago', data_pagamento:hoje() }).eq('id',id)
    toast('Marcado como pago!'); onRefresh()
  }

  const excluir = async (id) => {
    if(!window.confirm('Excluir este imposto?')) return
    await supabase.from('impostos').delete().eq('id',id)
    toast('Removido.'); onRefresh()
  }

  return (
    <div className="page-content">
      <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(2,1fr)', marginBottom:14 }}>
        {[
          { bar:'var(--orange)', ic:'var(--orange-l)', icon:'📋', label:'Impostos a recolher', value:brl(totalPendente), sub:`${impostos.filter(i=>i.status==='pendente').length} item(s) pendente(s)` },
          { bar:'var(--g3)', ic:'var(--g7)', icon:'✅', label:'Total recolhido', value:brl(totalPago), sub:`${impostos.filter(i=>i.status==='pago').length} item(s) pagos` },
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
          <span className="table-title">Impostos a recolher</span>
          <button className="btn btn-primary btn-sm" onClick={()=>abrir()}>+ Novo imposto</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Competência</th><th>Tipo</th><th>Base de cálculo</th><th>Alíquota</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {impostos.length===0 ? (
                <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon">🧾</div><h4>Nenhum imposto cadastrado</h4><p>Registre os impostos a recolher por competência</p></div></td></tr>
              ) : impostos.map(i => (
                <tr key={i.id} className={i.status==='pendente'&&i.vencimento<hoje()?'row-alert':''}>
                  <td className="mono">{fmtMes(i.competencia)}</td>
                  <td><span className="badge badge-emit">{i.tipo}</span></td>
                  <td className="mono">{i.base_calculo?brl(i.base_calculo):'—'}</td>
                  <td className="mono">{i.aliquota?i.aliquota+'%':'—'}</td>
                  <td className="mono" style={{ fontWeight:700, color:'var(--red-d)' }}>{brl(i.valor)}</td>
                  <td className="mono">{fmtData(i.vencimento)}</td>
                  <td><span className={`badge ${i.status==='pago'?'badge-ok':'badge-emit'}`}>{i.status==='pago'?'✓ Pago':'Pendente'}</span></td>
                  <td style={{ display:'flex', gap:4, paddingTop:6 }}>
                    {i.status==='pendente'&&<button className="btn btn-primary btn-xs" onClick={()=>marcarPago(i.id)}>✓ Pago</button>}
                    <button className="btn btn-ghost btn-xs" onClick={()=>abrir(i)}>✏️</button>
                    <button className="btn btn-danger btn-xs" onClick={()=>excluir(i.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editando?'Editar imposto':'Novo imposto'}
        footer={<><button className="btn btn-ghost" onClick={()=>setModalOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={salvar} disabled={loading}>{loading?<><span className="spinner spinner-sm"/> Salvando…</>:'Salvar'}</button></>}>
        <div className="form-grid">
          <div className="field"><label>Competência *</label><input type="month" value={form.competencia} onChange={e=>setForm(f=>({...f,competencia:e.target.value}))}/></div>
          <div className="field"><label>Tipo *</label>
            <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value,aliquota:ALIQUOTAS[e.target.value]||''}))}>
              {TIPOS_IMP.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field"><label>Base de cálculo (R$)</label><input type="number" value={form.base_calculo} onChange={e=>setForm(f=>({...f,base_calculo:e.target.value}))} step="0.01" placeholder="0,00"/></div>
          <div className="field"><label>Alíquota (%)</label><input type="number" value={form.aliquota} onChange={e=>setForm(f=>({...f,aliquota:e.target.value}))} step="0.01" placeholder="0,00"/></div>
          <div className="field"><label>Valor a recolher (R$) *</label><input type="number" className="inp-money" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} step="0.01" placeholder="0,00"/></div>
          <div className="field"><label>Vencimento</label><input type="date" value={form.vencimento} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))}/></div>
          <div className="field form-full"><label>Observações</label><textarea value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} rows={2}/></div>
        </div>
        <button className="btn btn-outline btn-sm" style={{ marginTop:10 }} onClick={calcularAutomatico}>🧮 Calcular automaticamente com base nas NFs</button>
      </Modal>
    </div>
  )
}
