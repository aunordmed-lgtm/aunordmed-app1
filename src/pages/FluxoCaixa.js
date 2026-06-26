import { useMemo, useState } from 'react'
import { brl, fmtMes } from '../lib/helpers'

export function FluxoCaixa({ notas, contas = [] }) {
  const [ano, setAno] = useState(new Date().getFullYear().toString())

  const meses = useMemo(() => {
    const m = {}
    for(let i=1;i<=12;i++) {
      const k = `${ano}-${String(i).padStart(2,'0')}`
      m[k] = { mes:k, entradas:0, saidas:0, saldo:0, itens:[] }
    }
    // Notas recebidas = entradas
    notas.forEach(n => {
      if(!n.comp || !n.comp.startsWith(ano)) return
      if(n.status==='Recebida'||n.status==='Paga ao médico') {
        if(m[n.comp]) { m[n.comp].entradas += n.recebido||0; m[n.comp].itens.push({desc:`NF ${n.nf} - ${n.tomador}`, val:n.recebido||0, tipo:'entrada'}) }
      }
    })
    // Contas pagas = saídas, contas a receber = entradas
    contas.forEach(c => {
      const k = c.competencia || c.vencimento?.substring(0,7)
      if(!k || !k.startsWith(ano) || !m[k]) return
      if(c.status==='pago') {
        if(c.tipo==='pagar') { m[k].saidas += c.valor||0; m[k].itens.push({desc:c.descricao,val:c.valor||0,tipo:'saida'}) }
        else { m[k].entradas += c.valor||0; m[k].itens.push({desc:c.descricao,val:c.valor||0,tipo:'entrada'}) }
      }
    })
    // Calcular saldo
    let saldoAcum = 0
    Object.values(m).forEach(v => { v.saldo = v.entradas - v.saidas; saldoAcum += v.saldo; v.saldoAcum = saldoAcum })
    return Object.values(m)
  }, [notas, contas, ano])

  const totEntradas = meses.reduce((a,m)=>a+m.entradas,0)
  const totSaidas = meses.reduce((a,m)=>a+m.saidas,0)

  return (
    <div className="page-content">
      <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:14 }}>
        {[
          { bar:'var(--g3)', ic:'var(--g7)', icon:'📥', label:'Total entradas', value:brl(totEntradas), sub:`Ano ${ano}` },
          { bar:'var(--red)', ic:'var(--red-l)', icon:'📤', label:'Total saídas', value:brl(totSaidas), sub:`Ano ${ano}` },
          { bar: totEntradas-totSaidas>=0?'var(--g3)':'var(--red)', ic: totEntradas-totSaidas>=0?'var(--g8)':'var(--red-l)', icon:'💰', label:'Resultado', value:brl(totEntradas-totSaidas), sub:'Entradas − Saídas' },
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
        <div className="card-header">
          <h3>💰 Fluxo de caixa</h3>
          <select style={{ height:32, fontSize:12, border:'1px solid var(--border)', borderRadius:6, padding:'0 8px' }} value={ano} onChange={e=>setAno(e.target.value)}>
            {[2024,2025,2026,2027].map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Mês</th><th style={{textAlign:'right'}}>Entradas</th><th style={{textAlign:'right'}}>Saídas</th><th style={{textAlign:'right'}}>Resultado</th><th style={{textAlign:'right'}}>Saldo acumulado</th>
            </tr></thead>
            <tbody>
              {meses.map(m => (
                <tr key={m.mes}>
                  <td style={{ fontWeight:500 }}>{fmtMes(m.mes)}</td>
                  <td className="mono fluxo-entrada" style={{ textAlign:'right' }}>{m.entradas>0?brl(m.entradas):'—'}</td>
                  <td className="mono fluxo-saida" style={{ textAlign:'right' }}>{m.saidas>0?brl(m.saidas):'—'}</td>
                  <td className={`mono ${m.saldo>=0?'fluxo-entrada':'fluxo-saida'}`} style={{ textAlign:'right', fontWeight:700 }}>{m.entradas>0||m.saidas>0?brl(m.saldo):'—'}</td>
                  <td className={`mono ${m.saldoAcum>=0?'fluxo-entrada':'fluxo-saida'}`} style={{ textAlign:'right', fontWeight:700 }}>{brl(m.saldoAcum)}</td>
                </tr>
              ))}
              <tr style={{ background:'var(--g1)' }}>
                <td style={{ fontWeight:700, color:'#fff', fontSize:12 }}>TOTAL {ano}</td>
                <td className="mono" style={{ textAlign:'right', fontWeight:700, color:'var(--g5)' }}>{brl(totEntradas)}</td>
                <td className="mono" style={{ textAlign:'right', fontWeight:700, color:'#F87171' }}>{brl(totSaidas)}</td>
                <td className="mono" style={{ textAlign:'right', fontWeight:700, color: totEntradas-totSaidas>=0?'var(--g5)':'#F87171' }}>{brl(totEntradas-totSaidas)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
