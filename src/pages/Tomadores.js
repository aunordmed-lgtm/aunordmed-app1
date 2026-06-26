import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { brl } from '../lib/helpers'

export function Tomadores({ tomadores=[], notas, onRefresh }) {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ nome:'', cnpj:'', contato:'', email:'', telefone:'', obs:'' })

  const abrir = (t=null) => {
    setEditando(t)
    setForm(t?{nome:t.nome||'',cnpj:t.cnpj||'',contato:t.contato||'',email:t.email||'',telefone:t.telefone||'',obs:t.obs||''}:{nome:'',cnpj:'',contato:'',email:'',telefone:'',obs:''})
    setModalOpen(true)
  }

  const salvar = async () => {
    if(!form.nome) { toast('Preencha o nome.','error'); return }
    setLoading(true)
    try {
      if(editando) { await supabase.from('tomadores').update(form).eq('id',editando.id); toast('Atualizado!') }
      else { await supabase.from('tomadores').insert(form); toast('Tomador cadastrado!') }
      setModalOpen(false); onRefresh()
    } catch(e) { toast('Erro: '+e.message,'error') }
    setLoading(false)
  }

  const excluir = async (id) => {
    if(!window.confirm('Excluir este tomador?')) return
    await supabase.from('tomadores').delete().eq('id',id)
    toast('Removido.'); onRefresh()
  }

  const getStats = (nome) => {
    const nfs = notas.filter(n=>n.tomador===nome)
    return { count:nfs.length, total:nfs.reduce((a,n)=>a+n.bruto,0) }
  }

  return (
    <div className="page-content">
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
        <button className="btn btn-primary" onClick={()=>abrir()}>+ Cadastrar tomador</button>
      </div>
      <div className="card">
        <div className="table-wrap"><table>
          <thead><tr><th>Nome</th><th>CNPJ</th><th>Contato</th><th>NFs</th><th>Total emitido</th><th>Ações</th></tr></thead>
          <tbody>
            {tomadores.length===0?(<tr><td colSpan={6}><div className="empty-state"><div className="empty-icon">🏥</div><h4>Nenhum tomador cadastrado</h4><p>Cadastre planos de saúde e clientes</p></div></td></tr>)
            :tomadores.map(t=>{
              const s = getStats(t.nome)
              return (
                <tr key={t.id}>
                  <td style={{ fontWeight:500 }}>{t.nome}</td>
                  <td className="mono">{t.cnpj||'—'}</td>
                  <td>{t.contato||t.email||t.telefone||'—'}</td>
                  <td className="mono">{s.count}</td>
                  <td className="mono" style={{ fontWeight:700, color:'var(--g2)' }}>{brl(s.total)}</td>
                  <td style={{ display:'flex', gap:4, paddingTop:6 }}>
                    <button className="btn btn-ghost btn-xs" onClick={()=>abrir(t)}>✏️</button>
                    <button className="btn btn-danger btn-xs" onClick={()=>excluir(t.id)}>✕</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
      </div>
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editando?'Editar tomador':'Cadastrar tomador'}
        footer={<><button className="btn btn-ghost" onClick={()=>setModalOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={salvar} disabled={loading}>{loading?<><span className="spinner spinner-sm"/> Salvando…</>:'Salvar'}</button></>}>
        <div className="form-grid">
          {[['nome','Nome *','text','Unimed Sergipe'],['cnpj','CNPJ','text','00.000.000/0001-00'],['contato','Contato','text','Nome do responsável'],['email','E-mail','email',''],['telefone','Telefone','text','']].map(([k,l,t,p])=>(
            <div key={k} className="field"><label>{l}</label><input type={t} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={p}/></div>
          ))}
          <div className="field form-full"><label>Observações</label><textarea value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} rows={2}/></div>
        </div>
      </Modal>
    </div>
  )
}
