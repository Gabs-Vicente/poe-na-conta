import { QUICK_THIRD_PARTY_ID, QUICK_THIRD_PARTY_NAME, type Data, type Occurrence } from '../finance'
import { money, monthName } from './format'

export type ExportReportParams = {
  month: string
  theme: 'light' | 'dark'
  profileName?: string
  data: Data
  items: Occurrence[]
  personalTotal: number
  reimbursementTotal: number
  invoiceTotal: number
  personalValue: (occurrence: Occurrence) => number
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const sanitizeSpreadsheetText = (value: string): string => {
  const trimmed = value.trim()
  if (/^[=+\-@]/.test(trimmed)) return `'${trimmed}`
  return trimmed
}

const formatBrDate = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}/${m}/${y}`
}

const resolveParticipantsLabel = (occurrence: Occurrence, data: Data): string => {
  const names = occurrence.allocatedShares
    .filter(share => share.amount > 0)
    .map(share =>
      share.participantId === QUICK_THIRD_PARTY_ID
        ? QUICK_THIRD_PARTY_NAME
        : data.participants?.find(p => p.id === share.participantId)?.name || 'Participante',
    )
  return names.length ? names.join(', ') : '—'
}

const resolveCardLabel = (occurrence: Occurrence, data: Data): string => {
  if (!occurrence.method.startsWith('Crédito')) return '—'
  const card = data.cards.find(c => c.id === occurrence.cardId) || data.cards[0]
  return card?.name || 'Cartão'
}

const buildCategorySummary = (items: Occurrence[], data: Data, personalValue: (o: Occurrence) => number) => {
  const totalPersonal = items.reduce((sum, item) => sum + personalValue(item), 0)
  return data.categories
    .map(cat => {
      const catItems = items.filter(item => item.category === cat.id)
      const total = Math.round(catItems.reduce((sum, item) => sum + personalValue(item), 0) * 100) / 100
      const percentage = totalPersonal > 0 ? Math.round((total / totalPersonal) * 100) : 0
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color || '#6e7f72',
        count: catItems.length,
        total,
        percentage,
      }
    })
    .filter(cat => cat.total > 0)
    .sort((a, b) => b.total - a.total)
}

export const exportStyledSpreadsheet = ({
  month,
  profileName,
  data,
  items,
  personalTotal,
  reimbursementTotal,
  invoiceTotal,
  personalValue,
}: ExportReportParams): void => {
  const prettyMonth = monthName(month)
  const emittedAt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())

  const categorySummary = buildCategorySummary(items, data, personalValue)

  const rowsHtml = items
    .map((item, idx) => {
      const cat = data.categories.find(c => c.id === item.category)
      const catColor = cat?.color || '#6e7f72'
      const thirdPartyVal = Math.round(item.allocatedShares.reduce((sum, s) => sum + s.amount, 0) * 100) / 100
      const myVal = Math.round(personalValue(item) * 100) / 100
      const bg = idx % 2 === 0 ? '#ffffff' : '#f7f6f1'
      const installmentLabel = item.installments > 1 ? `Parcela ${item.part}/${item.installments}` : 'À vista'

      return `
        <tr>
          <td style="background:${bg};border:1px solid #e2dfd7;padding:8px 10px;text-align:center;color:#4e5048;font-size:10pt;">${escapeHtml(formatBrDate(item.date))}</td>
          <td style="background:${bg};border:1px solid #e2dfd7;padding:8px 12px;font-weight:600;color:#1e201c;font-size:10pt;">${escapeHtml(sanitizeSpreadsheetText(item.description))}</td>
          <td style="background:${bg};border:1px solid #e2dfd7;padding:8px 10px;color:#2b2d28;font-size:10pt;">
            <span style="color:${escapeHtml(catColor)};font-weight:700;">●</span> ${escapeHtml(sanitizeSpreadsheetText(cat?.name || 'Sem categoria'))}
          </td>
          <td style="background:${bg};border:1px solid #e2dfd7;padding:8px 10px;color:#383a34;font-size:10pt;">${escapeHtml(item.method)}</td>
          <td style="background:${bg};border:1px solid #e2dfd7;padding:8px 10px;color:#4e5048;font-size:10pt;">${escapeHtml(sanitizeSpreadsheetText(resolveCardLabel(item, data)))}</td>
          <td style="background:${bg};border:1px solid #e2dfd7;padding:8px 10px;text-align:center;color:#4e5048;font-size:10pt;">${escapeHtml(installmentLabel)}</td>
          <td style="background:${bg};border:1px solid #e2dfd7;padding:8px 10px;color:#5a5950;font-size:10pt;">${escapeHtml(sanitizeSpreadsheetText(resolveParticipantsLabel(item, data)))}</td>
          <td style="background:${bg};border:1px solid #e2dfd7;padding:8px 12px;text-align:right;color:#2c2e29;font-size:10pt;mso-number-format:'R\\$ \\#\\,\\#\\#0\\.00';">${escapeHtml(money(item.value))}</td>
          <td style="background:${bg};border:1px solid #e2dfd7;padding:8px 12px;text-align:right;color:${thirdPartyVal > 0 ? '#9a4b26' : '#8a8980'};font-size:10pt;mso-number-format:'R\\$ \\#\\,\\#\\#0\\.00';">${escapeHtml(money(thirdPartyVal))}</td>
          <td style="background:${bg};border:1px solid #e2dfd7;padding:8px 12px;text-align:right;font-weight:700;color:#1b4d32;font-size:10pt;mso-number-format:'R\\$ \\#\\,\\#\\#0\\.00';">${escapeHtml(money(myVal))}</td>
        </tr>`
    })
    .join('')

  const categoryRowsHtml = categorySummary
    .map((cat, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f7f6f1'
      return `
        <tr>
          <td colspan="3" style="background:${bg};border:1px solid #e2dfd7;padding:7px 12px;font-weight:600;color:#22241f;font-size:10pt;">
            <span style="color:${escapeHtml(cat.color)};font-weight:700;">●</span> ${escapeHtml(sanitizeSpreadsheetText(cat.name))}
          </td>
          <td colspan="2" style="background:${bg};border:1px solid #e2dfd7;padding:7px 10px;text-align:center;color:#55564e;font-size:10pt;">
            ${cat.count} ${cat.count === 1 ? 'lançamento' : 'lançamentos'}
          </td>
          <td colspan="2" style="background:${bg};border:1px solid #e2dfd7;padding:7px 10px;text-align:center;font-weight:600;color:#3d5c49;font-size:10pt;">
            ${cat.percentage}%
          </td>
          <td colspan="3" style="background:${bg};border:1px solid #e2dfd7;padding:7px 12px;text-align:right;font-weight:700;color:#1b4d32;font-size:10pt;">
            ${escapeHtml(money(cat.total))}
          </td>
        </tr>`
    })
    .join('')

  const html = `\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>Relatório ${escapeHtml(prettyMonth)}</title>
  <style>
    body, table, td, th { font-family: 'Segoe UI', Calibri, Arial, sans-serif; }
    table { border-collapse: collapse; }
  </style>
</head>
<body style="background:#f4f3ee;padding:18px;">
  <table>
    <col width="110" />
    <col width="250" />
    <col width="160" />
    <col width="150" />
    <col width="165" />
    <col width="115" />
    <col width="185" />
    <col width="145" />
    <col width="145" />
    <col width="155" />

    <tr>
      <td colspan="10" style="background:#1f2420;color:#f6d77e;padding:14px 18px;font-size:15pt;font-weight:800;letter-spacing:0.4px;border:1px solid #1f2420;">
        PÕE NA CONTA · RELATÓRIO FINANCEIRO (${escapeHtml(prettyMonth.toLocaleUpperCase('pt-BR'))})
      </td>
    </tr>
    <tr>
      <td colspan="10" style="background:#2a302b;color:#d6d5cc;padding:6px 18px;font-size:9.5pt;border:1px solid #2a302b;">
        ${profileName?.trim() ? `Espaço de ${escapeHtml(profileName.trim())} · ` : ''}Emitido em ${escapeHtml(emittedAt)} · Dados processados localmente
      </td>
    </tr>
    <tr><td colspan="10" style="height:10px;background:#f4f3ee;"></td></tr>

    <tr>
      <td colspan="3" style="background:#eaf4ee;border:1px solid #c7dfd0;padding:10px 14px;">
        <div style="font-size:8.5pt;font-weight:700;color:#355e46;text-transform:uppercase;">Gastos Pessoais (Sua Parte)</div>
        <div style="font-size:14pt;font-weight:800;color:#18492d;margin-top:3px;">${escapeHtml(money(personalTotal))}</div>
      </td>
      <td colspan="2" style="background:#fdf3ec;border:1px solid #ebd2c0;padding:10px 14px;">
        <div style="font-size:8.5pt;font-weight:700;color:#8c4828;text-transform:uppercase;">A Receber (Terceiros)</div>
        <div style="font-size:14pt;font-weight:800;color:#9a4b26;margin-top:3px;">${escapeHtml(money(reimbursementTotal))}</div>
      </td>
      <td colspan="3" style="background:#eef4f8;border:1px solid #cbdbe6;padding:10px 14px;">
        <div style="font-size:8.5pt;font-weight:700;color:#2f526b;text-transform:uppercase;">Total Movimentado (Bruto)</div>
        <div style="font-size:14pt;font-weight:800;color:#1e3f57;margin-top:3px;">${escapeHtml(money(invoiceTotal))}</div>
      </td>
      <td colspan="2" style="background:#f3f0f8;border:1px solid #d8d0e5;padding:10px 14px;">
        <div style="font-size:8.5pt;font-weight:700;color:#4f3f6e;text-transform:uppercase;">Lançamentos no Mês</div>
        <div style="font-size:14pt;font-weight:800;color:#392a57;margin-top:3px;">${items.length} ${items.length === 1 ? 'registro' : 'registros'}</div>
      </td>
    </tr>

    <tr><td colspan="10" style="height:12px;background:#f4f3ee;"></td></tr>

    <tr>
      <th style="background:#26382d;color:#ffffff;border:1px solid #26382d;padding:9px 10px;font-size:9.5pt;text-align:center;">DATA</th>
      <th style="background:#26382d;color:#ffffff;border:1px solid #26382d;padding:9px 12px;font-size:9.5pt;text-align:left;">DESCRIÇÃO</th>
      <th style="background:#26382d;color:#ffffff;border:1px solid #26382d;padding:9px 10px;font-size:9.5pt;text-align:left;">CATEGORIA</th>
      <th style="background:#26382d;color:#ffffff;border:1px solid #26382d;padding:9px 10px;font-size:9.5pt;text-align:left;">PAGAMENTO</th>
      <th style="background:#26382d;color:#ffffff;border:1px solid #26382d;padding:9px 10px;font-size:9.5pt;text-align:left;">CARTÃO / CRÉDITO</th>
      <th style="background:#26382d;color:#ffffff;border:1px solid #26382d;padding:9px 10px;font-size:9.5pt;text-align:center;">PARCELA</th>
      <th style="background:#26382d;color:#ffffff;border:1px solid #26382d;padding:9px 10px;font-size:9.5pt;text-align:left;">PARTICIPANTES</th>
      <th style="background:#26382d;color:#ffffff;border:1px solid #26382d;padding:9px 12px;font-size:9.5pt;text-align:right;">VALOR BRUTO</th>
      <th style="background:#26382d;color:#ffffff;border:1px solid #26382d;padding:9px 12px;font-size:9.5pt;text-align:right;">A RECEBER</th>
      <th style="background:#26382d;color:#ffffff;border:1px solid #26382d;padding:9px 12px;font-size:9.5pt;text-align:right;">SUA PARTE</th>
    </tr>
    ${rowsHtml || `<tr><td colspan="10" style="background:#ffffff;border:1px solid #e2dfd7;padding:16px;text-align:center;color:#7a7970;">Nenhum lançamento registrado neste período.</td></tr>`}
    <tr>
      <td colspan="7" style="background:#e8eee9;border:1px solid #c7d5cb;padding:10px 12px;font-weight:800;color:#1d2b22;font-size:10.5pt;text-align:right;">
        TOTAL DO PERÍODO (${items.length} ${items.length === 1 ? 'lançamento' : 'lançamentos'})
      </td>
      <td style="background:#e8eee9;border:1px solid #c7d5cb;padding:10px 12px;font-weight:800;color:#1d2b22;font-size:10.5pt;text-align:right;">
        ${escapeHtml(money(invoiceTotal))}
      </td>
      <td style="background:#e8eee9;border:1px solid #c7d5cb;padding:10px 12px;font-weight:800;color:#9a4b26;font-size:10.5pt;text-align:right;">
        ${escapeHtml(money(reimbursementTotal))}
      </td>
      <td style="background:#dff0e5;border:1px solid #b4d1be;padding:10px 12px;font-weight:800;color:#15472a;font-size:11pt;text-align:right;">
        ${escapeHtml(money(personalTotal))}
      </td>
    </tr>

    ${
      categorySummary.length
        ? `
    <tr><td colspan="10" style="height:16px;background:#f4f3ee;"></td></tr>
    <tr>
      <th colspan="3" style="background:#333630;color:#ffffff;border:1px solid #333630;padding:8px 12px;font-size:9.5pt;text-align:left;">RESUMO POR CATEGORIA</th>
      <th colspan="2" style="background:#333630;color:#ffffff;border:1px solid #333630;padding:8px 10px;font-size:9.5pt;text-align:center;">QUANTIDADE</th>
      <th colspan="2" style="background:#333630;color:#ffffff;border:1px solid #333630;padding:8px 10px;font-size:9.5pt;text-align:center;">PARTICIPAÇÃO</th>
      <th colspan="3" style="background:#333630;color:#ffffff;border:1px solid #333630;padding:8px 12px;font-size:9.5pt;text-align:right;">GASTO PESSOAL</th>
    </tr>
    ${categoryRowsHtml}`
        : ''
    }
  </table>
</body>
</html>`

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `poe-na-conta-relatorio-${month}.xls`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

const truncateCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
  if (ctx.measureText(text).width <= maxWidth) return text
  let end = text.length
  while (end > 1 && ctx.measureText(`${text.slice(0, end).trimEnd()}…`).width > maxWidth) {
    end -= 1
  }
  return `${text.slice(0, end).trimEnd()}…`
}

export const exportReportImage = ({
  month,
  theme,
  profileName,
  data,
  items,
  personalTotal,
  reimbursementTotal,
  invoiceTotal,
  personalValue,
}: ExportReportParams): void => {
  const isDark = theme === 'dark'
  const palette = isDark
    ? {
        bg: '#161714',
        panelBg: '#20221d',
        panelBorder: '#32352d',
        cardBg: '#262822',
        cardBorder: '#383b32',
        primaryCardBg: '#203227',
        primaryCardBorder: '#3c614b',
        textMain: '#f1efe6',
        textMuted: '#9e9d93',
        textSoft: '#c8c6bc',
        accentGreen: '#9fd4b1',
        accentOrange: '#efb08c',
        accentBlue: '#9ec5e5',
        accentPurple: '#c7b4e8',
        tableHeadBg: '#282b24',
        rowAltBg: '#242620',
        rowBorder: '#2e3029',
        barTrack: '#2f322a',
      }
    : {
        bg: '#f3f1ea',
        panelBg: '#ffffff',
        panelBorder: '#e3e0d6',
        cardBg: '#faf9f5',
        cardBorder: '#e5e2d9',
        primaryCardBg: '#eef7f1',
        primaryCardBorder: '#c5dfd0',
        textMain: '#1f211d',
        textMuted: '#78776e',
        textSoft: '#4c4d46',
        accentGreen: '#1c5636',
        accentOrange: '#9e4c25',
        accentBlue: '#274d68',
        accentPurple: '#4f3b70',
        tableHeadBg: '#f4f2ec',
        rowAltBg: '#faf9f5',
        rowBorder: '#eceae2',
        barTrack: '#eae7df',
      }

  const categorySummary = buildCategorySummary(items, data, personalValue)
  const maxVisibleRows = 30
  const visibleItems = items.slice(0, maxVisibleRows)
  const extraItemsCount = Math.max(0, items.length - visibleItems.length)
  const extraItemsPersonalSum = items.slice(maxVisibleRows).reduce((sum, item) => sum + personalValue(item), 0)

  const width = 1080
  const pad = 40
  const innerWidth = width - pad * 2
  const headerHeight = 96
  const kpiHeight = 108
  const catRowHeight = 40
  const catSectionHeight = categorySummary.length > 0 ? 74 + categorySummary.length * catRowHeight + 16 : 0
  const txRowHeight = 42
  const txRowsCount = Math.max(1, visibleItems.length) + (extraItemsCount > 0 ? 1 : 0)
  const txSectionHeight = 112 + txRowsCount * txRowHeight + 54
  const footerHeight = 46

  const totalHeight =
    pad +
    headerHeight +
    20 +
    kpiHeight +
    22 +
    (catSectionHeight > 0 ? catSectionHeight + 22 : 0) +
    txSectionHeight +
    footerHeight +
    pad

  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = totalHeight * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(scale, scale)

  // Background
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, width, totalHeight)

  // Header Panel
  let y = pad
  drawRoundedRect(ctx, pad, y, innerWidth, headerHeight, 20)
  ctx.fillStyle = palette.panelBg
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = palette.panelBorder
  ctx.stroke()

  // Brand Coin Badge
  const coinX = pad + 24
  const coinY = y + 22
  drawRoundedRect(ctx, coinX, coinY, 52, 52, 14)
  ctx.fillStyle = '#20231f'
  ctx.fill()
  ctx.fillStyle = '#e8b957'
  ctx.font = '800 24px Manrope, Segoe UI, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('$', coinX + 26, coinY + 27)

  // Title & Month
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = palette.textMuted
  ctx.font = '700 11px Inter, Segoe UI, sans-serif'
  ctx.fillText('PÕE NA CONTA · RELATÓRIO FINANCEIRO', coinX + 68, y + 36)

  const prettyMonth = monthName(month)
  const capitalizedMonth = prettyMonth.charAt(0).toUpperCase() + prettyMonth.slice(1)
  ctx.fillStyle = palette.textMain
  ctx.font = '800 26px Manrope, Segoe UI, sans-serif'
  ctx.fillText(capitalizedMonth, coinX + 68, y + 68)

  // Right Header Meta
  const emittedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())
  ctx.textAlign = 'right'
  ctx.fillStyle = palette.textSoft
  ctx.font = '600 13px Inter, Segoe UI, sans-serif'
  ctx.fillText(profileName?.trim() ? `Espaço de ${profileName.trim()}` : 'Resumo consolidado do mês', width - pad - 24, y + 42)
  ctx.fillStyle = palette.textMuted
  ctx.font = '500 12px Inter, Segoe UI, sans-serif'
  ctx.fillText(`Emitido em ${emittedDate}`, width - pad - 24, y + 64)

  // 4 KPI Cards
  y += headerHeight + 20
  const kpiGap = 14
  const kpiWidth = (innerWidth - kpiGap * 3) / 4
  const creditPersonal = items.filter(e => e.method.startsWith('Crédito')).reduce((s, e) => s + personalValue(e), 0)
  const creditPercent = personalTotal > 0 ? Math.round((creditPersonal / personalTotal) * 100) : 0
  const directPercent = personalTotal > 0 ? Math.max(0, 100 - creditPercent) : 0

  const kpis = [
    {
      label: 'GASTOS PESSOAIS',
      value: money(personalTotal),
      sub: 'Sua parte líquida no mês',
      color: palette.accentGreen,
      primary: true,
    },
    {
      label: 'A RECEBER (TERCEIROS)',
      value: money(reimbursementTotal),
      sub: 'Compras compartilhadas',
      color: palette.accentOrange,
      primary: false,
    },
    {
      label: 'TOTAL MOVIMENTADO',
      value: money(invoiceTotal),
      sub: `${directPercent}% à vista · ${creditPercent}% crédito`,
      color: palette.accentBlue,
      primary: false,
    },
    {
      label: 'LANÇAMENTOS',
      value: String(items.length),
      sub: items.length === 1 ? '1 despesa no período' : `${items.length} despesas no período`,
      color: palette.accentPurple,
      primary: false,
    },
  ]

  kpis.forEach((kpi, idx) => {
    const kx = pad + idx * (kpiWidth + kpiGap)
    drawRoundedRect(ctx, kx, y, kpiWidth, kpiHeight, 16)
    ctx.fillStyle = kpi.primary ? palette.primaryCardBg : palette.panelBg
    ctx.fill()
    ctx.strokeStyle = kpi.primary ? palette.primaryCardBorder : palette.panelBorder
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.fillStyle = palette.textMuted
    ctx.font = '700 10.5px Inter, Segoe UI, sans-serif'
    ctx.fillText(kpi.label, kx + 18, y + 28)

    ctx.fillStyle = kpi.color
    ctx.font = '800 22px Manrope, Segoe UI, sans-serif'
    ctx.fillText(truncateCanvasText(ctx, kpi.value, kpiWidth - 36), kx + 18, y + 61)

    ctx.fillStyle = palette.textSoft
    ctx.font = '500 11.5px Inter, Segoe UI, sans-serif'
    ctx.fillText(truncateCanvasText(ctx, kpi.sub, kpiWidth - 36), kx + 18, y + 86)
  })

  y += kpiHeight + 22

  // Category Ranking Section
  if (categorySummary.length > 0) {
    drawRoundedRect(ctx, pad, y, innerWidth, catSectionHeight, 20)
    ctx.fillStyle = palette.panelBg
    ctx.fill()
    ctx.strokeStyle = palette.panelBorder
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.fillStyle = palette.textMain
    ctx.font = '800 16px Manrope, Segoe UI, sans-serif'
    ctx.fillText('Gastos por categoria', pad + 24, y + 34)

    ctx.fillStyle = palette.textMuted
    ctx.font = '500 12px Inter, Segoe UI, sans-serif'
    ctx.fillText('Distribuição da sua parte pessoal no período', pad + 24, y + 54)

    let cy = y + 74
    const barStartX = pad + 240
    const barMaxWidth = innerWidth - 440

    categorySummary.forEach(cat => {
      // Category Dot + Name
      ctx.beginPath()
      ctx.arc(pad + 32, cy + 12, 6, 0, Math.PI * 2)
      ctx.fillStyle = cat.color
      ctx.fill()

      ctx.textAlign = 'left'
      ctx.fillStyle = palette.textMain
      ctx.font = '700 13px Inter, Segoe UI, sans-serif'
      ctx.fillText(truncateCanvasText(ctx, cat.name, 130), pad + 46, cy + 16)

      ctx.fillStyle = palette.textMuted
      ctx.font = '500 11px Inter, Segoe UI, sans-serif'
      ctx.fillText(`${cat.count}x`, pad + 188, cy + 16)

      // Progress Bar Track
      drawRoundedRect(ctx, barStartX, cy + 6, barMaxWidth, 12, 6)
      ctx.fillStyle = palette.barTrack
      ctx.fill()

      // Progress Bar Fill
      const fillW = Math.max(8, (Math.min(100, cat.percentage) / 100) * barMaxWidth)
      drawRoundedRect(ctx, barStartX, cy + 6, fillW, 12, 6)
      ctx.fillStyle = cat.color
      ctx.fill()

      // Percentage & Value
      ctx.textAlign = 'right'
      ctx.fillStyle = palette.textMuted
      ctx.font = '700 12px Inter, Segoe UI, sans-serif'
      ctx.fillText(`${cat.percentage}%`, width - pad - 135, cy + 16)

      ctx.fillStyle = palette.textMain
      ctx.font = '800 13.5px Manrope, Segoe UI, sans-serif'
      ctx.fillText(money(cat.total), width - pad - 24, cy + 16)

      cy += catRowHeight
    })

    y += catSectionHeight + 22
  }

  // Transactions Section
  drawRoundedRect(ctx, pad, y, innerWidth, txSectionHeight, 20)
  ctx.fillStyle = palette.panelBg
  ctx.fill()
  ctx.strokeStyle = palette.panelBorder
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = palette.textMain
  ctx.font = '800 16px Manrope, Segoe UI, sans-serif'
  ctx.fillText('Detalhamento dos lançamentos', pad + 24, y + 34)

  ctx.fillStyle = palette.textMuted
  ctx.font = '500 12px Inter, Segoe UI, sans-serif'
  ctx.fillText('Valores pessoais e formas de pagamento registradas no mês', pad + 24, y + 54)

  // Table Header
  const tableTop = y + 70
  drawRoundedRect(ctx, pad + 16, tableTop, innerWidth - 32, 34, 10)
  ctx.fillStyle = palette.tableHeadBg
  ctx.fill()

  const colDateX = pad + 30
  const colDescX = pad + 128
  const colCatX = pad + 440
  const colPayX = pad + 615
  const colValRightX = width - pad - 30

  ctx.fillStyle = palette.textMuted
  ctx.font = '700 10.5px Inter, Segoe UI, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('DATA', colDateX, tableTop + 21)
  ctx.fillText('DESCRIÇÃO', colDescX, tableTop + 21)
  ctx.fillText('CATEGORIA', colCatX, tableTop + 21)
  ctx.fillText('PAGAMENTO / PARCELA', colPayX, tableTop + 21)
  ctx.textAlign = 'right'
  ctx.fillText('SUA PARTE', colValRightX, tableTop + 21)

  let ry = tableTop + 38
  if (visibleItems.length === 0) {
    ctx.textAlign = 'center'
    ctx.fillStyle = palette.textMuted
    ctx.font = '500 13px Inter, Segoe UI, sans-serif'
    ctx.fillText('Nenhum lançamento encontrado para este período.', width / 2, ry + 26)
    ry += txRowHeight
  } else {
    visibleItems.forEach((item, idx) => {
      if (idx % 2 === 1) {
        drawRoundedRect(ctx, pad + 16, ry, innerWidth - 32, txRowHeight - 2, 8)
        ctx.fillStyle = palette.rowAltBg
        ctx.fill()
      }

      const cat = data.categories.find(c => c.id === item.category)
      const catColor = cat?.color || '#6e7f72'
      const cardName = item.method.startsWith('Crédito') ? resolveCardLabel(item, data) : ''
      const instText = item.installments > 1 ? ` · ${item.part}/${item.installments}` : ''
      const payText = `${item.method}${cardName ? ` (${cardName})` : ''}${instText}`

      ctx.textAlign = 'left'
      ctx.fillStyle = palette.textSoft
      ctx.font = '500 12px Inter, Segoe UI, sans-serif'
      ctx.fillText(formatBrDate(item.date), colDateX, ry + 25)

      ctx.fillStyle = palette.textMain
      ctx.font = '700 13px Inter, Segoe UI, sans-serif'
      ctx.fillText(truncateCanvasText(ctx, item.description, 295), colDescX, ry + 25)

      ctx.beginPath()
      ctx.arc(colCatX + 6, ry + 21, 4.5, 0, Math.PI * 2)
      ctx.fillStyle = catColor
      ctx.fill()

      ctx.fillStyle = palette.textSoft
      ctx.font = '600 12px Inter, Segoe UI, sans-serif'
      ctx.fillText(truncateCanvasText(ctx, cat?.name || 'Sem categoria', 150), colCatX + 16, ry + 25)

      ctx.fillStyle = palette.textMuted
      ctx.font = '500 12px Inter, Segoe UI, sans-serif'
      ctx.fillText(truncateCanvasText(ctx, payText, 240), colPayX, ry + 25)

      ctx.textAlign = 'right'
      ctx.fillStyle = palette.textMain
      ctx.font = '800 13.5px Manrope, Segoe UI, sans-serif'
      ctx.fillText(money(personalValue(item)), colValRightX, ry + 25)

      ry += txRowHeight
    })

    if (extraItemsCount > 0) {
      ctx.textAlign = 'left'
      ctx.fillStyle = palette.textMuted
      ctx.font = '600 12px Inter, Segoe UI, sans-serif'
      ctx.fillText(`+ ${extraItemsCount} outros lançamentos neste período`, colDescX, ry + 25)
      ctx.textAlign = 'right'
      ctx.fillText(money(extraItemsPersonalSum), colValRightX, ry + 25)
      ry += txRowHeight
    }
  }

  // Total Footer inside Transactions Panel
  drawRoundedRect(ctx, pad + 16, ry + 6, innerWidth - 32, 40, 12)
  ctx.fillStyle = palette.primaryCardBg
  ctx.fill()
  ctx.strokeStyle = palette.primaryCardBorder
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = palette.textMain
  ctx.font = '700 13px Inter, Segoe UI, sans-serif'
  ctx.fillText(
    `Total pessoal consolidado (${items.length} ${items.length === 1 ? 'lançamento' : 'lançamentos'})`,
    colDateX,
    ry + 31,
  )

  ctx.textAlign = 'right'
  ctx.fillStyle = palette.accentGreen
  ctx.font = '800 16px Manrope, Segoe UI, sans-serif'
  ctx.fillText(money(personalTotal), colValRightX, ry + 31)

  // Bottom Watermark
  ctx.textAlign = 'center'
  ctx.fillStyle = palette.textMuted
  ctx.font = '500 11.5px Inter, Segoe UI, sans-serif'
  ctx.fillText('Põe na Conta · Gestão Financeira Pessoal · Gerado localmente no seu dispositivo', width / 2, totalHeight - pad - 10)

  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `poe-na-conta-relatorio-${month}.png`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}
