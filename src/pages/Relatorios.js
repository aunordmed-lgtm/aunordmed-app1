import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { brl, pct, fmtMes } from '../lib/helpers'

export function Relatorios({ notas, medicos }) {
  const [tipo, setTipo] = useState('mes')
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7))
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')

  const notasFiltradas = useMemo(() => {
    if (tipo === 'todos') return notas
    if (tipo === 'mes') return mes ? notas.filter(n => n.comp === mes) : notas
    return notas.filter(n => {
      if (!n.comp) return false
      if (de && n.comp < de) return false
      if (ate && n.comp > ate) return false
      return true
    })
  }, [notas, tipo, mes, de, ate])

  const periodo = tipo === 'todos' ? '(todos os períodos)' : tipo === 'mes' ? `em ${fmtMes(mes)}` : de && ate ? `de ${fmtMes(de)} até ${fmtMes(ate)}` : ''

  const faturaram = useMemo(() => {
    const s = new Set()
    notasFiltradas.forEach(n => n.medicos_nota?.forEach(mn => s.add(mn.nome)))
    return s
  }, [notasFiltradas])

  const naoFaturaram = useMemo(() => medicos.filter(m => !faturaram.has(m.nome)), [medicos, faturaram])

  const totais = useMemo(() => notasFiltradas.reduce((a, n) => ({
    bruto: a.bruto + (n.bruto || 0),
    recebido: a.recebido + (n.recebido || 0),
    margem: a.margem + (n.margem || 0),
  }), { bruto: 0, recebido: 0, margem: 0 }), [notasFiltradas])

  const getStatsMed = (nome) => {
    const nfs = notasFiltradas.filter(n => n.medicos_nota?.some(mn => mn.nome === nome))
    const tot = nfs.reduce((a, n) => { const mn = n.medicos_nota?.find(mn => mn.nome === nome); return a + (mn?.valor_bruto_medico || 0) }, 0)
    const rep = nfs.reduce((a, n) => { const mn = n.medicos_nota?.find(mn => mn.nome === nome); return a + (mn?.repasse || 0) }, 0)
    return { count: nfs.length, tot, rep }
  }

  const exportar = () => {
    const rows = [['Médico', 'CRM', 'Qtd NFs', 'Total bruto', 'Total repasse', 'Período']]
    ;[...faturaram].forEach(nome => {
      const m = medicos.find(x => x.nome === nome)
      const s = getStatsMed(nome)
      rows.push([nome, m?.crm || '', s.count, +s.tot.toFixed(2), +s.rep.toFixed(2), periodo])
    })
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
    XLSX.writeFile(wb, 'relatorio_aunordmed.xlsx')
  }

  return (
    <div className="page-content">
      {/* Filtros */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="field">
              <label>Tipo de período</label>
              <select style={{ height: 36, fontSize: 13, width: 160 }} value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="mes">Mês específico</option>
                <option value="intervalo">Intervalo</option>
                <option value="todos">Todos os períodos</option>
              </select>
            </div>
            {tipo === 'mes' && (
              <div className="field"><label>Mês/Ano</label><input type="month" style={{ height: 36, width: 150 }} value={mes} onChange={e => setMes(e.target.value)} /></div>
            )}
            {tipo === 'intervalo' && (<>
              <div className="field"><label>De</label><input type="month" style={{ height: 36, width: 140 }} value={de} onChange={e => setDe(e.target.value)} /></div>
              <div className="field"><label>Até</label><input type="month" style={{ height: 36, width: 140 }} value={ate} onChange={e => setAte(e.target.value)} /></div>
            </>)}
            <button className="btn btn-ghost btn-sm" onClick={exportar}>⬇ Exportar Excel</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 14 }}>
        {[
          { bar:'var(--g2)', ic:'var(--g7)', icon:'💰', label:'Total emitido', value:brl(totais.bruto), sub:`${notasFiltradas.length} nota(s)` },
          { bar:'var(--blue)', ic:'var(--blue-l)', icon:'📥', label:'Total recebido', value:brl(totais.recebido), sub:'Após impostos' },
          { bar:'var(--g4)', ic:'var(--g8)', icon:'📈', label:'Margem empresa', value:brl(totais.margem), sub:totais.recebido>0?pct(totais.margem/totais.recebido):'-' },
          { bar:'var(--orange)', ic:'var(--orange-l)', icon:'👨‍⚕️', label:'Médicos ativos', value:faturaram.size, sub:`de ${medicos.length} cadastrados` },
        ].map((k,i) => (
          <div key={i} className="kpi">
            <div className="kpi-bar" style={{ background: k.bar }} />
            <div className="kpi-icon" style={{ background: k.ic }}>{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabelas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="card-header" style={{ background:'var(--g7)', borderLeft:'4px solid var(--g3)' }}>
            <h3>✅ Faturaram {periodo} ({faturaram.size})</h3>
          </div>
          {faturaram.size === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}><p>Nenhum neste período</p></div>
          ) : [...faturaram].map(nome => {
            const m = medicos.find(x => x.nome === nome)
            const s = getStatsMed(nome)
            return (
              <div key={nome} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', borderBottom:'1px solid var(--gray6)', fontSize:12 }}>
                <div>
                  <div style={{ fontWeight:500, color:'var(--g2)' }}>{nome}</div>
                  <div style={{ fontSize:10, color:'var(--gray3)' }}>{m?.crm||''}{m?.especialidade?` · ${m.especialidade}`:''}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div className="mono" style={{ fontWeight:700 }}>{brl(s.tot)}</div>
                  <div style={{ fontSize:10, color:'var(--gray3)' }}>{s.count} NF(s) · Repasse: {brl(s.rep)}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="card-header" style={{ background:'var(--red-l)', borderLeft:'4px solid var(--red)' }}>
            <h3>❌ Não faturaram {periodo} ({naoFaturaram.length})</h3>
          </div>
          {naoFaturaram.length === 0 ? (
            <div className="empty-state" style={{ padding:'1.5rem' }}><div className="empty-icon">🎉</div><h4>Todos faturaram!</h4></div>
          ) : naoFaturaram.map(m => (
            <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', borderBottom:'1px solid var(--gray6)', fontSize:12 }}>
              <div>
                <div style={{ fontWeight:500, color:'var(--red-d)' }}>{m.nome}</div>
                <div style={{ fontSize:10, color:'var(--gray3)' }}>{m.crm||''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
