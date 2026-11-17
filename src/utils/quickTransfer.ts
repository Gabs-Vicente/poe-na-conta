import {
  isDate,
  QUICK_THIRD_PARTY_ID,
  type Card,
  type CardKind,
  type Category,
  type ClosingDayRule,
  type Data,
  type Expense,
  type Method,
  type Participant,
} from '../finance.ts'

export const QUICK_TRANSFER_HASH_PREFIX = '#import-tx='

const VALID_METHODS: Method[] = ['PIX', 'Débito', 'Dinheiro', 'Crédito à vista', 'Crédito parcelado']

export type QuickExpenseTransferItem = {
  expense: Expense
  categoryName?: string
  categoryColor?: string
  cardName?: string
  cardKind?: CardKind
  cardClosingDay?: number
  cardDueDay?: number
  cardClosingDayRule?: ClosingDayRule
  participantNames?: Record<string, string>
}

export type QuickExpenseTransferPayload = {
  v: 1
  t: 'expenses'
  items: QuickExpenseTransferItem[]
}

export type QuickTransferMergeResult = {
  nextData: Data
  addedCount: number
  updatedCount: number
  skippedCount: number
  createdCategories: string[]
  createdCards: string[]
  createdParticipants: string[]
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(base64Url: string): Uint8Array {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((base64Url.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function buildQuickTransferPayload(expenses: Expense[], data: Data): QuickExpenseTransferPayload {
  const items: QuickExpenseTransferItem[] = expenses.map(expense => {
    const category = data.categories.find(c => c.id === expense.category)
    const card = expense.cardId ? data.cards.find(c => c.id === expense.cardId) : undefined
    const participantNames: Record<string, string> = {}
    for (const share of expense.shares || []) {
      if (share.participantId === QUICK_THIRD_PARTY_ID) continue
      const p = (data.participants || []).find(item => item.id === share.participantId)
      if (p) participantNames[p.id] = p.name
    }

    return {
      expense,
      ...(category ? { categoryName: category.name, categoryColor: category.color } : {}),
      ...(card
        ? {
            cardName: card.name,
            ...(card.kind ? { cardKind: card.kind } : {}),
            cardClosingDay: card.closingDay,
            cardDueDay: card.dueDay,
            ...(card.closingDayRule ? { cardClosingDayRule: card.closingDayRule } : {}),
          }
        : {}),
      ...(Object.keys(participantNames).length > 0 ? { participantNames } : {}),
    }
  })

  return { v: 1, t: 'expenses', items }
}

export function encodeQuickTransfer(expenses: Expense[], data: Data): string {
  const payload = buildQuickTransferPayload(expenses, data)
  const json = JSON.stringify(payload)
  const bytes = new TextEncoder().encode(json)
  return bytesToBase64Url(bytes)
}

export function buildQuickTransferUrl(encoded: string): string {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://gabs-vicente.github.io/poe-na-conta/'
  return `${base}${QUICK_TRANSFER_HASH_PREFIX}${encoded}`
}

export function extractQuickTransferCode(rawInput: string): string | null {
  const trimmed = rawInput.trim()
  if (!trimmed) return null
  const hashIdx = trimmed.indexOf(QUICK_TRANSFER_HASH_PREFIX)
  if (hashIdx >= 0) {
    const code = trimmed.slice(hashIdx + QUICK_TRANSFER_HASH_PREFIX.length).split(/[&#\s]/)[0]
    return code || null
  }
  if (/^[A-Za-z0-9\-_]{12,}$/.test(trimmed)) {
    return trimmed
  }
  return null
}

function isValidExpenseItem(candidate: unknown): candidate is QuickExpenseTransferItem {
  if (!candidate || typeof candidate !== 'object') return false
  const item = candidate as Record<string, unknown>
  const exp = item.expense
  if (!exp || typeof exp !== 'object') return false
  const e = exp as Record<string, unknown>
  if (typeof e.id !== 'string' || !e.id.trim()) return false
  if (typeof e.description !== 'string' || !e.description.trim()) return false
  if (typeof e.amount !== 'number' || !Number.isFinite(e.amount) || e.amount <= 0) return false
  if (typeof e.date !== 'string' || !isDate(e.date)) return false
  if (typeof e.category !== 'string') return false
  if (typeof e.method !== 'string' || !VALID_METHODS.includes(e.method as Method)) return false
  if (typeof e.installments !== 'number' || !Number.isInteger(e.installments) || e.installments < 1) return false
  if (typeof e.firstMonth !== 'string' || !/^\d{4}-\d{2}$/.test(e.firstMonth)) return false
  return true
}

export function decodeQuickTransfer(rawInput: string): QuickExpenseTransferPayload | null {
  const code = extractQuickTransferCode(rawInput)
  if (!code) return null
  try {
    const bytes = base64UrlToBytes(code)
    const json = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(json) as Record<string, unknown>
    if (parsed?.v !== 1 || parsed?.t !== 'expenses' || !Array.isArray(parsed.items)) return null
    const validItems = parsed.items.filter(isValidExpenseItem)
    if (validItems.length === 0) return null
    return {
      v: 1,
      t: 'expenses',
      items: validItems,
    }
  } catch {
    return null
  }
}

export function mergeQuickTransferIntoData(
  currentData: Data,
  payload: QuickExpenseTransferPayload,
  duplicatePolicy: 'update' | 'skip' = 'skip',
): QuickTransferMergeResult {
  const nextCategories: Category[] = [...currentData.categories]
  const nextCards: Card[] = [...currentData.cards]
  const nextParticipants: Participant[] = [...(currentData.participants || [])]
  const nextExpenses: Expense[] = [...currentData.expenses]

  const createdCategories: string[] = []
  const createdCards: string[] = []
  const createdParticipants: string[] = []
  let addedCount = 0
  let updatedCount = 0
  let skippedCount = 0

  for (const item of payload.items) {
    const rawExp = item.expense

    // 1. Resolve Category (by ID -> by name -> create if named -> fallback)
    let resolvedCategoryId = nextCategories.find(c => c.id === rawExp.category)?.id
    if (!resolvedCategoryId && item.categoryName) {
      const normalized = item.categoryName.trim().toLowerCase()
      resolvedCategoryId = nextCategories.find(c => c.name.trim().toLowerCase() === normalized)?.id
      if (!resolvedCategoryId) {
        const newCat: Category = {
          id: rawExp.category,
          name: item.categoryName.trim(),
          color: item.categoryColor || '#6e7f72',
        }
        nextCategories.push(newCat)
        createdCategories.push(newCat.name)
        resolvedCategoryId = newCat.id
      }
    }
    if (!resolvedCategoryId) {
      resolvedCategoryId = nextCategories[0]?.id || rawExp.category
    }

    // 2. Resolve Card if credit
    let resolvedCardId = rawExp.cardId
    if (rawExp.method.startsWith('Crédito') && rawExp.cardId) {
      const byId = nextCards.find(c => c.id === rawExp.cardId)
      if (byId) {
        resolvedCardId = byId.id
      } else if (item.cardName) {
        const normalized = item.cardName.trim().toLowerCase()
        const byName = nextCards.find(c => c.name.trim().toLowerCase() === normalized)
        if (byName) {
          resolvedCardId = byName.id
        } else {
          const newCard: Card = {
            id: rawExp.cardId,
            name: item.cardName.trim(),
            closingDay: item.cardClosingDay ?? 25,
            dueDay: item.cardDueDay ?? 5,
            ...(item.cardClosingDayRule ? { closingDayRule: item.cardClosingDayRule } : { closingDayRule: 'after' }),
            ...(item.cardKind ? { kind: item.cardKind } : {}),
          }
          nextCards.push(newCard)
          createdCards.push(newCard.name)
          resolvedCardId = newCard.id
        }
      } else if (nextCards[0]) {
        resolvedCardId = nextCards[0].id
      }
    }

    // 3. Resolve Participant shares
    const resolvedShares = rawExp.shares?.map(share => {
      if (share.participantId === QUICK_THIRD_PARTY_ID) return share
      const byId = nextParticipants.find(p => p.id === share.participantId)
      if (byId) return share
      const pName = item.participantNames?.[share.participantId]?.trim()
      if (pName) {
        const normalized = pName.toLowerCase()
        const byName = nextParticipants.find(p => p.name.trim().toLowerCase() === normalized)
        if (byName) return { ...share, participantId: byName.id }
        const newParticipant: Participant = { id: share.participantId, name: pName }
        nextParticipants.push(newParticipant)
        createdParticipants.push(newParticipant.name)
        return share
      }
      return share
    })

    const mappedExpense: Expense = {
      ...rawExp,
      category: resolvedCategoryId,
      ...(resolvedCardId ? { cardId: resolvedCardId } : {}),
      ...(resolvedShares ? { shares: resolvedShares } : {}),
    }

    const existingIdx = nextExpenses.findIndex(e => e.id === mappedExpense.id)
    if (existingIdx >= 0) {
      if (duplicatePolicy === 'update') {
        nextExpenses[existingIdx] = mappedExpense
        updatedCount += 1
      } else {
        skippedCount += 1
      }
    } else {
      nextExpenses.push(mappedExpense)
      addedCount += 1
    }
  }

  return {
    nextData: {
      ...currentData,
      categories: nextCategories,
      cards: nextCards,
      participants: nextParticipants,
      expenses: nextExpenses,
    },
    addedCount,
    updatedCount,
    skippedCount,
    createdCategories,
    createdCards,
    createdParticipants,
  }
}
