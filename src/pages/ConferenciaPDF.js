import { useState, useRef } from 'react'
import { useToast } from '../components/Toast'
import { brl, fmtMes } from '../lib/helpers'

export function ConferenciaPDF({ notas }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [etapa, setEtapa] = useState('upload')
  const [nfsPrefeitura, setNfsPrefeitura] = useState([])
  const [conferencia, setConferencia] = useState(null)
  const [progresso, setProgresso] = useState('')
  const fileRef = useRef()

  const processarPDF = async (file) => {
    setLoading(true)
    setProgresso('Lendo PDF com IA...')
    
    try {
      // Converter PDF para base64
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      bytes.forEach(b => binary += String.fromCharCode(b))
      const base64 = btoa(binary)

      setProgresso('Extraindo notas fiscais com IA...')

      // Usar Claude API para extrair dados do PDF
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 }
              },
              {
                type: 'text',
                text: `Este é um relatório DMSe (Declaração Mensal de Serviços) da Prefeitura Municipal de Olinda.
                
Extraia TODAS as notas fiscais listadas neste documento e retorne APENAS um JSON válido no seguinte formato:
{
  "competencia": "JANEIRO/2026",
  "notas": [
    {
      "numero": "2600000000010",
      "data": "01/01/2026",
      "tomador": "HAPVIDA ASSISTENCIA MEDICA LTDA",
      "situacao": "Normal",
      "slt_pag": "QUITADA",
      "retido": "NÃO",
      "valor": 2628.00
    }
  ]
}

Regras:
- Inclua TODAS as notas, incluindo as CANCELADAS (coloque valor 0 para canceladas)
- O campo "situacao" pode ser "Normal" ou "CANCELADA"
- O campo "slt_pag" pode ser "QUITADA", "CANCELADA" ou vazio
- O campo "numero" é o número da NFS-e (ex: 2600000000010)
- Retorne APENAS o JSON, sem texto adicional`
              }
            ]
          }]
        })
      })

      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      
      setProgresso('Processando dados extraídos...')

      // Parsear JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Não foi possível extrair os dados do PDF')
      
      const resultado = JSON.parse(jsonMatch[0])
      const nfsValidas = resultado.notas.filter(n => n.situacao !== 'CANCELADA' && n.valor > 0)
      
      setNfsPrefeitura(resultado.notas)
      
      // Cruzar com notas do sistema
      setProgresso('Cruzando com notas do sistema...')
      const conferir = cruzarNotas(resultado.notas, notas)
      setConferencia({ ...conferir, competencia: resultado.competencia })
      setEtapa('resultado')
      toast(`${resultado.notas.length} NF(s) extraída(s) do PDF!`)

    } catch(e) {
      toast('Erro ao processar PDF: ' + e.message, 'error')
      console.error(e)
    }
    setLoading(false)
    setProgresso('')
  }

  const cruzarNotas = (nfsPref, nfsSistema) => {
    const normalizarNum = (n) => String(n || '').replace(/\D/g, '').replace(/^0+/, '')
    
    const nfsNormais = nfsPref.filter(n => n.situacao !== 'CANCELADA' && n.valor > 0)
    const nfsCanceladas = nfsPref.filter(n => n.situacao === 'CANCELADA')
    
    const encontradas = []
    const faltando = []
    const extras = []

    nfsNormais.forEach(nfP => {
      const numP = normalizarNum(nfP.numero)
      const nfS = nfsSistema.find(n => normalizarNum(n.nf) === numP)
      if (nfS) {
        encontradas.push({ prefeitura: nfP, sistema: nfS, difValor: Math.abs((nfP.valor || 0) - (nfS.bruto || 0)) })
      } else {
        faltando.push(nfP)
      }
    })

    nfsSistema.forEach(nfS => {
      const numS = normalizarNum(nfS.nf)
      const nfP = nfsNormais.find(n => normalizarNum(n.numero) === numS)
      if (!nfP) extras.push(nfS)
    })

    return { nfsNormais, nfsCanceladas, encontradas, faltando, extras }
  }

  const reiniciar = () => { setEtapa('upload'); setNfsPrefeitura([]); setConferencia(null) }

  return (
    <div className="page-content">
      {etapa === 'upload' && (
        <>
          <div style={{ background: 'linear-gradient(135deg, var(--red-l), var(--orange-l))', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-xl)', padding: '18px 22px', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red-d)', marginBottom: 10 }}>📋 Conferência com relatório da prefeitura</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { n:'1', t:'Baixe o relatório DMSe', d:'Na prefeitura de Olinda: DMSe → Declaração Mensal de Serviços → Exportar PDF' },
                { n:'2', t:'IA extrai as NFS-e', d:'O sistema usa inteligência artificial para ler o PDF e extrair todos os números e valores' },
                { n:'3', t:'Veja o que falta', d:'Compara com as notas do sistema e mostra quais estão faltando importar' },
              ].map(s => (
                <div key={s.n} style={{ background: 'rgba(255,255,255,.8)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', display: 'flex', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{s.n}</div>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--n2)', marginBottom: 2 }}>{s.t}</div><div style={{ fontSize: 11, color: 'var(--n4)' }}>{s.d}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>📄 Importar relatório DMSe da Prefeitura de Olinda</h3></div>
            <div className="card-body">
              <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center', cursor: 'pointer', background: 'var(--n10)', transition: 'all .2s' }}
                onClick={() => fileRef.current.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--red)'; e.currentTarget.style.background='var(--red-l)' }}
                onDragLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--n10)' }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--n10)'; if(e.dataTransfer.files[0]) processarPDF(e.dataTransfer.files[0]) }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--n2)', marginBottom: 4 }}>Arraste o PDF da prefeitura aqui</div>
                <div style={{ fontSize: 12, color: 'var(--n5)', marginBottom: 12 }}>ou clique para selecionar</div>
                <span style={{ background: 'var(--red-l)', color: 'var(--red-d)', border: '1px solid #FCA5A5', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '3px 12px' }}>PDF</span>
              </div>
              {loading && (
                <div style={{ marginTop: 16, textAlign: 'center', padding: 20 }}>
                  <div className="spinner spinner-md" style={{ margin: '0 auto 10px' }}/>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n2)', marginBottom: 4 }}>{progresso}</div>
                  <div style={{ fontSize: 11, color: 'var(--n5)' }}>A IA está lendo o PDF — isso pode levar alguns segundos...</div>
                </div>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { if(e.target.files[0]) processarPDF(e.target.files[0]) }} />
        </>
      )}

      {etapa === 'resultado' && conferencia && (
        <>
          {/* KPIs */}
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--n2)' }}>Competência: <span style={{ color: 'var(--g3)' }}>{conferencia.competencia}</span></div>
            <button className="btn btn-ghost btn-sm" onClick={reiniciar}>← Novo PDF</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { bar:'var(--g5)', ic:'var(--g10)', icon:'📄', label:'NFs na prefeitura', value:conferencia.nfsNormais.length, sub:'Notas normais' },
              { bar:'var(--g5)', ic:'var(--g10)', icon:'✅', label:'Encontradas no sistema', value:conferencia.encontradas.length, sub:'Já importadas' },
              { bar:'var(--red)', ic:'var(--red-l)', icon:'❌', label:'Faltando importar', value:conferencia.faltando.length, sub:'Não estão no sistema' },
              { bar:'var(--orange)', ic:'var(--orange-l)', icon:'⚠️', label:'Extras no sistema', value:conferencia.extras.length, sub:'Não estão na prefeitura' },
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

          {/* FALTANDO */}
          {conferencia.faltando.length > 0 && (
            <div className="card" style={{ marginBottom: 14, border: '2px solid var(--red)' }}>
              <div className="card-header" style={{ background: 'var(--red-l)' }}>
                <h3 style={{ color: 'var(--red-d)' }}>❌ NFS-e que FALTAM no sistema ({conferencia.faltando.length})</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Número NFS-e</th><th>Data</th><th>Tomador</th><th>Situação</th><th>Valor</th>
                  </tr></thead>
                  <tbody>
                    {conferencia.faltando.map((n, i) => (
                      <tr key={i} style={{ background: '#FEF2F2' }}>
                        <td className="mono" style={{ fontWeight: 700, color: 'var(--red-d)' }}>{n.numero}</td>
                        <td className="mono">{n.data}</td>
                        <td>{n.tomador}</td>
                        <td><span className="badge badge-emit">{n.slt_pag || n.situacao}</span></td>
                        <td className="mono" style={{ fontWeight: 600 }}>{brl(n.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ENCONTRADAS */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-header" style={{ background: 'var(--g10)' }}>
              <h3 style={{ color: 'var(--g2)' }}>✅ NFS-e encontradas no sistema ({conferencia.encontradas.length})</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Número NFS-e</th><th>Tomador</th><th>Valor prefeitura</th><th>Valor sistema</th><th>Diferença</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {conferencia.encontradas.map((item, i) => (
                    <tr key={i} style={{ background: item.difValor > 1 ? '#FFFBEB' : '#F0FDF4' }}>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--g3)' }}>{item.prefeitura.numero}</td>
                      <td>{item.prefeitura.tomador}</td>
                      <td className="mono">{brl(item.prefeitura.valor)}</td>
                      <td className="mono">{brl(item.sistema.bruto)}</td>
                      <td className="mono" style={{ color: item.difValor > 1 ? 'var(--orange-d)' : 'var(--g3)', fontWeight: 600 }}>
                        {item.difValor > 1 ? `⚠️ ${brl(item.difValor)}` : '✓ OK'}
                      </td>
                      <td><span className={`badge ${item.sistema.status==='Paga ao médico'?'badge-ok':item.sistema.status==='Recebida'?'badge-rec':'badge-emit'}`}>{item.sistema.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CANCELADAS */}
          {conferencia.nfsCanceladas.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3>🚫 NFS-e canceladas na prefeitura ({conferencia.nfsCanceladas.length})</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Número</th><th>Data</th><th>Tomador</th></tr></thead>
                  <tbody>
                    {conferencia.nfsCanceladas.map((n,i) => (
                      <tr key={i} style={{ opacity: .6 }}>
                        <td className="mono">{n.numero}</td>
                        <td className="mono">{n.data}</td>
                        <td>{n.tomador}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
