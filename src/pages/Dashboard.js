import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { brl, pct, fmtMes } from '../lib/helpers'

export function Dashboard({ notas, medicos, adiantamentos, cashbacks, contas }) {
  const totais = useMemo(() => notas.reduce((a, n) => ({
    bruto: a.bruto + (n.bruto || 0),
    recebido: a.recebido + (n.recebido || 0),
    repasse: a.repasse + (n.total_repasse || 0),
    margem: a.margem + (n.margem || 0),
  }), { bruto: 0, recebido: 0, repasse: 0, margem: 0 }), [notas])

  const pm = totais.recebido > 0 ? totais.margem / totais.recebido : 0

  const byComp = useMemo(() => {
    const m = {}
    notas.forEach(n => {
      const k = fmtMes(n.comp) || 'S/D'
      if (!m[k]) m[k] = { name: k, bruto: 0, recebido: 0, repasse: 0, margem: 0 }
      m[k].bruto += n.bruto || 0
      m[k].recebido += n.recebido || 0
      m[k].repasse += n.total_repasse || 0
      m[k].margem += n.margem || 0
    })
    return Object.values(m).sort((a, b) => a.name.localeCompare(b.name))
  }, [notas])

  const emitidas = notas.filter(n => n.status === 'Emitida')
  const recebidas = notas.filter(n => n.status === 'Recebida')
  const pagas = notas.filter(n => n.status === 'Paga ao médico')
  const adtPend = adiantamentos.filter(a => a.status === 'pendente').reduce((s, a) => s + a.valor, 0)
  const cbPend = cashbacks.filter(c => c.status === 'pendente').reduce((s, c) => s + c.valor, 0)
  const contasVenc = contas?.filter(c => c.status === 'pendente' && c.vencimento <= new Date().toISOString().split('T')[0]).length || 0

  const pizzaData = [
    { name: 'Repasse médicos', value: Math.round(totais.repasse), color: '#94A3B8' },
    { name: 'Margem empresa', value: Math.round(totais.margem), color: '#22994D' },
    { name: 'Impostos', value: Math.round(totais.bruto * 0.0615), color: '#1A56DB' },
  ]

  return (
    <div className="page-content">
      {/* KPIs */}
      <div className="kpi-grid">
        {[
          { bar: '#22994D', ic: '#E8F5ED', icon: '💰', label: 'Total emitido', value: brl(totais.bruto), sub: `${notas.length} nota(s)` },
          { bar: '#1A56DB', ic: '#EBF5FF', icon: '📥', label: 'Total recebido', value: brl(totais.recebido), sub: 'Após impostos' },
          { bar: '#D97706', ic: '#FFFBEB', icon: '👨‍⚕️', label: 'Total repassado', value: brl(totais.repasse), sub: 'Repasse médicos' },
          { bar: '#22994D', ic: '#F0FFF6', icon: '📈', label: 'Margem empresa', value: brl(totais.margem), sub: pct(pm) + ' sobre recebido' },
          { bar: '#D97706', ic: '#FFFBEB', icon: '💵', label: 'Adiantamentos', value: brl(adtPend), sub: 'Pendentes' },
          { bar: '#7C3AED', ic: '#F5F3FF', icon: '🎁', label: 'Cashback', value: brl(cbPend), sub: 'Pendentes' },
        ].map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-bar" style={{ background: k.bar }} />
            <div className="kpi-icon" style={{ background: k.ic }}>{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="ss-grid">
        {[
          { cls: 'ss-emit', n: emitidas.length, label: 'Emitidas', sub: brl(emitidas.reduce((a,n)=>a+n.bruto,0)) },
          { cls: 'ss-rec', n: recebidas.length, label: 'Recebidas', sub: brl(recebidas.reduce((a,n)=>a+n.bruto,0)) },
          { cls: 'ss-pag', n: pagas.length, label: 'Pagas ao médico', sub: brl(pagas.reduce((a,n)=>a+n.bruto,0)) },
        ].map((s, i) => (
          <div key={i} className={`ss ${s.cls}`}>
            <div className="ss-num">{s.n}</div>
            <div><div className="ss-label">{s.label}</div><div className="ss-sub">{s.sub}</div></div>
          </div>
        ))}
      </div>

      {contasVenc > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#B91C1C' }}>
          ⚠️ <strong>{contasVenc}</strong> conta(s) vencida(s) ou a vencer hoje. Verifique em <strong>Contas</strong>.
        </div>
      )}

      {/* Gráficos */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><h3>📊 Bruto × Recebido × Repasse</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byComp}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'Inter' }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={v => 'R$' + (v/1000).toFixed(0) + 'k'} />
                <Tooltip formatter={v => brl(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="bruto" name="Bruto" fill="#145C30" radius={[3,3,0,0]} />
                <Bar dataKey="recebido" name="Recebido" fill="#22994D" radius={[3,3,0,0]} />
                <Bar dataKey="repasse" name="Repasse" fill="#94A3B8" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>🥧 Composição do valor bruto</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pizzaData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                  {pizzaData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={v => brl(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-full">
          <div className="card-header"><h3>📈 Evolução da margem</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={byComp}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={v => 'R$' + (v/1000).toFixed(1) + 'k'} />
                <Tooltip formatter={v => brl(v)} />
                <Line type="monotone" dataKey="margem" name="Margem" stroke="#22994D" strokeWidth={2.5} dot={{ fill: '#22994D', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
