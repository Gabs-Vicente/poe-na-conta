import React from 'react'

export type MainView = 'Visão geral' | 'Lançamentos' | 'Relatórios' | 'Investimentos' | 'Recorrências' | 'Ajustes'
export type SortOrder = 'date-desc' | 'date-asc' | 'value-desc' | 'value-asc' | 'desc-asc'

export const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const monthName = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
}

export const shortMonthYear = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(y, m - 1, 1)).replace('.', '')
}

export const piePoint = (degrees: number, radius: number) => {
  const angle = (degrees - 90) * Math.PI / 180
  return [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)]
}

export const donutSlice = (start: number, end: number) => {
  const outerStart = piePoint(start, 46)
  const outerEnd = piePoint(end, 46)
  const innerEnd = piePoint(end, 28)
  const innerStart = piePoint(start, 28)
  const largeArc = end - start > 180 ? 1 : 0
  return `M ${outerStart[0]} ${outerStart[1]} A 46 46 0 ${largeArc} 1 ${outerEnd[0]} ${outerEnd[1]} L ${innerEnd[0]} ${innerEnd[1]} A 28 28 0 ${largeArc} 0 ${innerStart[0]} ${innerStart[1]} Z`
}

export const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export const blurActiveInputOnTouch = () => {
  if (isTouchDevice() && document.activeElement instanceof HTMLInputElement) {
    document.activeElement.blur()
  }
}

export const dismissKeyboardOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter' && isTouchDevice()) {
    event.preventDefault()
    event.currentTarget.blur()
  }
}

export const profileInitials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]?.toLocaleUpperCase('pt-BR') || '').join('')

export const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : '6e7f72'
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export const hslToHex = (h: number, s: number, l: number): string => {
  const hue = ((h % 360) + 360) % 360
  const sat = Math.max(0, Math.min(100, s)) / 100
  const light = Math.max(0, Math.min(100, l)) / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = light - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) { r = c; g = x }
  else if (hue < 120) { r = x; g = c }
  else if (hue < 180) { g = c; b = x }
  else if (hue < 240) { g = x; b = c }
  else if (hue < 300) { r = x; b = c }
  else { r = c; b = x }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export type CategoryIconKind =
  | 'tcg'
  | 'games'
  | 'assinaturas'
  | 'uber'
  | 'alimentacao'
  | 'saude'
  | 'moradia'
  | 'transporte'
  | 'lazer'
  | 'educacao'
  | 'compras'
  | 'pet'
  | 'default'

export const resolveCategoryIconKind = (
  categoryOrId: string | { id?: string; name?: string } | undefined,
  categoryName?: string,
): CategoryIconKind => {
  const rawId = typeof categoryOrId === 'string' ? categoryOrId : categoryOrId?.id || ''
  const rawName = typeof categoryOrId === 'object' && categoryOrId ? categoryOrId.name || '' : categoryName || ''
  const normalized = `${rawId} ${rawName}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (/\b(tcg|cartas|carta|cards|card|yugioh|yu-gi-oh|ygo|pokemon|magic|mtg|booster|deck|lorcana|digimon)\b/.test(normalized) || normalized.includes('tcg')) {
    return 'tcg'
  }
  if (/\b(games|game|jogos|jogo|steam|playstation|psn|xbox|nintendo|switch|gamer|console)\b/.test(normalized) || normalized.includes('game') || normalized.includes('jogo')) {
    return 'games'
  }
  if (/\b(assinaturas|assinatura|streaming|crunchyroll|netflix|spotify|youtube|prime|disney|hbo|max|icloud|ygp|mensalidade)\b/.test(normalized) || normalized.includes('assinatura')) {
    return 'assinaturas'
  }
  if (/\b(uber|99|99pop|taxi|corrida|indrive|cabify|carro)\b/.test(normalized) || normalized.includes('uber') || normalized.includes('99')) {
    return 'uber'
  }
  if (/\b(alimentacao|mercado|supermercado|comida|restaurante|ifood|delivery|lanche|padaria|feira|bar|cafe|almoco|jantar)\b/.test(normalized) || normalized.includes('alimenta') || normalized.includes('mercado')) {
    return 'alimentacao'
  }
  if (/\b(saude|consulta|medico|farmacia|remedio|exame|dentista|hospital|terapia|psicologo|academia|treino|clinica)\b/.test(normalized) || normalized.includes('saude')) {
    return 'saude'
  }
  if (/\b(moradia|casa|aluguel|condominio|luz|energia|agua|internet|gas|iptu|reforma)\b/.test(normalized) || normalized.includes('moradia')) {
    return 'moradia'
  }
  if (/\b(transporte|combustivel|gasolina|etanol|onibus|metro|trem|pedagio|estacionamento|oficina)\b/.test(normalized) || normalized.includes('transporte')) {
    return 'transporte'
  }
  if (/\b(lazer|cinema|viagem|passeio|festa|show|evento|ingresso|hobby|ferias)\b/.test(normalized) || normalized.includes('lazer')) {
    return 'lazer'
  }
  if (/\b(educacao|curso|faculdade|escola|livro|livros|estudo|idioma|aula)\b/.test(normalized) || normalized.includes('educa')) {
    return 'educacao'
  }
  if (/\b(compras|compra|shopping|roupa|roupas|vestuario|eletronicos|presente|loja)\b/.test(normalized)) {
    return 'compras'
  }
  if (/\b(pet|pets|cachorro|gato|racao|veterinario)\b/.test(normalized)) {
    return 'pet'
  }
  return 'default'
}

export const categorySymbol = (
  categoryOrId: string | { id?: string; name?: string } | undefined,
  categoryName?: string,
): React.ReactNode => {
  const kind = resolveCategoryIconKind(categoryOrId, categoryName)
  const svgProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (kind) {
    case 'tcg':
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('path', { d: 'M7.5 5.2 4.6 6.1a1.8 1.8 0 0 0-1.1 2.3l2.7 9.1a1.8 1.8 0 0 0 2.2 1.2l1.1-.3' }),
        React.createElement('rect', { x: 9, y: 3, width: 11.5, height: 16.5, rx: 2 }),
        React.createElement('path', { d: 'M14.75 7.5 17.5 11.25 14.75 15 12 11.25Z' }),
      )
    case 'games':
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('rect', { x: 2, y: 6, width: 20, height: 12, rx: 6 }),
        React.createElement('path', { d: 'M6.5 12h4M8.5 10v4' }),
        React.createElement('circle', { cx: 15.2, cy: 10.7, r: 0.9, fill: 'currentColor' }),
        React.createElement('circle', { cx: 17.4, cy: 13.1, r: 0.9, fill: 'currentColor' }),
      )
    case 'assinaturas':
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('rect', { x: 3, y: 4, width: 18, height: 13, rx: 2.5 }),
        React.createElement('path', { d: 'M8 20h8' }),
        React.createElement('path', { d: 'M10.4 8.2 15 10.5 10.4 12.8Z', fill: 'currentColor' }),
      )
    case 'uber':
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('path', { d: 'M5 11 6.8 6.3A2 2 0 0 1 8.7 5h6.6a2 2 0 0 1 1.9 1.3L19 11' }),
        React.createElement('rect', { x: 3, y: 11, width: 18, height: 6, rx: 2 }),
        React.createElement('path', { d: 'M10 5V3.5h4V5M6 17v2M18 17v2' }),
        React.createElement('circle', { cx: 7, cy: 14, r: 0.8, fill: 'currentColor' }),
        React.createElement('circle', { cx: 17, cy: 14, r: 0.8, fill: 'currentColor' }),
      )
    case 'alimentacao':
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('path', { d: 'M4 10h16l-1.6 8.4a2 2 0 0 1-2 1.6H7.6a2 2 0 0 1-2-1.6L4 10Z' }),
        React.createElement('path', { d: 'M8.5 10 11 4.5M15.5 10 13 4.5M9.5 13.8v3M14.5 13.8v3' }),
      )
    case 'saude':
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('path', { d: 'M19.5 12.6 12 20l-7.5-7.4A5 5 0 0 1 12 6a5 5 0 0 1 7.5 6.6Z' }),
        React.createElement('path', { d: 'M8.5 12h2l1.2-2.2 1.6 4.4 1.2-2.2h1' }),
      )
    case 'moradia':
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('path', { d: 'M3 10.5 12 3l9 7.5' }),
        React.createElement('path', { d: 'M5 9.2V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V9.2' }),
        React.createElement('path', { d: 'M9.5 20.5v-6h5v6' }),
      )
    case 'transporte':
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('rect', { x: 4, y: 4, width: 16, height: 13, rx: 2.5 }),
        React.createElement('path', { d: 'M4 11h16M8 17v2.5M16 17v2.5' }),
        React.createElement('circle', { cx: 8, cy: 14, r: 0.8, fill: 'currentColor' }),
        React.createElement('circle', { cx: 16, cy: 14, r: 0.8, fill: 'currentColor' }),
      )
    case 'lazer':
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('path', { d: 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z' }),
      )
    case 'educacao':
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('path', { d: 'M2 9.5 12 4l10 5.5L12 15 2 9.5Z' }),
        React.createElement('path', { d: 'M6 11.8v4.7c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.7' }),
      )
    case 'compras':
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('path', { d: 'M5 7h14l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.5L5 7Z' }),
        React.createElement('path', { d: 'M9 7V5a3 3 0 0 1 6 0v2' }),
      )
    case 'pet':
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('circle', { cx: 7, cy: 8.5, r: 1.5 }),
        React.createElement('circle', { cx: 12, cy: 6.5, r: 1.5 }),
        React.createElement('circle', { cx: 17, cy: 8.5, r: 1.5 }),
        React.createElement('path', { d: 'M12 11.5c-2.8 0-5 2.2-5 4.6 0 1.5 1.2 2.4 2.7 2.4 1 0 1.6-.4 2.3-.4s1.3.4 2.3.4c1.5 0 2.7-.9 2.7-2.4 0-2.4-2.2-4.6-5-4.6Z' }),
      )
    default:
      return React.createElement(
        'svg',
        svgProps,
        React.createElement('path', { d: 'M12.6 3H6a3 3 0 0 0-3 3v6.6a2 2 0 0 0 .6 1.4l7.4 7.4a2 2 0 0 0 2.8 0l6.6-6.6a2 2 0 0 0 0-2.8L14 3.6a2 2 0 0 0-1.4-.6Z' }),
        React.createElement('circle', { cx: 8, cy: 8, r: 1.1, fill: 'currentColor' }),
      )
  }
}
