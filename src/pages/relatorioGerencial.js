import { useState, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import { brl, pct, fmtMes, fmtData } from '../lib/helpers'

export function RelatorioGerencial({ notas, medicos, contas = [], impostos = [] }) {
  const [tipo, setTipo] = useState('mes')
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7))
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [gerado, setGerado] = useState(false)
  const printRef = useRef()

  const notasF = useMemo(() => {
    if (tipo === 'todos') return notas
    if (tipo === 'mes') return mes ? notas.filter(n => n.comp === mes) : notas
    return notas.filter(n => { if (!n.comp) return false; if (de && n.comp < de) return false; if (ate && n.comp > ate) return false; return true })
  }, [notas, tipo, mes, de, ate])

  const contasF = useMemo(() => {
    if (tipo === 'todos') return contas
    if (tipo === 'mes') return contas.filter(c => c.competencia === mes || c.vencimento?.startsWith(mes))
    return contas.filter(c => { const k = c.competencia || c.vencimento?.substring(0,7); if(!k)return false; if(de&&k<de)return false; if(ate&&k>ate)return false; return true })
  }, [contas, tipo, mes, de, ate])

  const impostosF = useMemo(() => {
    if (tipo === 'todos') return impostos
    if (tipo === 'mes') return impostos.filter(i => i.competencia === mes)
    return impostos.filter(i => { if(!i.competencia)return false; if(de&&i.competencia<de)return false; if(ate&&i.competencia>ate)return false; return true })
  }, [impostos, tipo, mes, de, ate])

  // Cálculos financeiros
  const calc = useMemo(() => {
    const totalBruto = notasF.reduce((a,n) => a + (n.bruto||0), 0)
    const totalRecebido = notasF.reduce((a,n) => a + (n.recebido||0), 0)
    const totalRepasse = notasF.reduce((a,n) => a + (n.total_repasse||0), 0)
    const totalMargem = notasF.reduce((a,n) => a + (n.margem||0), 0)
    const impostosBruto = totalBruto * 0.0615
    const impostosRecolhidos = impostosF.filter(i=>i.status==='pago').reduce((a,i)=>a+i.valor,0)
    const despesas = contasF.filter(c=>c.tipo==='pagar'&&c.status==='pago').reduce((a,c)=>a+c.valor,0)
    const lucroLiquido = totalMargem - despesas - impostosRecolhidos
    const margemLiquida = totalRecebido > 0 ? lucroLiquido / totalRecebido : 0
    const emitidas = notasF.filter(n=>n.status==='Emitida').length
    const recebidas = notasF.filter(n=>n.status==='Recebida').length
    const pagas = notasF.filter(n=>n.status==='Paga ao médico').length

    // Por médico
    const byMed = {}
    notasF.forEach(n => {
      (n.medicos_nota||[]).forEach(mn => {
        if (!byMed[mn.nome]) byMed[mn.nome] = { count:0, bruto:0, repasse:0, margem:0 }
        byMed[mn.nome].count++
        byMed[mn.nome].bruto += mn.valor_bruto_medico||0
        byMed[mn.nome].repasse += mn.repasse||0
        byMed[mn.nome].margem += (mn.valor_bruto_medico||0) * 0.0615 // aprox
      })
    })

    // Por tomador
    const byTomador = {}
    notasF.forEach(n => {
      const t = n.tomador || 'Não informado'
      if (!byTomador[t]) byTomador[t] = { count:0, bruto:0 }
      byTomador[t].count++
      byTomador[t].bruto += n.bruto||0
    })

    // Por mês (para gráfico)
    const byMes = {}
    notasF.forEach(n => {
      const k = n.comp || 'S/D'
      if (!byMes[k]) byMes[k] = { bruto:0, recebido:0, repasse:0, margem:0 }
      byMes[k].bruto += n.bruto||0
      byMes[k].recebido += n.recebido||0
      byMes[k].repasse += n.total_repasse||0
      byMes[k].margem += n.margem||0
    })

    return {
      totalBruto, totalRecebido, totalRepasse, totalMargem,
      impostosBruto, impostosRecolhidos, despesas, lucroLiquido, margemLiquida,
      emitidas, recebidas, pagas, qtdNotas: notasF.length,
      byMed: Object.entries(byMed).sort((a,b)=>b[1].bruto-a[1].bruto),
      byTomador: Object.entries(byTomador).sort((a,b)=>b[1].bruto-a[1].bruto),
      byMes: Object.entries(byMes).sort((a,b)=>a[0].localeCompare(b[0])),
      medicosMaisAtivos: medicos.length,
      naoFaturaram: medicos.filter(m => !notasF.some(n=>n.nomes_medicos?.includes(m.nome))).length,
    }
  }, [notasF, contasF, impostosF, medicos])

  const periodo = tipo==='todos'?'Todos os períodos':tipo==='mes'?fmtMes(mes):`${fmtMes(de)} a ${fmtMes(ate)}`
  const dataGeracao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new()

    // Aba 1: Resumo executivo
    const resumo = [
      ['RELATÓRIO FINANCEIRO GERENCIAL — AUNORDMED'],
      [`Período: ${periodo}`],
      [`Gerado em: ${dataGeracao}`],
      [],
      ['INDICADORES PRINCIPAIS'],
      ['Total emitido (bruto)', calc.totalBruto],
      ['Total recebido (líquido)', calc.totalRecebido],
      ['Total repassado aos médicos', calc.totalRepasse],
      ['Margem bruta da empresa', calc.totalMargem],
      ['Margem bruta (%)', calc.totalRecebido>0?calc.totalMargem/calc.totalRecebido:0],
      ['Despesas operacionais', calc.despesas],
      ['Impostos recolhidos', calc.impostosRecolhidos],
      ['Lucro líquido', calc.lucroLiquido],
      ['Margem líquida (%)', calc.margemLiquida],
      [],
      ['NOTAS FISCAIS'],
      ['Total de NFs', calc.qtdNotas],
      ['Emitidas (aguardando)', calc.emitidas],
      ['Recebidas (aguardando repasse)', calc.recebidas],
      ['Pagas ao médico', calc.pagas],
      [],
      ['MÉDICOS'],
      ['Total cadastrados', medicos.length],
      ['Sem faturamento no período', calc.naoFaturaram],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(resumo)
    ws1['!cols'] = [{wch:35},{wch:20}]
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumo Executivo')

    // Aba 2: Por médico
    const medRows = [['Médico','Qtd NFs','Total bruto','Total repasse','CRM']]
    calc.byMed.forEach(([nome,v]) => {
      const m = medicos.find(x=>x.nome===nome)
      medRows.push([nome, v.count, +v.bruto.toFixed(2), +v.repasse.toFixed(2), m?.crm||''])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(medRows), 'Por Médico')

    // Aba 3: Por tomador
    const tomRows = [['Tomador','Qtd NFs','Total bruto']]
    calc.byTomador.forEach(([t,v]) => tomRows.push([t, v.count, +v.bruto.toFixed(2)]))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tomRows), 'Por Tomador')

    // Aba 4: Por mês
    const mesRows = [['Competência','Bruto','Recebido','Repasse','Margem']]
    calc.byMes.forEach(([m,v]) => mesRows.push([fmtMes(m), +v.bruto.toFixed(2), +v.recebido.toFixed(2), +v.repasse.toFixed(2), +v.margem.toFixed(2)]))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mesRows), 'Por Competência')

    // Aba 5: Notas detalhadas
    const nfRows = [['NF','Tomador','Médicos','Competência','Emissão','Bruto','Recebido','Repasse','Margem','Status']]
    notasF.forEach(n => nfRows.push([n.nf,n.tomador,n.nomes_medicos,fmtMes(n.comp),fmtData(n.emissao),+(n.bruto||0).toFixed(2),+(n.recebido||0).toFixed(2),+(n.total_repasse||0).toFixed(2),+(n.margem||0).toFixed(2),n.status]))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(nfRows), 'Notas Detalhadas')

    XLSX.writeFile(wb, `relatorio_gerencial_aunordmed_${tipo==='mes'?mes:'periodo'}.xlsx`)
  }

  const imprimir = () => window.print()

  const Bar = ({ value, max, color = 'var(--g5)' }) => (
    <div style={{ background: 'var(--n9)', borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${max > 0 ? (value/max)*100 : 0}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .5s' }} />
    </div>
  )

  return (
    <div className="page-content">
      {/* FILTROS */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="field">
              <label>Período</label>
              <select style={{ height: 36 }} value={tipo} onChange={e => { setTipo(e.target.value); setGerado(false) }}>
                <option value="mes">Mês específico</option>
                <option value="intervalo">Intervalo</option>
                <option value="todos">Todos os períodos</option>
              </select>
            </div>
            {tipo === 'mes' && <div className="field"><label>Mês/Ano</label><input type="month" style={{ height: 36 }} value={mes} onChange={e => { setMes(e.target.value); setGerado(false) }} /></div>}
            {tipo === 'intervalo' && <>
              <div className="field"><label>De</label><input type="month" style={{ height: 36 }} value={de} onChange={e => { setDe(e.target.value); setGerado(false) }} /></div>
              <div className="field"><label>Até</label><input type="month" style={{ height: 36 }} value={ate} onChange={e => { setAte(e.target.value); setGerado(false) }} /></div>
            </>}
            <button className="btn btn-primary" onClick={() => setGerado(true)}>📊 Gerar relatório</button>
            {gerado && <>
              <button className="btn btn-outline" onClick={imprimir}>🖨️ Imprimir / PDF</button>
              <button className="btn btn-ghost" onClick={exportarExcel}>📊 Exportar Excel</button>
            </>}
          </div>
        </div>
      </div>

      {!gerado ? (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <div className="empty-icon">📋</div>
          <h4>Configure o período e clique em "Gerar relatório"</h4>
          <p>O relatório gerencial resume toda a situação financeira da AunordMED</p>
        </div>
      ) : (
        <div ref={printRef} id="relatorio-print">
          {/* CABEÇALHO EXECUTIVO */}
          <div style={{ background: 'linear-gradient(135deg, var(--g0) 0%, var(--g2) 100%)', borderRadius: 'var(--radius-xl)', padding: '24px 28px', marginBottom: 14, color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Relatório Financeiro Gerencial</div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -.5 }}>Aunord<span style={{ color: 'var(--g7)' }}>MED</span></div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>Período: <strong style={{ color: '#fff' }}>{periodo}</strong></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>Gerado em</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{dataGeracao}</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  {[{l:'NFs',v:calc.qtdNotas},{l:'Médicos',v:calc.byMed.length},{l:'Tomadores',v:calc.byTomador.length}].map(({l,v})=>(
                    <div key={l} style={{ background:'rgba(255,255,255,.1)', borderRadius:8, padding:'6px 12px', textAlign:'center' }}>
                      <div style={{ fontSize:18, fontWeight:800, fontFamily:'var(--mono)' }}>{v}</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:.5 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* KPIs PRINCIPAIS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { bar:'var(--g5)', ic:'var(--g10)', icon:'💰', label:'Total emitido', value:brl(calc.totalBruto), sub:`${calc.qtdNotas} nota(s)` },
              { bar:'var(--blue)', ic:'var(--blue-l)', icon:'📥', label:'Total recebido', value:brl(calc.totalRecebido), sub:`Após 6,15% impostos` },
              { bar:'var(--orange)', ic:'var(--orange-l)', icon:'👨‍⚕️', label:'Total repassado', value:brl(calc.totalRepasse), sub:`${calc.byMed.length} médico(s)` },
              { bar: calc.lucroLiquido>=0?'var(--g5)':'var(--red)', ic: calc.lucroLiquido>=0?'var(--g10)':'var(--red-l)', icon:'📈', label:'Lucro líquido', value:brl(calc.lucroLiquido), sub:pct(calc.margemLiquida)+' margem' },
            ].map((k,i)=>(
              <div key={i} className="kpi">
                <div className="kpi-bar" style={{ background:k.bar }} />
                <div className="kpi-icon" style={{ background:k.ic }}>{k.icon}</div>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value" style={{ fontSize:17 }}>{k.value}</div>
                <div className="kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* DEMONSTRATIVO + STATUS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            {/* DRE resumido */}
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <div className="card-header"><h3>📑 Demonstrativo de resultado</h3></div>
              <div style={{ padding: '8px 0' }}>
                {[
                  { label:'Receita bruta (NFs emitidas)', value:calc.totalBruto, color:'var(--n2)', indent:false },
                  { label:'(−) Impostos sobre serviço (6,15%)', value:-calc.impostosBruto, color:'var(--red-d)', indent:true },
                  { label:'= Receita líquida', value:calc.totalRecebido, color:'var(--g3)', indent:false, bold:true, bg:'var(--g10)' },
                  { label:'(−) Repasses aos médicos', value:-calc.totalRepasse, color:'var(--red-d)', indent:true },
                  { label:'= Margem bruta', value:calc.totalMargem, color:'var(--g3)', indent:false, bold:true, bg:'var(--g10)' },
                  { label:'(−) Despesas operacionais', value:-calc.despesas, color:'var(--red-d)', indent:true },
                  { label:'(−) Impostos recolhidos', value:-calc.impostosRecolhidos, color:'var(--red-d)', indent:true },
                  { label:'= Lucro líquido', value:calc.lucroLiquido, color:calc.lucroLiquido>=0?'var(--g2)':'var(--red-d)', indent:false, bold:true, bg:calc.lucroLiquido>=0?'var(--g10)':'var(--red-l)' },
                ].map((row,i)=>(
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 16px', borderRadius:row.bg?6:0, background:row.bg||'transparent', margin:row.bg?'3px 8px':0, borderBottom:!row.bg?'1px solid var(--n9)':'none' }}>
                    <span style={{ fontWeight:row.bold?700:400, paddingLeft:row.indent?16:0, fontSize:12.5, color:row.bold?'var(--n1)':'var(--n3)' }}>{row.label}</span>
                    <span style={{ fontFamily:'var(--mono)', fontWeight:row.bold?700:500, fontSize:12.5, color:row.color }}>{brl(Math.abs(row.value))}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status e indicadores */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div className="card">
                <div className="card-header"><h3>📊 Status das NFs</h3></div>
                <div className="card-body" style={{ padding:'10px 14px' }}>
                  {[
                    { label:'Emitidas', value:calc.emitidas, color:'var(--orange)', bg:'var(--orange-l)' },
                    { label:'Recebidas', value:calc.recebidas, color:'var(--blue)', bg:'var(--blue-l)' },
                    { label:'Pagas ao médico', value:calc.pagas, color:'var(--g4)', bg:'var(--g10)' },
                  ].map(s=>(
                    <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid var(--n9)', fontSize:12 }}>
                      <span style={{ color:'var(--n4)' }}>{s.label}</span>
                      <span style={{ background:s.bg, color:s.color, padding:'1px 10px', borderRadius:99, fontWeight:700, fontFamily:'var(--mono)', fontSize:11 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-header"><h3>👨‍⚕️ Médicos</h3></div>
                <div className="card-body" style={{ padding:'10px 14px' }}>
                  {[
                    { label:'Cadastrados', value:medicos.length },
                    { label:'Faturaram', value:calc.byMed.length, color:'var(--g3)' },
                    { label:'Sem faturamento', value:calc.naoFaturaram, color:'var(--red-d)' },
                  ].map(s=>(
                    <div key={s.label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--n9)', fontSize:12 }}>
                      <span style={{ color:'var(--n4)' }}>{s.label}</span>
                      <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:s.color||'var(--n2)' }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* POR MÉDICO + POR TOMADOR */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div className="card">
              <div className="card-header"><h3>👨‍⚕️ Ranking por médico</h3></div>
              <div style={{ padding:'8px 0' }}>
                {calc.byMed.length === 0 ? <div className="empty-state" style={{ padding:'1rem' }}><p>Nenhum dado</p></div>
                : calc.byMed.slice(0,8).map(([nome,v],i)=>(
                  <div key={nome} style={{ padding:'8px 16px', borderBottom:'1px solid var(--n9)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--n6)', fontFamily:'var(--mono)', width:20 }}>#{i+1}</span>
                        <span style={{ fontSize:12, fontWeight:500, color:'var(--n2)' }}>{nome}</span>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, fontFamily:'var(--mono)', color:'var(--g3)' }}>{brl(v.bruto)}</span>
                    </div>
                    <Bar value={v.bruto} max={calc.byMed[0]?.[1]?.bruto||1} color='var(--g5)' />
                    <div style={{ fontSize:10, color:'var(--n6)', marginTop:3 }}>{v.count} NF(s) · Repasse: {brl(v.repasse)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>🏥 Ranking por tomador</h3></div>
              <div style={{ padding:'8px 0' }}>
                {calc.byTomador.length === 0 ? <div className="empty-state" style={{ padding:'1rem' }}><p>Nenhum dado</p></div>
                : calc.byTomador.slice(0,8).map(([tom,v],i)=>(
                  <div key={tom} style={{ padding:'8px 16px', borderBottom:'1px solid var(--n9)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--n6)', fontFamily:'var(--mono)', width:20 }}>#{i+1}</span>
                        <span style={{ fontSize:12, fontWeight:500, color:'var(--n2)' }}>{tom}</span>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, fontFamily:'var(--mono)', color:'var(--blue)' }}>{brl(v.bruto)}</span>
                    </div>
                    <Bar value={v.bruto} max={calc.byTomador[0]?.[1]?.bruto||1} color='var(--blue)' />
                    <div style={{ fontSize:10, color:'var(--n6)', marginTop:3 }}>{v.count} NF(s)</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* EVOLUÇÃO MENSAL */}
          {calc.byMes.length > 1 && (
            <div className="card">
              <div className="card-header"><h3>📈 Evolução mensal</h3></div>
              <div style={{ padding:'8px 0' }}>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr style={{ background:'linear-gradient(90deg, var(--g1), var(--g2))' }}>
                      {['Competência','Bruto','Recebido','Repasse','Margem','% Margem'].map(h=>(
                        <th key={h} style={{ padding:'8px 14px', textAlign:h==='Competência'?'left':'right', fontSize:9, fontWeight:700, color:'var(--g8)', textTransform:'uppercase', letterSpacing:.5 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {calc.byMes.map(([m,v],i)=>(
                        <tr key={m} style={{ background:i%2?'var(--n10)':'#fff' }}>
                          <td style={{ padding:'8px 14px', fontWeight:500 }}>{fmtMes(m)}</td>
                          <td style={{ padding:'8px 14px', textAlign:'right', fontFamily:'var(--mono)', fontWeight:600 }}>{brl(v.bruto)}</td>
                          <td style={{ padding:'8px 14px', textAlign:'right', fontFamily:'var(--mono)', color:'var(--blue)' }}>{brl(v.recebido)}</td>
                          <td style={{ padding:'8px 14px', textAlign:'right', fontFamily:'var(--mono)', color:'var(--n4)' }}>{brl(v.repasse)}</td>
                          <td style={{ padding:'8px 14px', textAlign:'right', fontFamily:'var(--mono)', color:'var(--g3)', fontWeight:700 }}>{brl(v.margem)}</td>
                          <td style={{ padding:'8px 14px', textAlign:'right', fontFamily:'var(--mono)' }}>{v.recebido>0?pct(v.margem/v.recebido):'—'}</td>
                        </tr>
                      ))}
                      <tr style={{ background:'var(--g1)' }}>
                        <td style={{ padding:'8px 14px', fontWeight:700, color:'#fff', fontSize:12 }}>TOTAL</td>
                        {[calc.totalBruto, calc.totalRecebido, calc.totalRepasse, calc.totalMargem].map((v,i)=>(
                          <td key={i} style={{ padding:'8px 14px', textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, color:i===3?'var(--g7)':'rgba(255,255,255,.85)' }}>{brl(v)}</td>
                        ))}
                        <td style={{ padding:'8px 14px', textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, color:'var(--g7)' }}>{pct(calc.totalRecebido>0?calc.totalMargem/calc.totalRecebido:0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* RODAPÉ */}
          <div style={{ marginTop:16, padding:'12px 16px', background:'var(--n10)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:'var(--n5)' }}>
            <span>AunordMED Financeiro — Relatório Gerencial</span>
            <span>Gerado em {dataGeracao} · Período: {periodo}</span>
          </div>
        </div>
      )}

      {/* CSS de impressão */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #relatorio-print, #relatorio-print * { visibility: visible; }
          #relatorio-print { position: absolute; top: 0; left: 0; width: 100%; padding: 20px; }
          .page-content { padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  )
}
