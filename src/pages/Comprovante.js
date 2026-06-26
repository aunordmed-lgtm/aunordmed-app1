import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { brl, fmtData, fmtMes, pad } from '../lib/helpers'

export function Comprovantes({ comprovantes=[], medicos, onRefresh }) {
  const { toast } = useToast()
  const [busca, setBusca] = useState('')
  const [modalWpp, setModalWpp] = useState(false)
  const [wppData, setWppData] = useState({ link:'', msg:'', tel:'' })
  const cfg = JSON.parse(localStorage.getItem('am_cfg4')||'{}')
  const baseUrl = cfg.baseUrl || 'https://aunordmed-lgtm.github.io/aunordmed-financeiro/comprovante.html'

  const filtrados = useMemo(() => comprovantes.filter(c =>
    !busca || c.medico_nome?.toLowerCase().includes(busca.toLowerCase())
  ), [comprovantes, busca])

  const getNumSeq = (c) => {
    const doMedico = comprovantes.filter(x=>x.medico_nome===c.medico_nome).sort((a,b)=>new Date(a.criado_em)-new Date(b.criado_em))
    const idx = doMedico.findIndex(x=>x.id===c.id)
    return idx>=0?idx+1:1
  }

  const abrirWpp = (c) => {
    const link = `${baseUrl}?token=${c.token}`
    const med = medicos.find(m=>m.nome===c.medico_nome)
    const tel = med?.telefone_whatsapp||med?.telefone||''
    const num = pad(getNumSeq(c))
    const msg = `🏥 *AunordMED Financeiro*\n\nOlá, Dr(a). *${c.medico_nome}*!\n\nSeu comprovante de repasse *#${num}* está disponível.\n\n💰 *Valor:* ${brl(c.valor_repasse)}\n📅 *Data:* ${fmtData(c.data_pagamento)}\n🏢 *Tomador:* ${c.tomador||'—'}\n📅 *Competência:* ${fmtMes(c.competencia)}\n\n📄 Acesse:\n${link}\n\n_AunordMED — Gestão financeira médica_`
    setWppData({ link, msg, tel })
    setModalWpp(true)
  }

  const copiarLink = (token) => {
    const link = `${baseUrl}?token=${token}`
    navigator.clipboard.writeText(link).then(()=>toast('Link copiado!')).catch(()=>toast('Erro ao copiar.','error'))
  }

  const enviarWpp = async () => {
    const { tel, msg } = wppData
    if(!tel) { toast('Médico sem WhatsApp cadastrado.','error'); return }
    if(cfg.wppUrl&&cfg.wppKey) {
      const r = await fetch(`${cfg.wppUrl}/message/sendText/${cfg.wppInst||'aunordmed'}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.wppKey},body:JSON.stringify({number:tel,text:msg,delay:1000})}).catch(()=>null)
      if(r?.ok) { toast('WhatsApp enviado!','wpp'); setModalWpp(false); return }
    }
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,'_blank')
    toast('Abrindo WhatsApp…','wpp')
    setModalWpp(false)
  }

  const excluir = async (id) => {
    if(!window.confirm('Excluir este comprovante? O link deixará de funcionar.')) return
    await supabase.from('comprovantes').delete().eq('id',id)
    toast('Comprovante excluído.'); onRefresh()
  }

  return (
    <div className="page-content">
      <div className="card">
        <div className="table-toolbar">
          <span className="table-title">Comprovantes gerados</span>
          <input className="search-input" placeholder="🔍 Buscar médico…" value={busca} onChange={e=>setBusca(e.target.value)}/>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>#</th><th>Seq.</th><th>Médico</th><th>NF</th><th>Tomador</th><th>Competência</th><th>Valor repasse</th><th>Data pag.</th><th>Link</th><th>WhatsApp</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtrados.length===0?(<tr><td colSpan={12}><div className="empty-state"><div className="empty-icon">🧾</div><h4>Nenhum comprovante</h4><p>São gerados automaticamente ao cadastrar notas</p></div></td></tr>)
            :filtrados.map((c,i)=>(
              <tr key={c.id}>
                <td className="mono" style={{ color:'var(--gray3)' }}>{i+1}</td>
                <td className="mono" style={{ fontWeight:700, color:'var(--g2)' }}>#{pad(getNumSeq(c))}</td>
                <td style={{ fontWeight:500, color:'var(--g2)' }}>{c.medico_nome||'—'}</td>
                <td className="mono">{c.dados_extras?.nf||'—'}</td>
                <td>{c.tomador||'—'}</td>
                <td className="mono">{fmtMes(c.competencia)}</td>
                <td className="mono" style={{ fontWeight:700, color:'var(--g2)' }}>{brl(c.valor_repasse)}</td>
                <td className="mono">{fmtData(c.data_pagamento)}</td>
                <td style={{ display:'flex', gap:4, paddingTop:6 }}>
                  <button className="btn btn-ghost btn-xs" onClick={()=>copiarLink(c.token)}>🔗 Copiar</button>
                  <button className="btn btn-ghost btn-xs" onClick={()=>window.open(`${baseUrl}?token=${c.token}`,'_blank')}>↗</button>
                </td>
                <td><button className="btn btn-wpp btn-xs" onClick={()=>abrirWpp(c)}>💬 Enviar</button></td>
                <td><span className={`badge ${c.whatsapp_enviado?'badge-ok':'badge-emit'}`}>{c.whatsapp_enviado?'✓ Enviado':'Pendente'}</span></td>
                <td><button className="btn btn-danger btn-xs" onClick={()=>excluir(c.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <Modal open={modalWpp} onClose={()=>setModalWpp(false)} title="💬 Enviar por WhatsApp"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setModalWpp(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>{navigator.clipboard.writeText(wppData.link);toast('Link copiado!')}}>🔗 Só copiar link</button>
          <button className="btn btn-wpp" onClick={enviarWpp}>💬 Enviar WhatsApp</button>
        </>}>
        <div className="field" style={{ marginBottom:10 }}>
          <label>Link do comprovante</label>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
            <input type="text" value={wppData.link} readOnly style={{ background:'var(--gray6)', fontFamily:'var(--mono)', fontSize:11 }}/>
            <button className="btn btn-ghost btn-sm" onClick={()=>{navigator.clipboard.writeText(wppData.link);toast('Copiado!')}}>Copiar</button>
          </div>
        </div>
        <div className="field">
          <label>Mensagem (editável)</label>
          <textarea style={{ marginTop:4, fontSize:12, lineHeight:1.7, height:220 }} value={wppData.msg} onChange={e=>setWppData(d=>({...d,msg:e.target.value}))}/>
        </div>
      </Modal>
    </div>
  )
}
