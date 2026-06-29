import { useState, useRef } from 'react'
import { useToast } from '../components/Toast'
import { brl } from '../lib/helpers'

export function ConferenciaPDF({ notas }) {
  const { toast } = useToast()
  const [etapa, setEtapa] = useState('upload')
  const [textoManual, setTextoManual] = useState('')
  const [conferencia, setConferencia] = useState(null)
  const [competencia, setCompetencia] = useState('')
  const fileRef = useRef()

  // Parser do texto copiado do PDF
  const parsearTexto = (texto) => {
    const nfs = []
    const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean)

    // Padrão: número de 13 dígitos começando com 26
    const reNumero = /\b(26\d{11})\b/g
    const reValor = /(\d{1,3}(?:\.\d{3})*,\d{2})/g
    const reData = /(\d{2}\/\d{2}\/\d{4})/

    // Detectar competência
    const reComp = /(JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\/(\d{4})/i
    const compMatch = texto.match(reComp)
    if (compMatch) setCompetencia(compMatch[0])

    let i = 0
    while (i < linhas.length) {
      const linha = linhas[i]
      const numMatch = linha.match(/^(26\d{11})/)
      
      if (numMatch) {
        const numero = numMatch[1]
        const data = linha.match(reData)?.[1] || ''
        
        // Próxima linha pode ter tomador
        const tomador = linhas[i+1] || ''
        
        // Buscar situação e valor
        let situacao = 'Normal'
        let sltPag = ''
        let valor = 0
        
        // Verificar se é cancelada
        const linhaCompleta = linhas.slice(i, i+5).join(' ')
        if (linhaCompleta.toUpperCase().includes('CANCELADA')) situacao = 'CANCELADA'
        
        // Extrair status pagamento
        if (linhaCompleta.toUpperCase().includes('QUITADA')) sltPag = 'QUITADA'
        
        // Extrair valor (último número no formato 0.000,00)
        const valores = linhaCompleta.match(reValor)
        if (valores && valores.length > 0) {
          valor = parseFloat(valores[valores.length-1].replace(/\./g,'').replace(',','.'))
        }

        nfs.push({ numero, data, tomador: tomador.substring(0,80), situacao, sltPag, valor })
        i += 2
      } else {
        i++
      }
    }
    return nfs
  }

  const conferir = () => {
    if (!textoManual.trim()) { toast('Cole o texto do PDF primeiro.', 'error'); return }
    
    const nfsPref = parsearTexto(textoManual)
    if (!nfsPref.length) { toast('Nenhuma NFS-e encontrada. Verifique o texto colado.', 'error'); return }

    const normNum = (n) => String(n||'').replace(/\D/g,'').replace(/^0+/,'')
    const nfsNormais = nfsPref.filter(n => n.situacao !== 'CANCELADA' && n.valor > 0)
    const nfsCanceladas = nfsPref.filter(n => n.situacao === 'CANCELADA')

    const encontradas = []
    const faltando = []

    nfsNormais.forEach(nfP => {
      const numP = normNum(nfP.numero)
      const nfS = notas.find(n => normNum(n.nf) === numP)
      if (nfS) encontradas.push({ prefeitura: nfP, sistema: nfS, difValor: Math.abs((nfP.valor||0)-(nfS.bruto||0)) })
      else faltando.push(nfP)
    })

    const extras = notas.filter(nfS => !nfsNormais.find(nfP => normNum(nfP.numero) === normNum(nfS.nf)))

    setConferencia({ nfsNormais, nfsCanceladas, encontradas, faltando, extras, total: nfsPref.length })
    setEtapa('resultado')
    toast(`${nfsPref.length} NF(s) identificada(s)! ${faltando.length} faltando no sistema.`)
  }

  const reiniciar = () => { setEtapa('upload'); setTextoManual(''); setConferencia(null); setCompetencia('') }

  return (
    <div className="page-content">
      {etapa === 'upload' && (
        <>
          <div style={{ background: 'linear-gradient(135deg, var(--red-l), var(--orange-l))', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-xl)', padding: '18px 22px', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red-d)', marginBottom: 10 }}>📋 Conferência com relatório da Prefeitura de Olinda</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { n:'1', t:'Abra o PDF da prefeitura', d:'Abra o relatório DMSe no navegador ou Adobe Reader' },
                { n:'2', t:'Copie todo o texto', d:'Pressione Ctrl+A para selecionar tudo, depois Ctrl+C para copiar' },
                { n:'3', t:'Cole e confira', d:'Cole o texto abaixo e clique em Conferir — o sistema identifica as NFS-e automaticamente' },
              ].map(s => (
                <div key={s.n} style={{ background: 'rgba(255,255,255,.8)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', display: 'flex', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{s.n}</div>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--n2)', marginBottom: 2 }}>{s.t}</div><div style={{ fontSize: 11, color: 'var(--n4)' }}>{s.d}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>📄 Cole o texto do relatório da prefeitura</h3></div>
            <div className="card-body">
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Competência (opcional)</label>
                <input type="text" value={competencia} onChange={e => setCompetencia(e.target.value)} placeholder="Ex: JANEIRO/2026" style={{ width: 200 }} />
              </div>
              <div className="field">
                <label>Texto copiado do PDF <span className="req">*</span></label>
                <textarea
                  value={textoManual}
                  onChange={e => setTextoManual(e.target.value)}
                  placeholder={`Cole aqui o texto copiado do relatório DMSe da prefeitura...\n\nDica: Abra o PDF → Ctrl+A → Ctrl+C → Ctrl+V aqui`}
                  style={{ height: 280, fontSize: 11, fontFamily: 'var(--mono)', lineHeight: 1.6 }}
                />
                <div className="field-hint">
                  💡 Se o PDF não permitir copiar texto, acesse o relatório diretamente no site da prefeitura de Olinda e copie de lá.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button className="btn btn-primary" onClick={conferir} disabled={!textoManual.trim()}>
                  🔍 Conferir NFS-e
                </button>
                <button className="btn btn-ghost" onClick={() => setTextoManual('')}>
                  Limpar
                </button>
              </div>
            </div>
          </div>

          {/* Instruções alternativas */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-header"><h3>💡 Como acessar o relatório online</h3></div>
            <div className="card-body">
              <ol style={{ paddingLeft: 20, fontSize: 13, color: 'var(--n3)', lineHeight: 2 }}>
                <li>Acesse o portal da Prefeitura de Olinda</li>
                <li>Vá em <strong>DMSe → Declaração Mensal de Serviços</strong></li>
                <li>Selecione a competência desejada</li>
                <li>O relatório vai abrir no navegador (não como PDF)</li>
                <li>Pressione <strong>Ctrl+A</strong> para selecionar todo o texto</li>
                <li>Pressione <strong>Ctrl+C</strong> para copiar</li>
                <li>Cole aqui e clique em <strong>Conferir</strong></li>
              </ol>
            </div>
          </div>
        </>
      )}

      {etapa === 'resultado' && conferencia && (
        <>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--n2)' }}>
              Competência: <span style={{ color: 'var(--g3)' }}>{competencia || 'Não identificada'}</span>
              <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--n5)' }}>— {conferencia.total} NFS-e no relatório</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={reiniciar}>← Nova conferência</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { bar:'var(--g5)', ic:'var(--g10)', icon:'📄', label:'NFs normais', value:conferencia.nfsNormais.length, sub:'Na prefeitura' },
              { bar:'var(--g5)', ic:'var(--g10)', icon:'✅', label:'Encontradas', value:conferencia.encontradas.length, sub:'Já no sistema' },
              { bar:'var(--red)', ic:'var(--red-l)', icon:'❌', label:'Faltando', value:conferencia.faltando.length, sub:'Não importadas' },
              { bar:'var(--orange)', ic:'var(--orange-l)', icon:'🚫', label:'Canceladas', value:conferencia.nfsCanceladas.length, sub:'Na prefeitura' },
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

          {conferencia.faltando.length > 0 && (
            <div className="card" style={{ marginBottom: 14, border: '2px solid var(--red)' }}>
              <div className="card-header" style={{ background: 'var(--red-l)' }}>
                <h3 style={{ color: 'var(--red-d)' }}>❌ NFS-e que FALTAM no sistema ({conferencia.faltando.length})</h3>
                <span style={{ fontSize: 11, color: 'var(--red)' }}>Importe essas notas via XML ou manualmente</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Número NFS-e</th><th>Data</th><th>Tomador</th><th>Status</th><th>Valor</th></tr></thead>
                  <tbody>
                    {conferencia.faltando.map((n, i) => (
                      <tr key={i} style={{ background: '#FEF2F2' }}>
                        <td className="mono" style={{ fontWeight: 700, color: 'var(--red-d)' }}>{n.numero}</td>
                        <td className="mono">{n.data}</td>
                        <td>{n.tomador}</td>
                        <td><span className="badge badge-emit">{n.sltPag || 'Pendente'}</span></td>
                        <td className="mono" style={{ fontWeight: 600 }}>{n.valor > 0 ? brl(n.valor) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {conferencia.encontradas.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-header" style={{ background: 'var(--g10)' }}>
                <h3 style={{ color: 'var(--g2)' }}>✅ NFS-e encontradas no sistema ({conferencia.encontradas.length})</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Número</th><th>Tomador</th><th>Valor prefeitura</th><th>Valor sistema</th><th>Diferença</th><th>Status</th></tr></thead>
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
          )}

          {conferencia.nfsCanceladas.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3>🚫 NFS-e canceladas ({conferencia.nfsCanceladas.length})</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Número</th><th>Data</th><th>Tomador</th></tr></thead>
                  <tbody>
                    {conferencia.nfsCanceladas.map((n,i) => (
                      <tr key={i} style={{ opacity:.6 }}>
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
