import type React from 'react'
import {
  formatMoneyInput,
  isDate,
  isManualBillingCard,
  QUICK_THIRD_PARTY_ID,
  shiftMonth as shiftMonthKey,
  type Card,
  type Category,
  type Method,
  type Participant,
} from '../../finance'
import {
  blurActiveInputOnTouch,
  dismissKeyboardOnEnter,
  isTouchDevice,
  money,
  monthName,
} from '../../utils/format'

export type FirstMonthMode = 'auto' | 'current' | 'next' | 'plus2'

export type ExpenseForm = {
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

type ExpenseModalProps = {
  modal: boolean
  closingModal: string | null
  formShake: string | null
  onClearShake: () => void
  editingExpenseId: string | null
  expenseDescInputRef: React.RefObject<HTMLInputElement | null>
  form: ExpenseForm
  setForm: (form: ExpenseForm) => void
  expenseErrors: Record<string, string>
  onClearExpenseError: (field: string) => void
  shareError: string
  setShareError: (error: string) => void
  categories: Category[]
  cards: Card[]
  participants: Participant[]
  getPreferredCard: () => Card | undefined
  rememberCard: (cardId: string) => void
  selectedFormCard: Card | undefined
  isManualFormCard: boolean
  normalizedFormDate: string
  purchaseBaseMonth: string
  effectiveFirstMonthMode: FirstMonthMode
  isFormOnClosingDay: boolean
  creditDueMonth: string | null
  participantsSectionOpen: boolean
  setParticipantsSectionOpen: React.Dispatch<React.SetStateAction<boolean>>
  totalFormSharesAmount: number
  validFormAmount: number
  personalFormPreview: number
  applyQuickThirdPartyPreset: (preset: 'plus1' | 'plus2' | 'plus3' | 'full') => void
  applyEqualSplitWithMe: () => void
  applySplitAmongMarkedOnly: () => void
  addParticipantFromExpense: () => void
  keepExpenseModalOpen: boolean
  setKeepExpenseModalOpen: (value: boolean) => void
  onClose: () => void
  onSubmit: (event: React.FormEvent) => void
}

export function ExpenseModal({
  modal,
  closingModal,
  formShake,
  onClearShake,
  editingExpenseId,
  expenseDescInputRef,
  form,
  setForm,
  expenseErrors,
  onClearExpenseError,
  shareError,
  setShareError,
  categories,
  cards,
  participants,
  getPreferredCard,
  rememberCard,
  selectedFormCard,
  isManualFormCard,
  normalizedFormDate,
  purchaseBaseMonth,
  effectiveFirstMonthMode,
  isFormOnClosingDay,
  creditDueMonth,
  participantsSectionOpen,
  setParticipantsSectionOpen,
  totalFormSharesAmount,
  validFormAmount,
  personalFormPreview,
  applyQuickThirdPartyPreset,
  applyEqualSplitWithMe,
  applySplitAmongMarkedOnly,
  addParticipantFromExpense,
  keepExpenseModalOpen,
  setKeepExpenseModalOpen,
  onClose,
  onSubmit,
}: ExpenseModalProps) {
  if (!modal) return null

  return (
    <div
      className={`modal-backdrop ${closingModal === 'expense' ? 'is-closing' : ''}`}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        noValidate
        className={`modal expense-modal ${formShake === 'expense' ? 'is-shaking' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-modal-title"
        onSubmit={onSubmit}
        onAnimationEnd={event => {
          if (event.animationName === 'nexus-modal-shake') onClearShake()
        }}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">{editingExpenseId ? 'EDITAR REGISTRO' : 'NOVO REGISTRO'}</span>
            <h2 id="expense-modal-title">{editingExpenseId ? 'Editar lançamento' : 'Adicionar lançamento'}</h2>
          </div>
          <button type="button" aria-label="Fechar lançamento" onClick={onClose}>
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
              onClearExpenseError('description')
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
                  onClearExpenseError('amount')
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
                onClearExpenseError('date')
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
            <select value={form.category || categories[0]?.id || ''} onFocus={blurActiveInputOnTouch} onChange={e => setForm({ ...form, category: e.target.value })}>
              {categories.map(c => (
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
                  ? (cards.some(c => c.id === form.cardId) ? form.cardId : fallbackCard?.id || '')
                  : form.cardId
                const nextCard = cards.find(c => c.id === nextCardId) || fallbackCard
                onClearExpenseError('installments')
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
                  const nextCard = cards.find(c => c.id === e.target.value) || getPreferredCard()
                  rememberCard(e.target.value)
                  setForm({
                    ...form,
                    cardId: e.target.value,
                    afterClosing: (nextCard?.closingDayRule ?? 'after') !== 'before',
                    firstMonthMode: isManualBillingCard(nextCard) ? 'next' : 'auto',
                  })
                }}
              >
                {cards.map(c => (
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
                onClearExpenseError('installments')
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
                            onClearExpenseError(quickErrorKey)
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
                                onClearExpenseError(quickErrorKey)
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
              {participants.length ? (
                <>
                  {participants.map(participant => {
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
                              onClearExpenseError(shareErrorKey)
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
                                    onClearExpenseError(shareErrorKey)
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
          <button type="button" className="cancel-btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" type="submit">
            {editingExpenseId ? 'Salvar alterações' : keepExpenseModalOpen ? 'Salvar e adicionar outra' : 'Salvar lançamento'}
          </button>
        </div>
      </form>
    </div>
  )
}
