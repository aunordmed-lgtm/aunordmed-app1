import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { brl, fmtData } from '../lib/helpers'

// Parser OFX
function parseOFX(text) {
  const transacoes = []
  
  // OFX pode ser XML ou formato legado SGML
  const isXML = text.trim().startsWith('<?xml') || text.includes('<OFX>')

  if (isXML) {
    // Formato XML
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/xml')
    const stmtTrns = doc.getElementsByTagName('STMTTRN')
    Array.from(stmtTrns).forEach(t => {
      const get = (tag) => t.getElementsByTagName(tag)[0]?.textContent?.trim() || ''
      const valor = parseFloat(get('TRNAMT') || '0')
      const data = get('DTPOSTED') || ''
      const memo = get('MEMO') || get('NAME') || ''
      const id = get('FITID') || ''
      if (valor !== 0) {
        transacoes.push({ id, valor, data: formatarDataOFX(data), memo, tipo: valor > 0 ? 'credito' : 'debito' })
      }
    })
  } else {
    // Formato SGML legado
    const linhas = text.split('\n').map(l => l.trim())
    let dentro = false
    let atual = {}
    linhas.forEach(linha => {
      if (linha === '<STMTTRN>') { dentro = true; atual = {} }
      else if (linha === '</STMTTRN>' && dentro) {
        if (atual.valor !== undefined) transacoes.push(atual)
        dentro = false; atual = {}
      } else if (dentro) {
        const match = linha.match(/^<(\w+)>(.*)$/)
        if (match) {
          const [, tag, val] = match
          if (tag === 'TRNAMT') atual.valor = parseFloat(val.replace(',', '.'))
          if (tag === 'DTPOSTED') atual.data = formatarDataOFX(val)
          if (tag === 'MEMO') atual.memo = val
          if (tag === 'NAME') atual.nome = val
          if (tag === 'FITID') atual.id = val
        }
      }
    })
    transacoes.forEach(t => {
      t.tipo = t.valor >= 0 ? 'credito' : 'debito'
      t.memo = t.memo || t.nome || ''
    })
  }
  return transacoes
}

function formatarDataOFX(data) {
  // OFX: YYYYMMDDHHMMSS ou YYYYMMDD
  const d = data.replace(/[^\d]/g, '').substring(0, 8)
  if (d.length >= 8) {
    return `${d.substring(0,4)}-${d.substring(4,6)}-${d.substring(6,8)}`
  }
  return data
}

function cruzar(transacoes, notas) {
  const resultado = []
  const MARGEM = 0.02 // 2% de tolerância

  transacoes.filter(t => t.tipo === 'credito').forEach(t => {
    const valorT = Math.abs(t.valor)
    
    // Procura nota com valor recebido próximo (bruto - 6,15%)
    const notaMatch = notas.find(n => {
      if (n.status === 'Paga ao médico') return false // já processada
      const recebido = n.recebido || (n.bruto * 0.9385)
      const diff = Math.abs(recebido - valorT) / valorT
      return diff <= MARGEM
    })

    resultado.push({
      transacao: t,
      nota: notaMatch || null,
      status: notaMatch ? 'encontrada' : 'nao_encontrada'
    })
  })

  return resultado
}

export function ExtratoOFX({ notas, onRefresh }) {
  const { toast } = useToast()
  const [etapa, setEtapa] = useState('upload')
  const [loading, setLoading] = useState(false)
  const [transacoes, setTransacoes] = useState([])
  const [cruzamento, setCruzamento] = useState([])
  const [resultado, setResultado] = useState(null)
  const [selecionadas, setSelecionadas] = useState(new Set())
  const fileRef = useRef()

  const processarOFX = async (file) => {
    setLoading(true)
    try {
      const text = await file.text()
      const trans = parseOFX(text)
      if (!trans.length) { toast('Nenhuma transação encontrada no extrato.', 'error'); setLoading(false); return }
      
      const cruz = cruzar(trans, notas)
      setTransacoes(trans)
      setCruzamento(cruz)
      // Selecionar automaticamente as que encontraram match
      setSelecionadas(new Set(cruz.map((c,i) => c.status === 'encontrada' ? i : -1).filter(i => i >= 0)))
      setEtapa('preview')
      const encontradas = cruz.filter(c => c.status === 'encontrada').length
      toast(`${trans.length} transação(ões) encontrada(s). ${encontradas} cruzamento(s) automático(s)!`)
    } catch(e) { toast('Erro ao processar: ' + e.message, 'error') }
    setLoading(false)
  }

  const darBaixa = async () => {
    const sels = cruzamento.filter((_, i) => selecionadas.has(i))
    if (!sels.length) { toast('Selecione ao menos um item.', 'error'); return }
    setLoading(true)
    let sucesso = 0, falhas = 0

    for (const item of sels) {
      if (!item.nota) continue
      try {
        // Marcar NF como Recebida
        await supabase.from('notas_fiscais').update({ status: 'Recebida' }).eq('id', item.nota.id)
        sucesso++
      } catch(e) { falhas++ }
    }

    setLoading(false)
    setResultado({ sucesso, falhas })
    setEtapa('resultado')
    onRefresh()
  }

  const reiniciar = () => { setEtapa('upload'); setTransacoes([]); setCruzamento([]); setResultado(null); setSelecionadas(new Set()) }
  const toggleSel = (i) => setSelecionadas(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })

  const encontradas = cruzamento.filter(c => c.status === 'encontrada').length
  const naoEncontradas = cruzamento.filter(c => c.status === 'nao_encontrada').length

  return (
    <div className="page-content">
      {etapa === 'upload' && (
        <>
          {/* INFO */}
          <div style={{ background: 'linear-gradient(135deg, var(--blue-l), var(--g10))', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-xl)', padding: '18px 22px', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--g2)', marginBottom: 8 }}>📊 Como funciona o cruzamento com extrato</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { n:'1', t:'Importe o OFX', d:'Baixe o extrato bancário em formato OFX no seu banco' },
                { n:'2', t:'Cruzamento automático', d:'O sistema compara os valores recebidos com as NFs emitidas (bruto − 6,15%)' },
                { n:'3', t:'Dê baixa', d:'Confirme os matches e marque as NFs como "Recebida" automaticamente' },
              ].map(s => (
                <div key={s.n} style={{ background: 'rgba(255,255,255,.7)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', display: 'flex', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--g4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{s.n}</div>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--n2)', marginBottom: 2 }}>{s.t}</div><div style={{ fontSize: 11, color: 'var(--n4)' }}>{s.d}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>📂 Importar extrato OFX</h3></div>
            <div className="card-body">
              <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center', cursor: 'pointer', background: 'var(--n10)', transition: 'all .2s' }}
                onClick={() => fileRef.current.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.background='var(--blue-l)' }}
                onDragLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--n10)' }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--n10)'; if(e.dataTransfer.files[0]) processarOFX(e.dataTransfer.files[0]) }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n2)', marginBottom: 4 }}>Arraste o extrato OFX aqui</div>
                <div style={{ fontSize: 12, color: 'var(--n5)', marginBottom: 12 }}>ou clique para selecionar</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {['OFX','QFX','OFC'].map(f => <span key={f} style={{ background: 'var(--blue-l)', color: 'var(--blue)', border: '1px solid #BFDBFE', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '3px 12px' }}>{f}</span>)}
                </div>
              </div>
              <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--yellow-l)', border: '1px solid #FDE68A', borderRadius: 'var(--radius-lg)', fontSize: 12, color: 'var(--yellow)' }}>
                💡 <strong>Dica:</strong> No Banco Inter, acesse Extrato → Exportar → selecione o período → formato OFX. No Bradesco, Itaú e outros bancos o processo é similar.
              </div>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".ofx,.qfx,.ofc,.txt" style={{ display: 'none' }} onChange={e => { if(e.target.files[0]) processarOFX(e.target.files[0]) }} />
          {loading && <div className="loading-full"><div className="spinner spinner-lg"/><span>Processando extrato...</span></div>}
        </>
      )}

      {etapa === 'preview' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { bar:'var(--g5)', ic:'var(--g10)', icon:'📊', label:'Transações no extrato', value:transacoes.length, sub:'Total importado' },
              { bar:'var(--blue)', ic:'var(--blue-l)', icon:'💰', label:'Créditos', value:transacoes.filter(t=>t.tipo==='credito').length, sub:brl(transacoes.filter(t=>t.tipo==='credito').reduce((a,t)=>a+t.valor,0)) },
              { bar:'var(--g5)', ic:'var(--g10)', icon:'✅', label:'NFs identificadas', value:encontradas, sub:'Match automático' },
              { bar:'var(--orange)', ic:'var(--orange-l)', icon:'❓', label:'Não identificadas', value:naoEncontradas, sub:'Verificar manualmente' },
            ].map((k,i) => (
              <div key={i} className="kpi">
                <div className="kpi-bar" style={{ background:k.bar }}/>
                <div className="kpi-icon" style={{ background:k.ic }}>{k.icon}</div>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="table-toolbar">
              <span className="table-title">Cruzamento extrato × notas fiscais</span>
              <span style={{ fontSize: 11, color:'var(--n5)' }}>Tolerância de 2% na comparação de valores</span>
              <button className="btn btn-ghost btn-sm" onClick={reiniciar}>← Voltar</button>
              <button className="btn btn-primary btn-sm" onClick={darBaixa} disabled={loading || !selecionadas.size}>
                {loading ? <><span className="spinner spinner-sm"/> Processando…</> : `✓ Dar baixa em ${selecionadas.size} NF(s)`}
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th></th>
                  <th>Data extrato</th><th>Valor extrato</th><th>Descrição</th>
                  <th>NF vinculada</th><th>Tomador</th><th>Valor NF</th><th>Status atual</th><th>Match</th>
                </tr></thead>
                <tbody>
                  {cruzamento.map((item, i) => (
                    <tr key={i} style={{ background: item.status==='encontrada'?'#F0FDF4':item.status==='nao_encontrada'?'#FFFBEB':'#fff' }}>
                      <td>
                        {item.nota && <input type="checkbox" checked={selecionadas.has(i)} onChange={() => toggleSel(i)}/>}
                      </td>
                      <td className="mono">{fmtData(item.transacao.data)}</td>
                      <td className="mono" style={{ fontWeight:700, color:'var(--g3)' }}>{brl(item.transacao.valor)}</td>
                      <td style={{ fontSize:11, color:'var(--n4)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.transacao.memo}</td>
                      <td className="mono" style={{ fontWeight:600 }}>{item.nota?.nf || '—'}</td>
                      <td style={{ fontSize:11 }}>{item.nota?.tomador || '—'}</td>
                      <td className="mono">{item.nota ? brl(item.nota.recebido || item.nota.bruto * 0.9385) : '—'}</td>
                      <td>{item.nota ? <span className={`badge ${item.nota.status==='Emitida'?'badge-emit':item.nota.status==='Recebida'?'badge-rec':'badge-ok'}`}>{item.nota.status}</span> : '—'}</td>
                      <td>
                        {item.status==='encontrada'
                          ? <span style={{ background:'var(--g10)', color:'var(--g3)', border:'1px solid var(--g8)', borderRadius:99, fontSize:10, fontWeight:700, padding:'2px 8px' }}>✓ Match</span>
                          : <span style={{ background:'var(--yellow-l)', color:'var(--yellow)', border:'1px solid #FDE68A', borderRadius:99, fontSize:10, fontWeight:700, padding:'2px 8px' }}>? Não encontrado</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {etapa === 'resultado' && resultado && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:400, gap:20 }}>
          <div style={{ fontSize:64 }}>{resultado.falhas===0?'🎉':'⚠️'}</div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--n1)', marginBottom:8 }}>Baixa realizada!</div>
            <div style={{ fontSize:14, color:'var(--n4)' }}>
              <span style={{ color:'var(--g3)', fontWeight:700 }}>{resultado.sucesso}</span> NF(s) marcadas como <strong>Recebida</strong>
              {resultado.falhas>0 && <span style={{ color:'var(--red)', fontWeight:700 }}> · {resultado.falhas} falha(s)</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-outline" onClick={reiniciar}>⬆ Importar outro extrato</button>
            <button className="btn btn-primary" onClick={() => window.location.href='/pendencias'}>📋 Ver pendências</button>
          </div>
        </div>
      )}
    </div>
  )
}
