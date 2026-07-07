import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, fmtData, fmtMes } from '../lib/helpers'

export function Comprovante() {
  const [comp, setComp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) { setErro('Token não informado.'); setLoading(false); return }
    supabase
      .from('comprovantes')
      .select('*')
      .eq('token', token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setErro('Comprovante não encontrado.'); setLoading(false); return }
        setComp(data)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F8FAFC' }}>
      <div className="spinner spinner-lg"/>
    </div>
  )

  if (erro) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F8FAFC' }}>
      <div style={{ textAlign:'center', color:'#64748B' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
        <h2 style={{ color:'#1E293B', marginBottom:8 }}>Comprovante não encontrado</h2>
        <p>{erro}</p>
      </div>
    </div>
  )

  const link = window.location.href

  return (
    <div style={{ minHeight:'100vh', background:'#F1F5F9', padding:'32px 16px', fontFamily:'Inter,sans-serif' }}>
      <div style={{ maxWidth:560, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ background:'#0D3D20', borderRadius:'16px 16px 0 0', padding:'28px 32px', color:'#fff' }}>
          <div style={{ fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,.5)', marginBottom:6 }}>
            AunordMED Financeiro
          </div>
          <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Comprovante de Repasse</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>
            {fmtMes(comp.competencia)} · Gerado em {fmtData(comp.criado_em)}
          </div>
        </div>

        {/* Corpo */}
        <div style={{ background:'#fff', padding:'28px 32px', borderLeft:'1px solid #E2E8F0', borderRight:'1px solid #E2E8F0' }}>
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:10, letterSpacing:1, textTransform:'uppercase', color:'#94A3B8', marginBottom:4 }}>Médico</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#0F172A' }}>{comp.medico_nome}</div>
            {comp.medico_crm && <div style={{ fontSize:12, color:'#64748B' }}>CRM {comp.medico_crm}</div>}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
            {[
              { label:'Tomador', value: comp.tomador || '—' },
              { label:'Competência', value: fmtMes(comp.competencia) },
              { label:'NF', value: comp.dados_extras?.nf || '—' },
              { label:'Data pagamento', value: comp.data_pagamento ? fmtData(comp.data_pagamento) : '—' },
            ].map((item, i) => (
              <div key={i} style={{ background:'#F8FAFC', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:10, letterSpacing:.8, textTransform:'uppercase', color:'#94A3B8', marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'#1E293B' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Valor destaque */}
          <div style={{ background:'#F0FDF4', border:'2px solid #BBF7D0', borderRadius:12, padding:'20px 24px', textAlign:'center', marginBottom:24 }}>
            <div style={{ fontSize:11, letterSpacing:1, textTransform:'uppercase', color:'#16A34A', marginBottom:6 }}>Valor do repasse</div>
            <div style={{ fontSize:32, fontWeight:800, color:'#0D3D20', fontFamily:'monospace' }}>
              {brl(comp.valor_repasse)}
            </div>
          </div>

          {/* PIX */}
          {comp.dados_extras?.pix && (
            <div style={{ background:'#F8FAFC', borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
              <div style={{ fontSize:10, letterSpacing:.8, textTransform:'uppercase', color:'#94A3B8', marginBottom:4 }}>Chave PIX</div>
              <div style={{ fontSize:13, fontWeight:600, color:'#1E293B', fontFamily:'monospace' }}>
                {comp.dados_extras.tipo_pix?.toUpperCase()}: {comp.dados_extras.pix}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderTop:'none', borderRadius:'0 0 16px 16px', padding:'16px 32px', textAlign:'center' }}>
          <div style={{ fontSize:11, color:'#94A3B8' }}>
            AunordMED Financeiro · Gestão financeira médica
          </div>
          <div style={{ fontSize:10, color:'#CBD5E1', marginTop:4, fontFamily:'monospace', wordBreak:'break-all' }}>
            {link}
          </div>
        </div>
      </div>
    </div>
  )
}
