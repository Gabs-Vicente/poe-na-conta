import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { OverviewView } from './components/OverviewView'
import { InvestmentsView } from './components/InvestmentsView'
import { RecurrencesView } from './components/RecurrencesView'
import { ReportsView } from './components/ReportsView'
import { SettingsView } from './components/SettingsView'
import { TransactionsTable } from './components/TransactionsTable'
import {
  buildInstallmentRelief,
  buildOccurrences as calculateOccurrences,
  cardDueMonth as calculateCardDueMonth,
  createBackup,
  dateKey,
  expenseFirstMonth,
  formatMoneyInput,
  INVESTMENT_TYPE_META,
  isDate,
  isManualBillingCard,
  monthKey,
  normalizeDateInput,
  occurrencePersonalValue,
  parseBackupFile,
  parseMoneyInput,
  QUICK_THIRD_PARTY_ID,
  QUICK_THIRD_PARTY_NAME,
  quickSplitThirdPartyAmount,
  readStoredData,
  seed,
  shiftMonth as shiftMonthKey,
  splitAmountAmongParticipantsOnly,
  splitAmountEquallyWithMe,
  type BackupPayload,
  type Card,
  type CardKind,
  type Category,
  type ClosingDayRule,
  type Data,
  type Expense,
  type Investment,
  type InvestmentEntryType,
  type InvestmentType,
  type ManualReimbursement,
  type Method,
  type Occurrence,
  type Participant,
  type ParticipantShare,
  type Recurrence,
  type ReserveGoal,
} from './finance'
import {
  blurActiveInputOnTouch,
  categorySymbol,
  createId,
  dismissKeyboardOnEnter,
  hexToHsl,
  hslToHex,
  isTouchDevice,
  money,
  monthName,
  profileInitials,
  shortMonthYear,
  type MainView,
  type SortOrder,
} from './utils/format'
import { exportReportImage, exportStyledSpreadsheet } from './utils/exportReport'

type FirstMonthMode = 'auto' | 'current' | 'next' | 'plus2'

type ExpenseForm = {
  description: string
  amount: string
  date: string
  category: string
  method: Method
  cardId: string
  installments: string
  afterClosing: boolean
  firstMonthMode: FirstMonthMode
  shares: { participantId: string; amount: string; installment: string }[]
}
type SettingEditor = {
  kind: 'category' | 'card' | 'participant'
  id?: string
  name: string
  color: string
  cardKind: CardKind
  closingDay: string
  dueDay: string
  closingDayRule: ClosingDayRule
}
type RecurrenceEditor = {
  id?: string
  description: string
  amount: string
  category: string
  method: Method
  cardId: string
  day: string
}
type ManualReimbursementEditor = {
  id?: string
  description: string
  amount: string
  participantId: string
  cardId: string
  categoryId: string
}
type AdvanceInstallmentsEditor = {
  occurrence: Occurrence
  countToAdvance: number
  customAmount: string
}
type InvestmentEditor = {
  id?: string
  name: string
  type: InvestmentType
  institution: string
  investedAmount: string
  currentAmount: string
  goalId: string
}
type InvestmentMoveEditor = {
  investmentId: string
  investmentName: string
  mode: InvestmentEntryType
  amount: string
  date: string
  note: string
  goalId: string
}
type ReserveGoalEditor = {
  id?: string
  name: string
  targetAmount: string
  color: string
}
type ModalKind =
  | 'expense'
  | 'recurrence'
  | 'reimbursement'
  | 'participant-summary'
  | 'advance'
  | 'investment'
  | 'investment-move'
  | 'goal'
  | 'settings'
  | 'backup'
  | 'easter-egg'
  | 'onboarding'
  | 'reset'
  | 'confirm'
  | 'pwa-guide'
type OnboardingStartMode = 'empty' | 'demo' | 'keep'
type ConfirmDialog = { eyebrow: string; title: string; description: string; confirmLabel: string; onConfirm: () => void }
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const MODAL_CLOSE_DURATION_MS = 220
const TOAST_AUTO_DISMISS_MS = 3800
const SWIPE_VIEWS: MainView[] = ['Visão geral', 'Lançamentos', 'Relatórios', 'Investimentos', 'Recorrências', 'Ajustes']
const CATEGORY_COLOR_PRESETS = [
  { color: '#6e7f72', label: 'Verde sálvia' },
  { color: '#b88b63', label: 'Terracota suave' },
  { color: '#74858b', label: 'Azul ardósia' },
  { color: '#9b8193', label: 'Malva' },
  { color: '#8b966d', label: 'Oliva' },
  { color: '#c46b5c', label: 'Coral' },
  { color: '#5b8a72', label: 'Esmeralda' },
  { color: '#6a7ba2', label: 'Índigo' },
  { color: '#c89b54', label: 'Âmbar' },
  { color: '#866f9b', label: 'Lavanda' },
  { color: '#5d8b96', label: 'Petróleo' },
  { color: '#a36877', label: 'Rosé' },
]

// Dicionário de senhas secretas do Konami Code (chave em minúsculas -> escrita exibida no modal)
const EASTER_EGG_SECRETS: Record<string, string> = {
  bbkart: 'Bloodborne Kart não existe e não pode te machucar',
  ocara: 'O Caio é o cara',
  '13': 'Lulatron Ativar',
  '67': 'Aura farmada com Sucesso',
  bleach: 'Getsuga Tensho',
}
const getEasterEggSecret = (value: string): string | undefined => EASTER_EGG_SECRETS[value.trim().toLowerCase()]

const today = new Date()

function App() {
  const [hasExistingData, setHasExistingData] = useState(() => localStorage.getItem('conta-clara-v1') !== null)
  const [storedData] = useState(() => readStoredData(localStorage.getItem('conta-clara-v1')))
  const [data, setData] = useState<Data>(storedData.data)
  const [storageWarning, setStorageWarning] = useState(storedData.warning || '')
  useEffect(() => {
    if (hasExistingData && !storedData.warning) {
      try {
        localStorage.setItem('conta-clara-v1', JSON.stringify(storedData.data))
      } catch {
        /* ignore */
      }
    }
  }, [hasExistingData, storedData])

  const [onboardingOpen, setOnboardingOpen] = useState(() => localStorage.getItem('poe-na-conta-onboarded') !== '1')
  const [onboardingStartMode, setOnboardingStartMode] = useState<OnboardingStartMode>(() => (hasExistingData ? 'keep' : 'empty'))
  const [backupMessage, setBackupMessage] = useState('')
  const [toastClosing, setToastClosing] = useState(false)
  const [toastKey, setToastKey] = useState(0)
  const [pendingBackupImport, setPendingBackupImport] = useState<BackupPayload | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null)
  const [resetDataModalOpen, setResetDataModalOpen] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetConfirmError, setResetConfirmError] = useState(false)
  const backupInput = useRef<HTMLInputElement>(null)
  const trendChartRef = useRef<HTMLDivElement>(null)

  const showToast = (message: string) => {
    if (!message) {
      setBackupMessage('')
      setToastClosing(false)
      return
    }
    setToastClosing(false)
    setBackupMessage(message)
    setToastKey(current => current + 1)
  }
  const dismissToast = () => {
    if (!backupMessage || toastClosing) return
    setToastClosing(true)
    window.setTimeout(() => {
      setBackupMessage('')
      setToastClosing(false)
    }, MODAL_CLOSE_DURATION_MS)
  }

  const [month, setMonth] = useState(monthKey(today))
  const [view, setView] = useState<MainView>(() => {
    const saved = localStorage.getItem('poe-na-conta-last-view') || localStorage.getItem('nexus-default-view')
    return saved === 'Lançamentos' || saved === 'Relatórios' || saved === 'Investimentos' || saved === 'Recorrências' || saved === 'Ajustes'
      ? saved
      : 'Visão geral'
  })
  const [overviewMode, setOverviewMode] = useState<'expenses' | 'investments'>(() =>
    localStorage.getItem('poe-na-conta-overview-mode') === 'investments' ? 'investments' : 'expenses',
  )
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('nexus-theme') === 'dark' ? 'dark' : 'light'))
  const [defaultTheme, setDefaultTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('nexus-theme') === 'dark' ? 'dark' : 'light'))
  const [profileName, setProfileName] = useState(() => localStorage.getItem('poe-na-conta-profile-name') || '')
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem('poe-na-conta-profile-photo') || '')
  const [pixKey, setPixKey] = useState(() => localStorage.getItem('poe-na-conta-pix-key') || '')
  const [profileMessage, setProfileMessage] = useState('')
  const profilePhotoInput = useRef<HTMLInputElement>(null)
  const [monthlyLimit, setMonthlyLimit] = useState(() => localStorage.getItem('poe-na-conta-monthly-limit') || '')
  const [limitNoticePercent, setLimitNoticePercent] = useState(() => {
    const saved = Number(localStorage.getItem('poe-na-conta-limit-notice-percent'))
    return Number.isInteger(saved) && saved >= 1 && saved <= 100 ? String(saved) : '80'
  })
  const [query, setQuery] = useState('')
  const [searchAllMonths, setSearchAllMonths] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('Todas as categorias')
  const [methodFilter, setMethodFilter] = useState('Todos os pagamentos')
  const [cardFilter, setCardFilter] = useState('Todos os cartões')
  const [sortOrder, setSortOrder] = useState<SortOrder>('date-desc')
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true),
  )
  const [pwaBannerDismissed, setPwaBannerDismissed] = useState(() => localStorage.getItem('poe-na-conta-pwa-dismissed') === '1')
  const [pwaGuideOpen, setPwaGuideOpen] = useState(false)
  const [lastBackupAt, setLastBackupAt] = useState(() => localStorage.getItem('poe-na-conta-last-backup-at') || '')
  const [changesSinceBackup, setChangesSinceBackup] = useState(() => Number(localStorage.getItem('poe-na-conta-changes-since-backup') || '0'))
  const [backupSnoozeUntil, setBackupSnoozeUntil] = useState(() => Number(localStorage.getItem('poe-na-conta-backup-snooze-until') || '0'))
  const [nowTimestamp] = useState(() => Date.now())
  const [trendYear, setTrendYear] = useState(String(today.getFullYear()))
  const [categoryPanelMode, setCategoryPanelMode] = useState<'categories' | 'transactions'>('categories')
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [easterEggOpen, setEasterEggOpen] = useState(false)
  const [easterEggPassword, setEasterEggPassword] = useState('')
  const [easterEggMessage, setEasterEggMessage] = useState('')
  const [easterEggError, setEasterEggError] = useState(false)
  const [easterEggShake, setEasterEggShake] = useState(false)
  const [closingModal, setClosingModal] = useState<ModalKind | null>(null)
  const modalCloseTimer = useRef<number | null>(null)
  const easterEggInputRef = useRef<HTMLInputElement>(null)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [settingsModal, setSettingsModal] = useState<SettingEditor | null>(null)
  const [recurrenceEditor, setRecurrenceEditor] = useState<RecurrenceEditor | null>(null)
  const [reimbursementEditor, setReimbursementEditor] = useState<ManualReimbursementEditor | null>(null)
  const [participantSummaryTarget, setParticipantSummaryTarget] = useState<Participant | null>(null)
  const [advanceEditor, setAdvanceEditor] = useState<AdvanceInstallmentsEditor | null>(null)
  const [advanceError, setAdvanceError] = useState('')
  const [investmentEditor, setInvestmentEditor] = useState<InvestmentEditor | null>(null)
  const [investmentErrors, setInvestmentErrors] = useState<Record<string, string>>({})
  const [investmentMoveEditor, setInvestmentMoveEditor] = useState<InvestmentMoveEditor | null>(null)
  const [investmentMoveErrors, setInvestmentMoveErrors] = useState<Record<string, string>>({})
  const [goalEditor, setGoalEditor] = useState<ReserveGoalEditor | null>(null)
  const [goalErrors, setGoalErrors] = useState<Record<string, string>>({})
  const [recurrenceSelection, setRecurrenceSelection] = useState<string[] | null>(null)
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([])
  const [form, setForm] = useState<ExpenseForm>(() => ({
    description: '',
    amount: '',
    date: dateKey(today),
    category: storedData.data.categories[0]?.id || '',
    method: 'PIX',
    cardId: storedData.data.cards[0]?.id || '',
    installments: '2',
    afterClosing: (storedData.data.cards[0]?.closingDayRule ?? 'after') !== 'before',
    firstMonthMode: isManualBillingCard(storedData.data.cards[0]) ? 'next' : 'auto',
    shares: [],
  }))
  const [shareError, setShareError] = useState('')
  const [expenseErrors, setExpenseErrors] = useState<Record<string, string>>({})
  const [recurrenceErrors, setRecurrenceErrors] = useState<Record<string, string>>({})
  const [reimbursementErrors, setReimbursementErrors] = useState<Record<string, string>>({})
  const [settingsErrors, setSettingsErrors] = useState<Record<string, string>>({})
  const [formShake, setFormShake] = useState<ModalKind | null>(null)
  const [returnToExpenseAfterParticipant, setReturnToExpenseAfterParticipant] = useState(false)
  const [participantsSectionOpen, setParticipantsSectionOpen] = useState(false)
  const [keepExpenseModalOpen, setKeepExpenseModalOpen] = useState(false)
  const [lastUsedCardId, setLastUsedCardId] = useState(() => localStorage.getItem('poe-na-conta-last-card-id') || '')
  const expenseDescInputRef = useRef<HTMLInputElement>(null)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const swipeStartRef = useRef<{ x: number; y: number; time: number; blocked: boolean } | null>(null)

  const getPreferredCard = (cards = data.cards, expenses = data.expenses): Card | undefined => {
    if (lastUsedCardId) {
      const matched = cards.find(c => c.id === lastUsedCardId)
      if (matched) return matched
    }
    const lastCreditExpense = expenses.find(e => e.method.startsWith('Crédito') && e.cardId)
    if (lastCreditExpense?.cardId) {
      const matched = cards.find(c => c.id === lastCreditExpense.cardId)
      if (matched) return matched
    }
    return cards[0]
  }

  const rememberCard = (cardId?: string) => {
    if (!cardId) return
    setLastUsedCardId(cardId)
    try {
      localStorage.setItem('poe-na-conta-last-card-id', cardId)
    } catch {
      /* ignore */
    }
  }

  const hasAnyOpenModal = Boolean(
    modal ||
    settingsModal ||
    recurrenceEditor ||
    reimbursementEditor ||
    participantSummaryTarget ||
    advanceEditor ||
    investmentEditor ||
    investmentMoveEditor ||
    goalEditor ||
    confirmDialog ||
    onboardingOpen ||
    resetDataModalOpen ||
    pwaGuideOpen ||
    easterEggOpen ||
    pendingBackupImport,
  )

  const handleMainTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1 || hasAnyOpenModal) {
      swipeStartRef.current = null
      return
    }
    const target = event.target as HTMLElement | null
    if (target?.closest('input, select, textarea, .trend-chart, .relief-milestones-bar, [data-no-swipe]')) {
      swipeStartRef.current = { x: 0, y: 0, time: 0, blocked: true }
      return
    }
    swipeStartRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      time: Date.now(),
      blocked: false,
    }
  }

  const handleMainTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = swipeStartRef.current
    swipeStartRef.current = null
    if (!start || start.blocked || hasAnyOpenModal || event.changedTouches.length !== 1) return
    const deltaX = event.changedTouches[0].clientX - start.x
    const deltaY = event.changedTouches[0].clientY - start.y
    const elapsed = Date.now() - start.time
    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.5 || elapsed > 700) return
    const currentIndex = SWIPE_VIEWS.indexOf(view)
    if (currentIndex === -1) return
    if (deltaX < 0 && currentIndex < SWIPE_VIEWS.length - 1) {
      setSwipeDirection('left')
      setView(SWIPE_VIEWS[currentIndex + 1])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (deltaX > 0 && currentIndex > 0) {
      setSwipeDirection('right')
      setView(SWIPE_VIEWS[currentIndex - 1])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const triggerFormShake = (kind: ModalKind) => {
    setFormShake(null)
    window.requestAnimationFrame(() => setFormShake(kind))
  }
  const clearFieldError = (setter: React.Dispatch<React.SetStateAction<Record<string, string>>>, key: string) => {
    setter(current => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const normalizedFormDate = normalizeDateInput(form.date)
  const selectedFormCard = data.cards.find(card => card.id === form.cardId) || data.cards[0]
  const isManualFormCard = isManualBillingCard(selectedFormCard)
  const effectiveFirstMonthMode: FirstMonthMode = isManualFormCard ? (form.firstMonthMode === 'auto' ? 'next' : form.firstMonthMode) : 'auto'
  const purchaseBaseMonth = isDate(normalizedFormDate) ? normalizedFormDate.slice(0, 7) : month
  const isFormOnClosingDay = Boolean(
    form.method.startsWith('Crédito') &&
    selectedFormCard &&
    !isManualFormCard &&
    isDate(normalizedFormDate) &&
    Number(normalizedFormDate.slice(-2)) === selectedFormCard.closingDay,
  )
  const creditDueMonth =
    form.method.startsWith('Crédito') && selectedFormCard && isDate(normalizedFormDate)
      ? isManualFormCard
        ? effectiveFirstMonthMode === 'current'
          ? purchaseBaseMonth
          : effectiveFirstMonthMode === 'plus2'
            ? shiftMonthKey(purchaseBaseMonth, 2)
            : shiftMonthKey(purchaseBaseMonth, 1)
        : calculateCardDueMonth(normalizedFormDate, selectedFormCard, form.afterClosing)
      : ''

  const parsedFormAmount = parseMoneyInput(form.amount)
  const validFormAmount = Number.isFinite(parsedFormAmount) && parsedFormAmount > 0 ? parsedFormAmount : 0
  const totalFormSharesAmount = Math.round(
    form.shares.reduce((sum, share) => {
      const val = parseMoneyInput(share.amount)
      return sum + (Number.isFinite(val) && val > 0 ? val : 0)
    }, 0) * 100,
  ) / 100
  const personalFormPreview = Math.max(0, Math.round((validFormAmount - totalFormSharesAmount) * 100) / 100)

  const clearShareFieldErrors = (ids: string[]) => {
    setExpenseErrors(current => {
      const next = { ...current }
      for (const id of ids) delete next[`share-${id}`]
      return next
    })
  }

  const requireValidAmountForSplit = (): number | null => {
    if (!validFormAmount) {
      setExpenseErrors(current => ({ ...current, amount: 'Informe o valor total primeiro para calcular a divisão.' }))
      triggerFormShake('expense')
      return null
    }
    return validFormAmount
  }

  const applyEqualSplitWithMe = () => {
    const amount = requireValidAmountForSplit()
    if (!amount || form.shares.length === 0) return
    const values = splitAmountEquallyWithMe(amount, form.shares.length)
    setShareError('')
    clearShareFieldErrors(form.shares.map(s => s.participantId))
    setForm(current => ({
      ...current,
      shares: current.shares.map((item, index) => ({
        ...item,
        amount: formatMoneyInput(values[index] ?? 0),
      })),
    }))
  }

  const applySplitAmongMarkedOnly = () => {
    const amount = requireValidAmountForSplit()
    if (!amount || form.shares.length === 0) return
    const values = splitAmountAmongParticipantsOnly(amount, form.shares.length)
    setShareError('')
    clearShareFieldErrors(form.shares.map(s => s.participantId))
    setForm(current => ({
      ...current,
      shares: current.shares.map((item, index) => ({
        ...item,
        amount: formatMoneyInput(values[index] ?? 0),
      })),
    }))
  }

  const applyQuickThirdPartyPreset = (mode: 'plus1' | 'plus2' | 'plus3' | 'full') => {
    const amount = requireValidAmountForSplit()
    if (!amount) return
    const thirdPartyValue =
      mode === 'full'
        ? amount
        : quickSplitThirdPartyAmount(amount, mode === 'plus1' ? 1 : mode === 'plus2' ? 2 : 3)
    const formatted = formatMoneyInput(thirdPartyValue)
    setShareError('')
    clearShareFieldErrors([QUICK_THIRD_PARTY_ID])
    setForm(current => {
      const hasQuick = current.shares.some(item => item.participantId === QUICK_THIRD_PARTY_ID)
      return {
        ...current,
        shares: hasQuick
          ? current.shares.map(item => (item.participantId === QUICK_THIRD_PARTY_ID ? { ...item, amount: formatted } : item))
          : [{ participantId: QUICK_THIRD_PARTY_ID, amount: formatted, installment: 'all' }, ...current.shares],
      }
    })
  }

  const openNewExpenseModal = () => {
    const defaultCard = getPreferredCard()
    setEditingExpenseId(null)
    setShareError('')
    setExpenseErrors({})
    setParticipantsSectionOpen(false)
    setForm({
      description: '',
      amount: '',
      date: dateKey(today),
      category: data.categories[0]?.id || '',
      method: 'PIX',
      cardId: defaultCard?.id || '',
      installments: '2',
      afterClosing: (defaultCard?.closingDayRule ?? 'after') !== 'before',
      firstMonthMode: isManualBillingCard(defaultCard) ? 'next' : 'auto',
      shares: [],
    })
    setModal(true)
  }

  const closeModalWithAnimation = (kind: ModalKind, onClosed: () => void) => {
    if (closingModal === kind) return
    if (modalCloseTimer.current !== null) window.clearTimeout(modalCloseTimer.current)
    setClosingModal(kind)
    modalCloseTimer.current = window.setTimeout(() => {
      setClosingModal(current => (current === kind ? null : current))
      modalCloseTimer.current = null
      onClosed()
    }, MODAL_CLOSE_DURATION_MS)
  }

  useEffect(() => {
    if (!backupMessage) return
    const fadeTimer = window.setTimeout(() => setToastClosing(true), TOAST_AUTO_DISMISS_MS - MODAL_CLOSE_DURATION_MS)
    const clearTimer = window.setTimeout(() => {
      setBackupMessage('')
      setToastClosing(false)
    }, TOAST_AUTO_DISMISS_MS)
    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(clearTimer)
    }
  }, [backupMessage, toastKey])

  useEffect(() => {
    if (!profileMessage) return
    const timer = window.setTimeout(() => setProfileMessage(''), TOAST_AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [profileMessage])

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.row-actions')) {
        document.querySelectorAll<HTMLDetailsElement>('.row-actions[open]').forEach(menu => menu.removeAttribute('open'))
      }
    }
    document.addEventListener('click', closeMenus)
    return () => document.removeEventListener('click', closeMenus)
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    const root = document.documentElement
    const updateViewport = () => {
      if (!vv) return
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`)
      root.style.setProperty('--vvt', `${Math.round(vv.offsetTop)}px`)
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop
      if (keyboardHeight > 110) {
        root.setAttribute('data-keyboard', 'open')
      } else {
        root.removeAttribute('data-keyboard')
      }
    }
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || !target.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([type="file"]), textarea')) return
      window.setTimeout(() => {
        updateViewport()
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 160)
    }
    const onFocusOut = () => {
      window.setTimeout(updateViewport, 100)
    }
    updateViewport()
    vv?.addEventListener('resize', updateViewport)
    vv?.addEventListener('scroll', updateViewport)
    window.addEventListener('resize', updateViewport)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      vv?.removeEventListener('resize', updateViewport)
      vv?.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      root.removeAttribute('data-keyboard')
    }
  }, [])

  useEffect(() => {
    const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
    let position = 0
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]'))) return
      if (event.code === sequence[position]) position += 1
      else position = event.code === sequence[0] ? 1 : 0
      if (event.code.startsWith('Arrow') && position > 0) event.preventDefault()
      if (position === sequence.length) {
        event.preventDefault()
        position = 0
        if (modalCloseTimer.current !== null) {
          window.clearTimeout(modalCloseTimer.current)
          modalCloseTimer.current = null
        }
        setClosingModal(current => (current === 'easter-egg' ? null : current))
        setEasterEggPassword('')
        setEasterEggMessage('')
        setEasterEggError(false)
        setEasterEggShake(false)
        setEasterEggOpen(true)
        window.requestAnimationFrame(() => easterEggInputRef.current?.focus())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (modalCloseTimer.current !== null) window.clearTimeout(modalCloseTimer.current)
    }
  }, [])

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const onAppInstalled = () => {
      setIsStandalone(true)
      setDeferredInstallPrompt(null)
      setPwaGuideOpen(false)
      showToast('Põe na Conta instalado na sua tela inicial!')
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const closePwaGuideModal = () => closeModalWithAnimation('pwa-guide', () => setPwaGuideOpen(false))
  const handleInstallPwa = async () => {
    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt()
      const choice = await deferredInstallPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setDeferredInstallPrompt(null)
        setIsStandalone(true)
      }
      return
    }
    setPwaGuideOpen(true)
  }
  const dismissPwaBanner = () => {
    setPwaBannerDismissed(true)
    localStorage.setItem('poe-na-conta-pwa-dismissed', '1')
  }
  const recordBackupCompleted = () => {
    const iso = new Date().toISOString()
    setLastBackupAt(iso)
    setChangesSinceBackup(0)
    setBackupSnoozeUntil(0)
    localStorage.setItem('poe-na-conta-last-backup-at', iso)
    localStorage.setItem('poe-na-conta-changes-since-backup', '0')
    localStorage.removeItem('poe-na-conta-backup-snooze-until')
  }
  const snoozeBackupReminder = () => {
    const until = Date.now() + 7 * 24 * 60 * 60 * 1000
    setBackupSnoozeUntil(until)
    setChangesSinceBackup(0)
    localStorage.setItem('poe-na-conta-backup-snooze-until', String(until))
    localStorage.setItem('poe-na-conta-changes-since-backup', '0')
  }
  const closeSettingsModal = () =>
    closeModalWithAnimation('settings', () => {
      setSettingsModal(null)
      setSettingsErrors({})
      if (returnToExpenseAfterParticipant) {
        setReturnToExpenseAfterParticipant(false)
        setModal(true)
      }
    })

  const save = (next: Data, recoveringStorage = false, trackChange = true): boolean => {
    if (storageWarning && !recoveringStorage) {
      showToast('Importe um backup válido ou desbloqueie o armazenamento no aviso acima antes de salvar.')
      return false
    }
    try {
      localStorage.setItem('conta-clara-v1', JSON.stringify(next))
      setData(next)
      setStorageWarning('')
      if (trackChange) {
        setChangesSinceBackup(prev => {
          const updated = prev + 1
          localStorage.setItem('poe-na-conta-changes-since-backup', String(updated))
          return updated
        })
      }
      return true
    } catch {
      showToast('Não foi possível salvar no navegador. Verifique o espaço disponível ou as permissões de armazenamento.')
      return false
    }
  }

  const occurrences = useMemo(() => calculateOccurrences(data.expenses.filter(e => (e as Expense & { kind?: string }).kind !== 'income')), [data.expenses])
  const current = occurrences.filter(e => e.month === month)
  const currentExpenses = current
  const personalValue = occurrencePersonalValue
  const owedBy = (e: typeof occurrences[number]) => {
    const shares = e.allocatedShares.filter(share => share.amount > 0)
    const names = shares
      .map(share =>
        share.participantId === QUICK_THIRD_PARTY_ID
          ? QUICK_THIRD_PARTY_NAME
          : data.participants?.find(participant => participant.id === share.participantId)?.name,
      )
      .filter((name): name is string => Boolean(name))
    const amount = shares.reduce((sum, share) => sum + share.amount, 0)
    if (!amount) return ''
    const unpaidAmount = shares.filter(share => !share.paid).reduce((sum, share) => sum + share.amount, 0)
    if (unpaidAmount === 0) {
      if (names.length === 1 && names[0] === QUICK_THIRD_PARTY_NAME) return `Terceiros (avulso): ${money(amount)} (pago ✓)`
      return `${names.length ? names.join(', ') : 'Participante'} pagou ${money(amount)} ✓`
    }
    if (names.length === 1 && names[0] === QUICK_THIRD_PARTY_NAME) return `Terceiros (avulso): ${money(unpaidAmount)}`
    return `${names.length ? names.join(', ') : 'Participante'} ${names.length === 1 ? 'deve' : 'devem'} ${money(unpaidAmount)}`
  }

  const filtered = useMemo(() => {
    const sourceList = view === 'Lançamentos' && searchAllMonths ? occurrences : current
    const matching = sourceList.filter(e => {
      if (!e.description.toLowerCase().includes(query.toLowerCase())) return false
      if (categoryFilter !== 'Todas as categorias' && e.category !== categoryFilter) return false
      if (methodFilter === 'Crédito (todos)') {
        if (!e.method.startsWith('Crédito')) return false
      } else if (methodFilter !== 'Todos os pagamentos' && e.method !== methodFilter) {
        return false
      }
      if (cardFilter !== 'Todos os cartões') {
        const resolvedCardId = e.method.startsWith('Crédito') ? e.cardId || data.cards[0]?.id || '' : ''
        if (resolvedCardId !== cardFilter) return false
      }
      return true
    })
    return [...matching].sort((a, b) => {
      if (sortOrder === 'date-desc') return b.date.localeCompare(a.date) || b.month.localeCompare(a.month)
      if (sortOrder === 'date-asc') return a.date.localeCompare(b.date) || a.month.localeCompare(b.month)
      if (sortOrder === 'value-desc') return occurrencePersonalValue(b) - occurrencePersonalValue(a) || b.date.localeCompare(a.date)
      if (sortOrder === 'value-asc') return occurrencePersonalValue(a) - occurrencePersonalValue(b) || b.date.localeCompare(a.date)
      return a.description.localeCompare(b.description, 'pt-BR')
    })
  }, [view, searchAllMonths, occurrences, current, query, categoryFilter, methodFilter, cardFilter, sortOrder, data.cards])

  const hasActiveFilters =
    (view === 'Lançamentos' && searchAllMonths) ||
    Boolean(query.trim()) ||
    categoryFilter !== 'Todas as categorias' ||
    methodFilter !== 'Todos os pagamentos' ||
    cardFilter !== 'Todos os cartões'

  const clearAllFilters = () => {
    setQuery('')
    setSearchAllMonths(false)
    setCategoryFilter('Todas as categorias')
    setMethodFilter('Todos os pagamentos')
    setCardFilter('Todos os cartões')
    setSortOrder('date-desc')
  }

  const filteredPersonalTotal = filtered.reduce((sum, e) => sum + personalValue(e), 0)
  const filteredReimbursementTotal = filtered.reduce((sum, e) => sum + e.allocatedShares.filter(sh => !sh.paid).reduce((s, sh) => s + sh.amount, 0), 0)
  const filteredInvoiceTotal = filtered.reduce((sum, e) => sum + e.value, 0)
  const filteredExpenseIds = Array.from(new Set(filtered.map(e => e.id)))
  const selectedVisibleIds = filteredExpenseIds.filter(id => selectedExpenseIds.includes(id))
  const allVisibleSelected = filteredExpenseIds.length > 0 && selectedVisibleIds.length === filteredExpenseIds.length
  const allReimbursements = data.reimbursements || []
  const currentReimbursements = allReimbursements.filter(r => r.month === month)
  const manualReimbursementTotal = Math.round(currentReimbursements.reduce((sum, r) => sum + r.amount, 0) * 100) / 100
  const rawPersonalTotal = currentExpenses.reduce((sum, e) => sum + personalValue(e), 0)
  const total = Math.max(0, Math.round((rawPersonalTotal - manualReimbursementTotal) * 100) / 100)
  const monthlyLimitValue = Math.max(0, Number(monthlyLimit) || 0)
  const limitNoticePercentValue = Math.min(100, Math.max(1, Number(limitNoticePercent) || 80))
  const monthlyLimitProgress = monthlyLimitValue ? (total / monthlyLimitValue) * 100 : 0
  const monthlyLimitNotice = monthlyLimitValue > 0 && total >= (monthlyLimitValue * limitNoticePercentValue) / 100
  const reimbursementTotal =
    Math.round(
      (currentExpenses.reduce((sum, e) => sum + e.allocatedShares.filter(sh => !sh.paid).reduce((shareSum, share) => shareSum + share.amount, 0), 0) + manualReimbursementTotal) * 100,
    ) / 100
  const categoryTotals = data.categories
    .map(c => {
      const catExpensesPersonal = currentExpenses.filter(e => e.category === c.id).reduce((s, e) => s + personalValue(e), 0)
      const catManualOffset = currentReimbursements.filter(r => r.categoryId === c.id).reduce((s, r) => s + r.amount, 0)
      return { ...c, total: Math.max(0, Math.round((catExpensesPersonal - catManualOffset) * 100) / 100) }
    })
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
  const reimbursementByParticipant = [...(data.participants || []), { id: QUICK_THIRD_PARTY_ID, name: QUICK_THIRD_PARTY_NAME }]
    .map(participant => ({
      participant,
      current:
        Math.round(
          (currentExpenses.reduce(
            (sum, e) => sum + e.allocatedShares.filter(s => s.participantId === participant.id && !s.paid).reduce((a, s) => a + s.amount, 0),
            0,
          ) +
            currentReimbursements.filter(r => r.participantId === participant.id).reduce((s, r) => s + r.amount, 0)) *
            100,
        ) / 100,
      paidCurrent:
        Math.round(
          currentExpenses.reduce(
            (sum, e) => sum + e.allocatedShares.filter(s => s.participantId === participant.id && s.paid).reduce((a, s) => a + s.amount, 0),
            0,
          ) * 100,
        ) / 100,
      future:
        Math.round(
          (occurrences
            .filter(e => e.month > month)
            .reduce((sum, e) => sum + e.allocatedShares.filter(s => s.participantId === participant.id && !s.paid).reduce((a, s) => a + s.amount, 0), 0) +
            allReimbursements.filter(r => r.month > month && r.participantId === participant.id).reduce((s, r) => s + r.amount, 0)) *
            100,
        ) / 100,
    }))
    .filter(x => x.current > 0 || x.paidCurrent > 0 || x.future > 0)
  const nextMonths = Array.from({ length: 5 }, (_, i) => shiftMonthKey(month, i))
  const nextMonthKey = shiftMonthKey(month, 1)
  const cardSummaries = data.cards.map(card => {
    const cardOccurrences = currentExpenses.filter(e => e.method.startsWith('Crédito') && (e.cardId || data.cards[0]?.id) === card.id)
    const nextCardOccurrences = occurrences.filter(e => e.month === nextMonthKey && e.method.startsWith('Crédito') && (e.cardId || data.cards[0]?.id) === card.id)
    const invoiceTotal = cardOccurrences.reduce((sum, e) => sum + e.value, 0)
    const rawCardPersonal = cardOccurrences.reduce((sum, e) => sum + personalValue(e), 0)
    const rawCardShared = cardOccurrences.reduce((sum, e) => sum + e.allocatedShares.reduce((s, sh) => s + sh.amount, 0), 0)
    const manualCardOffset = currentReimbursements.filter(r => r.cardId === card.id).reduce((s, r) => s + r.amount, 0)
    const personalPart = Math.max(0, Math.round((rawCardPersonal - manualCardOffset) * 100) / 100)
    const sharedPart = Math.round((rawCardShared + manualCardOffset) * 100) / 100
    const nextInvoiceTotal = nextCardOccurrences.reduce((sum, e) => sum + e.value, 0)
    return { card, invoiceTotal, personalPart, sharedPart, count: cardOccurrences.length, nextInvoiceTotal }
  })
  const openCardTransactions = (cardId: string) => {
    setQuery('')
    setCategoryFilter('Todas as categorias')
    setMethodFilter('Crédito (todos)')
    setCardFilter(cardId)
    setView('Lançamentos')
  }
  const daysSinceBackup = lastBackupAt ? Math.max(0, Math.floor((nowTimestamp - new Date(lastBackupAt).getTime()) / 86400000)) : null
  const backupReminderMessage =
    !storageWarning && !onboardingOpen && data.expenses.length > 0 && nowTimestamp >= backupSnoozeUntil
      ? !lastBackupAt && changesSinceBackup >= 3
        ? 'Você já registrou novos lançamentos e ainda não baixou um backup de segurança neste dispositivo.'
        : daysSinceBackup !== null && daysSinceBackup >= 15
          ? `Faz ${daysSinceBackup} dias desde o seu último backup. Baixe uma cópia atualizada para proteger seus dados.`
          : changesSinceBackup >= 5
            ? `Você fez ${changesSinceBackup} alterações desde o último backup. Que tal baixar uma cópia atualizada?`
            : ''
      : ''
  const previousMonth = shiftMonthKey(month, -1)
  const previousMonthOccurrences = occurrences.filter(e => e.month === previousMonth)
  const previousMonthManualOffset = allReimbursements.filter(r => r.month === previousMonth).reduce((s, r) => s + r.amount, 0)
  const previousTotal = Math.max(0, Math.round((previousMonthOccurrences.reduce((s, e) => s + personalValue(e), 0) - previousMonthManualOffset) * 100) / 100)
  const monthChange = previousTotal ? ((total - previousTotal) / previousTotal) * 100 : null
  const upcomingTotal = occurrences.filter(e => e.month > month).reduce((s, e) => s + personalValue(e), 0)
  const installmentRelief = useMemo(() => buildInstallmentRelief(occurrences, month), [occurrences, month])

  const reportCategoryRanking = data.categories
    .map(category => {
      const items = currentExpenses.filter(e => e.category === category.id)
      const catManualOffset = currentReimbursements.filter(r => r.categoryId === category.id).reduce((s, r) => s + r.amount, 0)
      const prevCatManualOffset = allReimbursements
        .filter(r => r.month === previousMonth && r.categoryId === category.id)
        .reduce((s, r) => s + r.amount, 0)
      const catTotal = Math.max(0, Math.round((items.reduce((s, e) => s + personalValue(e), 0) - catManualOffset) * 100) / 100)
      const prevCatTotal = Math.max(
        0,
        Math.round((previousMonthOccurrences.filter(e => e.category === category.id).reduce((s, e) => s + personalValue(e), 0) - prevCatManualOffset) * 100) / 100,
      )
      const percentage = total > 0 ? Math.round((catTotal / total) * 100) : 0
      const diffPercent = prevCatTotal > 0 ? Math.round(((catTotal - prevCatTotal) / prevCatTotal) * 100) : null
      return { ...category, count: items.length, total: catTotal, prevTotal: prevCatTotal, percentage, diffPercent }
    })
    .filter(c => c.total > 0 || c.prevTotal > 0)
    .sort((a, b) => b.total - a.total || b.prevTotal - a.prevTotal)

  const reportMethods = (['PIX', 'Débito', 'Dinheiro', 'Crédito à vista', 'Crédito parcelado'] as const).map(methodName => {
    const items = currentExpenses.filter(e => e.method === methodName)
    const methodPersonal = items.reduce((s, e) => s + personalValue(e), 0)
    const methodGross = items.reduce((s, e) => s + e.value, 0)
    const percentage = total > 0 ? Math.round((methodPersonal / total) * 100) : 0
    return { method: methodName, count: items.length, personalTotal: methodPersonal, grossTotal: methodGross, percentage, isCredit: methodName.startsWith('Crédito') }
  })
  const directPersonalTotal = reportMethods.filter(m => !m.isCredit).reduce((s, m) => s + m.personalTotal, 0)
  const creditPersonalTotal = Math.max(0, Math.round((reportMethods.filter(m => m.isCredit).reduce((s, m) => s + m.personalTotal, 0) - manualReimbursementTotal) * 100) / 100)
  const directSharePercent = total > 0 ? Math.round((directPersonalTotal / total) * 100) : 0
  const creditSharePercent = total > 0 ? Math.max(0, 100 - directSharePercent) : 0
  const installmentOccurrences = currentExpenses.filter(e => e.installments > 1)
  const installmentPersonalTotal = installmentOccurrences.reduce((s, e) => s + personalValue(e), 0)
  const installmentSharePercent = total > 0 ? Math.round((installmentPersonalTotal / total) * 100) : 0
  const biggestPersonalExpense = [...currentExpenses].sort((a, b) => personalValue(b) - personalValue(a))[0]
  const averagePersonalTicket = currentExpenses.length > 0 ? total / currentExpenses.length : 0
  const trendYears = Array.from(new Set(occurrences.map(e => e.month.slice(0, 4)))).sort((a, b) => b.localeCompare(a))
  const currentYear = String(today.getFullYear())
  const activeTrendYear = trendYears.includes(trendYear) ? trendYear : trendYears.includes(currentYear) ? currentYear : trendYears[0] || currentYear
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const key = `${activeTrendYear}-${String(i + 1).padStart(2, '0')}`
    const monthManualOffset = allReimbursements.filter(r => r.month === key).reduce((s, r) => s + r.amount, 0)
    const rawMonthPersonal = occurrences.filter(e => e.month === key).reduce((s, e) => s + personalValue(e), 0)
    return { month: key, total: Math.max(0, Math.round((rawMonthPersonal - monthManualOffset) * 100) / 100) }
  })
  const trendYearTotal = monthlyTrend.reduce((sum, item) => sum + item.total, 0)

  useEffect(() => {
    if (view !== 'Visão geral') return
    const chart = trendChartRef.current
    if (!chart) return
    const focusMonth = activeTrendYear === currentYear ? monthKey(today) : `${activeTrendYear}-01`
    const target = chart.querySelector<HTMLElement>(`[data-month="${focusMonth}"]`)
    if (target) {
      chart.scrollTo({
        left: Math.max(0, chart.scrollLeft + target.getBoundingClientRect().left - chart.getBoundingClientRect().left - (chart.clientWidth - target.offsetWidth) / 2),
        behavior: 'smooth',
      })
    }
  }, [activeTrendYear, currentYear, view])

  const categoryTotal = categoryTotals.reduce((sum, c) => sum + c.total, 0)
  const pieSlices = categoryTotals.reduce<Array<{ category: Category & { total: number }; start: number; end: number; percentage: number }>>((slices, category) => {
    const start = slices.at(-1)?.end || 0
    const end = start + (category.total / categoryTotal) * 360
    return [...slices, { category, start, end, percentage: Math.round((category.total / categoryTotal) * 100) }]
  }, [])
  const hoveredCategory = pieSlices.find(slice => slice.category.id === hoveredCategoryId)

  const closeActionMenu = (event: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
    event.currentTarget.closest('details')?.removeAttribute('open')
    action()
  }
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('nexus-theme', next)
    setTheme(next)
    setDefaultTheme(next)
  }
  const closeEasterEgg = () =>
    closeModalWithAnimation('easter-egg', () => {
      setEasterEggOpen(false)
      setEasterEggPassword('')
      setEasterEggMessage('')
      setEasterEggError(false)
      setEasterEggShake(false)
    })
  const submitEasterEgg = (event: React.FormEvent) => {
    event.preventDefault()
    const secretMessage = getEasterEggSecret(easterEggPassword)
    if (!secretMessage) {
      setEasterEggError(true)
      setEasterEggShake(false)
      window.requestAnimationFrame(() => setEasterEggShake(true))
      easterEggInputRef.current?.focus()
      return
    }
    setEasterEggError(false)
    setEasterEggShake(false)
    setEasterEggMessage(secretMessage)
  }
  useEffect(() => {
    localStorage.setItem('poe-na-conta-last-view', view)
  }, [view])
  useEffect(() => {
    localStorage.setItem('poe-na-conta-overview-mode', overviewMode)
  }, [overviewMode])

  const updateDefaultTheme = (next: 'light' | 'dark') => {
    setDefaultTheme(next)
    setTheme(next)
    localStorage.setItem('nexus-theme', next)
  }
  const updateProfileName = (value: string) => {
    setProfileName(value)
    localStorage.setItem('poe-na-conta-profile-name', value)
  }
  const updatePixKey = (value: string) => {
    setPixKey(value)
    localStorage.setItem('poe-na-conta-pix-key', value)
  }
  const updateProfilePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setProfileMessage('Escolha uma imagem PNG, JPG ou WebP de até 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      try {
        localStorage.setItem('poe-na-conta-profile-photo', reader.result)
        setProfilePhoto(reader.result)
        setProfileMessage('Foto de perfil atualizada.')
      } catch {
        setProfileMessage('Não foi possível salvar essa imagem. Tente uma foto menor.')
      }
    }
    reader.onerror = () => setProfileMessage('Não foi possível ler a imagem selecionada.')
    reader.readAsDataURL(file)
  }
  const removeProfilePhoto = () => {
    localStorage.removeItem('poe-na-conta-profile-photo')
    setProfilePhoto('')
    setProfileMessage('Foto removida. As iniciais serão exibidas no perfil.')
  }
  const updateMonthlyLimit = (value: string) => {
    setMonthlyLimit(value)
    localStorage.setItem('poe-na-conta-monthly-limit', value)
  }
  const updateLimitNoticePercent = (value: string) => {
    const bounded = value === '' ? '' : String(Math.round(Math.min(100, Math.max(1, Number(value) || 80))))
    setLimitNoticePercent(bounded)
    localStorage.setItem('poe-na-conta-limit-notice-percent', bounded)
  }

  const recurrences = data.recurrences || []

  const matchesRecurrenceInMonth = (expense: Expense, recurrence: Recurrence, targetMonth: string): boolean => {
    const expMonth = expense.recurrenceMonth || expense.date.slice(0, 7)
    const inTargetMonth = expMonth === targetMonth || expense.firstMonth === targetMonth
    if (!inTargetMonth) return false
    if (expense.recurrenceId) return expense.recurrenceId === recurrence.id
    return (
      expense.installments === 1 &&
      expense.description.trim().toLowerCase() === recurrence.description.trim().toLowerCase()
    )
  }

  const buildRecurrenceExpense = (item: Recurrence, targetMonth: string, existing?: Expense): Expense => {
    const maxDay = new Date(Number(targetMonth.slice(0, 4)), Number(targetMonth.slice(5)), 0).getDate()
    const date = `${targetMonth}-${String(Math.min(item.day, maxDay)).padStart(2, '0')}`
    const card = item.method.startsWith('Crédito') ? data.cards.find(value => value.id === item.cardId) || data.cards[0] : undefined
    const firstMonth = item.method.startsWith('Crédito') && card && !isManualBillingCard(card) ? calculateCardDueMonth(date, card) : targetMonth
    return {
      id: existing?.id || createId(),
      description: item.description,
      amount: item.amount,
      date,
      category: item.category,
      method: item.method,
      cardId: card?.id,
      installments: 1,
      firstMonth,
      recurrenceId: item.id,
      recurrenceMonth: targetMonth,
      ...(existing?.shares ? { shares: existing.shares } : {}),
    }
  }

  const pendingRecurrences = recurrences.filter(
    item =>
      item.active &&
      !item.generatedMonths.includes(month) &&
      !item.skippedMonths.includes(month) &&
      !data.expenses.some(exp => matchesRecurrenceInMonth(exp, item, month)),
  )
  const selectedRecurrences = recurrenceSelection ?? pendingRecurrences.map(item => item.id)

  const openRecurrence = (item?: Recurrence) => {
    setRecurrenceErrors({})
    const preferredCard = getPreferredCard()
    setRecurrenceEditor({
      id: item?.id,
      description: item?.description || '',
      amount: item ? formatMoneyInput(item.amount) : '',
      category: item?.category || data.categories[0]?.id || '',
      method: item?.method || 'PIX',
      cardId: item?.cardId || preferredCard?.id || '',
      day: String(item?.day || 1),
    })
  }
  const closeRecurrenceModal = () =>
    closeModalWithAnimation('recurrence', () => {
      setRecurrenceEditor(null)
      setRecurrenceErrors({})
    })
  const saveRecurrence = (event: React.FormEvent) => {
    event.preventDefault()
    if (!recurrenceEditor) return
    const nextErrors: Record<string, string> = {}
    if (!recurrenceEditor.description.trim()) nextErrors.description = 'Informe uma descrição para a recorrência.'
    const amount = parseMoneyInput(recurrenceEditor.amount)
    if (!recurrenceEditor.amount.trim()) nextErrors.amount = 'Informe o valor mensal.'
    else if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = 'Informe um valor maior que zero.'
    const day = Number(recurrenceEditor.day)
    if (!recurrenceEditor.day.trim() || !Number.isInteger(day) || day < 1 || day > 31) nextErrors.day = 'Informe um dia entre 1 e 31.'
    if (Object.keys(nextErrors).length > 0) {
      setRecurrenceErrors(nextErrors)
      triggerFormShake('recurrence')
      return
    }
    setRecurrenceErrors({})
    const previous = recurrenceEditor.id ? recurrences.find(value => value.id === recurrenceEditor.id) : undefined
    const baseItem: Recurrence = {
      id: recurrenceEditor.id || createId(),
      description: recurrenceEditor.description.trim(),
      amount,
      category: recurrenceEditor.category || data.categories[0]?.id || '',
      method: recurrenceEditor.method,
      cardId: recurrenceEditor.method.startsWith('Crédito') ? recurrenceEditor.cardId || data.cards[0]?.id || undefined : undefined,
      day,
      active: previous?.active ?? true,
      generatedMonths: previous?.generatedMonths || [],
      skippedMonths: previous?.skippedMonths || [],
    }
    const existingMonthExpense = data.expenses.find(
      exp => (previous && matchesRecurrenceInMonth(exp, previous, month)) || matchesRecurrenceInMonth(exp, baseItem, month),
    )
    const shouldEnsureGeneratedInMonth = Boolean(existingMonthExpense && !baseItem.generatedMonths.includes(month))
    const item: Recurrence = shouldEnsureGeneratedInMonth
      ? { ...baseItem, generatedMonths: [...baseItem.generatedMonths, month] }
      : baseItem
    const updatedExpenses = existingMonthExpense
      ? data.expenses.map(exp => (exp.id === existingMonthExpense.id ? buildRecurrenceExpense(item, month, exp) : exp))
      : data.expenses
    if (
      save({
        ...data,
        expenses: updatedExpenses,
        recurrences: recurrenceEditor.id ? recurrences.map(value => (value.id === item.id ? item : value)) : [...recurrences, item],
      })
    ) {
      showToast(
        recurrenceEditor.id
          ? existingMonthExpense
            ? 'Recorrência e lançamento do mês atualizados.'
            : 'Recorrência atualizada.'
          : existingMonthExpense
            ? 'Recorrência criada e vinculada ao lançamento do mês.'
            : 'Recorrência criada.',
      )
      closeRecurrenceModal()
    }
  }
  const toggleRecurrenceActive = (item: Recurrence) => {
    const nextActive = !item.active
    if (!nextActive) {
      const remainingExpenses = data.expenses.filter(exp => !matchesRecurrenceInMonth(exp, item, month))
      const removedFromMonth = remainingExpenses.length !== data.expenses.length
      const updatedItem: Recurrence = {
        ...item,
        active: false,
        generatedMonths: item.generatedMonths.filter(m => m !== month),
      }
      if (
        save({
          ...data,
          expenses: remainingExpenses,
          recurrences: recurrences.map(value => (value.id === item.id ? updatedItem : value)),
        })
      ) {
        showToast(removedFromMonth ? 'Recorrência pausada e removida das despesas deste mês.' : 'Recorrência pausada.')
      }
    } else {
      const existingInMonth = data.expenses.find(exp => matchesRecurrenceInMonth(exp, item, month))
      const nextGenerated = item.generatedMonths.includes(month) ? item.generatedMonths : [...item.generatedMonths, month]
      const updatedItem: Recurrence = {
        ...item,
        active: true,
        generatedMonths: nextGenerated,
        skippedMonths: item.skippedMonths.filter(m => m !== month),
      }
      const nextExpenses = existingInMonth
        ? data.expenses.map(exp => (exp.id === existingInMonth.id ? buildRecurrenceExpense(updatedItem, month, exp) : exp))
        : [buildRecurrenceExpense(updatedItem, month), ...data.expenses]
      if (
        save({
          ...data,
          expenses: nextExpenses,
          recurrences: recurrences.map(value => (value.id === item.id ? updatedItem : value)),
        })
      ) {
        showToast('Recorrência reativada e lançada neste mês.')
      }
    }
  }
  const confirmRecurrences = () => {
    const chosen = pendingRecurrences.filter(item => selectedRecurrences.includes(item.id))
    if (!chosen.length) return
    const generated: Expense[] = chosen.map(item => buildRecurrenceExpense(item, month))
    const ids = new Set(chosen.map(item => item.id))
    if (
      save({
        ...data,
        expenses: [...generated, ...data.expenses],
        recurrences: recurrences.map(item => (ids.has(item.id) ? { ...item, generatedMonths: [...item.generatedMonths, month] } : item)),
      })
    ) {
      showToast(chosen.length === 1 ? '1 recorrência lançada no mês.' : `${chosen.length} recorrências lançadas no mês.`)
    }
    setRecurrenceSelection(null)
  }
  const skipRecurrence = (id: string) => {
    setRecurrenceSelection(selectedRecurrences.filter(value => value !== id))
    save({ ...data, recurrences: recurrences.map(item => (item.id === id ? { ...item, skippedMonths: [...item.skippedMonths, month] } : item)) })
  }

  const addExpense = (ev: React.FormEvent) => {
    ev.preventDefault()
    const nextErrors: Record<string, string> = {}
    const description = form.description.trim()
    if (!description) nextErrors.description = 'Informe uma descrição para o lançamento.'
    const amount = parseMoneyInput(form.amount)
    if (!form.amount.trim()) nextErrors.amount = 'Informe o valor da despesa.'
    else if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = 'Informe um valor maior que zero (ex.: 150,50).'
    const normalizedDate = normalizeDateInput(form.date)
    if (!form.date.trim() || !isDate(normalizedDate)) nextErrors.date = 'Informe uma data válida.'
    const rawInstallments = Number(form.installments)
    const n = Math.round(rawInstallments || 1)
    if (form.method === 'Crédito parcelado' && (!form.installments.trim() || !Number.isInteger(rawInstallments) || n < 2 || n > 60)) {
      nextErrors.installments = 'Informe entre 2 e 60 parcelas.'
    }
    for (const share of form.shares) {
      if (!share.amount.trim()) {
        nextErrors[`share-${share.participantId}`] = 'Informe o valor desta pessoa ou desmarque-a.'
      } else {
        const parsedShare = parseMoneyInput(share.amount)
        if (!Number.isFinite(parsedShare) || parsedShare <= 0) {
          nextErrors[`share-${share.participantId}`] = 'Informe um valor válido maior que zero.'
        }
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      if (Object.keys(nextErrors).some(key => key.startsWith('share-'))) {
        setParticipantsSectionOpen(true)
      }
      setExpenseErrors(nextErrors)
      setShareError('')
      triggerFormShake('expense')
      return
    }
    const count = form.method === 'Crédito parcelado' ? Math.max(1, n) : 1
    const previousExpense = editingExpenseId ? data.expenses.find(e => e.id === editingExpenseId) : undefined
    const shares: ParticipantShare[] = form.shares
      .map(share => {
        const prevShare = previousExpense?.shares?.find(ps => ps.participantId === share.participantId)
        const keptPaid = prevShare?.paidInstallments?.filter(inst => inst >= 1 && inst <= count)
        return {
          participantId: share.participantId,
          amount: parseMoneyInput(share.amount) || 0,
          installment: form.method === 'Crédito parcelado' && share.installment !== 'all' ? Number(share.installment) : undefined,
          ...(keptPaid && keptPaid.length > 0 ? { paidInstallments: keptPaid } : {}),
        }
      })
      .filter(share => share.amount > 0)
    const totalCents = Math.round(amount * 100)
    const partValues = Array.from({ length: count }, (_, i) => Math.floor(totalCents / count) + (i < totalCents % count ? 1 : 0))
    const allocated = Array.from({ length: count }, () => 0)
    for (const share of shares) {
      const cents = Math.round(share.amount * 100)
      if (share.installment && share.installment > count) {
        setParticipantsSectionOpen(true)
        setShareError('Uma atribuição aponta para uma parcela que não existe. Ajuste o número de parcelas ou a seleção.')
        triggerFormShake('expense')
        return
      }
      if (share.installment) allocated[share.installment - 1] += cents
      else for (let i = 0; i < count; i++) allocated[i] += Math.floor(cents / count) + (i < cents % count ? 1 : 0)
    }
    if (allocated.some((cents, i) => cents > partValues[i])) {
      setParticipantsSectionOpen(true)
      setShareError('A soma atribuída aos participantes não pode superar o valor da parcela correspondente.')
      triggerFormShake('expense')
      return
    }
    setExpenseErrors({})
    setShareError('')
    const card = form.method.startsWith('Crédito') ? data.cards.find(c => c.id === form.cardId) || getPreferredCard() : undefined
    if (card?.id) rememberCard(card.id)
    const isManualCard = isManualBillingCard(card)
    const resolvedFirstMonthMode: FirstMonthMode = isManualCard ? (form.firstMonthMode === 'auto' ? 'next' : form.firstMonthMode) : 'auto'
    const basePurchaseMonth = normalizedDate.slice(0, 7)
    const manualMonth =
      form.method.startsWith('Crédito') && isManualCard
        ? resolvedFirstMonthMode === 'current'
          ? basePurchaseMonth
          : resolvedFirstMonthMode === 'plus2'
            ? shiftMonthKey(basePurchaseMonth, 2)
            : shiftMonthKey(basePurchaseMonth, 1)
        : undefined
    const onClosingDay = Boolean(card && !isManualCard && Number(normalizedDate.slice(-2)) === card.closingDay)
    const firstMonth = manualMonth || expenseFirstMonth(normalizedDate, form.method, card, onClosingDay ? form.afterClosing : undefined)
    const linkedRecurrence = previousExpense
      ? recurrences.find(rec => matchesRecurrenceInMonth(previousExpense, rec, previousExpense.recurrenceMonth || previousExpense.date.slice(0, 7)))
      : undefined
    const entry: Expense = {
      id: editingExpenseId || createId(),
      description,
      amount,
      date: normalizedDate,
      category: form.category || data.categories[0]?.id || '',
      method: form.method,
      cardId: card?.id,
      installments: form.method === 'Crédito parcelado' ? Math.max(1, n) : 1,
      firstMonth,
      ...(manualMonth ? { manualFirstMonth: true } : {}),
      ...(onClosingDay ? { afterClosing: form.afterClosing } : {}),
      ...(linkedRecurrence ? { recurrenceId: linkedRecurrence.id, recurrenceMonth: previousExpense?.recurrenceMonth || normalizedDate.slice(0, 7) } : {}),
      shares,
    }
    const syncedRecurrences =
      linkedRecurrence && entry.installments === 1
        ? recurrences.map(rec =>
            rec.id === linkedRecurrence.id
              ? {
                  ...rec,
                  description: entry.description,
                  amount: entry.amount,
                  category: entry.category,
                  method: entry.method,
                  cardId: entry.cardId,
                }
              : rec,
          )
        : recurrences
    if (
      !save({
        ...data,
        expenses: editingExpenseId ? data.expenses.map(e => (e.id === editingExpenseId ? entry : e)) : [entry, ...data.expenses],
        ...(linkedRecurrence ? { recurrences: syncedRecurrences } : {}),
      })
    )
      return
    const nextCard = card || getPreferredCard()
    if (!editingExpenseId && keepExpenseModalOpen) {
      if (firstMonth !== month) {
        showToast(`Lançamento salvo em ${monthName(firstMonth)}. Pronto para o próximo!`)
      } else {
        showToast('Lançamento adicionado! Pronto para o próximo.')
      }
      setShareError('')
      setExpenseErrors({})
      setParticipantsSectionOpen(false)
      setForm({
        ...form,
        description: '',
        amount: '',
        date: normalizedDate,
        category: entry.category,
        cardId: nextCard?.id || '',
        installments: '2',
        afterClosing: (nextCard?.closingDayRule ?? 'after') !== 'before',
        firstMonthMode: isManualBillingCard(nextCard) ? 'next' : 'auto',
        shares: [],
      })
      if (!isTouchDevice()) {
        window.requestAnimationFrame(() => expenseDescInputRef.current?.focus())
      }
      return
    }
    if (editingExpenseId) {
      showToast('Alterações salvas no lançamento.')
    } else if (firstMonth !== month) {
      showToast(`Lançamento salvo em ${monthName(firstMonth)}.`)
    } else {
      showToast('Lançamento adicionado.')
    }
    closeModalWithAnimation('expense', () => {
      setModal(false)
      setEditingExpenseId(null)
      setShareError('')
      setExpenseErrors({})
      setForm({
        ...form,
        description: '',
        amount: '',
        date: normalizedDate,
        category: entry.category,
        cardId: nextCard?.id || '',
        installments: '2',
        afterClosing: (nextCard?.closingDayRule ?? 'after') !== 'before',
        firstMonthMode: isManualBillingCard(nextCard) ? 'next' : 'auto',
        shares: [],
      })
    })
  }

  const editExpense = (expense: Expense) => {
    const expenseCard = data.cards.find(c => c.id === expense.cardId) || data.cards[0]
    const hasShares = (expense.shares || []).length > 0
    const baseMonth = expense.date.slice(0, 7)
    const editFirstMonthMode: FirstMonthMode =
      isManualBillingCard(expenseCard)
        ? expense.firstMonth === baseMonth
          ? 'current'
          : expense.firstMonth === shiftMonthKey(baseMonth, 2)
            ? 'plus2'
            : 'next'
        : 'auto'
    setEditingExpenseId(expense.id)
    setParticipantsSectionOpen(hasShares)
    setForm({
      description: expense.description,
      amount: formatMoneyInput(expense.amount),
      date: expense.date,
      category: expense.category || data.categories[0]?.id || '',
      method: expense.method,
      cardId: expense.cardId || expenseCard?.id || '',
      installments: String(expense.installments > 1 ? expense.installments : 2),
      afterClosing: expense.afterClosing ?? (expenseCard?.closingDayRule ?? 'after') !== 'before',
      firstMonthMode: editFirstMonthMode,
      shares: (expense.shares || []).map(share => ({
        participantId: share.participantId,
        amount: formatMoneyInput(share.amount),
        installment: share.installment ? String(share.installment) : 'all',
      })),
    })
    setShareError('')
    setExpenseErrors({})
    setModal(true)
  }

  const duplicateExpense = (expense: Expense) => {
    const expenseCard = data.cards.find(c => c.id === expense.cardId) || data.cards[0]
    const hasShares = (expense.shares || []).length > 0
    setEditingExpenseId(null)
    setParticipantsSectionOpen(hasShares)
    setForm({
      description: expense.description,
      amount: formatMoneyInput(expense.amount),
      date: dateKey(today),
      category: expense.category || data.categories[0]?.id || '',
      method: expense.method,
      cardId: expense.cardId || expenseCard?.id || '',
      installments: String(expense.installments > 1 ? expense.installments : 2),
      afterClosing: (expenseCard?.closingDayRule ?? 'after') !== 'before',
      firstMonthMode: isManualBillingCard(expenseCard) ? 'next' : 'auto',
      shares: (expense.shares || []).map(share => ({
        participantId: share.participantId,
        amount: formatMoneyInput(share.amount),
        installment: share.installment ? String(share.installment) : 'all',
      })),
    })
    setShareError('')
    setExpenseErrors({})
    setModal(true)
  }

  const closeExpenseModal = () =>
    closeModalWithAnimation('expense', () => {
      setModal(false)
      setEditingExpenseId(null)
      setShareError('')
      setExpenseErrors({})
    })
  const closeConfirmDialog = () => closeModalWithAnimation('confirm', () => setConfirmDialog(null))
  const deleteExpense = (id: string) => {
    const target = data.expenses.find(e => e.id === id)
    const expMonth = target ? target.recurrenceMonth || target.date.slice(0, 7) : ''
    const updatedRecurrences = target
      ? recurrences.map(rec => (matchesRecurrenceInMonth(target, rec, expMonth) ? { ...rec, generatedMonths: rec.generatedMonths.filter(m => m !== expMonth) } : rec))
      : recurrences
    if (save({ ...data, expenses: data.expenses.filter(e => e.id !== id), recurrences: updatedRecurrences })) {
      setSelectedExpenseIds(current => current.filter(item => item !== id))
      showToast('Lançamento excluído.')
    }
  }
  const toggleSelectExpense = (id: string, checked: boolean) => {
    setSelectedExpenseIds(current => (checked ? (current.includes(id) ? current : [...current, id]) : current.filter(item => item !== id)))
  }
  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedExpenseIds(current => {
      if (checked) return Array.from(new Set([...current, ...filteredExpenseIds]))
      const visibleSet = new Set(filteredExpenseIds)
      return current.filter(id => !visibleSet.has(id))
    })
  }
  const deleteSelectedExpenses = () => {
    if (!selectedVisibleIds.length) return
    const idsToDelete = [...selectedVisibleIds]
    const count = idsToDelete.length
    setConfirmDialog({
      eyebrow: 'CONFIRMAR EXCLUSÃO',
      title: count === 1 ? 'Excluir lançamento selecionado?' : `Excluir ${count} lançamentos selecionados?`,
      description:
        count === 1
          ? 'O lançamento selecionado será removido permanentemente da sua lista de despesas.'
          : `Os ${count} lançamentos selecionados serão removidos permanentemente da sua lista de despesas.`,
      confirmLabel: count === 1 ? 'Excluir lançamento' : `Excluir ${count} lançamentos`,
      onConfirm: () => {
        const toDelete = new Set(idsToDelete)
        const removedExpenses = data.expenses.filter(e => toDelete.has(e.id))
        const updatedRecurrences = recurrences.map(rec => {
          const monthsToRemove = new Set(
            removedExpenses
              .map(exp => exp.recurrenceMonth || exp.date.slice(0, 7))
              .filter(expMonth => removedExpenses.some(exp => matchesRecurrenceInMonth(exp, rec, expMonth))),
          )
          return monthsToRemove.size > 0 ? { ...rec, generatedMonths: rec.generatedMonths.filter(m => !monthsToRemove.has(m)) } : rec
        })
        if (save({ ...data, expenses: data.expenses.filter(e => !toDelete.has(e.id)), recurrences: updatedRecurrences })) {
          setSelectedExpenseIds(current => current.filter(id => !toDelete.has(id)))
          showToast(count === 1 ? '1 lançamento excluído.' : `${count} lançamentos excluídos.`)
        }
        closeConfirmDialog()
      },
    })
  }
  const downloadCsv = () => {
    const itemsToExport = hasActiveFilters ? filtered : current
    const personalSum = hasActiveFilters ? filteredPersonalTotal : total
    const reimbSum = hasActiveFilters ? filteredReimbursementTotal : reimbursementTotal
    const invoiceSum = itemsToExport.reduce((sum, e) => sum + e.value, 0)
    exportStyledSpreadsheet({
      month,
      theme,
      profileName,
      data,
      items: itemsToExport,
      personalTotal: personalSum,
      reimbursementTotal: reimbSum,
      invoiceTotal: invoiceSum,
      personalValue,
    })
    showToast('Planilha estilizada (.xls) exportada com sucesso.')
  }
  const downloadReportImage = () => {
    const itemsToExport = hasActiveFilters ? filtered : current
    const personalSum = hasActiveFilters ? filteredPersonalTotal : total
    const reimbSum = hasActiveFilters ? filteredReimbursementTotal : reimbursementTotal
    const invoiceSum = itemsToExport.reduce((sum, e) => sum + e.value, 0)
    exportReportImage({
      month,
      theme,
      profileName,
      data,
      items: itemsToExport,
      personalTotal: personalSum,
      reimbursementTotal: reimbSum,
      invoiceTotal: invoiceSum,
      personalValue,
    })
    showToast('Imagem do relatório (.PNG) exportada.')
  }
  const downloadBackup = () => {
    if (storageWarning) {
      showToast('Importe um backup válido antes de baixar uma cópia dos dados.')
      return
    }
    const blob = new Blob(
      [createBackup(data, { monthlyLimit, limitNoticePercent: String(limitNoticePercentValue), defaultView: view, theme, profileName, profilePhoto, pixKey })],
      { type: 'application/json;charset=utf-8' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `poe-na-conta-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    recordBackupCompleted()
    showToast('Backup baixado. Guarde o arquivo em um local seguro.')
  }
  const applyBackupPayload = (payload: BackupPayload) => {
    save(payload.data, true, false)
    recordBackupCompleted()
    if (payload.preferences) {
      const { monthlyLimit: importedLimit, limitNoticePercent: importedPercent, defaultView: importedView, theme: importedTheme } = payload.preferences
      setMonthlyLimit(importedLimit)
      setLimitNoticePercent(importedPercent)
      setView(importedView)
      setTheme(importedTheme)
      setDefaultTheme(importedTheme)
      localStorage.setItem('poe-na-conta-monthly-limit', importedLimit)
      localStorage.setItem('poe-na-conta-limit-notice-percent', importedPercent)
      localStorage.setItem('poe-na-conta-last-view', importedView)
      localStorage.setItem('nexus-theme', importedTheme)
      if (payload.preferences.profileName !== undefined) {
        setProfileName(payload.preferences.profileName)
        localStorage.setItem('poe-na-conta-profile-name', payload.preferences.profileName)
      }
      if (payload.preferences.profilePhoto !== undefined) {
        setProfilePhoto(payload.preferences.profilePhoto)
        if (payload.preferences.profilePhoto) localStorage.setItem('poe-na-conta-profile-photo', payload.preferences.profilePhoto)
        else localStorage.removeItem('poe-na-conta-profile-photo')
      }
      if (payload.preferences.pixKey !== undefined) {
        setPixKey(payload.preferences.pixKey)
        localStorage.setItem('poe-na-conta-pix-key', payload.preferences.pixKey)
      }
    }
    localStorage.setItem('poe-na-conta-onboarded', '1')
    showToast('Backup importado com sucesso.')
  }
  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const imported = parseBackupFile(await file.text())
      if (!imported) {
        showToast('Este arquivo não é um backup válido do Põe na Conta.')
        return
      }
      if (onboardingOpen) {
        applyBackupPayload(imported)
        setProfileMessage('')
        closeModalWithAnimation('onboarding', () => setOnboardingOpen(false))
        return
      }
      setPendingBackupImport(imported)
      showToast('')
    } catch {
      showToast('Não foi possível ler o arquivo selecionado.')
    } finally {
      event.target.value = ''
    }
  }
  const confirmBackupImport = () => {
    if (!pendingBackupImport) return
    applyBackupPayload(pendingBackupImport)
    closeBackupConfirmModal()
  }
  const completeOnboarding = (event: React.FormEvent) => {
    event.preventDefault()
    updateProfileName(profileName.trim())
    if (onboardingStartMode === 'empty') {
      save({ ...structuredClone(seed), expenses: [], recurrences: [] }, true, false)
    } else if (onboardingStartMode === 'demo') {
      save(structuredClone(seed), true, false)
    } else if (!localStorage.getItem('conta-clara-v1')) {
      save(data, true, false)
    }
    setHasExistingData(true)
    localStorage.setItem('poe-na-conta-onboarded', '1')
    setProfileMessage('')
    closeModalWithAnimation('onboarding', () => setOnboardingOpen(false))
  }
  const openResetDataModal = () => {
    setResetConfirmText('')
    setResetConfirmError(false)
    setResetDataModalOpen(true)
  }
  const closeResetDataModal = () =>
    closeModalWithAnimation('reset', () => {
      setResetDataModalOpen(false)
      setResetConfirmText('')
      setResetConfirmError(false)
    })
  const confirmResetAllData = (event: React.FormEvent) => {
    event.preventDefault()
    if (resetConfirmText.trim().toLocaleUpperCase('pt-BR') !== 'EXCLUIR') {
      setResetConfirmError(true)
      triggerFormShake('reset')
      return
    }
    const keysToRemove = [
      'conta-clara-v1',
      'poe-na-conta-onboarded',
      'poe-na-conta-profile-name',
      'poe-na-conta-profile-photo',
      'poe-na-conta-pix-key',
      'poe-na-conta-last-card-id',
      'poe-na-conta-page-size',
      'poe-na-conta-monthly-limit',
      'poe-na-conta-limit-notice-percent',
      'poe-na-conta-last-backup-at',
      'poe-na-conta-changes-since-backup',
      'poe-na-conta-backup-snooze-until',
      'nexus-default-view',
      'nexus-theme',
    ]
    keysToRemove.forEach(key => localStorage.removeItem(key))
    const emptyData: Data = { ...structuredClone(seed), expenses: [], recurrences: [] }
    setHasExistingData(false)
    setData(emptyData)
    setStorageWarning('')
    setProfileName('')
    setProfilePhoto('')
    setPixKey('')
    setLastUsedCardId('')
    setProfileMessage('')
    setMonthlyLimit('')
    setLimitNoticePercent('80')
    setLastBackupAt('')
    setChangesSinceBackup(0)
    setBackupSnoozeUntil(0)
    setView('Visão geral')
    setOverviewMode('expenses')
    setSelectedExpenseIds([])
    setRecurrenceSelection(null)
    setQuery('')
    setCategoryFilter('Todas as categorias')
    setMethodFilter('Todos os pagamentos')
    setCardFilter('Todos os cartões')
    setSortOrder('date-desc')
    setOnboardingStartMode('empty')
    setBackupMessage('')
    closeModalWithAnimation('reset', () => {
      setResetDataModalOpen(false)
      setResetConfirmText('')
      setResetConfirmError(false)
      setOnboardingOpen(true)
    })
  }
  const closeBackupConfirmModal = () => closeModalWithAnimation('backup', () => setPendingBackupImport(null))
  const openCategory = (category?: Category) => {
    setSettingsErrors({})
    setSettingsModal({
      kind: 'category',
      id: category?.id,
      name: category?.name || '',
      color: category?.color || '#6e7f72',
      cardKind: 'bank',
      closingDay: '25',
      dueDay: '5',
      closingDayRule: 'after',
    })
  }
  const openCard = (card?: Card) => {
    setSettingsErrors({})
    setSettingsModal({
      kind: 'card',
      id: card?.id,
      name: card?.name || '',
      color: '#65a987',
      cardKind: card?.kind || 'bank',
      closingDay: String(card?.closingDay || 25),
      dueDay: String(card?.dueDay || 5),
      closingDayRule: card?.closingDayRule || 'after',
    })
  }
  const openParticipant = (participant?: Participant) => {
    setSettingsErrors({})
    setSettingsModal({
      kind: 'participant',
      id: participant?.id,
      name: participant?.name || '',
      color: '#65a987',
      cardKind: 'bank',
      closingDay: '25',
      dueDay: '5',
      closingDayRule: 'after',
    })
  }
  const addParticipantFromExpense = () => {
    setParticipantsSectionOpen(true)
    setReturnToExpenseAfterParticipant(true)
    closeModalWithAnimation('expense', () => {
      setModal(false)
      openParticipant()
    })
  }
  const saveSetting = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!settingsModal) return
    const { kind, id, name, color, cardKind, closingDay, dueDay, closingDayRule } = settingsModal
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) {
      nextErrors.name = kind === 'category' ? 'Informe o nome da categoria.' : kind === 'card' ? 'Informe o nome do cartão ou crédito.' : 'Informe o nome do participante.'
    }
    if (kind === 'category' && !/^#[0-9a-fA-F]{6}$/.test(color.trim())) {
      nextErrors.color = 'Informe uma cor hexadecimal válida (ex.: #6E7F72).'
    }
    const close = Number(closingDay)
    const due = Number(dueDay)
    if (kind === 'card' && cardKind === 'bank') {
      if (!closingDay.trim() || !Number.isInteger(close) || close < 1 || close > 31) nextErrors.closingDay = 'Informe um dia entre 1 e 31.'
      if (!dueDay.trim() || !Number.isInteger(due) || due < 1 || due > 31) nextErrors.dueDay = 'Informe um dia entre 1 e 31.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setSettingsErrors(nextErrors)
      triggerFormShake('settings')
      return
    }
    setSettingsErrors({})
    if (kind === 'category') {
      const category: Category = { id: id || createId(), name: name.trim(), color: color.trim().toLowerCase() }
      if (!save({ ...data, categories: id ? data.categories.map(c => (c.id === id ? category : c)) : [...data.categories, category] })) return
      showToast(id ? 'Categoria atualizada.' : 'Categoria criada.')
    } else if (kind === 'card') {
      const card: Card =
        cardKind === 'store' || cardKind === 'borrowed'
          ? { id: id || createId(), name: name.trim(), kind: cardKind, closingDay: 31, dueDay: 10, closingDayRule: 'after' }
          : { id: id || createId(), name: name.trim(), kind: 'bank', closingDay: close, dueDay: due, closingDayRule: closingDayRule || 'after' }
      const updatedCards = id ? data.cards.map(c => (c.id === id ? card : c)) : [...data.cards, card]
      const updatedExpenses = data.expenses.map(e => {
        if (!e.method.startsWith('Crédito') || e.manualFirstMonth) return e
        const txCard = updatedCards.find(c => c.id === e.cardId) || (e.cardId === undefined ? updatedCards[0] : undefined)
        if (!txCard || txCard.id !== card.id || isManualBillingCard(txCard)) return e
        return { ...e, firstMonth: calculateCardDueMonth(e.date, txCard, e.afterClosing) }
      })
      if (!save({ ...data, cards: updatedCards, expenses: updatedExpenses })) return
      showToast(id ? 'Cartão atualizado.' : 'Cartão criado.')
    } else {
      const participant: Participant = { id: id || createId(), name: name.trim() }
      if (!save({ ...data, participants: id ? (data.participants || []).map(p => (p.id === id ? participant : p)) : [...(data.participants || []), participant] })) return
      showToast(id ? 'Participante atualizado.' : 'Participante adicionado.')
    }
    closeSettingsModal()
  }
  const removeParticipant = (id: string) => {
    const participant = (data.participants || []).find(p => p.id === id)
    setConfirmDialog({
      eyebrow: 'CONFIRMAR EXCLUSÃO',
      title: participant ? `Remover ${participant.name}?` : 'Remover participante?',
      description: 'Este participante será removido e suas atribuições serão apagadas dos lançamentos.',
      confirmLabel: 'Remover participante',
      onConfirm: () => {
        if (
          save({
            ...data,
            participants: (data.participants || []).filter(p => p.id !== id),
            expenses: data.expenses.map(e => ({ ...e, shares: (e.shares || []).filter(share => share.participantId !== id) })),
            ...(data.reimbursements ? { reimbursements: data.reimbursements.filter(r => r.participantId !== id) } : {}),
          })
        ) {
          showToast('Participante removido.')
        }
        closeConfirmDialog()
      },
    })
  }

  const openManualReimbursement = (item?: ManualReimbursement) => {
    setReimbursementErrors({})
    const defaultUberCat =
      data.categories.find(c => c.id === 'cat-uber' || c.name.toLowerCase().includes('uber'))?.id || ''
    const preferredCard = getPreferredCard()
    setReimbursementEditor({
      id: item?.id,
      description: item?.description || '',
      amount: item ? formatMoneyInput(item.amount) : '',
      participantId: item?.participantId || QUICK_THIRD_PARTY_ID,
      cardId: item ? item.cardId || '' : preferredCard?.id || '',
      categoryId: item ? item.categoryId || '' : defaultUberCat,
    })
  }

  const closeManualReimbursementModal = () =>
    closeModalWithAnimation('reimbursement', () => {
      setReimbursementEditor(null)
      setReimbursementErrors({})
    })

  const saveManualReimbursement = (event: React.FormEvent) => {
    event.preventDefault()
    if (!reimbursementEditor) return
    const nextErrors: Record<string, string> = {}
    const description = reimbursementEditor.description.trim()
    if (!description) nextErrors.description = 'Informe uma descrição curta (ex.: Uber com amigos).'
    const amount = parseMoneyInput(reimbursementEditor.amount)
    if (!reimbursementEditor.amount.trim()) nextErrors.amount = 'Informe o valor recebido/abatido.'
    else if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = 'Informe um valor maior que zero (ex.: 45,00).'
    if (Object.keys(nextErrors).length > 0) {
      setReimbursementErrors(nextErrors)
      triggerFormShake('reimbursement')
      return
    }
    setReimbursementErrors({})
    const existingList = data.reimbursements || []
    const previous = reimbursementEditor.id ? existingList.find(r => r.id === reimbursementEditor.id) : undefined
    const entry: ManualReimbursement = {
      id: reimbursementEditor.id || createId(),
      description,
      amount: Math.round(amount * 100) / 100,
      month: previous?.month || month,
      participantId: reimbursementEditor.participantId || QUICK_THIRD_PARTY_ID,
      ...(reimbursementEditor.cardId ? { cardId: reimbursementEditor.cardId } : {}),
      ...(reimbursementEditor.categoryId ? { categoryId: reimbursementEditor.categoryId } : {}),
    }
    const updatedList = reimbursementEditor.id ? existingList.map(r => (r.id === entry.id ? entry : r)) : [entry, ...existingList]
    if (save({ ...data, reimbursements: updatedList })) {
      showToast(reimbursementEditor.id ? 'Abatimento avulso atualizado.' : 'Abatimento avulso aplicado no mês.')
      closeManualReimbursementModal()
    }
  }

  const deleteManualReimbursement = (id: string) => {
    const existingList = data.reimbursements || []
    if (save({ ...data, reimbursements: existingList.filter(r => r.id !== id) })) {
      showToast('Abatimento avulso removido.')
    }
  }

  const toggleParticipantSharePaid = (expenseId: string, part: number, participantId: string) => {
    const updatedExpenses = data.expenses.map(exp => {
      if (exp.id !== expenseId || !exp.shares) return exp
      return {
        ...exp,
        shares: exp.shares.map(sh => {
          if (sh.participantId !== participantId) return sh
          const currentPaid = sh.paidInstallments || []
          const isAlreadyPaid = currentPaid.includes(part)
          const nextPaid = isAlreadyPaid ? currentPaid.filter(p => p !== part) : [...currentPaid, part].sort((a, b) => a - b)
          const rest = { ...sh }
          delete rest.paidInstallments
          return nextPaid.length > 0 ? { ...rest, paidInstallments: nextPaid } : rest
        }),
      }
    })
    save({ ...data, expenses: updatedExpenses })
  }

  const setAllParticipantSharesPaidInMonth = (participantId: string, markPaid: boolean) => {
    const targetsInMonth = new Map<string, number[]>()
    for (const occ of currentExpenses) {
      const hasShare = occ.allocatedShares.some(s => s.participantId === participantId && s.amount > 0)
      if (!hasShare) continue
      const list = targetsInMonth.get(occ.id) || []
      list.push(occ.part)
      targetsInMonth.set(occ.id, list)
    }
    if (targetsInMonth.size === 0) return
    const updatedExpenses = data.expenses.map(exp => {
      const partsInMonth = targetsInMonth.get(exp.id)
      if (!partsInMonth || !exp.shares) return exp
      return {
        ...exp,
        shares: exp.shares.map(sh => {
          if (sh.participantId !== participantId) return sh
          const currentPaid = new Set(sh.paidInstallments || [])
          for (const part of partsInMonth) {
            if (markPaid) currentPaid.add(part)
            else currentPaid.delete(part)
          }
          const nextPaid = Array.from(currentPaid).sort((a, b) => a - b)
          const rest = { ...sh }
          delete rest.paidInstallments
          return nextPaid.length > 0 ? { ...rest, paidInstallments: nextPaid } : rest
        }),
      }
    })
    if (save({ ...data, expenses: updatedExpenses })) {
      showToast(markPaid ? 'Todas as despesas deste mês marcadas como pagas!' : 'Despesas marcadas como pendentes novamente.')
    }
  }

  const computeAdvanceDefaultAmount = (occ: Occurrence, countToAdvance: number): number => {
    const totalInstallments = Math.max(1, occ.installments || 1)
    const keptCount = Math.max(1, totalInstallments - countToAdvance)
    const totalCents = Math.round(occ.amount * 100)
    let keptCents = 0
    for (let i = 0; i < keptCount; i++) {
      keptCents += Math.floor(totalCents / totalInstallments) + (i < totalCents % totalInstallments ? 1 : 0)
    }
    return Math.max(0, totalCents - keptCents) / 100
  }

  const openAdvanceInstallments = (occ: Occurrence) => {
    if (occ.installments <= 1 || occ.part >= occ.installments) return
    const remaining = occ.installments - occ.part
    const defaultAmt = computeAdvanceDefaultAmount(occ, remaining)
    setAdvanceError('')
    setAdvanceEditor({
      occurrence: occ,
      countToAdvance: remaining,
      customAmount: formatMoneyInput(defaultAmt),
    })
  }

  const closeAdvanceModal = () =>
    closeModalWithAnimation('advance', () => {
      setAdvanceEditor(null)
      setAdvanceError('')
    })

  const confirmAdvanceInstallments = (event: React.FormEvent) => {
    event.preventDefault()
    if (!advanceEditor) return
    const { occurrence: occ, countToAdvance, customAmount } = advanceEditor
    const remaining = occ.installments - occ.part
    if (countToAdvance < 1 || countToAdvance > remaining) {
      setAdvanceError(`Escolha entre 1 e ${remaining} parcelas para adiantar.`)
      triggerFormShake('advance')
      return
    }
    const parsedCustom = parseMoneyInput(customAmount)
    if (!customAmount.trim() || !Number.isFinite(parsedCustom) || parsedCustom <= 0) {
      setAdvanceError('Informe um valor válido maior que zero para o adiantamento.')
      triggerFormShake('advance')
      return
    }
    const targetExpense = data.expenses.find(e => e.id === occ.id)
    if (!targetExpense) {
      closeAdvanceModal()
      return
    }
    const totalInstallments = Math.max(1, targetExpense.installments || 1)
    const keptCount = totalInstallments - countToAdvance
    const totalCents = Math.round(targetExpense.amount * 100)
    let keptCents = 0
    for (let i = 0; i < keptCount; i++) {
      keptCents += Math.floor(totalCents / totalInstallments) + (i < totalCents % totalInstallments ? 1 : 0)
    }
    const keptAmount = keptCents / 100

    const keptShares: ParticipantShare[] = []
    const advancedSharesMap = new Map<string, number>()

    for (const sh of targetExpense.shares || []) {
      const shCents = Math.round(sh.amount * 100)
      if (sh.installment) {
        if (sh.installment <= keptCount) {
          const keptPaid = sh.paidInstallments?.filter(p => p <= keptCount)
          keptShares.push({
            participantId: sh.participantId,
            amount: sh.amount,
            installment: sh.installment,
            ...(keptPaid && keptPaid.length ? { paidInstallments: keptPaid } : {}),
          })
        } else {
          advancedSharesMap.set(sh.participantId, (advancedSharesMap.get(sh.participantId) || 0) + shCents)
        }
      } else {
        let shKeptCents = 0
        for (let i = 0; i < keptCount; i++) {
          shKeptCents += Math.floor(shCents / totalInstallments) + (i < shCents % totalInstallments ? 1 : 0)
        }
        const shAdvCents = Math.max(0, shCents - shKeptCents)
        if (shKeptCents > 0) {
          const keptPaid = sh.paidInstallments?.filter(p => p <= keptCount)
          keptShares.push({
            participantId: sh.participantId,
            amount: shKeptCents / 100,
            ...(keptPaid && keptPaid.length ? { paidInstallments: keptPaid } : {}),
          })
        }
        if (shAdvCents > 0) {
          advancedSharesMap.set(sh.participantId, (advancedSharesMap.get(sh.participantId) || 0) + shAdvCents)
        }
      }
    }

    const finalAdvCents = Math.round(parsedCustom * 100)
    const rawAdvSharesTotalCents = Array.from(advancedSharesMap.values()).reduce((a, b) => a + b, 0)
    const advancedShares: ParticipantShare[] = Array.from(advancedSharesMap.entries())
      .map(([participantId, cents]) => {
        const scaledCents = rawAdvSharesTotalCents > finalAdvCents ? Math.floor((cents * finalAdvCents) / rawAdvSharesTotalCents) : cents
        return {
          participantId,
          amount: scaledCents / 100,
        }
      })
      .filter(s => s.amount > 0)

    const updatedOriginal: Expense = {
      ...targetExpense,
      amount: keptAmount,
      installments: keptCount,
      method: keptCount > 1 ? 'Crédito parcelado' : targetExpense.method === 'Crédito parcelado' ? 'Crédito à vista' : targetExpense.method,
      shares: keptShares,
    }

    const advancedExpense: Expense = {
      id: createId(),
      description: `${targetExpense.description} (Adiantamento de ${countToAdvance} ${countToAdvance === 1 ? 'parcela' : 'parcelas'})`,
      amount: Math.round(parsedCustom * 100) / 100,
      date: targetExpense.date,
      category: targetExpense.category,
      method: targetExpense.method.startsWith('Crédito') ? 'Crédito à vista' : targetExpense.method,
      cardId: targetExpense.cardId,
      installments: 1,
      firstMonth: occ.month,
      manualFirstMonth: true,
      shares: advancedShares,
    }

    if (
      save({
        ...data,
        expenses: [advancedExpense, ...data.expenses.map(e => (e.id === updatedOriginal.id ? updatedOriginal : e))],
      })
    ) {
      showToast(
        countToAdvance === 1
          ? `1 parcela adiantada para ${monthName(occ.month)}!`
          : `${countToAdvance} parcelas adiantadas para ${monthName(occ.month)}!`,
      )
      closeAdvanceModal()
    }
  }

  const investments = data.investments || []
  const reserveGoals = data.reserveGoals || []

  const openInvestmentModal = (item?: Investment) => {
    setInvestmentErrors({})
    setInvestmentEditor({
      id: item?.id,
      name: item?.name || '',
      type: item?.type || 'reserva',
      institution: item?.institution || '',
      investedAmount: item ? formatMoneyInput(item.investedAmount) : '',
      currentAmount: item ? formatMoneyInput(item.currentAmount) : '',
      goalId: item?.goalId || '',
    })
  }

  const closeInvestmentModal = () =>
    closeModalWithAnimation('investment', () => {
      setInvestmentEditor(null)
      setInvestmentErrors({})
    })

  const saveInvestment = (event: React.FormEvent) => {
    event.preventDefault()
    if (!investmentEditor) return
    const nextErrors: Record<string, string> = {}
    if (!investmentEditor.name.trim()) nextErrors.name = 'Informe o nome do investimento (ex.: Caixinha Nubank).'
    const invested = investmentEditor.investedAmount.trim() ? parseMoneyInput(investmentEditor.investedAmount) : 0
    if (!Number.isFinite(invested) || invested < 0) nextErrors.investedAmount = 'Informe um valor válido.'
    const currentVal = investmentEditor.currentAmount.trim() ? parseMoneyInput(investmentEditor.currentAmount) : invested
    if (!Number.isFinite(currentVal) || currentVal < 0) nextErrors.currentAmount = 'Informe um valor válido.'
    if (Object.keys(nextErrors).length > 0) {
      setInvestmentErrors(nextErrors)
      triggerFormShake('investment')
      return
    }
    const existing = investmentEditor.id ? investments.find(inv => inv.id === investmentEditor.id) : undefined
    const roundedInvested = Math.round(invested * 100) / 100
    const roundedCurrent = Math.round(currentVal * 100) / 100
    const initialEntries =
      !existing && roundedInvested > 0
        ? [{ id: createId(), date: dateKey(today), type: 'aporte' as const, amount: roundedInvested, note: 'Saldo inicial' }]
        : existing?.entries || []
    const entry: Investment = {
      id: existing?.id || createId(),
      name: investmentEditor.name.trim(),
      type: investmentEditor.type,
      ...(investmentEditor.institution.trim() ? { institution: investmentEditor.institution.trim() } : {}),
      investedAmount: roundedInvested,
      currentAmount: roundedCurrent,
      ...(investmentEditor.goalId ? { goalId: investmentEditor.goalId } : {}),
      entries: initialEntries,
    }
    const nextInvestments = existing ? investments.map(inv => (inv.id === entry.id ? entry : inv)) : [entry, ...investments]
    if (save({ ...data, investments: nextInvestments })) {
      showToast(existing ? 'Investimento atualizado.' : 'Investimento adicionado!')
      closeInvestmentModal()
    }
  }

  const deleteInvestment = (id: string) => {
    const target = investments.find(inv => inv.id === id)
    setConfirmDialog({
      eyebrow: 'CONFIRMAR EXCLUSÃO',
      title: target ? `Excluir “${target.name}”?` : 'Excluir investimento?',
      description: 'Este investimento e seu histórico de movimentações serão removidos.',
      confirmLabel: 'Excluir investimento',
      onConfirm: () => {
        if (save({ ...data, investments: investments.filter(inv => inv.id !== id) })) {
          showToast('Investimento excluído.')
        }
        closeConfirmDialog()
      },
    })
  }

  const openInvestmentMove = (inv: Investment, mode: InvestmentEntryType) => {
    setInvestmentMoveErrors({})
    setInvestmentMoveEditor({
      investmentId: inv.id,
      investmentName: inv.name,
      mode,
      amount: mode === 'atualizacao' ? formatMoneyInput(inv.currentAmount) : '',
      date: dateKey(today),
      note: '',
      goalId: inv.goalId || '',
    })
  }

  const closeInvestmentMoveModal = () =>
    closeModalWithAnimation('investment-move', () => {
      setInvestmentMoveEditor(null)
      setInvestmentMoveErrors({})
    })

  const saveInvestmentMove = (event: React.FormEvent) => {
    event.preventDefault()
    if (!investmentMoveEditor) return
    const nextErrors: Record<string, string> = {}
    const parsedAmount = parseMoneyInput(investmentMoveEditor.amount)
    if (!investmentMoveEditor.amount.trim()) {
      nextErrors.amount = 'Informe o valor.'
    } else if (!Number.isFinite(parsedAmount) || (investmentMoveEditor.mode === 'atualizacao' ? parsedAmount < 0 : parsedAmount <= 0)) {
      nextErrors.amount = 'Informe um valor válido maior que zero.'
    }
    const normalizedDate = normalizeDateInput(investmentMoveEditor.date)
    if (!investmentMoveEditor.date.trim() || !isDate(normalizedDate)) {
      nextErrors.date = 'Informe uma data válida.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setInvestmentMoveErrors(nextErrors)
      triggerFormShake('investment-move')
      return
    }
    const roundedAmt = Math.round(parsedAmount * 100) / 100
    const nextInvestments = investments.map(inv => {
      if (inv.id !== investmentMoveEditor.investmentId) return inv
      let nextInvested = inv.investedAmount
      let nextCurrent: number
      if (investmentMoveEditor.mode === 'aporte') {
        nextInvested = Math.round((inv.investedAmount + roundedAmt) * 100) / 100
        nextCurrent = Math.round((inv.currentAmount + roundedAmt) * 100) / 100
      } else if (investmentMoveEditor.mode === 'resgate') {
        nextInvested = Math.max(0, Math.round((inv.investedAmount - roundedAmt) * 100) / 100)
        nextCurrent = Math.max(0, Math.round((inv.currentAmount - roundedAmt) * 100) / 100)
      } else {
        nextCurrent = roundedAmt
      }
      const newEntry = {
        id: createId(),
        date: normalizedDate,
        type: investmentMoveEditor.mode,
        amount: roundedAmt,
        ...(investmentMoveEditor.note.trim() ? { note: investmentMoveEditor.note.trim() } : {}),
      }
      const nextGoalId = investmentMoveEditor.mode === 'aporte' ? investmentMoveEditor.goalId || undefined : inv.goalId
      const baseInv = { ...inv }
      delete baseInv.goalId
      return {
        ...baseInv,
        investedAmount: nextInvested,
        currentAmount: nextCurrent,
        ...(nextGoalId ? { goalId: nextGoalId } : {}),
        entries: [newEntry, ...(inv.entries || [])],
      }
    })
    if (save({ ...data, investments: nextInvestments })) {
      showToast(
        investmentMoveEditor.mode === 'aporte'
          ? 'Aporte registrado!'
          : investmentMoveEditor.mode === 'resgate'
            ? 'Resgate registrado!'
            : 'Saldo atualizado!',
      )
      closeInvestmentMoveModal()
    }
  }

  const deleteInvestmentEntry = (investmentId: string, entryId: string) => {
    const nextInvestments = investments.map(inv =>
      inv.id === investmentId ? { ...inv, entries: (inv.entries || []).filter(e => e.id !== entryId) } : inv,
    )
    if (save({ ...data, investments: nextInvestments })) {
      showToast('Registro removido do histórico.')
    }
  }

  const openGoalModal = (goal?: ReserveGoal) => {
    setGoalErrors({})
    setGoalEditor({
      id: goal?.id,
      name: goal?.name || (reserveGoals.length === 0 ? 'Reserva de Emergência' : ''),
      targetAmount: goal ? formatMoneyInput(goal.targetAmount) : '',
      color: goal?.color || '#4d9b6f',
    })
  }

  const closeGoalModal = () =>
    closeModalWithAnimation('goal', () => {
      setGoalEditor(null)
      setGoalErrors({})
    })

  const saveGoal = (event: React.FormEvent) => {
    event.preventDefault()
    if (!goalEditor) return
    const nextErrors: Record<string, string> = {}
    if (!goalEditor.name.trim()) nextErrors.name = 'Informe o nome da meta.'
    const target = parseMoneyInput(goalEditor.targetAmount)
    if (!goalEditor.targetAmount.trim() || !Number.isFinite(target) || target <= 0) nextErrors.targetAmount = 'Informe o valor-alvo da meta.'
    if (Object.keys(nextErrors).length > 0) {
      setGoalErrors(nextErrors)
      triggerFormShake('goal')
      return
    }
    const goal: ReserveGoal = {
      id: goalEditor.id || createId(),
      name: goalEditor.name.trim(),
      targetAmount: Math.round(target * 100) / 100,
      color: goalEditor.color || '#4d9b6f',
    }
    const nextGoals = goalEditor.id ? reserveGoals.map(g => (g.id === goal.id ? goal : g)) : [...reserveGoals, goal]
    if (save({ ...data, reserveGoals: nextGoals })) {
      showToast(goalEditor.id ? 'Meta atualizada.' : 'Meta de reserva criada!')
      closeGoalModal()
    }
  }

  const deleteGoal = (id: string) => {
    const target = reserveGoals.find(g => g.id === id)
    setConfirmDialog({
      eyebrow: 'CONFIRMAR EXCLUSÃO',
      title: target ? `Excluir meta “${target.name}”?` : 'Excluir meta?',
      description: 'Os investimentos vinculados não serão apagados, apenas desvinculados desta meta.',
      confirmLabel: 'Excluir meta',
      onConfirm: () => {
        const nextInvestments = investments.map(inv => {
          if (inv.goalId !== id) return inv
          const copy = { ...inv }
          delete copy.goalId
          return copy
        })
        if (save({ ...data, reserveGoals: reserveGoals.filter(g => g.id !== id), investments: nextInvestments })) {
          showToast('Meta excluída.')
        }
        closeConfirmDialog()
      },
    })
  }

  const transactionTable = (
    <TransactionsTable
      view={view}
      theme={theme}
      data={data}
      current={current}
      filtered={filtered}
      total={total}
      reimbursementTotal={reimbursementTotal}
      filteredPersonalTotal={filteredPersonalTotal}
      filteredReimbursementTotal={filteredReimbursementTotal}
      filteredInvoiceTotal={filteredInvoiceTotal}
      hasActiveFilters={hasActiveFilters}
      searchAllMonths={searchAllMonths}
      query={query}
      categoryFilter={categoryFilter}
      methodFilter={methodFilter}
      cardFilter={cardFilter}
      sortOrder={sortOrder}
      selectedExpenseIds={selectedExpenseIds}
      selectedVisibleIds={selectedVisibleIds}
      allVisibleSelected={allVisibleSelected}
      filteredExpenseIds={filteredExpenseIds}
      onSearchAllMonthsChange={setSearchAllMonths}
      onQueryChange={setQuery}
      onCategoryFilterChange={setCategoryFilter}
      onMethodFilterChange={setMethodFilter}
      onCardFilterChange={setCardFilter}
      onSortOrderChange={setSortOrder}
      onClearAllFilters={clearAllFilters}
      onToggleSelectAllVisible={toggleSelectAllVisible}
      onToggleSelectExpense={toggleSelectExpense}
      onDeleteSelectedExpenses={deleteSelectedExpenses}
      onDownloadCsv={downloadCsv}
      onDownloadImage={downloadReportImage}
      onEditExpense={editExpense}
      onDuplicateExpense={duplicateExpense}
      onOpenAdvanceInstallments={openAdvanceInstallments}
      onDeleteExpense={deleteExpense}
      personalValue={personalValue}
      owedBy={owedBy}
    />
  )

  return (
    <div className="app-shell" data-theme={theme}>
      <input ref={backupInput} type="file" accept="application/json,.json" hidden onChange={importBackup} />
      <input ref={profilePhotoInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={updateProfilePhoto} />
      {backupMessage && (
        <div className={`backup-toast ${toastClosing ? 'is-closing' : ''}`} role="status" aria-live="polite">
          <span>{backupMessage}</span>
          <button type="button" aria-label="Dispensar aviso" onClick={dismissToast}>
            ×
          </button>
        </div>
      )}
      <header className="site-header">
        <a className="brand" href="#" onClick={() => setView('Visão geral')}>
          <span className="brand-mark">
            <svg viewBox="0 0 48 48" shapeRendering="crispEdges" aria-hidden="true">
              <rect x="1" y="1" width="46" height="46" rx="13" fill="#20231f" />
              <path d="M18 6h12v3h6v6h3v6h3v12h-3v6h-6v3H18v-3h-6v-6H9v-6H6V18h3v-6h6V9h3z" fill="#986027" />
              <path d="M18 9h12v3h6v6h3v12h-3v6h-6v3H18v-3h-6v-6H9V18h3v-6h6z" fill="#e8b957" />
              <path d="M18 12h12v3h6v3h-3v3h-3v-3H18v-3h-3v-3h3z" fill="#f6d77e" />
              <rect x="22" y="14" width="4" height="20" fill="#80501f" />
              <rect x="18" y="17" width="12" height="3" fill="#80501f" />
              <rect x="15" y="20" width="3" height="3" fill="#80501f" />
              <rect x="18" y="23" width="12" height="3" fill="#80501f" />
              <rect x="27" y="26" width="3" height="3" fill="#80501f" />
              <rect x="18" y="29" width="12" height="3" fill="#80501f" />
              <rect x="12" y="18" width="3" height="6" fill="#f6d77e" />
            </svg>
          </span>
          <span>
            Põe na Conta
            <small>GESTÃO FINANCEIRA</small>
          </span>
        </a>
        <div className="side-label">MENU</div>
        <nav aria-label="Navegação principal">
          {(['Visão geral', 'Lançamentos', 'Relatórios', 'Investimentos', 'Recorrências'] as const).map((v, i) => (
            <button key={v} className={`nav-item ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
              <span className="nav-icon">{['◫', '↔', '▥', '◈', '↻'][i]}</span>
              <span className="nav-label">{v}</span>
            </button>
          ))}
          <button className={`nav-item mobile-settings-nav ${view === 'Ajustes' ? 'active' : ''}`} onClick={() => setView('Ajustes')}>
            <span className="nav-icon">⚙</span>
            <span className="nav-label">Ajustes</span>
          </button>
        </nav>
        <div className="side-bottom">
          <button
            className={`theme-switch header-theme-switch ${theme === 'dark' ? 'is-dark' : ''}`}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          >
            <span className="theme-switch-track" aria-hidden="true">
              <span className="theme-switch-thumb">
                {theme === 'dark' ? (
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z" />
                  </svg>
                )}
              </span>
            </span>
            <span className="theme-switch-label">{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
          </button>
          <div className="profile">
            <div className={`avatar profile-avatar ${profilePhoto ? 'has-photo' : ''}`}>
              {profilePhoto ? (
                <img src={profilePhoto} alt="" />
              ) : profileName.trim() ? (
                profileInitials(profileName)
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
              )}
            </div>
            <div>
              <b>Meu espaço</b>
              <span>{profileName.trim() || 'Plano pessoal'}</span>
            </div>
            <details className="row-actions profile-actions">
              <summary aria-label="Abrir opções do Meu espaço" title="Opções">···</summary>
              <div className={`row-action-menu ${theme === 'dark' ? 'is-dark' : 'is-light'}`}>
                <button onClick={event => closeActionMenu(event, () => setView('Ajustes'))}>Preferências</button>
                <button onClick={event => closeActionMenu(event, downloadBackup)}>Exportar backup</button>
                <button onClick={event => closeActionMenu(event, () => backupInput.current?.click())}>Importar backup</button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <main className="main" onTouchStart={handleMainTouchStart} onTouchEnd={handleMainTouchEnd}>
        <header className="topbar">
          <div className="breadcrumb">
            Põe na Conta <span>/</span> {view}
          </div>
        </header>
        <div className={`content ${swipeDirection ? `swipe-from-${swipeDirection}` : ''}`} key={view}>
          <div className="heading-row">
            <div>
              <div className="eyebrow">
                {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(today).toLocaleUpperCase('pt-BR')}
              </div>
              <h1>{view}</h1>
              <p className="subtitle">
                {view === 'Visão geral'
                  ? overviewMode === 'investments'
                    ? 'Resumo rápido do seu patrimônio, metas e rendimentos.'
                    : 'Uma leitura clara dos seus gastos e compromissos.'
                  : view === 'Lançamentos'
                    ? 'Encontre, ordene e acompanhe cada movimentação.'
                    : view === 'Relatórios'
                      ? 'Entenda como seus gastos se distribuem ao longo do tempo.'
                      : view === 'Investimentos'
                        ? 'Acompanhe o que você está guardando, seus rendimentos e metas de reserva.'
                        : view === 'Recorrências'
                          ? 'Revise as despesas que se repetem antes de lançar no mês.'
                          : 'Personalize categorias, cartões e pessoas com quem divide despesas.'}
              </p>
            </div>
            {view !== 'Ajustes' && (() => {
              const ctaMode = view === 'Recorrências'
                ? 'recurrence'
                : view === 'Investimentos' || (view === 'Visão geral' && overviewMode === 'investments')
                  ? 'investment'
                  : 'expense'
              return (
                <button
                  className={`primary heading-cta-btn ${ctaMode === 'investment' ? 'is-investment-mode' : ''}`}
                  onClick={() =>
                    ctaMode === 'recurrence'
                      ? openRecurrence()
                      : ctaMode === 'investment'
                        ? openInvestmentModal()
                        : openNewExpenseModal()
                  }
                >
                  <span key={ctaMode} className="heading-cta-inner">
                    <span className="heading-cta-plus" aria-hidden="true">＋</span>
                    <span>
                      {ctaMode === 'recurrence'
                        ? 'Nova recorrência'
                        : ctaMode === 'investment'
                          ? 'Novo investimento'
                          : 'Nova despesa'}
                    </span>
                  </span>
                </button>
              )
            })()}
          </div>
          {!isStandalone && !pwaBannerDismissed && !onboardingOpen && (Boolean(deferredInstallPrompt) || isTouchDevice()) && (
            <div className="pwa-install-banner" role="region" aria-label="Instalar aplicativo">
              <div className="pwa-install-banner-info">
                <div className="pwa-install-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="6" y="2" width="12" height="20" rx="2.5" />
                    <path d="M12 7v7m-3-3 3 3 3-3M10 18h4" />
                  </svg>
                </div>
                <div>
                  <b>Instale o Põe na Conta na sua tela inicial</b>
                  <span>Abra em tela cheia como um app nativo e use 100% offline a qualquer momento.</span>
                </div>
              </div>
              <div className="pwa-install-banner-actions">
                <button type="button" className="cancel-btn" onClick={dismissPwaBanner}>
                  Agora não
                </button>
                <button type="button" className="primary" onClick={handleInstallPwa}>
                  Instalar na tela inicial
                </button>
              </div>
            </div>
          )}
          {backupReminderMessage && (
            <div className="backup-reminder-banner" role="status">
              <div className="backup-reminder-info">
                <div className="backup-reminder-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 4v11m-4-4 4 4 4-4M5 19h14" />
                  </svg>
                </div>
                <div>
                  <b>Lembrete de backup</b>
                  <span>{backupReminderMessage}</span>
                </div>
              </div>
              <div className="backup-reminder-actions">
                <button type="button" className="cancel-btn" onClick={snoozeBackupReminder}>
                  Lembrar depois
                </button>
                <button type="button" className="outline-btn" onClick={downloadBackup}>
                  ↓ Baixar backup agora
                </button>
              </div>
            </div>
          )}
          {storageWarning && (
            <div className="backup-warning" role="alert">
              <span>
                {storageWarning} Acesse <b>Ajustes → Seus dados</b> para importar um backup válido.
              </span>
              <button type="button" className="outline-btn" onClick={() => save(data, true)}>
                Continuar com os dados atuais
              </button>
            </div>
          )}
          {view !== 'Ajustes' && (
            <div className="monthbar">
              <button
                className="month-arrow"
                aria-label="Mês anterior"
                onClick={() => {
                  setMonth(shiftMonthKey(month, -1))
                  setRecurrenceSelection(null)
                }}
              >
                ‹
              </button>
              <span>{monthName(month)}</span>
              <button
                className="month-arrow"
                aria-label="Próximo mês"
                onClick={() => {
                  setMonth(shiftMonthKey(month, 1))
                  setRecurrenceSelection(null)
                }}
              >
                ›
              </button>
              <button
                className="today-btn"
                onClick={() => {
                  setMonth(monthKey(today))
                  setRecurrenceSelection(null)
                }}
              >
                Hoje
              </button>
            </div>
          )}
          {view !== 'Ajustes' && monthlyLimitValue > 0 && (
            <section className={`monthly-limit ${monthlyLimitNotice ? 'is-warning' : ''}`} role="status" aria-live="polite">
              <div className="monthly-limit-heading">
                <span>Limite mensal · {monthName(month)}</span>
                <b>
                  {money(total)} de {money(monthlyLimitValue)}
                </b>
              </div>
              <div
                className="monthly-limit-track"
                role="progressbar"
                aria-label="Uso do limite mensal"
                aria-valuemin={0}
                aria-valuemax={monthlyLimitValue}
                aria-valuenow={Math.min(total, monthlyLimitValue)}
              >
                <i style={{ width: `${Math.min(monthlyLimitProgress, 100)}%` }} />
              </div>
              <p>
                {monthlyLimitNotice
                  ? monthlyLimitProgress > 100
                    ? `Teto mensal ultrapassado: você já usou ${Math.round(monthlyLimitProgress)}% do seu limite pessoal.`
                    : `Você atingiu ${limitNoticePercentValue}% do limite mensal que definiu.`
                  : `Avisaremos ao atingir ${limitNoticePercentValue}% (${money((monthlyLimitValue * limitNoticePercentValue) / 100)}).`}
              </p>
            </section>
          )}

          {view === 'Ajustes' ? (
            <SettingsView
              data={data}
              theme={theme}
              defaultTheme={defaultTheme}
              profileName={profileName}
              profilePhoto={profilePhoto}
              profileMessage={profileMessage}
              pixKey={pixKey}
              monthlyLimit={monthlyLimit}
              limitNoticePercent={limitNoticePercent}
              isStandalone={isStandalone}
              lastBackupAt={lastBackupAt}
              changesSinceBackup={changesSinceBackup}
              storageWarning={storageWarning}
              onUpdateProfileName={updateProfileName}
              onUpdatePixKey={updatePixKey}
              onPickProfilePhoto={() => profilePhotoInput.current?.click()}
              onRemoveProfilePhoto={removeProfilePhoto}
              onUpdateDefaultTheme={updateDefaultTheme}
              onUpdateMonthlyLimit={updateMonthlyLimit}
              onUpdateLimitNoticePercent={updateLimitNoticePercent}
              onInstallPwa={handleInstallPwa}
              onOpenCategory={openCategory}
              onRemoveCategory={id => {
                if (save({ ...data, categories: data.categories.filter(x => x.id !== id) })) showToast('Categoria removida.')
              }}
              onOpenCard={openCard}
              onRemoveCard={id => {
                if (save({ ...data, cards: data.cards.filter(x => x.id !== id) })) showToast('Cartão removido.')
              }}
              onOpenParticipant={openParticipant}
              onRemoveParticipant={removeParticipant}
              onDownloadBackup={downloadBackup}
              onTriggerBackupImport={() => backupInput.current?.click()}
              onDownloadCsv={downloadCsv}
              onOpenResetDataModal={openResetDataModal}
            />
          ) : view === 'Recorrências' ? (
            <RecurrencesView
              data={data}
              month={month}
              theme={theme}
              recurrences={recurrences}
              pendingRecurrences={pendingRecurrences}
              selectedRecurrences={selectedRecurrences}
              onSelectionChange={setRecurrenceSelection}
              onConfirmRecurrences={confirmRecurrences}
              onSkipRecurrence={skipRecurrence}
              onOpenRecurrence={openRecurrence}
              onToggleRecurrenceActive={toggleRecurrenceActive}
              onDeleteRecurrence={item =>
                setConfirmDialog({
                  eyebrow: 'CONFIRMAR EXCLUSÃO',
                  title: `Excluir “${item.description}”?`,
                  description: 'O modelo mensal será removido e o lançamento vinculado neste mês deixará de contabilizar nas suas despesas.',
                  confirmLabel: 'Excluir recorrência',
                  onConfirm: () => {
                    const remainingExpenses = data.expenses.filter(
                      exp => exp.recurrenceId !== item.id && !matchesRecurrenceInMonth(exp, item, month),
                    )
                    if (save({ ...data, expenses: remainingExpenses, recurrences: recurrences.filter(value => value.id !== item.id) })) {
                      showToast('Recorrência e lançamento vinculado excluídos.')
                    }
                    closeConfirmDialog()
                  },
                })
              }
            />
          ) : view === 'Investimentos' ? (
            <InvestmentsView
              theme={theme}
              investments={investments}
              reserveGoals={reserveGoals}
              month={month}
              onOpenInvestmentModal={openInvestmentModal}
              onDeleteInvestment={deleteInvestment}
              onOpenInvestmentMove={openInvestmentMove}
              onOpenGoalModal={openGoalModal}
              onDeleteGoal={deleteGoal}
              onDeleteEntry={deleteInvestmentEntry}
            />
          ) : view === 'Visão geral' ? (
            <OverviewView
              data={data}
              overviewMode={overviewMode}
              onOverviewModeChange={setOverviewMode}
              onOpenInvestmentModal={() => openInvestmentModal()}
              onOpenGoalModal={() => openGoalModal()}
              month={month}
              theme={theme}
              previousMonth={previousMonth}
              total={total}
              monthChange={monthChange}
              reimbursementTotal={reimbursementTotal}
              upcomingTotal={upcomingTotal}
              activeTrendYear={activeTrendYear}
              currentYear={currentYear}
              trendYears={trendYears}
              trendYearTotal={trendYearTotal}
              monthlyTrend={monthlyTrend}
              todayMonthKey={monthKey(today)}
              trendChartRef={trendChartRef}
              categoryTotals={categoryTotals}
              categoryTotal={categoryTotal}
              categoryPanelMode={categoryPanelMode}
              currentExpenses={currentExpenses}
              pieSlices={pieSlices}
              hoveredCategory={hoveredCategory}
              nextMonths={nextMonths}
              occurrences={occurrences}
              installmentRelief={installmentRelief}
              cardSummaries={cardSummaries}
              reimbursementByParticipant={reimbursementByParticipant}
              currentReimbursements={currentReimbursements}
              onTrendYearChange={setTrendYear}
              onCategoryPanelModeChange={setCategoryPanelMode}
              onHoveredCategoryIdChange={setHoveredCategoryId}
              onOpenCardTransactions={openCardTransactions}
              onOpenCardSettings={() => {
                setView('Ajustes')
                openCard()
              }}
              onOpenNewExpenseModal={openNewExpenseModal}
              onOpenManualReimbursement={openManualReimbursement}
              onDeleteManualReimbursement={deleteManualReimbursement}
              onOpenParticipantSummary={setParticipantSummaryTarget}
              onNavigateView={setView}
              personalValue={personalValue}
              owedBy={owedBy}
            />
          ) : view === 'Relatórios' ? (
            <ReportsView
              data={data}
              total={total}
              directPersonalTotal={directPersonalTotal}
              creditPersonalTotal={creditPersonalTotal}
              directSharePercent={directSharePercent}
              creditSharePercent={creditSharePercent}
              installmentOccurrences={installmentOccurrences}
              installmentPersonalTotal={installmentPersonalTotal}
              installmentSharePercent={installmentSharePercent}
              installmentRelief={installmentRelief}
              biggestPersonalExpense={biggestPersonalExpense}
              averagePersonalTicket={averagePersonalTicket}
              reportCategoryRanking={reportCategoryRanking}
              reportMethods={reportMethods}
              categoryFilter={categoryFilter}
              methodFilter={methodFilter}
              onCategoryFilterChange={setCategoryFilter}
              onMethodFilterChange={setMethodFilter}
              onCardFilterChange={setCardFilter}
              personalValue={personalValue}
            >
              {transactionTable}
            </ReportsView>
          ) : (
            <section className="data-page">{transactionTable}</section>
          )}
          <footer>
            Feito para trazer mais clareza ao seu dia a dia <span>✳</span>
            <span>Seus dados ficam neste dispositivo</span>
          </footer>
        </div>
      </main>

      {modal && (
        <div
          className={`modal-backdrop ${closingModal === 'expense' ? 'is-closing' : ''}`}
          onMouseDown={e => {
            if (e.target === e.currentTarget) closeExpenseModal()
          }}
        >
          <form
            noValidate
            className={`modal expense-modal ${formShake === 'expense' ? 'is-shaking' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-modal-title"
            onSubmit={addExpense}
            onAnimationEnd={event => {
              if (event.animationName === 'nexus-modal-shake') setFormShake(null)
            }}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">{editingExpenseId ? 'EDITAR REGISTRO' : 'NOVO REGISTRO'}</span>
                <h2 id="expense-modal-title">{editingExpenseId ? 'Editar lançamento' : 'Adicionar lançamento'}</h2>
              </div>
              <button type="button" aria-label="Fechar lançamento" onClick={closeExpenseModal}>
                ×
              </button>
            </div>
            <label className={expenseErrors.description ? 'is-invalid' : ''}>
              Descrição
              <input
                ref={expenseDescInputRef}
                autoFocus={!isTouchDevice()}
                enterKeyHint="done"
                onKeyDown={dismissKeyboardOnEnter}
                aria-invalid={Boolean(expenseErrors.description)}
                placeholder="Ex.: mercado, conta de luz..."
                value={form.description}
                onChange={e => {
                  clearFieldError(setExpenseErrors, 'description')
                  setForm({ ...form, description: e.target.value })
                }}
              />
              {expenseErrors.description && (
                <small className="field-error-msg" role="alert">
                  {expenseErrors.description}
                </small>
              )}
            </label>
            <div className="form-row">
              <label className={expenseErrors.amount ? 'is-invalid' : ''}>
                Valor total
                <div className="money-input-wrap">
                  <span className="money-prefix" aria-hidden="true">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    onKeyDown={dismissKeyboardOnEnter}
                    aria-invalid={Boolean(expenseErrors.amount)}
                    placeholder="0,00"
                    value={form.amount}
                    onChange={e => {
                      clearFieldError(setExpenseErrors, 'amount')
                      setShareError('')
                      setForm({ ...form, amount: formatMoneyInput(e.target.value) })
                    }}
                  />
                </div>
                {expenseErrors.amount && (
                  <small className="field-error-msg" role="alert">
                    {expenseErrors.amount}
                  </small>
                )}
              </label>
              <label className={expenseErrors.date ? 'is-invalid' : ''}>
                Data da compra
                <input
                  type="date"
                  aria-invalid={Boolean(expenseErrors.date)}
                  value={form.date}
                  onFocus={blurActiveInputOnTouch}
                  onChange={e => {
                    clearFieldError(setExpenseErrors, 'date')
                    setShareError('')
                    setForm({ ...form, date: e.target.value })
                  }}
                />
                {expenseErrors.date && (
                  <small className="field-error-msg" role="alert">
                    {expenseErrors.date}
                  </small>
                )}
              </label>
            </div>
            <div className="form-row">
              <label>
                Categoria
                <select value={form.category || data.categories[0]?.id || ''} onFocus={blurActiveInputOnTouch} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {data.categories.map(c => (
                    <option value={c.id} key={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Forma de pagamento
                <select
                  value={form.method}
                  onFocus={blurActiveInputOnTouch}
                  onChange={e => {
                    const nextMethod = e.target.value as Method
                    const fallbackCard = getPreferredCard()
                    const nextCardId = nextMethod.startsWith('Crédito')
                      ? (data.cards.some(c => c.id === form.cardId) ? form.cardId : fallbackCard?.id || '')
                      : form.cardId
                    const nextCard = data.cards.find(c => c.id === nextCardId) || fallbackCard
                    clearFieldError(setExpenseErrors, 'installments')
                    setForm({
                      ...form,
                      method: nextMethod,
                      cardId: nextCardId,
                      afterClosing: (nextCard?.closingDayRule ?? 'after') !== 'before',
                      firstMonthMode: isManualBillingCard(nextCard) ? (form.firstMonthMode === 'auto' ? 'next' : form.firstMonthMode) : 'auto',
                    })
                  }}
                >
                  <option>PIX</option>
                  <option>Débito</option>
                  <option>Dinheiro</option>
                  <option>Crédito à vista</option>
                  <option>Crédito parcelado</option>
                </select>
              </label>
            </div>
            {form.method.startsWith('Crédito') && (
              <>
                <label>
                  Cartão / Crédito
                  <select
                    value={form.cardId || getPreferredCard()?.id || ''}
                    onFocus={blurActiveInputOnTouch}
                    onChange={e => {
                      const nextCard = data.cards.find(c => c.id === e.target.value) || getPreferredCard()
                      rememberCard(e.target.value)
                      setForm({
                        ...form,
                        cardId: e.target.value,
                        afterClosing: (nextCard?.closingDayRule ?? 'after') !== 'before',
                        firstMonthMode: isManualBillingCard(nextCard) ? 'next' : 'auto',
                      })
                    }}
                  >
                    {data.cards.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.kind === 'store'
                          ? `🛍️ ${c.name} · Crédito de loja (mês definido na compra)`
                          : c.kind === 'borrowed'
                            ? `🤝 ${c.name} · Cartão emprestado (mês definido na compra)`
                            : `🏦 ${c.name} · fecha dia ${c.closingDay} · vence dia ${c.dueDay}`}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedFormCard && isManualFormCard && isDate(normalizedFormDate) && (
                  <div className="first-month-selector">
                    <span className="first-month-selector-label">
                      {form.method === 'Crédito parcelado' ? 'Quando cai a 1ª parcela?' : 'Em qual mês cai a cobrança?'}
                      <small>
                        {selectedFormCard.kind === 'borrowed'
                          ? 'Escolha em qual mês você combinou de pagar essa compra'
                          : 'Confira no app da loja para qual mês ficou o 1º pagamento'}
                      </small>
                    </span>
                    <div className="first-month-pills" role="radiogroup" aria-label="Mês da cobrança ou primeira parcela">
                      {(
                        [
                          { mode: 'current' as const, label: 'Neste mês', targetMonth: purchaseBaseMonth },
                          { mode: 'next' as const, label: 'Próximo mês', targetMonth: shiftMonthKey(purchaseBaseMonth, 1) },
                          { mode: 'plus2' as const, label: 'Daqui a 2 meses', targetMonth: shiftMonthKey(purchaseBaseMonth, 2) },
                        ]
                      ).map(opt => {
                        const isSelected = effectiveFirstMonthMode === opt.mode
                        return (
                          <button
                            key={opt.mode}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`first-month-pill ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => setForm({ ...form, firstMonthMode: opt.mode })}
                          >
                            <b>{opt.label}</b>
                            <small>{monthName(opt.targetMonth)}</small>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {isFormOnClosingDay && selectedFormCard && (
                  <label>
                    Compra no dia do fechamento (dia {selectedFormCard.closingDay})
                    <select value={form.afterClosing ? 'after' : 'before'} onFocus={blurActiveInputOnTouch} onChange={e => setForm({ ...form, afterClosing: e.target.value === 'after' })}>
                      <option value="after">Após o fechamento da fatura (contabilizar no próximo mês)</option>
                      <option value="before">Antes do fechamento da fatura (contabilizar neste mês)</option>
                    </select>
                  </label>
                )}
                {selectedFormCard && creditDueMonth && (
                  <div className="billing-preview">
                    <span>{selectedFormCard.kind === 'store' ? '🛍️' : selectedFormCard.kind === 'borrowed' ? '🤝' : '◷'}</span>
                    <div>
                      {form.method === 'Crédito parcelado' ? 'A 1ª parcela será contabilizada em' : 'Esta compra será contabilizada em'}{' '}
                      <b>{monthName(creditDueMonth)}</b>
                      {selectedFormCard.kind === 'store' ? (
                        <> (Crédito de loja · escolha acima o mês informado pelo app após finalizar a compra).</>
                      ) : selectedFormCard.kind === 'borrowed' ? (
                        <> (Cartão emprestado · o valor ficará separado no resumo de {monthName(creditDueMonth)}).</>
                      ) : (
                        <>
                          {' '}
                          (fechamento dia {selectedFormCard.closingDay} · vencimento dia {selectedFormCard.dueDay}).
                          {Number(normalizedFormDate.slice(-2)) > selectedFormCard.closingDay
                            ? ' Como a compra ocorreu após o fechamento, ela entra na próxima fatura.'
                            : Number(normalizedFormDate.slice(-2)) === selectedFormCard.closingDay
                              ? form.afterClosing
                                ? ' Fatura considerada fechada no momento da compra (próxima fatura).'
                                : ' Fatura considerada aberta no momento da compra (fatura atual).'
                              : ' Como a compra ocorreu antes do fechamento, ela entra na fatura atual.'}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {form.method === 'Crédito parcelado' && (
              <label className={expenseErrors.installments ? 'is-invalid' : ''}>
                Número de parcelas
                <input
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="done"
                  onKeyDown={dismissKeyboardOnEnter}
                  aria-invalid={Boolean(expenseErrors.installments)}
                  placeholder="2 a 60"
                  value={form.installments}
                  onChange={e => {
                    clearFieldError(setExpenseErrors, 'installments')
                    setForm({ ...form, installments: e.target.value.replace(/\D/g, '').slice(0, 2) })
                  }}
                />
                {expenseErrors.installments ? (
                  <small className="field-error-msg" role="alert">
                    {expenseErrors.installments}
                  </small>
                ) : (
                  <small className="form-help">O valor será dividido automaticamente entre os meses.</small>
                )}
              </label>
            )}
            <fieldset className={`participants-field ${participantsSectionOpen ? 'is-open' : 'is-collapsed'}`}>
              <button
                type="button"
                className="participants-collapse-toggle"
                aria-expanded={participantsSectionOpen}
                onClick={() => {
                  blurActiveInputOnTouch()
                  setParticipantsSectionOpen(current => !current)
                }}
              >
                <div className="participants-collapse-title">
                  <b>Alguém precisa te pagar?</b>
                  {form.shares.length > 0 ? (
                    <span className="participants-active-badge">
                      {form.shares.length === 1 ? '1 divisão ativa' : `${form.shares.length} divisões ativas`}
                      {totalFormSharesAmount > 0 ? ` · ${money(totalFormSharesAmount)}` : ''}
                    </span>
                  ) : (
                    <small>Opcional · toque para dividir conta ou cobrar terceiros</small>
                  )}
                </div>
                <span className={`participants-chevron ${participantsSectionOpen ? 'is-open' : ''}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>
              {participantsSectionOpen && (
                <div className="participants-collapsible-body">
                  <p>Use o <b>Modo rápido</b> para dividir corridas/contas sem cadastrar ninguém ou selecione pessoas abaixo.</p>
                  {(() => {
                const quickShare = form.shares.find(item => item.participantId === QUICK_THIRD_PARTY_ID)
                const quickErrorKey = `share-${QUICK_THIRD_PARTY_ID}`
                const quickError = expenseErrors[quickErrorKey]
                return (
                  <div className={`quick-third-party-box ${quickShare ? 'is-active' : ''}`}>
                    <div className="quick-third-party-head">
                      <label className="participant-check">
                        <input
                          type="checkbox"
                          checked={Boolean(quickShare)}
                          onChange={e => {
                            blurActiveInputOnTouch()
                            setShareError('')
                            clearFieldError(setExpenseErrors, quickErrorKey)
                            setForm({
                              ...form,
                              shares: e.target.checked
                                ? [{ participantId: QUICK_THIRD_PARTY_ID, amount: '', installment: 'all' }, ...form.shares]
                                : form.shares.filter(item => item.participantId !== QUICK_THIRD_PARTY_ID),
                            })
                          }}
                        />
                        <span>⚡ Terceiros (modo rápido sem cadastro)</span>
                      </label>
                      <div className="quick-split-pills" role="group" aria-label="Atalhos de divisão rápida">
                        <button type="button" className="split-pill-btn" onClick={() => applyQuickThirdPartyPreset('plus1')} title="Dividir entre você e +1 pessoa (50% terceiros)">
                          ÷ 2 comigo
                        </button>
                        <button type="button" className="split-pill-btn" onClick={() => applyQuickThirdPartyPreset('plus2')} title="Dividir entre você e +2 pessoas (2/3 terceiros)">
                          ÷ 3 comigo
                        </button>
                        <button type="button" className="split-pill-btn" onClick={() => applyQuickThirdPartyPreset('plus3')} title="Dividir entre você e +3 pessoas (3/4 terceiros)">
                          ÷ 4 comigo
                        </button>
                        <button type="button" className="split-pill-btn" onClick={() => applyQuickThirdPartyPreset('full')} title="100% pago por terceiros">
                          100% terceiros
                        </button>
                      </div>
                    </div>
                    {quickShare && (
                      <div className="participant-share-controls quick-share-controls">
                        <label className={`participant-amount ${quickError ? 'is-invalid' : ''}`}>
                          Valor de terceiros
                          <div className="money-input-wrap compact">
                            <span className="money-prefix" aria-hidden="true">R$</span>
                            <input
                              aria-label="Valor que terceiros devem pagar"
                              aria-invalid={Boolean(quickError)}
                              type="text"
                              inputMode="decimal"
                              enterKeyHint="done"
                              onKeyDown={dismissKeyboardOnEnter}
                              placeholder="0,00"
                              value={quickShare.amount}
                              onChange={e => {
                                clearFieldError(setExpenseErrors, quickErrorKey)
                                setShareError('')
                                setForm({
                                  ...form,
                                  shares: form.shares.map(item =>
                                    item.participantId === QUICK_THIRD_PARTY_ID ? { ...item, amount: formatMoneyInput(e.target.value) } : item,
                                  ),
                                })
                              }}
                            />
                          </div>
                          {quickError && (
                            <small className="field-error-msg" role="alert">
                              {quickError}
                            </small>
                          )}
                        </label>
                        {form.method === 'Crédito parcelado' && (
                          <label className="participant-scope">
                            Cobrança
                            <select
                              aria-label="Parcelas de terceiros (modo rápido)"
                              value={quickShare.installment}
                              onFocus={blurActiveInputOnTouch}
                              onChange={e =>
                                setForm({
                                  ...form,
                                  shares: form.shares.map(item =>
                                    item.participantId === QUICK_THIRD_PARTY_ID ? { ...item, installment: e.target.value } : item,
                                  ),
                                })
                              }
                            >
                              <option value="all">Todas</option>
                              {Array.from({ length: Math.max(2, Number(form.installments) || 2) }, (_, i) => (
                                <option key={i + 1} value={i + 1}>Só {i + 1}ª parcela</option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
              {form.shares.length > 0 && (
                <div className="split-actions-bar">
                  <span>Dividir entre marcados:</span>
                  <div className="split-actions-buttons">
                    <button type="button" className="split-action-btn" onClick={applyEqualSplitWithMe}>
                      ÷ Igual comigo ({form.shares.length + 1} partes)
                    </button>
                    <button type="button" className="split-action-btn" onClick={applySplitAmongMarkedOnly}>
                      100% entre marcados ({form.shares.length})
                    </button>
                  </div>
                </div>
              )}
              {(data.participants || []).length ? (
                <>
                  {(data.participants || []).map(participant => {
                    const share = form.shares.find(item => item.participantId === participant.id)
                    const shareErrorKey = `share-${participant.id}`
                    const participantError = expenseErrors[shareErrorKey]
                    return (
                      <div className="participant-share-row" key={participant.id}>
                        <label className="participant-check">
                          <input
                            type="checkbox"
                            checked={Boolean(share)}
                            onChange={e => {
                              blurActiveInputOnTouch()
                              setShareError('')
                              clearFieldError(setExpenseErrors, shareErrorKey)
                              setForm({
                                ...form,
                                shares: e.target.checked
                                  ? [...form.shares, { participantId: participant.id, amount: '', installment: 'all' }]
                                  : form.shares.filter(item => item.participantId !== participant.id),
                              })
                            }}
                          />
                          <span>{participant.name}</span>
                        </label>
                        {share && (
                          <div className="participant-share-controls">
                            <label className={`participant-amount ${participantError ? 'is-invalid' : ''}`}>
                              Quanto?
                              <div className="money-input-wrap compact">
                                <span className="money-prefix" aria-hidden="true">R$</span>
                                <input
                                  aria-label={`Valor que ${participant.name} deve pagar`}
                                  aria-invalid={Boolean(participantError)}
                                  type="text"
                                  inputMode="decimal"
                                  enterKeyHint="done"
                                  onKeyDown={dismissKeyboardOnEnter}
                                  placeholder="0,00"
                                  value={share.amount}
                                  onChange={e => {
                                    clearFieldError(setExpenseErrors, shareErrorKey)
                                    setShareError('')
                                    setForm({
                                      ...form,
                                      shares: form.shares.map(item =>
                                        item.participantId === participant.id ? { ...item, amount: formatMoneyInput(e.target.value) } : item,
                                      ),
                                    })
                                  }}
                                />
                              </div>
                              {participantError && (
                                <small className="field-error-msg" role="alert">
                                  {participantError}
                                </small>
                              )}
                            </label>
                            {form.method === 'Crédito parcelado' && (
                              <label className="participant-scope">
                                Cobrança
                                <select
                                  aria-label={`Parcelas de ${participant.name}`}
                                  value={share.installment}
                                  onFocus={blurActiveInputOnTouch}
                                  onChange={e =>
                                    setForm({
                                      ...form,
                                      shares: form.shares.map(item => (item.participantId === participant.id ? { ...item, installment: e.target.value } : item)),
                                    })
                                  }
                                >
                                  <option value="all">Todas</option>
                                  {Array.from({ length: Math.max(2, Number(form.installments) || 2) }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>Só {i + 1}ª parcela</option>
                                  ))}
                                </select>
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <button type="button" className="inline-participant-btn" onClick={addParticipantFromExpense}>
                    ＋ Cadastrar outra pessoa com nome
                  </button>
                </>
              ) : (
                <div className="participants-empty">
                  Quer acompanhar por nome quem te deve?{' '}
                  <button type="button" className="inline-participant-btn" onClick={addParticipantFromExpense}>
                    ＋ Cadastrar pessoa
                  </button>
                </div>
              )}
              {validFormAmount > 0 && form.shares.length > 0 && (
                <div className={`split-live-summary ${totalFormSharesAmount > validFormAmount ? 'is-over' : ''}`} role="status">
                  <span>Total: <b>{money(validFormAmount)}</b></span>
                  <span>Terceiros: <b>{money(totalFormSharesAmount)}</b></span>
                  <span className="split-live-personal">
                    {totalFormSharesAmount > validFormAmount
                      ? `Excede o total em ${money(totalFormSharesAmount - validFormAmount)}`
                      : `Sua parte: ${money(personalFormPreview)}`}
                  </span>
                </div>
              )}
              {shareError && (
                <div className="share-error" role="alert">
                  {shareError}
                </div>
              )}
                </div>
              )}
            </fieldset>
            {!editingExpenseId && (
              <label className="keep-modal-open-check">
                <input
                  type="checkbox"
                  checked={keepExpenseModalOpen}
                  onChange={e => {
                    blurActiveInputOnTouch()
                    setKeepExpenseModalOpen(e.target.checked)
                  }}
                />
                <span>Continuar adicionando outra despesa após salvar</span>
              </label>
            )}
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeExpenseModal}>
                Cancelar
              </button>
              <button className="primary" type="submit">
                {editingExpenseId ? 'Salvar alterações' : keepExpenseModalOpen ? 'Salvar e adicionar outra' : 'Salvar lançamento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {recurrenceEditor && (
        <div
          className={`modal-backdrop ${closingModal === 'recurrence' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeRecurrenceModal()
          }}
        >
          <form
            noValidate
            className={`modal recurrence-modal ${formShake === 'recurrence' ? 'is-shaking' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recurrence-modal-title"
            onSubmit={saveRecurrence}
            onAnimationEnd={event => {
              if (event.animationName === 'nexus-modal-shake') setFormShake(null)
            }}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">DESPESA MENSAL</span>
                <h2 id="recurrence-modal-title">{recurrenceEditor.id ? 'Editar recorrência' : 'Nova recorrência'}</h2>
              </div>
              <button type="button" aria-label="Fechar recorrência" onClick={closeRecurrenceModal}>
                ×
              </button>
            </div>
            <label className={recurrenceErrors.description ? 'is-invalid' : ''}>
              Descrição
              <input
                autoFocus={!isTouchDevice()}
                enterKeyHint="done"
                onKeyDown={dismissKeyboardOnEnter}
                maxLength={70}
                aria-invalid={Boolean(recurrenceErrors.description)}
                placeholder="Ex.: Internet, academia..."
                value={recurrenceEditor.description}
                onChange={event => {
                  clearFieldError(setRecurrenceErrors, 'description')
                  setRecurrenceEditor({ ...recurrenceEditor, description: event.target.value })
                }}
              />
              {recurrenceErrors.description && (
                <small className="field-error-msg" role="alert">
                  {recurrenceErrors.description}
                </small>
              )}
            </label>
            <div className="form-row">
              <label className={recurrenceErrors.amount ? 'is-invalid' : ''}>
                Valor mensal
                <div className="money-input-wrap">
                  <span className="money-prefix" aria-hidden="true">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    onKeyDown={dismissKeyboardOnEnter}
                    aria-invalid={Boolean(recurrenceErrors.amount)}
                    placeholder="0,00"
                    value={recurrenceEditor.amount}
                    onChange={event => {
                      clearFieldError(setRecurrenceErrors, 'amount')
                      setRecurrenceEditor({ ...recurrenceEditor, amount: formatMoneyInput(event.target.value) })
                    }}
                  />
                </div>
                {recurrenceErrors.amount && (
                  <small className="field-error-msg" role="alert">
                    {recurrenceErrors.amount}
                  </small>
                )}
              </label>
              <label className={recurrenceErrors.day ? 'is-invalid' : ''}>
                Dia da cobrança
                <input
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="done"
                  onKeyDown={dismissKeyboardOnEnter}
                  aria-invalid={Boolean(recurrenceErrors.day)}
                  placeholder="1 a 31"
                  value={recurrenceEditor.day}
                  onChange={event => {
                    clearFieldError(setRecurrenceErrors, 'day')
                    setRecurrenceEditor({ ...recurrenceEditor, day: event.target.value.replace(/\D/g, '').slice(0, 2) })
                  }}
                />
                {recurrenceErrors.day && (
                  <small className="field-error-msg" role="alert">
                    {recurrenceErrors.day}
                  </small>
                )}
              </label>
            </div>
            <div className="form-row">
              <label>
                Categoria
                <select value={recurrenceEditor.category} onFocus={blurActiveInputOnTouch} onChange={event => setRecurrenceEditor({ ...recurrenceEditor, category: event.target.value })}>
                  {data.categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Pagamento
                <select value={recurrenceEditor.method} onFocus={blurActiveInputOnTouch} onChange={event => setRecurrenceEditor({ ...recurrenceEditor, method: event.target.value as Method })}>
                  <option>PIX</option>
                  <option>Débito</option>
                  <option>Dinheiro</option>
                  {data.cards.length > 0 && <option>Crédito à vista</option>}
                </select>
              </label>
            </div>
            {recurrenceEditor.method.startsWith('Crédito') && (
              <label>
                Cartão
                <select value={recurrenceEditor.cardId} onFocus={blurActiveInputOnTouch} onChange={event => setRecurrenceEditor({ ...recurrenceEditor, cardId: event.target.value })}>
                  {data.cards.map(card => (
                    <option key={card.id} value={card.id}>
                      {card.kind === 'store' ? '🛍️' : card.kind === 'borrowed' ? '🤝' : '🏦'} {card.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="form-help">A recorrência só vira lançamento quando você confirma na revisão mensal. Você pode pular uma cobrança ou pausar o modelo.</p>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeRecurrenceModal}>
                Cancelar
              </button>
              <button className="primary" type="submit">
                {recurrenceEditor.id ? 'Salvar alterações' : 'Criar modelo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDialog && (
        <div
          className={`modal-backdrop ${closingModal === 'confirm' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeConfirmDialog()
          }}
        >
          <section className="modal confirm-dialog-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
            <div className="modal-header">
              <div>
                <span className="eyebrow">{confirmDialog.eyebrow}</span>
                <h2 id="confirm-dialog-title">{confirmDialog.title}</h2>
              </div>
              <button type="button" aria-label="Fechar confirmação" onClick={closeConfirmDialog}>
                ×
              </button>
            </div>
            <p className="confirm-dialog-description">{confirmDialog.description}</p>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeConfirmDialog}>
                Cancelar
              </button>
              <button type="button" className="danger-btn" onClick={confirmDialog.onConfirm}>
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}

      {settingsModal && (
        <div
          className={`modal-backdrop ${closingModal === 'settings' ? 'is-closing' : ''}`}
          onMouseDown={e => {
            if (e.target === e.currentTarget) closeSettingsModal()
          }}
        >
          <form
            noValidate
            className={`modal settings-modal ${formShake === 'settings' ? 'is-shaking' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onSubmit={saveSetting}
            onAnimationEnd={event => {
              if (event.animationName === 'nexus-modal-shake') setFormShake(null)
            }}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">AJUSTES</span>
                <h2 id="settings-modal-title">
                  {settingsModal.id ? 'Editar' : 'Novo'}{' '}
                  {settingsModal.kind === 'category' ? 'categoria' : settingsModal.kind === 'card' ? 'cartão / crédito' : 'participante'}
                </h2>
              </div>
              <button type="button" aria-label="Fechar ajustes" onClick={closeSettingsModal}>
                ×
              </button>
            </div>
            {settingsModal.kind === 'card' && (
              <div className="card-kind-selector" role="radiogroup" aria-label="Tipo de crédito">
                <button
                  type="button"
                  role="radio"
                  aria-checked={settingsModal.cardKind === 'bank'}
                  className={`card-kind-option ${settingsModal.cardKind === 'bank' ? 'is-selected' : ''}`}
                  onClick={() => setSettingsModal({ ...settingsModal, cardKind: 'bank' })}
                >
                  <span className="card-kind-icon" aria-hidden="true">🏦</span>
                  <div>
                    <b>Cartão tradicional</b>
                  </div>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={settingsModal.cardKind === 'store'}
                  className={`card-kind-option ${settingsModal.cardKind === 'store' ? 'is-selected' : ''}`}
                  onClick={() => {
                    clearFieldError(setSettingsErrors, 'closingDay')
                    clearFieldError(setSettingsErrors, 'dueDay')
                    setSettingsModal({ ...settingsModal, cardKind: 'store' })
                  }}
                >
                  <span className="card-kind-icon" aria-hidden="true">🛍️</span>
                  <div>
                    <b>Crédito de loja</b>
                  </div>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={settingsModal.cardKind === 'borrowed'}
                  className={`card-kind-option ${settingsModal.cardKind === 'borrowed' ? 'is-selected' : ''}`}
                  onClick={() => {
                    clearFieldError(setSettingsErrors, 'closingDay')
                    clearFieldError(setSettingsErrors, 'dueDay')
                    setSettingsModal({ ...settingsModal, cardKind: 'borrowed' })
                  }}
                >
                  <span className="card-kind-icon" aria-hidden="true">🤝</span>
                  <div>
                    <b>Cartão emprestado</b>
                  </div>
                </button>
              </div>
            )}
            <label className={settingsErrors.name ? 'is-invalid' : ''}>
              Nome
              <input
                autoFocus={!isTouchDevice()}
                enterKeyHint="done"
                onKeyDown={dismissKeyboardOnEnter}
                maxLength={40}
                aria-invalid={Boolean(settingsErrors.name)}
                placeholder={
                  settingsModal.kind === 'category'
                    ? 'Ex.: Educação'
                    : settingsModal.kind === 'card'
                      ? settingsModal.cardKind === 'store'
                        ? 'Ex.: Shopee Pay, Mercado Crédito, Parcela AliExpress'
                        : settingsModal.cardKind === 'borrowed'
                          ? 'Ex.: Cartão da Mãe, Cartão do Pai'
                          : 'Ex.: Cartão principal'
                      : 'Ex.: Maria'
                }
                value={settingsModal.name}
                onChange={e => {
                  clearFieldError(setSettingsErrors, 'name')
                  setSettingsModal({ ...settingsModal, name: e.target.value })
                }}
              />
              {settingsErrors.name && (
                <small className="field-error-msg" role="alert">
                  {settingsErrors.name}
                </small>
              )}
              {settingsModal.kind === 'card' && (settingsModal.cardKind === 'store' || settingsModal.cardKind === 'borrowed') && (
                <div className="store-card-presets">
                  <span>Sugestões rápidas:</span>
                  {(settingsModal.cardKind === 'store'
                    ? ['Shopee Pay', 'Mercado Crédito', 'Parcela (AliExpress)']
                    : ['Cartão da Mãe', 'Cartão do Pai', 'Cartão de Familiar']
                  ).map(presetName => (
                    <button
                      key={presetName}
                      type="button"
                      className={`store-preset-chip ${settingsModal.name.trim().toLowerCase() === presetName.toLowerCase() ? 'is-active' : ''}`}
                      onClick={() => {
                        clearFieldError(setSettingsErrors, 'name')
                        setSettingsModal({ ...settingsModal, name: presetName })
                      }}
                    >
                      {presetName}
                    </button>
                  ))}
                </div>
              )}
            </label>
            {settingsModal.kind === 'category' ? (
              <div className={`category-color-field ${settingsErrors.color ? 'is-invalid' : ''}`}>
                {(() => {
                  const safeColor = /^#[0-9a-fA-F]{6}$/.test(settingsModal.color) ? settingsModal.color : '#6e7f72'
                  const hsl = hexToHsl(safeColor)
                  const applyHsl = (nextH: number, nextS: number, nextL: number) => {
                    clearFieldError(setSettingsErrors, 'color')
                    const nextHex = hslToHex(nextH, nextS, nextL)
                    setSettingsModal(current => (current ? { ...current, color: nextHex } : current))
                  }
                  return (
                    <>
                      <div className="category-modal-preview" aria-label="Prévia da categoria">
                        <span className="category-icon" style={{ color: safeColor, background: `${safeColor}22` }}>
                          {categorySymbol(settingsModal.id, settingsModal.name)}
                        </span>
                        <div className="category-modal-preview-text">
                          <b>{settingsModal.name.trim() || 'Prévia da categoria'}</b>
                          <small>O ícone se adapta automaticamente ao nome (ex.: TCG, Games, Uber/99, Assinaturas)</small>
                        </div>
                        <span className="category-label">
                          <i style={{ background: safeColor }} />
                          {settingsModal.name.trim() || 'Categoria'}
                        </span>
                      </div>
                      <span className="category-color-label">Cores sugeridas</span>
                      <div className="color-swatch-grid" role="radiogroup" aria-label="Paleta de cores da categoria">
                        {CATEGORY_COLOR_PRESETS.map(preset => {
                          const isSelected = settingsModal.color.toLowerCase() === preset.color.toLowerCase()
                          return (
                            <button
                              key={preset.color}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              aria-label={preset.label}
                              title={preset.label}
                              className={`color-swatch ${isSelected ? 'is-selected' : ''}`}
                              style={{ backgroundColor: preset.color }}
                              onClick={() => {
                                clearFieldError(setSettingsErrors, 'color')
                                setSettingsModal(current => (current ? { ...current, color: preset.color } : current))
                              }}
                            >
                              {isSelected && <span aria-hidden="true">✓</span>}
                            </button>
                          )
                        })}
                      </div>
                      <div className="visual-color-picker" data-no-swipe="true">
                        <div className="visual-color-head">
                          <span className="category-color-label">Cor personalizada (arraste para escolher)</span>
                          <div className="tone-pills" role="group" aria-label="Tom da cor">
                            {[
                              { label: 'Suave', s: 36, l: 58 },
                              { label: 'Equilibrado', s: 52, l: 50 },
                              { label: 'Vibrante', s: 78, l: 54 },
                              { label: 'Intenso', s: 65, l: 40 },
                            ].map(tone => {
                              const isToneActive = Math.abs(hsl.s - tone.s) <= 10 && Math.abs(hsl.l - tone.l) <= 7
                              return (
                                <button
                                  key={tone.label}
                                  type="button"
                                  className={`tone-pill-btn ${isToneActive ? 'is-active' : ''}`}
                                  onClick={() => applyHsl(hsl.h, tone.s, tone.l)}
                                >
                                  {tone.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <input
                          type="range"
                          className="hue-slider"
                          aria-label="Escolher matiz da cor"
                          min={0}
                          max={360}
                          value={hsl.h}
                          onChange={e => applyHsl(Number(e.target.value), Math.max(35, hsl.s || 55), Math.min(62, Math.max(38, hsl.l || 50)))}
                        />
                        <div className={`custom-hex-row ${settingsErrors.color ? 'is-invalid' : ''}`}>
                          <label className="native-color-picker-btn" title="Abrir roda de cores do sistema">
                            <input
                              type="color"
                              aria-label="Abrir seletor visual de cores"
                              value={safeColor}
                              onChange={e => {
                                clearFieldError(setSettingsErrors, 'color')
                                setSettingsModal(current => (current ? { ...current, color: e.target.value.toLowerCase() } : current))
                              }}
                            />
                            <span className="custom-hex-preview" style={{ backgroundColor: safeColor }} aria-hidden="true" />
                            <span>Abrir seletor visual</span>
                          </label>
                          <input
                            type="text"
                            className="hex-code-input"
                            maxLength={7}
                            enterKeyHint="done"
                            onKeyDown={dismissKeyboardOnEnter}
                            aria-label="Código hexadecimal da cor (opcional)"
                            aria-invalid={Boolean(settingsErrors.color)}
                            placeholder="#6E7F72"
                            value={settingsModal.color.toUpperCase()}
                            onChange={e => {
                              clearFieldError(setSettingsErrors, 'color')
                              const raw = e.target.value.replace(/[^#0-9a-fA-F]/g, '')
                              const next = raw.startsWith('#') ? `#${raw.slice(1).replace(/#/g, '').slice(0, 6)}` : `#${raw.replace(/#/g, '').slice(0, 6)}`
                              setSettingsModal(current => (current ? { ...current, color: next } : current))
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )
                })()}
                {settingsErrors.color && (
                  <small className="field-error-msg" role="alert">
                    {settingsErrors.color}
                  </small>
                )}
              </div>
            ) : settingsModal.kind === 'card' ? (
              settingsModal.cardKind === 'store' || settingsModal.cardKind === 'borrowed' ? (
                <div className="store-card-info-box" role="note">
                  <span aria-hidden="true">{settingsModal.cardKind === 'borrowed' ? '🤝' : '🛍️'}</span>
                  <div>
                    <b>{settingsModal.cardKind === 'borrowed' ? 'Sem precisar saber o fechamento da fatura' : 'Sem data fixa de fechamento'}</b>
                    <p>
                      {settingsModal.cardKind === 'borrowed' ? (
                        <>
                          Ideal quando você passa uma compra no cartão da mãe, familiar ou amigo. Ao lançar a despesa nesse cartão, basta tocar em <b>Neste mês</b> ou <b>Próximo mês</b> e o valor ficará separado no resumo daquele mês.
                        </>
                      ) : (
                        <>
                          Como o Shopee Pay, Mercado Crédito e Parcela (AliExpress) só informam a data de cobrança após finalizar o pedido, você não precisa informar dia de fechamento aqui. Na hora de lançar a compra, basta tocar em <b>Neste mês</b> ou <b>Próximo mês</b>.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-row">
                    <label className={settingsErrors.closingDay ? 'is-invalid' : ''}>
                      Dia de fechamento
                      <input
                        type="text"
                        inputMode="numeric"
                        enterKeyHint="done"
                        onKeyDown={dismissKeyboardOnEnter}
                        aria-invalid={Boolean(settingsErrors.closingDay)}
                        placeholder="1 a 31"
                        value={settingsModal.closingDay}
                        onChange={e => {
                          clearFieldError(setSettingsErrors, 'closingDay')
                          setSettingsModal({ ...settingsModal, closingDay: e.target.value.replace(/\D/g, '').slice(0, 2) })
                        }}
                      />
                      {settingsErrors.closingDay ? (
                        <small className="field-error-msg" role="alert">
                          {settingsErrors.closingDay}
                        </small>
                      ) : (
                        <small className="form-help">Compras após este dia entram na próxima fatura.</small>
                      )}
                    </label>
                    <label className={settingsErrors.dueDay ? 'is-invalid' : ''}>
                      Dia de vencimento
                      <input
                        type="text"
                        inputMode="numeric"
                        enterKeyHint="done"
                        onKeyDown={dismissKeyboardOnEnter}
                        aria-invalid={Boolean(settingsErrors.dueDay)}
                        placeholder="1 a 31"
                        value={settingsModal.dueDay}
                        onChange={e => {
                          clearFieldError(setSettingsErrors, 'dueDay')
                          setSettingsModal({ ...settingsModal, dueDay: e.target.value.replace(/\D/g, '').slice(0, 2) })
                        }}
                      />
                      {settingsErrors.dueDay && (
                        <small className="field-error-msg" role="alert">
                          {settingsErrors.dueDay}
                        </small>
                      )}
                    </label>
                  </div>
                  <label>
                    Compras no dia do fechamento
                    <select
                      value={settingsModal.closingDayRule}
                      onFocus={blurActiveInputOnTouch}
                      onChange={e => setSettingsModal({ ...settingsModal, closingDayRule: e.target.value as ClosingDayRule })}
                    >
                      <option value="after">Fatura já fechada (contabilizar na próxima fatura)</option>
                      <option value="before">Fatura ainda aberta (contabilizar na fatura atual)</option>
                    </select>
                    <small className="form-help">Regra padrão aplicada quando uma compra é feita no próprio dia de fechamento.</small>
                  </label>
                </>
              )
            ) : (
              <p className="form-help participant-modal-help">
                Os valores atribuídos a esta pessoa ficarão associados aos lançamentos correspondentes e serão salvos apenas neste dispositivo.
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeSettingsModal}>
                Cancelar
              </button>
              <button className="primary" type="submit">
                {settingsModal.id ? 'Salvar alterações' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingBackupImport && (
        <div
          className={`modal-backdrop ${closingModal === 'backup' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeBackupConfirmModal()
          }}
        >
          <section className="modal backup-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="backup-confirm-title">
            <div className="modal-header">
              <div>
                <span className="eyebrow">SEUS DADOS</span>
                <h2 id="backup-confirm-title">Importar backup?</h2>
              </div>
              <button type="button" aria-label="Fechar" onClick={closeBackupConfirmModal}>
                ×
              </button>
            </div>
            <p>Esta ação vai substituir os dados salvos neste navegador.</p>
            {pendingBackupImport.preferences && (
              <p>O arquivo também contém suas preferências, como tema, tela inicial, limite mensal e perfil.</p>
            )}
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeBackupConfirmModal}>
                Cancelar
              </button>
              <button type="button" className="primary" onClick={confirmBackupImport}>
                Importar e substituir
              </button>
            </div>
          </section>
        </div>
      )}

      {resetDataModalOpen && (
        <div
          className={`modal-backdrop ${closingModal === 'reset' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeResetDataModal()
          }}
        >
          <form
            noValidate
            className={`modal reset-data-modal ${formShake === 'reset' ? 'is-shaking' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-data-title"
            onSubmit={confirmResetAllData}
            onAnimationEnd={event => {
              if (event.animationName === 'nexus-modal-shake') setFormShake(null)
            }}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">ZONA DE SEGURANÇA</span>
                <h2 id="reset-data-title">Excluir todos os dados?</h2>
              </div>
              <button type="button" aria-label="Fechar confirmação de exclusão" onClick={closeResetDataModal}>
                ×
              </button>
            </div>
            <div className="reset-warning-box" role="note">
              <b>Esta ação não pode ser desfeita.</b>
              <p>
                Todos os lançamentos, recorrências, categorias, cartões, participantes e o seu perfil salvos neste navegador serão apagados permanentemente,
                e o Põe na Conta voltará para a tela inicial de cadastro.
              </p>
            </div>
            <button type="button" className="outline-btn reset-backup-shortcut" onClick={downloadBackup}>
              ↓ Baixar backup JSON antes de excluir
            </button>
            <label className={resetConfirmError ? 'easter-egg-field is-invalid' : 'easter-egg-field'}>
              Para confirmar, digite <b>EXCLUIR</b> abaixo
              <input
                autoFocus={!isTouchDevice()}
                type="text"
                enterKeyHint="done"
                onKeyDown={dismissKeyboardOnEnter}
                placeholder="Digite EXCLUIR"
                aria-invalid={resetConfirmError}
                value={resetConfirmText}
                onChange={event => {
                  setResetConfirmText(event.target.value)
                  if (resetConfirmError) setResetConfirmError(false)
                }}
              />
              {resetConfirmError && (
                <small className="field-error-msg" role="alert">
                  Digite exatamente a palavra EXCLUIR para liberar a limpeza dos dados.
                </small>
              )}
            </label>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeResetDataModal}>
                Cancelar
              </button>
              <button type="submit" className="danger-btn">
                Excluir tudo e recomeçar
              </button>
            </div>
          </form>
        </div>
      )}

      {onboardingOpen && (
        <div className={`modal-backdrop onboarding-backdrop ${closingModal === 'onboarding' ? 'is-closing' : ''}`}>
          <form noValidate className="modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" onSubmit={completeOnboarding}>
            <div className="onboarding-brand">
              <span className="brand-mark">
                <svg viewBox="0 0 48 48" shapeRendering="crispEdges" aria-hidden="true">
                  <rect x="1" y="1" width="46" height="46" rx="13" fill="#20231f" />
                  <path d="M18 6h12v3h6v6h3v6h3v12h-3v6h-6v3H18v-3h-6v-6H9v-6H6V18h3v-6h6V9h3z" fill="#986027" />
                  <path d="M18 9h12v3h6v6h3v12h-3v6h-6v3H18v-3h-6v-6H9V18h3v-6h6z" fill="#e8b957" />
                  <path d="M18 12h12v3h6v3h-3v3h-3v-3H18v-3h-3v-3h3z" fill="#f6d77e" />
                  <rect x="22" y="14" width="4" height="20" fill="#80501f" />
                  <rect x="18" y="17" width="12" height="3" fill="#80501f" />
                  <rect x="15" y="20" width="3" height="3" fill="#80501f" />
                  <rect x="18" y="23" width="12" height="3" fill="#80501f" />
                  <rect x="27" y="26" width="3" height="3" fill="#80501f" />
                  <rect x="18" y="29" width="12" height="3" fill="#80501f" />
                  <rect x="12" y="18" width="3" height="6" fill="#f6d77e" />
                </svg>
              </span>
              <div>
                <span className="eyebrow">BOAS-VINDAS AO PÕE NA CONTA</span>
                <h2 id="onboarding-title">Configure seu perfil</h2>
                <p>Personalize como seu espaço aparece neste navegador. Tudo pode ser alterado depois em Ajustes.</p>
              </div>
            </div>
            <div className="onboarding-profile-box">
              <div className={`avatar onboarding-avatar profile-avatar ${profilePhoto ? 'has-photo' : ''}`}>
                {profilePhoto ? (
                  <img src={profilePhoto} alt="" />
                ) : profileName.trim() ? (
                  profileInitials(profileName)
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>
                )}
              </div>
              <div className="onboarding-profile-fields">
                <label>
                  Como quer ser chamado(a)?
                  <input
                    autoFocus={!isTouchDevice()}
                    type="text"
                    enterKeyHint="done"
                    onKeyDown={dismissKeyboardOnEnter}
                    maxLength={60}
                    placeholder="Ex.: Gabriel"
                    value={profileName}
                    onChange={event => updateProfileName(event.target.value)}
                  />
                </label>
                <div className="profile-photo-actions">
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => {
                      blurActiveInputOnTouch()
                      profilePhotoInput.current?.click()
                    }}
                  >
                    {profilePhoto ? 'Trocar foto' : 'Adicionar foto'}
                  </button>
                  {profilePhoto && (
                    <button type="button" className="text-btn" onClick={removeProfilePhoto}>
                      Remover foto
                    </button>
                  )}
                </div>
                {profileMessage && (
                  <small className="profile-message" role="status">
                    {profileMessage}
                  </small>
                )}
              </div>
            </div>
            <div className="onboarding-section">
              <span className="onboarding-label">Aparência</span>
              <div className="onboarding-options two-cols" role="radiogroup" aria-label="Tema da interface">
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === 'light'}
                  className={`onboarding-option ${theme === 'light' ? 'is-selected' : ''}`}
                  onClick={() => {
                    blurActiveInputOnTouch()
                    updateDefaultTheme('light')
                  }}
                >
                  <span className="onboarding-option-icon">☀</span>
                  <div>
                    <b>Tema claro</b>
                    <small>Fundo suave e leitura diurna</small>
                  </div>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === 'dark'}
                  className={`onboarding-option ${theme === 'dark' ? 'is-selected' : ''}`}
                  onClick={() => {
                    blurActiveInputOnTouch()
                    updateDefaultTheme('dark')
                  }}
                >
                  <span className="onboarding-option-icon">☾</span>
                  <div>
                    <b>Tema escuro</b>
                    <small>Contraste confortável à noite</small>
                  </div>
                </button>
              </div>
            </div>
            <div className="onboarding-section">
              <span className="onboarding-label">Como deseja começar?</span>
              <div className="onboarding-options" role="radiogroup" aria-label="Dados iniciais">
                {hasExistingData && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={onboardingStartMode === 'keep'}
                    className={`onboarding-option ${onboardingStartMode === 'keep' ? 'is-selected' : ''}`}
                    onClick={() => {
                      blurActiveInputOnTouch()
                      setOnboardingStartMode('keep')
                    }}
                  >
                    <span className="onboarding-option-icon">✓</span>
                    <div>
                      <b>Manter meus lançamentos atuais</b>
                      <small>Preserva os registros que já estão salvos neste navegador.</small>
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  role="radio"
                  aria-checked={onboardingStartMode === 'empty'}
                  className={`onboarding-option ${onboardingStartMode === 'empty' ? 'is-selected' : ''}`}
                  onClick={() => {
                    blurActiveInputOnTouch()
                    setOnboardingStartMode('empty')
                  }}
                >
                  <span className="onboarding-option-icon">✨</span>
                  <div>
                    <b>Começar do zero</b>
                    <small>Conta limpa, pronta para registrar seus próprios gastos.</small>
                  </div>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={onboardingStartMode === 'demo'}
                  className={`onboarding-option ${onboardingStartMode === 'demo' ? 'is-selected' : ''}`}
                  onClick={() => {
                    blurActiveInputOnTouch()
                    setOnboardingStartMode('demo')
                  }}
                >
                  <span className="onboarding-option-icon">◫</span>
                  <div>
                    <b>Explorar com dados de exemplo</b>
                    <small>Inclui despesas fictícias para visualizar gráficos e relatórios.</small>
                  </div>
                </button>
              </div>
            </div>
            <div className="onboarding-footer">
              <button type="button" className="outline-btn" onClick={() => backupInput.current?.click()}>
                ↑ Já tenho um backup JSON
              </button>
              <button type="submit" className="primary">
                Entrar no Põe na Conta →
              </button>
            </div>
            <p className="onboarding-privacy-note">🔒 Seus dados ficam salvos apenas neste navegador.</p>
          </form>
        </div>
      )}

      {easterEggOpen && (
        <div
          className={`modal-backdrop easter-egg-backdrop ${closingModal === 'easter-egg' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeEasterEgg()
          }}
        >
          {easterEggMessage ? (
            <section className="modal easter-egg-modal is-revealed" role="dialog" aria-modal="true" aria-labelledby="easter-egg-title">
              <div className="modal-header">
                <div>
                  <span className="eyebrow">SEGREDO DESBLOQUEADO</span>
                  <h2 id="easter-egg-title">Mensagem secreta</h2>
                </div>
                <button type="button" aria-label="Fechar" onClick={closeEasterEgg}>
                  ×
                </button>
              </div>
              <div className="easter-egg-reveal" role="status">
                <p>{easterEggMessage}</p>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setEasterEggMessage('')
                    setEasterEggPassword('')
                    setEasterEggError(false)
                    setEasterEggShake(false)
                    window.requestAnimationFrame(() => easterEggInputRef.current?.focus())
                  }}
                >
                  Outra senha
                </button>
                <button type="button" className="primary" onClick={closeEasterEgg}>
                  Fechar
                </button>
              </div>
            </section>
          ) : (
            <form
              noValidate
              className={`modal easter-egg-modal ${easterEggShake ? 'is-shaking' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="easter-egg-title"
              onSubmit={submitEasterEgg}
              onAnimationEnd={event => {
                if (event.animationName === 'nexus-modal-shake') setEasterEggShake(false)
              }}
            >
              <div className="modal-header">
                <div>
                  <span className="eyebrow">SEGREDO DESBLOQUEADO</span>
                  <h2 id="easter-egg-title">Digite a senha</h2>
                </div>
                <button type="button" aria-label="Fechar" onClick={closeEasterEgg}>
                  ×
                </button>
              </div>
              <label className={easterEggError ? 'easter-egg-field is-invalid' : 'easter-egg-field'}>
                Senha
                <input
                  ref={easterEggInputRef}
                  type="password"
                  aria-invalid={easterEggError}
                  value={easterEggPassword}
                  onChange={event => {
                    setEasterEggPassword(event.target.value)
                    if (easterEggError) setEasterEggError(false)
                  }}
                  placeholder="Digite a senha"
                />
                {easterEggError && (
                  <small className="field-error-msg" role="alert">
                    Senha incorreta. Tente novamente.
                  </small>
                )}
              </label>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeEasterEgg}>
                  Fechar
                </button>
                <button className="primary" type="submit">
                  Confirmar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {reimbursementEditor && (
        <div
          className={`modal-backdrop ${closingModal === 'reimbursement' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeManualReimbursementModal()
          }}
        >
          <form
            noValidate
            className={`modal reimbursement-modal ${formShake === 'reimbursement' ? 'is-shaking' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reimbursement-modal-title"
            onSubmit={saveManualReimbursement}
            onAnimationEnd={event => {
              if (event.animationName === 'nexus-modal-shake') setFormShake(null)
            }}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">ABATIMENTO DE RACHA ({monthName(month).toUpperCase()})</span>
                <h2 id="reimbursement-modal-title">
                  {reimbursementEditor.id ? 'Editar valor avulso' : 'Abater valor avulso'}
                </h2>
              </div>
              <button type="button" aria-label="Fechar abatimento" onClick={closeManualReimbursementModal}>
                ×
              </button>
            </div>
            <p className="form-help participant-modal-help">
              Ideal para quando você rachou várias despesas (como corridas de Uber) e recebeu o PIX somado, mas não lembra quais lançamentos específicos dividir. O valor será <b>descontado da sua parte pessoal</b> neste mês.
            </p>
            <label className={reimbursementErrors.description ? 'is-invalid' : ''}>
              Descrição / Motivo
              <input
                autoFocus={!isTouchDevice()}
                enterKeyHint="done"
                onKeyDown={dismissKeyboardOnEnter}
                aria-invalid={Boolean(reimbursementErrors.description)}
                placeholder="Ex.: Racha dos Ubers da semana, PIX do almoço..."
                value={reimbursementEditor.description}
                onChange={e => {
                  clearFieldError(setReimbursementErrors, 'description')
                  setReimbursementEditor({ ...reimbursementEditor, description: e.target.value })
                }}
              />
              {reimbursementErrors.description && (
                <small className="field-error-msg" role="alert">
                  {reimbursementErrors.description}
                </small>
              )}
            </label>
            <div className="form-row">
              <label className={reimbursementErrors.amount ? 'is-invalid' : ''}>
                Valor a abater
                <div className="money-input-wrap">
                  <span className="money-prefix" aria-hidden="true">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    onKeyDown={dismissKeyboardOnEnter}
                    aria-invalid={Boolean(reimbursementErrors.amount)}
                    placeholder="0,00"
                    value={reimbursementEditor.amount}
                    onChange={e => {
                      clearFieldError(setReimbursementErrors, 'amount')
                      setReimbursementEditor({ ...reimbursementEditor, amount: formatMoneyInput(e.target.value) })
                    }}
                  />
                </div>
                {reimbursementErrors.amount && (
                  <small className="field-error-msg" role="alert">
                    {reimbursementErrors.amount}
                  </small>
                )}
              </label>
              <label>
                Quem pagou / racha
                <select
                  value={reimbursementEditor.participantId}
                  onFocus={blurActiveInputOnTouch}
                  onChange={e => setReimbursementEditor({ ...reimbursementEditor, participantId: e.target.value })}
                >
                  <option value={QUICK_THIRD_PARTY_ID}>⚡ {QUICK_THIRD_PARTY_NAME} (sem cadastro)</option>
                  {(data.participants || []).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Abater da fatura do cartão (opcional)
                <select
                  value={reimbursementEditor.cardId}
                  onFocus={blurActiveInputOnTouch}
                  onChange={e => setReimbursementEditor({ ...reimbursementEditor, cardId: e.target.value })}
                >
                  <option value="">Nenhum (apenas no total do mês)</option>
                  {data.cards.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.kind === 'store' ? '🛍️' : c.kind === 'borrowed' ? '🤝' : '🏦'} {c.name}
                    </option>
                  ))}
                </select>
                <small className="form-help">Reduz a &ldquo;Sua parte&rdquo; no resumo desse cartão.</small>
              </label>
              <label>
                Abater de qual categoria? (opcional)
                <select
                  value={reimbursementEditor.categoryId}
                  onFocus={blurActiveInputOnTouch}
                  onChange={e => setReimbursementEditor({ ...reimbursementEditor, categoryId: e.target.value })}
                >
                  <option value="">Nenhuma (apenas no total geral)</option>
                  {data.categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <small className="form-help">Desconta o valor do gráfico dessa categoria.</small>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeManualReimbursementModal}>
                Cancelar
              </button>
              <button className="primary" type="submit">
                {reimbursementEditor.id ? 'Salvar alterações' : 'Aplicar abatimento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {participantSummaryTarget && (() => {
        const expenseItems = currentExpenses.flatMap(e => {
          const share = e.allocatedShares.find(s => s.participantId === participantSummaryTarget.id && s.amount > 0)
          if (!share) return []
          const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${e.date}T12:00:00`)).replace('.', '')
          return [
            {
              key: `${e.id}-${e.part}`,
              expenseId: e.id,
              part: e.part,
              description: e.description,
              detail: `${shortDate} · ${e.installments > 1 ? `Parcela ${e.part}/${e.installments}` : e.method}`,
              amount: share.amount,
              paid: Boolean(share.paid),
              labelForText: e.installments > 1 ? `${e.description} (Parcela ${e.part}/${e.installments})` : e.description,
            },
          ]
        })
        const manualItems = currentReimbursements
          .filter(r => r.participantId === participantSummaryTarget.id && r.amount > 0)
          .map(r => ({
            key: r.id,
            expenseId: undefined as string | undefined,
            part: 1,
            description: r.description,
            detail: 'Abatimento avulso no mês',
            amount: r.amount,
            paid: false,
            labelForText: r.description,
          }))
        const allSummaryItems = [...expenseItems, ...manualItems]
        const unpaidSummaryItems = allSummaryItems.filter(item => !item.paid)
        const paidSummaryTotal = Math.round(allSummaryItems.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0) * 100) / 100
        const summaryTotal = Math.round(unpaidSummaryItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100
        const allExpenseItemsPaid = expenseItems.length > 0 && expenseItems.every(item => item.paid)
        const itemClauses = unpaidSummaryItems.map(item => `${money(item.amount)} por conta de ${item.labelForText}`).join(', ')
        const trimmedPix = pixKey.trim()
        const copyMessage =
          unpaidSummaryItems.length > 0
            ? `O valor que você tem que me passar é ${itemClauses}. Totalizando: ${money(summaryTotal)}.${
                trimmedPix ? ` Essa é minha chave PIX: ${trimmedPix}` : ''
              }`
            : ''

        const closeParticipantSummary = () =>
          closeModalWithAnimation('participant-summary', () => setParticipantSummaryTarget(null))

        const handleCopySummary = async () => {
          if (!copyMessage) return
          try {
            await navigator.clipboard.writeText(copyMessage)
            showToast('Resumo copiado para a área de transferência!')
          } catch {
            const textarea = document.createElement('textarea')
            textarea.value = copyMessage
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            showToast('Resumo copiado para a área de transferência!')
          }
        }

        return (
          <div
            className={`modal-backdrop ${closingModal === 'participant-summary' ? 'is-closing' : ''}`}
            onMouseDown={event => {
              if (event.target === event.currentTarget) closeParticipantSummary()
            }}
          >
            <section
              className="modal participant-summary-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="participant-summary-title"
            >
              <div className="modal-header">
                <div>
                  <span className="eyebrow">RESUMO DE REEMBOLSO ({monthName(month).toUpperCase()})</span>
                  <h2 id="participant-summary-title">{participantSummaryTarget.name}</h2>
                </div>
                <button type="button" aria-label="Fechar resumo" onClick={closeParticipantSummary}>
                  ×
                </button>
              </div>
              <div className="participant-summary-toolbar">
                <span className="participant-summary-hint">
                  Toque nas despesas que {participantSummaryTarget.name} já pagou para abatê-las da cobrança:
                </span>
                {expenseItems.length > 1 && (
                  <button
                    type="button"
                    className="text-btn participant-mark-all-btn"
                    onClick={() => setAllParticipantSharesPaidInMonth(participantSummaryTarget.id, !allExpenseItemsPaid)}
                  >
                    {allExpenseItemsPaid ? 'Desmarcar todas' : '✓ Marcar todas como pagas'}
                  </button>
                )}
              </div>
              <div className="participant-summary-items">
                {allSummaryItems.map(item => (
                  <div className={`participant-summary-row ${item.paid ? 'is-paid' : ''}`} key={item.key}>
                    <div className="participant-summary-row-info">
                      <b>{item.description}</b>
                      <small>{item.detail}</small>
                    </div>
                    <div className="participant-summary-row-right">
                      <strong className={item.paid ? 'is-paid-amount' : ''}>{money(item.amount)}</strong>
                      {item.expenseId && (
                        <button
                          type="button"
                          className={`participant-paid-toggle ${item.paid ? 'is-paid' : ''}`}
                          aria-pressed={item.paid}
                          onClick={() => toggleParticipantSharePaid(item.expenseId!, item.part, participantSummaryTarget.id)}
                          title={item.paid ? 'Desmarcar como pago' : 'Marcar esta despesa como paga'}
                        >
                          {item.paid ? '✓ Pago' : 'Marcar pago'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {paidSummaryTotal > 0 && (
                  <div className="participant-summary-paid-sub">
                    <span>Já pago neste mês</span>
                    <b>✓ {money(paidSummaryTotal)}</b>
                  </div>
                )}
                <div className="participant-summary-total">
                  <span>{paidSummaryTotal > 0 ? 'Falta receber neste mês' : 'Total a receber neste mês'}</span>
                  <b>{money(summaryTotal)}</b>
                </div>
              </div>
              {copyMessage ? (
                <div className="participant-summary-preview-box">
                  <span className="participant-summary-preview-label">
                    Mensagem que será copiada ({unpaidSummaryItems.length} {unpaidSummaryItems.length === 1 ? 'item pendente' : 'itens pendentes'}):
                  </span>
                  <p>{copyMessage}</p>
                  {!trimmedPix && (
                    <button
                      type="button"
                      className="text-btn participant-summary-pix-link"
                      onClick={() => {
                        closeParticipantSummary()
                        setView('Ajustes')
                      }}
                    >
                      ＋ Cadastrar minha chave PIX nas Preferências para incluir no texto →
                    </button>
                  )}
                </div>
              ) : (
                <div className="participant-summary-settled-box" role="status">
                  <span>🎉</span>
                  <div>
                    <b>Tudo quitado em {monthName(month)}!</b>
                    <p>Todas as despesas de {participantSummaryTarget.name} neste mês foram marcadas como pagas. Seus gastos pessoais permanecem intactos.</p>
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeParticipantSummary}>
                  Fechar
                </button>
                {copyMessage && (
                  <button type="button" className="primary" onClick={handleCopySummary}>
                    Copiar resumo
                  </button>
                )}
              </div>
            </section>
          </div>
        )
      })()}

      {advanceEditor && (() => {
        const { occurrence: occ, countToAdvance, customAmount } = advanceEditor
        const remaining = occ.installments - occ.part
        const defaultAmt = computeAdvanceDefaultAmount(occ, countToAdvance)
        const parsedCustom = parseMoneyInput(customAmount)
        const validCustom = Number.isFinite(parsedCustom) && parsedCustom > 0 ? parsedCustom : 0
        const discountSavings = Math.max(0, Math.round((defaultAmt - validCustom) * 100) / 100)
        const firstFreedMonth = shiftMonthKey(occ.month, remaining - countToAdvance + 1)
        const lastFreedMonth = shiftMonthKey(occ.month, remaining)

        return (
          <div
            className={`modal-backdrop ${closingModal === 'advance' ? 'is-closing' : ''}`}
            onMouseDown={event => {
              if (event.target === event.currentTarget) closeAdvanceModal()
            }}
          >
            <form
              noValidate
              className={`modal advance-modal ${formShake === 'advance' ? 'is-shaking' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="advance-modal-title"
              onSubmit={confirmAdvanceInstallments}
              onAnimationEnd={event => {
                if (event.animationName === 'nexus-modal-shake') setFormShake(null)
              }}
            >
              <div className="modal-header">
                <div>
                  <span className="eyebrow">ADIANTAR PARCELAS FUTURAS</span>
                  <h2 id="advance-modal-title">{occ.description}</h2>
                </div>
                <button type="button" aria-label="Fechar adiantamento" onClick={closeAdvanceModal}>
                  ×
                </button>
              </div>
              <p className="form-help participant-modal-help">
                Você está na <b>Parcela {occ.part} de {occ.installments}</b> ({monthName(occ.month)}). Ao adiantar, as parcelas escolhidas saem das faturas futuras e entram como pagamento único em <b>{monthName(occ.month)}</b>, mantendo os meses anteriores intactos.
              </p>
              <div className="advance-count-selector">
                <span className="first-month-selector-label">
                  Quantas parcelas futuras deseja adiantar?
                  <small>Restam {remaining} {remaining === 1 ? 'parcela futura' : 'parcelas futuras'} após {shortMonthYear(occ.month)}</small>
                </span>
                <div className="advance-count-pills" role="radiogroup" aria-label="Quantidade de parcelas para adiantar">
                  {Array.from({ length: remaining }, (_, i) => i + 1).map(num => {
                    const isSelected = countToAdvance === num
                    const amt = computeAdvanceDefaultAmount(occ, num)
                    return (
                      <button
                        key={num}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`first-month-pill ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          setAdvanceError('')
                          setAdvanceEditor({
                            ...advanceEditor,
                            countToAdvance: num,
                            customAmount: formatMoneyInput(amt),
                          })
                        }}
                      >
                        <b>{num === remaining ? `Todas (${num})` : `${num} ${num === 1 ? 'parcela' : 'parcelas'}`}</b>
                        <small>{money(amt)}</small>
                      </button>
                    )
                  })}
                </div>
              </div>
              <label className={advanceError ? 'is-invalid' : ''}>
                Valor cobrado no adiantamento (com desconto, se houver)
                <div className="money-input-wrap">
                  <span className="money-prefix" aria-hidden="true">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    onKeyDown={dismissKeyboardOnEnter}
                    aria-invalid={Boolean(advanceError)}
                    placeholder="0,00"
                    value={customAmount}
                    onChange={e => {
                      setAdvanceError('')
                      setAdvanceEditor({ ...advanceEditor, customAmount: formatMoneyInput(e.target.value) })
                    }}
                  />
                </div>
                {advanceError ? (
                  <small className="field-error-msg" role="alert">
                    {advanceError}
                  </small>
                ) : (
                  <small className="form-help">
                    Valor original das {countToAdvance} {countToAdvance === 1 ? 'parcela' : 'parcelas'}: <b>{money(defaultAmt)}</b>.
                    {discountSavings > 0 ? ` Economia com desconto: ${money(discountSavings)}!` : ' Se o banco deu desconto ao antecipar, digite o valor final acima.'}
                  </small>
                )}
              </label>
              <div className="billing-preview">
                <span>⚡</span>
                <div>
                  Faturas liberadas:{' '}
                  <b>
                    {countToAdvance === 1
                      ? monthName(lastFreedMonth)
                      : `${shortMonthYear(firstFreedMonth)} até ${shortMonthYear(lastFreedMonth)}`}
                  </b>
                  . O lançamento original passará a ter <b>{occ.installments - countToAdvance}x</b> e o adiantamento de <b>{money(validCustom || defaultAmt)}</b> cairá em <b>{monthName(occ.month)}</b>.
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeAdvanceModal}>
                  Cancelar
                </button>
                <button className="primary" type="submit">
                  Confirmar adiantamento
                </button>
              </div>
            </form>
          </div>
        )
      })()}

      {pwaGuideOpen && (
        <div
          className={`modal-backdrop ${closingModal === 'pwa-guide' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) closePwaGuideModal()
          }}
        >
          <section className="modal pwa-guide-modal" role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title">
            <div className="modal-header">
              <div>
                <span className="eyebrow">APLICATIVO NA TELA INICIAL</span>
                <h2 id="pwa-guide-title">Como instalar o Põe na Conta</h2>
              </div>
              <button type="button" aria-label="Fechar instruções" onClick={closePwaGuideModal}>
                ×
              </button>
            </div>
            <p className="confirm-dialog-description">
              Ao adicionar o ícone à tela inicial, o Põe na Conta abre em tela cheia (sem barra de endereço) e funciona 100% offline.
            </p>
            <div className="pwa-guide-steps">
              <div className="pwa-guide-card">
                <b>No iPhone / iPad (Safari)</b>
                <ol>
                  <li>
                    Toque no ícone <b>Compartilhar</b> (quadrado com seta para cima <b>↑</b>) na barra do Safari.
                  </li>
                  <li>
                    Role a lista para baixo e toque em <b>Adicionar à Tela de Início</b>.
                  </li>
                  <li>
                    Confirme tocando em <b>Adicionar</b> no canto superior direito.
                  </li>
                </ol>
              </div>
              <div className="pwa-guide-card">
                <b>No Android (Chrome / Edge / Samsung)</b>
                <ol>
                  <li>
                    Toque no menu de três pontos (<b>⋮</b>) no canto do navegador.
                  </li>
                  <li>
                    Selecione <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b>.
                  </li>
                  <li>Confirme a instalação para criar o atalho em tela cheia.</li>
                </ol>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="primary" onClick={closePwaGuideModal}>
                Entendi
              </button>
            </div>
          </section>
        </div>
      )}

      {investmentEditor && (
        <div
          className={`modal-backdrop ${closingModal === 'investment' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeInvestmentModal()
          }}
        >
          <form
            noValidate
            className={`modal investment-modal ${formShake === 'investment' ? 'is-shaking' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="investment-modal-title"
            onSubmit={saveInvestment}
            onAnimationEnd={event => {
              if (event.animationName === 'nexus-modal-shake') setFormShake(null)
            }}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">CARTEIRA DE INVESTIMENTOS</span>
                <h2 id="investment-modal-title">{investmentEditor.id ? 'Editar investimento' : 'Novo investimento'}</h2>
              </div>
              <button type="button" aria-label="Fechar investimento" onClick={closeInvestmentModal}>
                ×
              </button>
            </div>
            <label className={investmentErrors.name ? 'is-invalid' : ''}>
              Nome da aplicação / caixinha
              <input
                autoFocus={!isTouchDevice()}
                enterKeyHint="done"
                onKeyDown={dismissKeyboardOnEnter}
                maxLength={60}
                aria-invalid={Boolean(investmentErrors.name)}
                placeholder="Ex.: Caixinha Nubank, CDB Inter 110%, MXRF11..."
                value={investmentEditor.name}
                onChange={e => {
                  clearFieldError(setInvestmentErrors, 'name')
                  setInvestmentEditor({ ...investmentEditor, name: e.target.value })
                }}
              />
              {investmentErrors.name && (
                <small className="field-error-msg" role="alert">
                  {investmentErrors.name}
                </small>
              )}
            </label>
            <div className="form-row">
              <label>
                Tipo de investimento
                <select
                  value={investmentEditor.type}
                  onFocus={blurActiveInputOnTouch}
                  onChange={e => setInvestmentEditor({ ...investmentEditor, type: e.target.value as InvestmentType })}
                >
                  {(Object.keys(INVESTMENT_TYPE_META) as InvestmentType[]).map(typeKey => (
                    <option key={typeKey} value={typeKey}>
                      {INVESTMENT_TYPE_META[typeKey].label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Instituição / Corretora (opcional)
                <input
                  enterKeyHint="done"
                  onKeyDown={dismissKeyboardOnEnter}
                  maxLength={40}
                  placeholder="Ex.: Nubank, Inter, XP..."
                  value={investmentEditor.institution}
                  onChange={e => setInvestmentEditor({ ...investmentEditor, institution: e.target.value })}
                />
              </label>
            </div>
            <div className="form-row">
              <label className={investmentErrors.investedAmount ? 'is-invalid' : ''}>
                Total aportado até hoje
                <div className="money-input-wrap">
                  <span className="money-prefix" aria-hidden="true">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    onKeyDown={dismissKeyboardOnEnter}
                    aria-invalid={Boolean(investmentErrors.investedAmount)}
                    placeholder="0,00"
                    value={investmentEditor.investedAmount}
                    onChange={e => {
                      clearFieldError(setInvestmentErrors, 'investedAmount')
                      setInvestmentEditor({ ...investmentEditor, investedAmount: formatMoneyInput(e.target.value) })
                    }}
                  />
                </div>
                {investmentErrors.investedAmount && (
                  <small className="field-error-msg" role="alert">
                    {investmentErrors.investedAmount}
                  </small>
                )}
              </label>
              <label className={investmentErrors.currentAmount ? 'is-invalid' : ''}>
                Saldo atual (opcional)
                <div className="money-input-wrap">
                  <span className="money-prefix" aria-hidden="true">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    onKeyDown={dismissKeyboardOnEnter}
                    aria-invalid={Boolean(investmentErrors.currentAmount)}
                    placeholder="Igual ao aportado"
                    value={investmentEditor.currentAmount}
                    onChange={e => {
                      clearFieldError(setInvestmentErrors, 'currentAmount')
                      setInvestmentEditor({ ...investmentEditor, currentAmount: formatMoneyInput(e.target.value) })
                    }}
                  />
                </div>
                {investmentErrors.currentAmount && (
                  <small className="field-error-msg" role="alert">
                    {investmentErrors.currentAmount}
                  </small>
                )}
              </label>
            </div>
            <label>
              Faz parte de alguma meta de reserva?
              <select
                value={investmentEditor.goalId}
                onFocus={blurActiveInputOnTouch}
                onChange={e => setInvestmentEditor({ ...investmentEditor, goalId: e.target.value })}
              >
                <option value="">Não vincular a nenhuma meta</option>
                {reserveGoals.map(goal => (
                  <option key={goal.id} value={goal.id}>
                    🛡 {goal.name} (meta: {money(goal.targetAmount)})
                  </option>
                ))}
              </select>
              {reserveGoals.length === 0 && (
                <small className="form-help">
                  Você ainda não criou metas de reserva (ex.: Reserva de Emergência). Crie uma na aba Investimentos para vincular aqui.
                </small>
              )}
            </label>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeInvestmentModal}>
                Cancelar
              </button>
              <button className="primary" type="submit">
                {investmentEditor.id ? 'Salvar alterações' : 'Adicionar investimento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {investmentMoveEditor && (
        <div
          className={`modal-backdrop ${closingModal === 'investment-move' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeInvestmentMoveModal()
          }}
        >
          <form
            noValidate
            className={`modal investment-move-modal ${formShake === 'investment-move' ? 'is-shaking' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="investment-move-title"
            onSubmit={saveInvestmentMove}
            onAnimationEnd={event => {
              if (event.animationName === 'nexus-modal-shake') setFormShake(null)
            }}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  {investmentMoveEditor.mode === 'aporte'
                    ? 'NOVO APORTE'
                    : investmentMoveEditor.mode === 'resgate'
                      ? 'NOVO RESGATE'
                      : 'ATUALIZAR SALDO'}
                </span>
                <h2 id="investment-move-title">{investmentMoveEditor.investmentName}</h2>
              </div>
              <button type="button" aria-label="Fechar movimentação" onClick={closeInvestmentMoveModal}>
                ×
              </button>
            </div>
            <p className="form-help participant-modal-help">
              {investmentMoveEditor.mode === 'aporte'
                ? 'O valor aportado será somado ao total aplicado e ao saldo atual deste investimento.'
                : investmentMoveEditor.mode === 'resgate'
                  ? 'O valor resgatado será subtraído do saldo atual e do total aportado.'
                  : 'Digite quanto você vê hoje no app do banco/corretora para recalcular o rendimento automaticamente.'}
            </p>
            <div className="form-row">
              <label className={investmentMoveErrors.amount ? 'is-invalid' : ''}>
                {investmentMoveEditor.mode === 'atualizacao' ? 'Novo saldo atual' : 'Valor'}
                <div className="money-input-wrap">
                  <span className="money-prefix" aria-hidden="true">R$</span>
                  <input
                    autoFocus={!isTouchDevice()}
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    onKeyDown={dismissKeyboardOnEnter}
                    aria-invalid={Boolean(investmentMoveErrors.amount)}
                    placeholder="0,00"
                    value={investmentMoveEditor.amount}
                    onChange={e => {
                      clearFieldError(setInvestmentMoveErrors, 'amount')
                      setInvestmentMoveEditor({ ...investmentMoveEditor, amount: formatMoneyInput(e.target.value) })
                    }}
                  />
                </div>
                {investmentMoveErrors.amount && (
                  <small className="field-error-msg" role="alert">
                    {investmentMoveErrors.amount}
                  </small>
                )}
              </label>
              <label className={investmentMoveErrors.date ? 'is-invalid' : ''}>
                Data
                <input
                  type="date"
                  aria-invalid={Boolean(investmentMoveErrors.date)}
                  value={investmentMoveEditor.date}
                  onFocus={blurActiveInputOnTouch}
                  onChange={e => {
                    clearFieldError(setInvestmentMoveErrors, 'date')
                    setInvestmentMoveEditor({ ...investmentMoveEditor, date: e.target.value })
                  }}
                />
                {investmentMoveErrors.date && (
                  <small className="field-error-msg" role="alert">
                    {investmentMoveErrors.date}
                  </small>
                )}
              </label>
            </div>
            {investmentMoveEditor.mode === 'aporte' && (
              <label>
                Entra em alguma meta de reserva?
                <select
                  value={investmentMoveEditor.goalId}
                  onFocus={blurActiveInputOnTouch}
                  onChange={e => setInvestmentMoveEditor({ ...investmentMoveEditor, goalId: e.target.value })}
                >
                  <option value="">Não contabilizar em meta de reserva</option>
                  {reserveGoals.map(goal => (
                    <option key={goal.id} value={goal.id}>
                      🛡 {goal.name} (meta: {money(goal.targetAmount)})
                    </option>
                  ))}
                </select>
                <small className="form-help">
                  Escolha se este investimento/aporte deve somar na sua Reserva de Emergência ou outra meta.
                </small>
              </label>
            )}
            <label>
              Observação (opcional)
              <input
                enterKeyHint="done"
                onKeyDown={dismissKeyboardOnEnter}
                maxLength={80}
                placeholder="Ex.: Aporte do salário, rendimento mensal..."
                value={investmentMoveEditor.note}
                onChange={e => setInvestmentMoveEditor({ ...investmentMoveEditor, note: e.target.value })}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeInvestmentMoveModal}>
                Cancelar
              </button>
              <button className="primary" type="submit">
                {investmentMoveEditor.mode === 'aporte'
                  ? 'Confirmar aporte'
                  : investmentMoveEditor.mode === 'resgate'
                    ? 'Confirmar resgate'
                    : 'Atualizar saldo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {goalEditor && (
        <div
          className={`modal-backdrop ${closingModal === 'goal' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeGoalModal()
          }}
        >
          <form
            noValidate
            className={`modal goal-modal ${formShake === 'goal' ? 'is-shaking' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-modal-title"
            onSubmit={saveGoal}
            onAnimationEnd={event => {
              if (event.animationName === 'nexus-modal-shake') setFormShake(null)
            }}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">METAS DE RESERVA</span>
                <h2 id="goal-modal-title">{goalEditor.id ? 'Editar meta' : 'Nova meta de reserva'}</h2>
              </div>
              <button type="button" aria-label="Fechar meta" onClick={closeGoalModal}>
                ×
              </button>
            </div>
            <label className={goalErrors.name ? 'is-invalid' : ''}>
              Nome da meta
              <input
                autoFocus={!isTouchDevice()}
                enterKeyHint="done"
                onKeyDown={dismissKeyboardOnEnter}
                maxLength={50}
                aria-invalid={Boolean(goalErrors.name)}
                placeholder="Ex.: Reserva de Emergência, Viagem, Trocar de celular..."
                value={goalEditor.name}
                onChange={e => {
                  clearFieldError(setGoalErrors, 'name')
                  setGoalEditor({ ...goalEditor, name: e.target.value })
                }}
              />
              {goalErrors.name && (
                <small className="field-error-msg" role="alert">
                  {goalErrors.name}
                </small>
              )}
              {!goalEditor.id && (
                <div className="store-card-presets" role="group" aria-label="Sugestões de meta">
                  {['Reserva de Emergência', 'Viagem', 'Entrada / Imóvel', 'Reserva para PC / Celular'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      className={`store-preset-chip ${goalEditor.name === preset ? 'is-active' : ''}`}
                      onClick={() => {
                        clearFieldError(setGoalErrors, 'name')
                        setGoalEditor({ ...goalEditor, name: preset })
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
            </label>
            <label className={goalErrors.targetAmount ? 'is-invalid' : ''}>
              Valor-alvo da meta
              <div className="money-input-wrap">
                <span className="money-prefix" aria-hidden="true">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="done"
                  onKeyDown={dismissKeyboardOnEnter}
                  aria-invalid={Boolean(goalErrors.targetAmount)}
                  placeholder="0,00"
                  value={goalEditor.targetAmount}
                  onChange={e => {
                    clearFieldError(setGoalErrors, 'targetAmount')
                    setGoalEditor({ ...goalEditor, targetAmount: formatMoneyInput(e.target.value) })
                  }}
                />
              </div>
              {goalErrors.targetAmount && (
                <small className="field-error-msg" role="alert">
                  {goalErrors.targetAmount}
                </small>
              )}
            </label>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeGoalModal}>
                Cancelar
              </button>
              <button className="primary" type="submit">
                {goalEditor.id ? 'Salvar alterações' : 'Criar meta'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default App
