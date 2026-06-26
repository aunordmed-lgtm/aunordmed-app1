import { useState, useMemo } from 'react'
import { brl, fmtMes } from '../lib/helpers'

export function DRE({ notas, contas=[], impostos=[] }) {
  const [tipo, setTipo] = useState('mes')
  const [mes, setMes] = useState(new Date().toISOString().substring(0,7))
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')

  const filtrar = (arr, campo='comp') => {
    if(tipo==='todos') return arr
    if(tipo==='mes') return arr.filter(n=>n[campo]===mes||n[campo]?.startsWith(mes))
    return arr.filter(n=>{ const k=n[campo]; if(!k)return false; if(de&&k<de)return false; if(ate&&k>ate)return false; return true })
  }

  const notasF = useMemo(()=>filtrar(notas), [notas,tipo,mes,de,ate])
  const contasF = useMemo(()=>filtrar(contas,'competencia'), [contas,tipo,mes,de,ate])
  const impostosF = useMemo(()=>filtrar(impostos,'competencia'), [impostos,tipo,mes,de,ate])

  const receita = notasF.reduce((a,n)=>a+(n.recebido||0),0)
  const repasses = notasF.reduce((a,n)=>a+(n.total_repasse||0),0)
  const lucBruto = receita - repasses
  const outrasDesp = contasF.filter(c=>c.tipo==='pagar'&&c.status==='pago').reduce((a,c)=>a+c.valor,0)
  const impostoVal = impostosF.filter(i=>i.status==='pago').reduce((a,i)=>a+i.valor,0)
  const lucLiquido = lucBruto - outrasDesp - impostoVal
  const margem = receita>0?lucLiquido/receita:0

  const periodo = tipo==='todos'?'Todos os períodos':tipo==='mes'?fmtMes(mes):`${fmtMes(de)} a ${fmtMes(ate)}`

  const Row = ({label,value,bold,indent,positive,negative,total}) => (
    <div className={`dre-row${total?' total':''}`}>
      <span style={{ fontWeight:bold?600:400, paddingLeft:indent?16:0, color:total?'var(--gray0)':'var(--gray1)', fontSize:13 }}>{label}</span>
      <span className="dre-val" style={{ fontWeight:bold||total?700:400, color:positive?'var(--g2)':negative?'var(--red-d)':'var(--gray0)' }}>{brl(value)}</span>
    </div>
  )

  return (
    <div className="page-content">
      <div className="card" style={{ marginBottom:14 }}>
        <div className="card-body">
          <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div className="field"><label>Período</label>
              <select style={{ height:36 }} value={tipo} onChange={e=>setTipo(e.target.value)}>
                <option value="mes">Mês</option><option value="intervalo">Intervalo</option><option value="todos">Todos</option>
              </select>
            </div>
            {tipo==='mes'&&<div className="field"><label>Mês</label><input type="month" style={{ height:36 }} value={mes} onChange={e=>setMes(e.target.value)}/></div>}
            {tipo==='intervalo'&&<><div className="field"><label>De</label><input type="month" style={{ height:36 }} value={de} onChange={e=>setDe(e.target.value)}/></div><div className="field"><label>Até</label><input type="month" style={{ height:36 }} value={ate} onChange={e=>setAte(e.target.value)}/></div></>}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div className="card">
          <div className="card-header"><h3>📑 DRE — {periodo}</h3></div>
          <div className="card-body" style={{ padding:'8px 0' }}>
            <div className="dre-section">
              <div className="dre-title">Receita operacional</div>
              <Row label="Receita bruta (NFs emitidas)" value={notasF.reduce((a,n)=>a+(n.bruto||0),0)} />
              <Row label="(−) Impostos sobre serviço" value={notasF.reduce((a,n)=>a+(n.bruto||0)*0.0615,0)} indent negative />
              <Row label="Receita líquida (recebido)" value={receita} bold positive total />
            </div>
            <div className="dre-section" style={{ marginTop:8 }}>
              <div className="dre-title">Custos</div>
              <Row label="Repasses aos médicos" value={repasses} negative />
              <Row label="Lucro bruto" value={lucBruto} bold positive={lucBruto>=0} negative={lucBruto<0} total />
            </div>
            <div className="dre-section" style={{ marginTop:8 }}>
              <div className="dre-title">Despesas operacionais</div>
              <Row label="Outras despesas (contas pagas)" value={outrasDesp} negative />
              <Row label="Impostos recolhidos" value={impostoVal} negative />
            </div>
            <div className="dre-section" style={{ marginTop:8 }}>
              <div className="dre-title">Resultado</div>
              <Row label="Lucro líquido" value={lucLiquido} bold positive={lucLiquido>=0} negative={lucLiquido<0} total />
              <Row label="Margem líquida" value={receita>0?lucLiquido/receita*100:0} />
            </div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { label:'Receita líquida', value:receita, bar:'var(--g3)', ic:'var(--g7)', icon:'💰' },
            { label:'Total repasses', value:repasses, bar:'var(--orange)', ic:'var(--orange-l)', icon:'👨‍⚕️' },
            { label:'Despesas operacionais', value:outrasDesp+impostoVal, bar:'var(--red)', ic:'var(--red-l)', icon:'📤' },
            { label:'Lucro líquido', value:lucLiquido, bar:lucLiquido>=0?'var(--g3)':'var(--red)', ic:lucLiquido>=0?'var(--g8)':'var(--red-l)', icon:'📈' },
          ].map((k,i) => (
            <div key={i} className="kpi">
              <div className="kpi-bar" style={{ background:k.bar }} />
              <div className="kpi-icon" style={{ background:k.ic }}>{k.icon}</div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ color:i===3?(lucLiquido>=0?'var(--g2)':'var(--red-d)'):'var(--gray0)' }}>{brl(k.value)}</div>
            </div>
          ))}
          <div className="card" style={{ padding:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--gray3)', textTransform:'uppercase', letterSpacing:.4, marginBottom:8 }}>Margem líquida</div>
            <div style={{ fontSize:32, fontWeight:700, fontFamily:'var(--mono)', color:margem>=0?'var(--g2)':'var(--red-d)' }}>{(margem*100).toFixed(1)}%</div>
            <div style={{ fontSize:11, color:'var(--gray3)', marginTop:4 }}>Lucro líquido sobre receita</div>
          </div>
        </div>
      </div>
    </div>
  )
}
