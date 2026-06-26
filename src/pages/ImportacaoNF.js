import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import * as XLSX from 'xlsx'
import { uid, mesAtual } from '../lib/helpers'

// Parser XML NFS-e padrão nacional (gov.br - SPED Fazenda)
function parseXMLNFSe(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const notas = []
  const erros = []

  const NS = 'http://www.sped.fazenda.gov.br/nfse'

  const getEl = (el, tag) => {
    // Tenta com namespace
    let found = el.getElementsByTagNameNS(NS, tag)
    if (found.length > 0) return found[0].textContent?.trim() || null
    // Tenta sem namespace
    found = el.getElementsByTagName(tag)
    if (found.length > 0) return found[0].textContent?.trim() || null
    return null
  }

  // Buscar elementos infNFSe
  let nfsElements = Array.from(doc.getElementsByTagNameNS(NS, 'infNFSe'))
  if (!nfsElements.length) nfsElements = Array.from(doc.getElementsByTagName('infNFSe'))
  if (!nfsElements.length) nfsElements = [doc.documentElement]

  nfsElements.forEach((el, i) => {
    try {
      // Número da NFS-e
      const numero = getEl(el, 'nNFSe') || getEl(el, 'nDFSe') || `IMPORT-${i+1}`

      // Valor do serviço (bruto)
      const valorBruto = parseFloat(
        getEl(el, 'vServ') ||
        getEl(el, 'vBC') ||
        getEl(el, 'vLiq') ||
        '0'
      )

      // Tomador
      const tomador = getEl(el, 'xNome') || 'Tomador não identificado'

      // Data de competência
      const dCompet = getEl(el, 'dCompet') || getEl(el, 'dhEmi') || getEl(el, 'dhProc') || ''
      let comp = ''
      let emissao = ''
      if (dCompet) {
        const d = new Date(dCompet)
        if (!isNaN(d)) {
          comp = d.toISOString().substring(0, 7)
          emissao = d.toISOString().split('T')[0]
        }
      }

      // Valores de impostos
      const vISSQN = parseFloat(getEl(el, 'vISSQN') || '0')
      const vLiq = parseFloat(getEl(el, 'vLiq') || '0')
      const discriminacao = getEl(el, 'xDescServ') || ''

      if (valorBruto > 0) {
        notas.push({
          nf: numero,
          tomador: tomador.substring(0, 100),
          comp,
          emissao,
          bruto: valorBruto,
          iss_retido: vISSQN,
          valor_liquido_nf: vLiq,
          discriminacao: discriminacao.substring(0, 500),
          status: 'Emitida',
          origem: 'xml'
        })
      }
    } catch (e) {
      erros.push(`Nota ${i+1}: ${e.message}`)
    }
  })

  return { notas, erros }
}

// Parser Excel/CSV
function parseExcel(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (rows.length < 2) { resolve({ notas: [], erros: ['Arquivo vazio'] }); return }

        const header = rows[0].map(h => String(h).toLowerCase().trim())
        const col = (names) => {
          for (const n of names) {
            const idx = header.findIndex(h => h.includes(n))
            if (idx >= 0) return idx
          }
          return -1
        }

        const cols = {
          nf: col(['número', 'numero', 'nf', 'nota']),
          tomador: col(['tomador', 'cliente', 'razão', 'razao', 'nome']),
          valor: col(['valor', 'bruto', 'serviço', 'servico', 'total']),
          competencia: col(['competência', 'competencia', 'período', 'periodo', 'mês', 'mes']),
          emissao: col(['emissão', 'emissao', 'data', 'dt']),
          status: col(['status', 'situação', 'situacao']),
        }

        const notas = []
        const erros = []

        rows.slice(1).forEach((row, i) => {
          if (!row.some(c => c !== '')) return
          try {
            const get = (c) => c >= 0 ? String(row[c] || '').trim() : ''
            const getNum = (c) => c >= 0 ? parseFloat(String(row[c] || '0').replace(/[^\d.,]/g,'').replace(',','.')) || 0 : 0
            const valorBruto = getNum(cols.valor)
            if (valorBruto <= 0) return
            let comp = ''
            const compRaw = get(cols.competencia)
            if (compRaw) {
              const m1 = compRaw.match(/^(\d{2})\/(\d{4})$/)
              const m2 = compRaw.match(/^(\d{4})-(\d{2})$/)
              if (m1) comp = `${m1[2]}-${m1[1]}`
              else if (m2) comp = compRaw
              else { const d = new Date(compRaw); if (!isNaN(d)) comp = d.toISOString().substring(0,7) }
            }
            let emissao = ''
            const emissaoRaw = get(cols.emissao) || row[cols.emissao]
            if (emissaoRaw instanceof Date) emissao = emissaoRaw.toISOString().split('T')[0]
            else if (emissaoRaw) { const d = new Date(emissaoRaw); if (!isNaN(d)) emissao = d.toISOString().split('T')[0] }
            notas.push({ nf: get(cols.nf) || `IMPORT-${i+1}`, tomador: get(cols.tomador) || 'Não informado', comp: comp || mesAtual(), emissao, bruto: valorBruto, status: get(cols.status) || 'Emitida', origem: 'excel' })
          } catch (e) { erros.push(`Linha ${i+2}: ${e.message}`) }
        })
        resolve({ notas, erros })
      } catch (e) { resolve({ notas: [], erros: ['Erro ao ler arquivo: ' + e.message] }) }
    }
    reader.readAsArrayBuffer(file)
  })
}

export function ImportacaoNF({ medicos, onRefresh }) {
  const { toast } = useToast()
  const [etapa, setEtapa] = useState('upload')
  const [loading, setLoading] = useState(false)
  const [notasImportadas, setNotasImportadas] = useState([])
  const [erros, setErros] = useState([])
  const [resultado, setResultado] = useState(null)
  const [medicoSelecionado, setMedicoSelecionado] = useState('')
  const [retencaoCustom, setRetencaoCustom] = useState('')
  const [selecionadas, setSelecionadas] = useState(new Set())
  const fileRef = useRef()

  const processarArquivo = async (file) => {
    setLoading(true)
    setErros([])
    setNotasImportadas([])
    try {
      let res
      if (file.name.toLowerCase().endsWith('.xml')) {
        const text = await file.text()
        res = parseXMLNFSe(text)
      } else {
        res = await parseExcel(file)
      }
      if (res.erros.length > 0) setErros(res.erros)
      if (res.notas.length > 0) {
        setNotasImportadas(res.notas)
        setSelecionadas(new Set(res.notas.map((_, i) => i)))
        setEtapa('preview')
        toast(`${res.notas.length} nota(s) identificada(s)!`)
      } else {
        toast('Nenhuma nota encontrada no arquivo.', 'error')
      }
    } catch (e) { toast('Erro ao processar: ' + e.message, 'error') }
    setLoading(false)
  }

  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processarArquivo(f) }

  const importar = async () => {
    const notasSel = notasImportadas.filter((_, i) => selecionadas.has(i))
    if (!notasSel.length) { toast('Selecione ao menos uma nota.', 'error'); return }
    const med = medicos.find(m => m.nome === medicoSelecionado)
    const retencao = parseFloat(retencaoCustom) || med?.retencao || 13
    const imposto = 0.0615
    setLoading(true)
    let sucesso = 0, falhas = 0
    for (const n of notasSel) {
      try {
        const recebido = n.bruto * (1 - imposto)
        const medicos_nota = medicoSelecionado ? [{ nome: medicoSelecionado, crm: med?.crm || '', valor_bruto_medico: n.bruto, retencao_individual: retencao, repasse: n.bruto * (1 - retencao/100) }] : []
        const totalRepasse = medicos_nota.reduce((a, m) => a + m.repasse, 0)
        const margem = recebido - totalRepasse
        const payload = { nf: n.nf, tomador: n.tomador, comp: n.comp, emissao: n.emissao, status: n.status, bruto: n.bruto, recebido, total_repasse: totalRepasse, margem, pct_margem: recebido > 0 ? margem/recebido : 0, medicos_nota: medicos_nota.length ? medicos_nota : null, nomes_medicos: medicoSelecionado || null, obs: n.discriminacao ? `Discriminação: ${n.discriminacao}` : null }
        const { data: nova } = await supabase.from('notas_fiscais').insert(payload).select().single()
        if (medicoSelecionado && nova?.id) {
          await supabase.from('comprovantes').insert({ token: uid(), nf_id: nova.id, medico_nome: medicoSelecionado, medico_crm: med?.crm || null, tomador: n.tomador, valor_repasse: n.bruto * (1 - retencao/100), competencia: n.comp, dados_extras: { nf: n.nf, pix: med?.chave_pix } })
        }
        sucesso++
      } catch (e) { falhas++ }
    }
    setLoading(false)
    setResultado({ sucesso, falhas, total: notasSel.length })
    setEtapa('resultado')
    onRefresh()
  }

  const reiniciar = () => { setEtapa('upload'); setNotasImportadas([]); setErros([]); setResultado(null); setSelecionadas(new Set()); setMedicoSelecionado(''); setRetencaoCustom('') }
  const toggleSel = (i) => { setSelecionadas(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n }) }
  const toggleTodos = () => { if (selecionadas.size === notasImportadas.length) setSelecionadas(new Set()); else setSelecionadas(new Set(notasImportadas.map((_, i) => i))) }

  return (
    <div className="page-content">
      {etapa === 'upload' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div className="card">
              <div className="card-header"><h3>📄 Importar XML — Portal Nacional NFS-e</h3></div>
              <div className="card-body">
                <p style={{ fontSize: 13, color: 'var(--n4)', marginBottom: 14, lineHeight: 1.6 }}>
                  Compatível com o padrão <strong>SPED Fazenda (gov.br)</strong> — o mesmo formato dos XMLs da prefeitura de Olinda/PE e demais municípios que usam o portal nacional.
                </p>
                <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center', cursor: 'pointer', transition: 'all .2s', background: 'var(--n10)' }}
                  onClick={() => { fileRef.current.accept='.xml'; fileRef.current.click() }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--g5)'; e.currentTarget.style.background='var(--g10)' }}
                  onDragLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--n10)' }}
                  onDrop={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--n10)'; handleDrop(e) }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🗂️</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n2)', marginBottom: 4 }}>Arraste o XML aqui</div>
                  <div style={{ fontSize: 12, color: 'var(--n5)' }}>ou clique para selecionar</div>
                  <div style={{ marginTop: 12 }}><span style={{ background: 'var(--g10)', color: 'var(--g3)', border: '1px solid var(--g8)', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '2px 10px' }}>XML</span></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>📊 Importar Excel / CSV</h3></div>
              <div className="card-body">
                <p style={{ fontSize: 13, color: 'var(--n4)', marginBottom: 14, lineHeight: 1.6 }}>
                  Importe planilhas com colunas de <strong>número, tomador, valor, competência</strong> e data de emissão. O sistema detecta os campos automaticamente.
                </p>
                <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center', cursor: 'pointer', transition: 'all .2s', background: 'var(--n10)' }}
                  onClick={() => { fileRef.current.accept='.xlsx,.xls,.csv'; fileRef.current.click() }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.background='var(--blue-l)' }}
                  onDragLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--n10)' }}
                  onDrop={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--n10)'; handleDrop(e) }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📈</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n2)', marginBottom: 4 }}>Arraste o Excel aqui</div>
                  <div style={{ fontSize: 12, color: 'var(--n5)' }}>ou clique para selecionar</div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {['XLSX','XLS','CSV'].map(f => <span key={f} style={{ background: 'var(--blue-l)', color: 'var(--blue)', border: '1px solid #BFDBFE', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '2px 10px' }}>{f}</span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>📋 Modelo de planilha Excel</h3></div>
            <div className="card-body">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ background: 'var(--g1)' }}>
                    {['Número','Tomador','Valor','Competência','Emissão','Status'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', color: 'var(--g8)', fontSize: 10, fontWeight: 700, textAlign: 'left', letterSpacing: .5 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody><tr style={{ background: 'var(--n10)' }}>
                    {['00001','Unimed Sergipe','1200,00','05/2026','15/05/2026','Emitida'].map((v,i) => (
                      <td key={i} style={{ padding: '8px 12px', color: 'var(--n4)', fontFamily: 'var(--mono)', fontSize: 11 }}>{v}</td>
                    ))}
                  </tr></tbody>
                </table>
              </div>
              <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => {
                const ws = XLSX.utils.aoa_to_sheet([['Número','Tomador','Valor','Competência','Emissão','Status'],['00001','Unimed Sergipe','1200,00','05/2026','15/05/2026','Emitida']])
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Modelo')
                XLSX.writeFile(wb, 'modelo_importacao_nf.xlsx')
                toast('Modelo baixado!')
              }}>⬇ Baixar modelo Excel</button>
            </div>
          </div>

          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { if(e.target.files[0]) processarArquivo(e.target.files[0]) }} />
          {loading && <div className="loading-full"><div className="spinner spinner-lg"/><span>Processando arquivo...</span></div>}
        </>
      )}

      {etapa === 'preview' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="card" style={{ flex: 1, minWidth: 280 }}>
              <div className="card-header"><h3>👨‍⚕️ Vincular médico (opcional)</h3></div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="field"><label>Médico responsável</label>
                    <select value={medicoSelecionado} onChange={e => setMedicoSelecionado(e.target.value)}>
                      <option value="">— sem vínculo —</option>
                      {medicos.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>% Retenção</label>
                    <input type="number" value={retencaoCustom} onChange={e => setRetencaoCustom(e.target.value)} placeholder={medicos.find(m=>m.nome===medicoSelecionado)?.retencao||'13'} step="0.01"/>
                  </div>
                </div>
              </div>
            </div>
            <div className="kpi" style={{ minWidth: 140 }}>
              <div className="kpi-bar" style={{ background: 'var(--g5)' }}/>
              <div className="kpi-label">Notas encontradas</div>
              <div className="kpi-value">{notasImportadas.length}</div>
              <div className="kpi-sub">{selecionadas.size} selecionadas</div>
            </div>
          </div>

          {erros.length > 0 && (
            <div style={{ background: 'var(--yellow-l)', border: '1px solid #FDE68A', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 12, fontSize: 12, color: 'var(--yellow)' }}>
              ⚠️ {erros.length} aviso(s): {erros.slice(0,3).join(' | ')}
            </div>
          )}

          <div className="card">
            <div className="table-toolbar">
              <span className="table-title">Notas para importar</span>
              <button className="btn btn-ghost btn-sm" onClick={toggleTodos}>{selecionadas.size === notasImportadas.length ? 'Desmarcar todas' : 'Selecionar todas'}</button>
              <button className="btn btn-ghost btn-sm" onClick={reiniciar}>← Voltar</button>
              <button className="btn btn-primary btn-sm" onClick={importar} disabled={loading || selecionadas.size === 0}>
                {loading ? <><span className="spinner spinner-sm"/> Importando…</> : `✓ Importar ${selecionadas.size} nota(s)`}
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th><input type="checkbox" checked={selecionadas.size===notasImportadas.length} onChange={toggleTodos}/></th>
                  <th>Nº NF</th><th>Tomador</th><th>Competência</th><th>Emissão</th><th>Valor bruto</th><th>Status</th><th>Origem</th>
                </tr></thead>
                <tbody>
                  {notasImportadas.map((n, i) => (
                    <tr key={i} style={{ opacity: selecionadas.has(i) ? 1 : .45 }}>
                      <td><input type="checkbox" checked={selecionadas.has(i)} onChange={() => toggleSel(i)}/></td>
                      <td className="mono" style={{ fontWeight: 600 }}>{n.nf}</td>
                      <td>{n.tomador}</td>
                      <td className="mono">{n.comp || '—'}</td>
                      <td className="mono">{n.emissao || '—'}</td>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--g3)' }}>{Number(n.bruto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td><span className="badge badge-emit">{n.status}</span></td>
                      <td><span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: n.origem==='xml'?'#EFF6FF':'#F0FDF4', color: n.origem==='xml'?'#2563EB':'#15803D', border: `1px solid ${n.origem==='xml'?'#BFDBFE':'#BBF7D0'}`, fontWeight: 700 }}>{n.origem?.toUpperCase()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {etapa === 'resultado' && resultado && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 20 }}>
          <div style={{ fontSize: 64 }}>{resultado.falhas === 0 ? '🎉' : '⚠️'}</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--n1)', marginBottom: 8 }}>Importação concluída!</div>
            <div style={{ fontSize: 14, color: 'var(--n4)' }}>
              <span style={{ color: 'var(--g3)', fontWeight: 700 }}>{resultado.sucesso}</span> nota(s) importada(s) com sucesso
              {resultado.falhas > 0 && <span style={{ color: 'var(--red)', fontWeight: 700 }}> · {resultado.falhas} falha(s)</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={reiniciar}>⬆ Importar mais</button>
            <button className="btn btn-primary" onClick={() => window.location.href = '/'}>📊 Ver dashboard</button>
          </div>
        </div>
      )}
    </div>
  )
}
