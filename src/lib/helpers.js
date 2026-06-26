export const brl = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const pct = (v) =>
  (Number(v || 0) * 100).toFixed(2).replace('.', ',') + '%'

export const fmtMes = (m) => {
  if (!m) return '—'
  const [y, mo] = m.split('-')
  const ms = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${ms[+mo - 1]}/${y}`
}

export const fmtData = (d) => {
  if (!d) return '—'
  const p = d.split('T')[0].split('-')
  return `${p[2]}/${p[1]}/${p[0]}`
}

export const initials = (n) =>
  (n || '').split(' ').filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('')

export const avatarColor = (n) => {
  const cs = ['#22994D','#1A56DB','#D97706','#7C3AED','#DB2777','#0891B2','#B45309','#BE185D']
  let h = 0
  for (let c of (n || '')) h = (h * 31 + c.charCodeAt(0)) % cs.length
  return cs[Math.abs(h)]
}

export const uid = () =>
  Math.random().toString(36).substring(2, 10) + Date.now().toString(36)

export const pad = (n) => String(n).padStart(3, '0')

export const mesAtual = () => new Date().toISOString().substring(0, 7)

export const hoje = () => new Date().toISOString().split('T')[0]
