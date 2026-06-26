import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { brl, initials, avatarColor } from '../lib/helpers'

export function Medicos({ medicos, notas, onRefresh }) {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState({ nome:'',crm:'',especialidade:'',email:'',telefone_whatsapp:'',retencao:'13',tipo_pix:'cpf',chave_pix:'',meta_mensal:'',obs:'' })

  const filtrados = useMemo(() => medicos.filter(m => !busca || m.nome?.toLowerCase().includes(busca.toLowerCase()) || m.crm?.toLowerCase().includes(busca.toLowerCase())), [medicos, busca])

  const abrir = (m = null) => {
    setEditando(m)
    setForm(m ? { nome:m.nome||'',crm:m.crm||'',especialidade:m.especialidade||'',email:m.email||'',telefone_whatsapp:m.telefone_whatsapp||'',retencao:m.retencao||'13',tipo_pix:m.tipo_pix||'cpf',chave_pix:m.chave_pix||'',meta_mensal:m.meta_mensal||'',obs:m.obs||'' }
      : { nome:'',crm:'',especialidade:'',email:'',telefone_whatsapp:'',retencao:'13',tipo_pix:'cpf',chave_pix:'',meta_mensal:'',obs:'' })
    setModalOpen(true)
  }

  const salvar = async () => {
    if (!form.nome || !form.retencao) { toast('Preencha nome e % de retenção.', 'error'); return }
    const payload = { ...form, retencao: parseFloat(form.retencao), meta_mensal: form.meta_mensal ? parseFloat(form.meta_mensal) : null }
    setLoading(true)
    try {
      if (editando) { await supabase.from('medicos').update(payload).eq('id', editando.id); toast('Médico atualizado!') }
      else { await supabase.from('medicos').insert(payload); toast('Médico cadastrado!') }
      setModalOpen(false); onRefresh()
    } catch (e) { toast('Erro: ' + e.message, 'error') }
    setLoading(false)
  }

  const excluir = async (id, nome) => {
    if (!window.confirm(`Excluir o médico "${nome}"?`)) return
    await supabase.from('medicos').delete().eq('id', id)
    toast('Médico removido.'); onRefresh()
  }

  const getStats = (m) => {
    const nm = notas.filter(n => n.medicos_nota?.some(mn => mn.nome === m.nome))
    const tBruto = nm.reduce((a, n) => { const mn = n.medicos_nota?.find(mn => mn.nome === m.nome); return a + (mn?.valor_bruto_medico || 0) }, 0)
    const tRep = nm.reduce((a, n) => { const mn = n.medicos_nota?.find(mn => mn.nome === m.nome); return a + (mn?.repasse || 0) }, 0)
    return { count: nm.length, tBruto, tRep }
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <input className="search-input" style={{ width: 220 }} placeholder="🔍 Buscar médico…" value={busca} onChange={e => setBusca(e.target.value)} />
        <button className="btn btn-primary" onClick={() => abrir()}>+ Cadastrar médico</button>
      </div>

      {filtrados.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">👨‍⚕️</div><h4>Nenhum médico cadastrado</h4><p>Cadastre os médicos para gerenciar retenções individuais</p></div>
      ) : (
        <div className="med-cards">
          {filtrados.map(m => {
            const s = getStats(m)
            const cor = avatarColor(m.nome)
            return (
              <div key={m.id} className="med-card">
                <div className="med-card-header">
                  <div className="avatar" style={{ width: 40, height: 40, background: cor, fontSize: 13 }}>{initials(m.nome)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--gray3)' }}>{m.crm || 'Sem CRM'}{m.especialidade ? ` · ${m.especialidade}` : ''}</div>
                  </div>
                  <span className="ret-tag">{m.retencao}%</span>
                </div>
                <div className="med-card-body">
                  {[
                    ['Notas vinculadas', s.count],
                    ['Total bruto médico', brl(s.tBruto)],
                    ['Total repasse', <span style={{ color: 'var(--g3)', fontWeight: 600 }}>{brl(s.tRep)}</span>],
                    m.meta_mensal && ['Meta mensal', brl(m.meta_mensal)],
                    m.chave_pix && ['PIX', <span className="pix-tag">{(m.tipo_pix || 'pix').toUpperCase()}: {m.chave_pix}</span>],
                    m.telefone_whatsapp && ['WhatsApp', `+${m.telefone_whatsapp}`],
                  ].filter(Boolean).map(([l, v], i) => (
                    <div key={i} className="med-stat">
                      <span className="med-stat-label">{l}</span>
                      <span className="med-stat-value">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="med-card-footer">
                  <button className="btn btn-ghost btn-xs" onClick={() => abrir(m)}>✏️ Editar</button>
                  <button className="btn btn-danger btn-xs" onClick={() => excluir(m.id, m.nome)}>✕ Excluir</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar médico' : 'Cadastrar médico'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar} disabled={loading}>{loading ? <><span className="spinner spinner-sm" /> Salvando…</> : 'Salvar'}</button>
        </>}>
        <div className="form-grid">
          {[['nome','Nome completo *','text','Dr. Nome Sobrenome'],['crm','CRM','text','CRM/SE 123456'],['especialidade','Especialidade','text','Cardiologia'],['email','E-mail','email','medico@email.com'],['telefone_whatsapp','WhatsApp *','text','5579999999999'],['retencao','% Retenção *','number','13'],['meta_mensal','Meta mensal (R$)','number','']].map(([k,l,t,p]) => (
            <div key={k} className="field">
              <label>{l}</label>
              <input type={t} value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} placeholder={p} step={t==='number'?'0.01':undefined} />
            </div>
          ))}
          <div className="field">
            <label>Tipo da chave PIX</label>
            <select value={form.tipo_pix} onChange={e => setForm(f => ({...f,tipo_pix:e.target.value}))}>
              <option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Aleatória</option>
            </select>
          </div>
          <div className="field">
            <label>Chave PIX</label>
            <input type="text" value={form.chave_pix} onChange={e => setForm(f => ({...f,chave_pix:e.target.value}))} placeholder="000.000.000-00" />
          </div>
          <div className="field form-full">
            <label>Observações</label>
            <textarea value={form.obs} onChange={e => setForm(f => ({...f,obs:e.target.value}))} rows={2} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
