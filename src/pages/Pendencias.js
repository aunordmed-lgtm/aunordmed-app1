import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { brl, fmtMes } from '../lib/helpers'

export function Pendencias({ notas, adiantamentos, onRefresh }) {
  const { toast } = useToast()
  const aguardRec = useMemo(() => notas.filter(n => n.status === 'Emitida'), [notas])
  const aguardPag = useMemo(() => notas.filter(n => n.status === 'Recebida'), [notas])
  const adtPend = useMemo(() => adiantamentos.filter(a => a.status === 'pendente'), [adiantamentos])

  const marcar = async (id, status) => {
    await supabase.from('notas_fiscais').update({ status }).eq('id', id)
    toast('Status atualizado!'); onRefresh()
  }

  const tbl = (lista, tipo) => (
    <div className="table-wrap">
      <table>
        <thead><tr>
          <th>NF</th><th>Tomador</th><th>Médicos</th><th>Competência</th>
          <th>{tipo === 'rec' ? 'A receber' : 'A pagar'}</th><th>Ação</th>
        </tr></thead>
        <tbody>
          {lista.length === 0 ? (
            <tr><td colSpan={6}><div className="empty-state" style={{ padding: '1.5rem' }}><div className="empty-icon">{tipo === 'rec' ? '✅' : '💚'}</div><h4>Nenhuma pendência</h4></div></td></tr>
          ) : lista.map(n => (
            <tr key={n.id}>
              <td className="mono" style={{ fontWeight: 600 }}>{n.nf || '—'}</td>
              <td>{n.tomador || '—'}</td>
              <td style={{ fontSize: 11 }}>{n.nomes_medicos || '—'}</td>
              <td className="mono">{fmtMes(n.comp)}</td>
              <td className="mono" style={{ fontWeight: 700, color: tipo === 'rec' ? 'var(--orange-d)' : 'var(--blue-d)' }}>
                {brl(tipo === 'rec' ? n.bruto : n.total_repasse || 0)}
              </td>
              <td>
                <button className="btn btn-sm" style={{ background: tipo === 'rec' ? 'var(--orange-d)' : 'var(--blue-d)', color: '#fff', fontSize: 11 }}
                  onClick={() => marcar(n.id, tipo === 'rec' ? 'Recebida' : 'Paga ao médico')}>
                  {tipo === 'rec' ? '✓ Marcar recebido' : '✓ Marcar pago'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="page-content">
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        {[
          { bar: 'var(--orange)', ic: 'var(--orange-l)', icon: '⏳', label: 'A receber do tomador', value: brl(aguardRec.reduce((a,n)=>a+n.bruto,0)), sub: `${aguardRec.length} nota(s)` },
          { bar: 'var(--blue)', ic: 'var(--blue-l)', icon: '💳', label: 'A pagar aos médicos', value: brl(aguardPag.reduce((a,n)=>a+(n.total_repasse||0),0)), sub: `${aguardPag.length} nota(s)` },
          { bar: 'var(--purple)', ic: 'var(--purple-l)', icon: '💵', label: 'Adiantamentos pendentes', value: brl(adtPend.reduce((a,n)=>a+n.valor,0)), sub: `${adtPend.length} item(s)` },
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="card-header" style={{ borderLeft: '4px solid var(--orange)', borderRadius: '0 var(--radius-lg) 0 0' }}>
            <h3>⏳ A receber do tomador</h3>
            <span className="nav-badge" style={{ background: 'var(--orange)' }}>{aguardRec.length}</span>
          </div>
          {tbl(aguardRec, 'rec')}
        </div>
        <div className="card">
          <div className="card-header" style={{ borderLeft: '4px solid var(--blue)', borderRadius: '0 var(--radius-lg) 0 0' }}>
            <h3>💳 A pagar aos médicos</h3>
            <span className="nav-badge" style={{ background: 'var(--blue)' }}>{aguardPag.length}</span>
          </div>
          {tbl(aguardPag, 'pag')}
        </div>
      </div>
    </div>
  )
}
