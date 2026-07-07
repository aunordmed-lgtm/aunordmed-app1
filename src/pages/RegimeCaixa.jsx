import { useMemo, useState, useRef } from 'react'

const brl = v => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtMes = m => {
  if (!m) return '—'
  const [y, mo] = m.split('-')
  const ms = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${ms[+mo - 1]}/${y}`
}
const fmtDt = d => {
  if (!d) return '—'
  const p = d.split('T')[0].split('-')
  return `${p[2]}/${p[1]}/${p[0]}`
}

const G = { g1: '#0D3D20', g2: '#145C30', g3: '#1A7A3E', g4: '#22994D', g6: '#A8DCBA', g7: '#E8F5ED' }
const GRAY = { 0: '#0F172A', 1: '#1E293B', 2: '#475569', 3: '#94A3B8', 5: '#E2E8F0', 6: '#F1F5F9' }
const RED = '#DC2626'
const ORANGE = '#D97706'

const cardStyle = { background: '#fff', border: '1px solid #D4E6DA', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }
const inputStyle = { border: '1.5px solid ' + GRAY[5], borderRadius: 10, padding: '0 12px', fontSize: 13, color: GRAY[0], background: GRAY[6], height: 38, minWidth: 160 }
const labelStyle = { fontSize: 10, fontWeight: 700, color: GRAY[2], textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5, display: 'block' }
const thStyle = { padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: G.g6, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px 14px', borderBottom: '1px solid ' + GRAY[6], fontSize: 12.5, whiteSpace: 'nowrap' }
const btnPrimary = { height: 38, padding: '0 16px', borderRadius: 10, border: 'none', background: G.g3, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnGhost = { height: 38, padding: '0 16px', borderRadius: 10, border: '1px solid #D4E6DA', background: GRAY[6], color: GRAY[1], fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const badge = (bg, color, border) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: 10.5, fontWeight: 700, background: bg, color, border: '1px solid ' + border })

function Kpi({ label, value, sub, color }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px' }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 700, fontFamily: 'monospace', color: color || GRAY[0] }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: GRAY[3], marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Parser OFX (mesmo formato usado no ExtratoOFX.jsx, Banco Inter / SGML Latin-1) ──
function parseOFX(text) {
  const transacoes = []
  const blocos = text.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) || []
  blocos.forEach((bloco, i) => {
    const get = (tag) => {
      const match = bloco.match(new RegExp(`<${tag}>([^<\r\n]+)`, 'i'))
      return match ? match[1].trim() : ''
    }
    const tipo = get('TRNTYPE').toUpperCase()
    const valorStr = get('TRNAMT').replace(',', '.')
    const valor = parseFloat(valorStr) || 0
    const dtRaw = get('DTPOSTED')
    const memo = get('MEMO') || get('NAME') || ''
    const nome = get('NAME') || ''
    const fitid = get('FITID') || `T${i}`
    let data = ''
    if (dtRaw.length >= 8) data = `${dtRaw.substring(0, 4)}-${dtRaw.substring(4, 6)}-${dtRaw.substring(6, 8)}`
    if (valor !== 0) {
      transacoes.push({
        id: fitid, valor, data,
        memo: memo.replace(/["]/g, '').trim(),
        nome: nome.trim(),
        tipo: valor > 0 ? 'credito' : 'debito',
        trntype: tipo,
      })
    }
  })
  return transacoes
}

function normalizar(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Cruza débitos do extrato (dinheiro saindo p/ médicos) com comprovantes já lançados
function cruzarDebitosComComprovantes(transacoes, comprovantes) {
  const MARGEM = 0.02
  const debitos = transacoes.filter(t => t.tipo === 'debito')
  const usados = new Set()

  const linhas = debitos.map(t => {
    const valorAbs = Math.abs(t.valor)
    const nomeNorm = normalizar(t.nome || t.memo)

    // candidatos por valor dentro da margem
    const candidatos = comprovantes
      .map((c, idx) => ({ c, idx }))
      .filter(({ c, idx }) => {
        if (usados.has(idx)) return false
        const diff = Math.abs((c.valor_repasse || 0) - valorAbs)
        return diff <= Math.max(MARGEM, valorAbs * 0.005)
      })

    let melhor = null
    if (candidatos.length === 1) {
      melhor = candidatos[0]
    } else if (candidatos.length > 1) {
      // desempate: nome do médico aparece na descrição do banco
      melhor = candidatos.find(({ c }) => nomeNorm.includes(normalizar(c.medico_nome).split(' ')[0])) || candidatos[0]
    }

    if (melhor) usados.add(melhor.idx)
    const comp = melhor?.c || null

    let status = 'sem_comprovante'
    let diffDias = null
    if (comp) {
      if (comp.data_pagamento && t.data) {
        const d1 = new Date(comp.data_pagamento), d2 = new Date(t.data)
        diffDias = Math.round((d2 - d1) / 86400000)
        status = diffDias === 0 ? 'ok' : 'data_divergente'
      } else {
        status = 'sem_data_sistema'
      }
    }

    return { transacao: t, comprovante: comp, status, diffDias }
  })

  // Comprovantes dentro do período do extrato que não bateram com nenhuma transação
  const datasExtrato = transacoes.map(t => t.data).filter(Boolean).sort()
  const dataMin = datasExtrato[0], dataMax = datasExtrato[datasExtrato.length - 1]
  const orfaos = comprovantes
    .map((c, idx) => ({ c, idx }))
    .filter(({ c, idx }) => !usados.has(idx) && c.data_pagamento && dataMin && dataMax && c.data_pagamento >= dataMin && c.data_pagamento <= dataMax)
    .map(({ c }) => c)

  return { linhas, orfaos }
}

function AbaExtratoOFX({ comprovantes = [] }) {
  const [loading, setLoading] = useState(false)
  const [transacoes, setTransacoes] = useState([])
  const [cruzamento, setCruzamento] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const fileRef = useRef()

  async function processarArquivo(file) {
    setLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const decoder = new TextDecoder('iso-8859-1')
      const text = decoder.decode(buffer)
      const trans = parseOFX(text)
      if (!trans.length) { alert('Nenhuma transação encontrada no extrato.'); setLoading(false); return }
      setTransacoes(trans)
      setCruzamento(cruzarDebitosComComprovantes(trans, comprovantes))
    } catch (e) {
      alert('Erro ao processar o extrato: ' + e.message)
    }
    setLoading(false)
  }

  function reiniciar() { setTransacoes([]); setCruzamento(null); if (fileRef.current) fileRef.current.value = '' }

  if (!cruzamento) {
    return (
      <div>
        <div style={{ ...cardStyle, padding: '18px 22px', marginBottom: 16, background: 'linear-gradient(135deg, #EBF5FF, #F0F9FF)', border: '1px solid #BFDBFE' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: G.g2, marginBottom: 6 }}>🏦 Cruzamento de repasses pagos com o extrato bancário</div>
          <div style={{ fontSize: 12, color: GRAY[2], lineHeight: 1.5 }}>
            Envie o mesmo arquivo OFX exportado do banco. O sistema pega os <strong>débitos</strong> (pagamentos feitos a médicos) e compara com a <strong>data de pagamento</strong> registrada em cada comprovante, por valor — sinalizando datas divergentes ou pagamentos que aparecem no banco mas não foram lançados como comprovante.
          </div>
        </div>
        <div
          style={{ border: '2px dashed #D4E6DA', borderRadius: 14, padding: 40, textAlign: 'center', cursor: 'pointer', background: GRAY[6] }}
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) processarArquivo(e.dataTransfer.files[0]) }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: GRAY[1], marginBottom: 4 }}>Arraste o extrato OFX aqui</div>
          <div style={{ fontSize: 12, color: GRAY[3] }}>ou clique para selecionar (.ofx, .qfx)</div>
        </div>
        <input ref={fileRef} type="file" accept=".ofx,.qfx,.ofc,.txt" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) processarArquivo(e.target.files[0]) }} />
        {loading && <div style={{ textAlign: 'center', padding: 20, color: GRAY[2] }}>Processando extrato...</div>}
      </div>
    )
  }

  const { linhas, orfaos } = cruzamento
  const ok = linhas.filter(l => l.status === 'ok').length
  const divergentes = linhas.filter(l => l.status === 'data_divergente').length
  const semComprovante = linhas.filter(l => l.status === 'sem_comprovante').length
  const semData = linhas.filter(l => l.status === 'sem_data_sistema').length

  const linhasFiltradas = linhas.filter(l => filtroStatus === 'todos' || l.status === filtroStatus)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <Kpi label="Datas OK" value={ok} sub="banco = sistema" color={G.g2} />
        <Kpi label="Datas divergentes" value={divergentes} sub="banco ≠ sistema" color={ORANGE} />
        <Kpi label="Sem comprovante" value={semComprovante} sub="pago no banco, não lançado" color={RED} />
        <Kpi label="Sem match no banco" value={orfaos.length} sub="lançado, não achado no extrato" color={GRAY[3]} />
      </div>

      <div style={{ ...cardStyle, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Mostrar</label>
        <select style={inputStyle} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos ({linhas.length})</option>
          <option value="ok">✓ Datas OK ({ok})</option>
          <option value="data_divergente">⚠ Datas divergentes ({divergentes})</option>
          <option value="sem_comprovante">❌ Sem comprovante ({semComprovante})</option>
          {semData > 0 && <option value="sem_data_sistema">Sem data no sistema ({semData})</option>}
        </select>
        <div style={{ flex: 1 }} />
        <button style={btnGhost} onClick={reiniciar}>⬆ Importar outro extrato</button>
      </div>

      <div style={{ ...cardStyle, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #D4E6DA', fontSize: 13, fontWeight: 600, color: GRAY[0] }}>
          Débitos do extrato × comprovantes ({linhasFiltradas.length})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead><tr style={{ background: G.g1 }}>
              <th style={thStyle}>Data (banco)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Valor (banco)</th>
              <th style={thStyle}>Descrição banco</th>
              <th style={thStyle}>Médico (comprovante)</th>
              <th style={thStyle}>Data (sistema)</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Diferença</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
            </tr></thead>
            <tbody>
              {linhasFiltradas.length === 0 && (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: GRAY[3], padding: 30 }}>Nenhum item para esse filtro.</td></tr>
              )}
              {linhasFiltradas.map((l, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{fmtDt(l.transacao.data)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>R$ {brl(Math.abs(l.transacao.valor))}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'normal', maxWidth: 220, fontSize: 11, color: GRAY[2] }} title={l.transacao.memo}>{l.transacao.memo || '—'}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'normal', fontWeight: 600 }}>{l.comprovante?.medico_nome || '—'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{l.comprovante ? fmtDt(l.comprovante.data_pagamento) : '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'monospace' }}>{l.diffDias !== null ? `${l.diffDias > 0 ? '+' : ''}${l.diffDias}d` : '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {l.status === 'ok' && <span style={badge(G.g7, G.g2, G.g6)}>✓ OK</span>}
                    {l.status === 'data_divergente' && <span style={badge('#FFFBEB', ORANGE, '#FDE68A')}>⚠ Divergente</span>}
                    {l.status === 'sem_comprovante' && <span style={badge('#FEF2F2', RED, '#FECACA')}>❌ Sem comprovante</span>}
                    {l.status === 'sem_data_sistema' && <span style={badge(GRAY[6], GRAY[2], GRAY[5])}>Sem data cadastrada</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {orfaos.length > 0 && (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #D4E6DA', fontSize: 13, fontWeight: 600, color: GRAY[0] }}>
            Comprovantes lançados no período, sem transação correspondente no extrato ({orfaos.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead><tr style={{ background: G.g1 }}>
                <th style={thStyle}>Médico</th>
                <th style={thStyle}>Data (sistema)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
                <th style={thStyle}>Tomador</th>
              </tr></thead>
              <tbody>
                {orfaos.map((c, i) => (
                  <tr key={i}>
                    <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: 'normal' }}>{c.medico_nome}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{fmtDt(c.data_pagamento)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>R$ {brl(c.valor_repasse)}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'normal' }}>{c.tomador || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export function RegimeCaixa({ notas = [], comprovantes = [], medicos = [], tomadores = [] }) {
  const [aba, setAba] = useState('caixa')
  const [fMedico, setFMedico] = useState('')
  const [fComp, setFComp] = useState('')
  const [fTomador, setFTomador] = useState('')
  const [fDataIni, setFDataIni] = useState('')
  const [fDataFim, setFDataFim] = useState('')

  const medicosOpts = useMemo(() => {
    const s = new Set(medicos.map(m => m.nome).filter(Boolean))
    notas.forEach(n => (n.medicos_nota || []).forEach(mn => mn.nome && s.add(mn.nome)))
    return [...s].sort()
  }, [medicos, notas])

  const competenciasOpts = useMemo(() => {
    const s = new Set(notas.map(n => n.comp).filter(Boolean))
    return [...s].sort().reverse()
  }, [notas])

  const tomadoresOpts = useMemo(() => {
    const s = new Set(tomadores.map(t => t.nome).filter(Boolean))
    notas.forEach(n => n.tomador && s.add(n.tomador))
    return [...s].sort()
  }, [tomadores, notas])

  const linhas = useMemo(() => {
    const out = []
    notas.forEach(n => {
      if (fTomador && n.tomador !== fTomador) return
      if (fComp && n.comp !== fComp) return
      ;(n.medicos_nota || []).forEach(mn => {
        if (fMedico && mn.nome !== fMedico) return
        out.push({
          nf: n.nf, tomador: n.tomador, comp: n.comp, status: n.status,
          medico: mn.nome, bruto: mn.valor_bruto_medico || 0, repasse: mn.repasse || 0,
        })
      })
    })
    return out
  }, [notas, fMedico, fComp, fTomador])

  const comprovantesFiltrados = useMemo(() => {
    return comprovantes.filter(c => {
      if (fMedico && c.medico_nome !== fMedico) return false
      if (fTomador && c.tomador !== fTomador) return false
      if (fComp && c.competencia !== fComp) return false
      if (fDataIni && (!c.data_pagamento || c.data_pagamento < fDataIni)) return false
      if (fDataFim && (!c.data_pagamento || c.data_pagamento > fDataFim)) return false
      return true
    })
  }, [comprovantes, fMedico, fComp, fTomador, fDataIni, fDataFim])

  const totalBruto = linhas.reduce((a, l) => a + l.bruto, 0)
  const totalDevido = linhas.reduce((a, l) => a + l.repasse, 0)
  const totalPago = comprovantesFiltrados.reduce((a, c) => a + (c.valor_repasse || 0), 0)
  const diferenca = totalPago - totalDevido

  const porMedico = useMemo(() => {
    const m = {}
    linhas.forEach(l => {
      if (!m[l.medico]) m[l.medico] = { medico: l.medico, qtdNotas: 0, bruto: 0, devido: 0, pago: 0 }
      m[l.medico].qtdNotas++
      m[l.medico].bruto += l.bruto
      m[l.medico].devido += l.repasse
    })
    comprovantesFiltrados.forEach(c => {
      const nome = c.medico_nome
      if (!nome) return
      if (!m[nome]) m[nome] = { medico: nome, qtdNotas: 0, bruto: 0, devido: 0, pago: 0 }
      m[nome].pago += c.valor_repasse || 0
    })
    return Object.values(m).sort((a, b) => a.medico.localeCompare(b.medico))
  }, [linhas, comprovantesFiltrados])

  function limparFiltros() { setFMedico(''); setFComp(''); setFTomador(''); setFDataIni(''); setFDataFim('') }

  function exportarCSV() {
    const headers = ['NF', 'Tomador', 'Competência', 'Médico', 'Bruto', 'Repasse (devido)', 'Status']
    const rows = linhas.map(l => [l.nf, l.tomador, fmtMes(l.comp), l.medico, l.bruto.toFixed(2).replace('.', ','), l.repasse.toFixed(2).replace('.', ','), l.status])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_medico_competencia_tomador.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ background: `linear-gradient(135deg, ${G.g1} 0%, ${G.g3} 100%)`, borderRadius: 20, padding: '24px 28px', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>📈 Regime de caixa</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 4, maxWidth: 620, lineHeight: 1.5 }}>
            Cruza os valores lançados nas notas fiscais com o que foi efetivamente pago aos médicos, e confere com o extrato bancário real.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #D4E6DA' }}>
          {[{ k: 'caixa', label: '📊 Regime de caixa' }, { k: 'ofx', label: '🏦 Extrato bancário (OFX)' }].map(t => (
            <button key={t.k} onClick={() => setAba(t.k)} style={{
              padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: aba === t.k ? G.g2 : GRAY[3],
              borderBottom: aba === t.k ? `2px solid ${G.g3}` : '2px solid transparent', marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {aba === 'ofx' ? (
          <AbaExtratoOFX comprovantes={comprovantes} />
        ) : (
          <>
            <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={labelStyle}>Médico</label>
                <select style={inputStyle} value={fMedico} onChange={e => setFMedico(e.target.value)}>
                  <option value="">Todos os médicos</option>
                  {medicosOpts.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Competência</label>
                <select style={inputStyle} value={fComp} onChange={e => setFComp(e.target.value)}>
                  <option value="">Todas</option>
                  {competenciasOpts.map(c => <option key={c} value={c}>{fmtMes(c)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tomador</label>
                <select style={inputStyle} value={fTomador} onChange={e => setFTomador(e.target.value)}>
                  <option value="">Todos</option>
                  {tomadoresOpts.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Pago de</label>
                <input type="date" style={inputStyle} value={fDataIni} onChange={e => setFDataIni(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Pago até</label>
                <input type="date" style={inputStyle} value={fDataFim} onChange={e => setFDataFim(e.target.value)} />
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={limparFiltros} style={btnGhost}>Limpar filtros</button>
              <button onClick={exportarCSV} style={btnPrimary}>📥 Exportar CSV</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              <Kpi label="Total bruto" value={`R$ ${brl(totalBruto)}`} sub="valor emitido nas notas" />
              <Kpi label="Total devido (repasse)" value={`R$ ${brl(totalDevido)}`} sub="segundo as notas fiscais" />
              <Kpi label="Total pago (caixa)" value={`R$ ${brl(totalPago)}`} sub="segundo os comprovantes" color={G.g2} />
              <Kpi label="Diferença" value={`${diferenca >= 0 ? '' : '-'}R$ ${brl(Math.abs(diferenca))}`} sub="pago − devido" color={Math.abs(diferenca) < 0.01 ? GRAY[3] : diferenca > 0 ? G.g2 : RED} />
            </div>

            <div style={{ ...cardStyle, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #D4E6DA', fontSize: 13, fontWeight: 600, color: GRAY[0] }}>
                Resumo por médico ({porMedico.length})
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead><tr style={{ background: G.g1 }}>
                    <th style={thStyle}>Médico</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Nº notas</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Bruto</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Devido (repasse)</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Pago (caixa)</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Diferença</th>
                  </tr></thead>
                  <tbody>
                    {porMedico.length === 0 && (
                      <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: GRAY[3], padding: 30 }}>Nenhum resultado para os filtros selecionados.</td></tr>
                    )}
                    {porMedico.map(m => {
                      const dif = m.pago - m.devido
                      return (
                        <tr key={m.medico}>
                          <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: 'normal', color: GRAY[1] }}>{m.medico}</td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'monospace' }}>{m.qtdNotas}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>R$ {brl(m.bruto)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>R$ {brl(m.devido)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>R$ {brl(m.pago)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: Math.abs(dif) < 0.01 ? GRAY[3] : dif > 0 ? G.g2 : RED }}>
                            {dif >= 0 ? '+' : '-'}R$ {brl(Math.abs(dif))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ ...cardStyle, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #D4E6DA', fontSize: 13, fontWeight: 600, color: GRAY[0] }}>
                Detalhamento por nota ({linhas.length})
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
                  <thead><tr style={{ background: G.g1 }}>
                    <th style={thStyle}>NF</th>
                    <th style={thStyle}>Tomador</th>
                    <th style={thStyle}>Competência</th>
                    <th style={thStyle}>Médico</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Bruto</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Repasse</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                  </tr></thead>
                  <tbody>
                    {linhas.length === 0 && (
                      <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: GRAY[3], padding: 30 }}>Nenhuma nota encontrada para os filtros selecionados.</td></tr>
                    )}
                    {linhas.map((l, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>{l.nf || '—'}</td>
                        <td style={{ ...tdStyle, whiteSpace: 'normal' }}>{l.tomador || '—'}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{fmtMes(l.comp)}</td>
                        <td style={{ ...tdStyle, whiteSpace: 'normal' }}>{l.medico}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>R$ {brl(l.bruto)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: G.g2 }}>R$ {brl(l.repasse)}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{l.status || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
