import type React from 'react'
import {
  formatMoneyInput,
  parseMoneyInput,
  QUICK_THIRD_PARTY_ID,
  QUICK_THIRD_PARTY_NAME,
  shiftMonth as shiftMonthKey,
  type Card,
  type Category,
  type ManualReimbursement,
  type Occurrence,
  type Participant,
} from '../../finance'
import {
  blurActiveInputOnTouch,
  dismissKeyboardOnEnter,
  isTouchDevice,
  money,
  monthName,
  shortMonthYear,
} from '../../utils/format'

export type ManualReimbursementEditor = {
  id?: string
  description: string
  amount: string
  participantId: string
  cardId: string
  categoryId: string
}

export type AdvanceInstallmentsEditor = {
  occurrence: Occurrence
  countToAdvance: number
  customAmount: string
}

type ReimbursementModalsProps = {
  closingModal: string | null
  formShake: string | null
  onClearShake: () => void
  month: string
  participants: Participant[]
  cards: Card[]
  categories: Category[]
  pixKey: string
  currentExpenses: Occurrence[]
  currentReimbursements: ManualReimbursement[]
  reimbursementEditor: ManualReimbursementEditor | null
  setReimbursementEditor: (editor: ManualReimbursementEditor) => void
  reimbursementErrors: Record<string, string>
  onClearReimbursementError: (field: string) => void
  onCloseReimbursement: () => void
  onSaveReimbursement: (event: React.FormEvent) => void
  participantSummaryTarget: Participant | null
  onCloseParticipantSummary: () => void
  onToggleParticipantSharePaid: (expenseId: string, part: number, participantId: string) => void
  onSetAllParticipantSharesPaidInMonth: (participantId: string, paid: boolean) => void
  onNavigateToSettings: () => void
  onToast: (message: string) => void
  advanceEditor: AdvanceInstallmentsEditor | null
  setAdvanceEditor: (editor: AdvanceInstallmentsEditor) => void
  advanceError: string
  setAdvanceError: (error: string) => void
  onCloseAdvance: () => void
  onConfirmAdvance: (event: React.FormEvent) => void
  computeAdvanceDefaultAmount: (occurrence: Occurrence, countToAdvance: number) => number
}

export function ReimbursementModals({
  closingModal,
  formShake,
  onClearShake,
  month,
  participants,
  cards,
  categories,
  pixKey,
  currentExpenses,
  currentReimbursements,
  reimbursementEditor,
  setReimbursementEditor,
  reimbursementErrors,
  onClearReimbursementError,
  onCloseReimbursement,
  onSaveReimbursement,
  participantSummaryTarget,
  onCloseParticipantSummary,
  onToggleParticipantSharePaid,
  onSetAllParticipantSharesPaidInMonth,
  onNavigateToSettings,
  onToast,
  advanceEditor,
  setAdvanceEditor,
  advanceError,
  setAdvanceError,
  onCloseAdvance,
  onConfirmAdvance,
  computeAdvanceDefaultAmount,
}: ReimbursementModalsProps) {
  return (
    <>
      {reimbursementEditor && (
        <div
          className={`modal-backdrop ${closingModal === 'reimbursement' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) onCloseReimbursement()
          }}
        >
          <form
            noValidate
            className={`modal reimbursement-modal ${formShake === 'reimbursement' ? 'is-shaking' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reimbursement-modal-title"
            onSubmit={onSaveReimbursement}
            onAnimationEnd={event => {
              if (event.animationName === 'nexus-modal-shake') onClearShake()
            }}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">ABATIMENTO DE RACHA ({monthName(month).toUpperCase()})</span>
                <h2 id="reimbursement-modal-title">
                  {reimbursementEditor.id ? 'Editar valor avulso' : 'Abater valor avulso'}
                </h2>
              </div>
              <button type="button" aria-label="Fechar abatimento" onClick={onCloseReimbursement}>
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
                  onClearReimbursementError('description')
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
                      onClearReimbursementError('amount')
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
                  {participants.map(p => (
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
                  {cards.map(c => (
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
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <small className="form-help">Desconta o valor do gráfico dessa categoria.</small>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={onCloseReimbursement}>
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

        const handleCopySummary = async () => {
          if (!copyMessage) return
          try {
            await navigator.clipboard.writeText(copyMessage)
            onToast('Resumo copiado para a área de transferência!')
          } catch {
            const textarea = document.createElement('textarea')
            textarea.value = copyMessage
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            onToast('Resumo copiado para a área de transferência!')
          }
        }

        return (
          <div
            className={`modal-backdrop ${closingModal === 'participant-summary' ? 'is-closing' : ''}`}
            onMouseDown={event => {
              if (event.target === event.currentTarget) onCloseParticipantSummary()
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
                <button type="button" aria-label="Fechar resumo" onClick={onCloseParticipantSummary}>
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
                    onClick={() => onSetAllParticipantSharesPaidInMonth(participantSummaryTarget.id, !allExpenseItemsPaid)}
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
                          onClick={() => onToggleParticipantSharePaid(item.expenseId!, item.part, participantSummaryTarget.id)}
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
                        onCloseParticipantSummary()
                        onNavigateToSettings()
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
                <button type="button" className="cancel-btn" onClick={onCloseParticipantSummary}>
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
              if (event.target === event.currentTarget) onCloseAdvance()
            }}
          >
            <form
              noValidate
              className={`modal advance-modal ${formShake === 'advance' ? 'is-shaking' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="advance-modal-title"
              onSubmit={onConfirmAdvance}
              onAnimationEnd={event => {
                if (event.animationName === 'nexus-modal-shake') onClearShake()
              }}
            >
              <div className="modal-header">
                <div>
                  <span className="eyebrow">ADIANTAR PARCELAS FUTURAS</span>
                  <h2 id="advance-modal-title">{occ.description}</h2>
                </div>
                <button type="button" aria-label="Fechar adiantamento" onClick={onCloseAdvance}>
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
                <button type="button" className="cancel-btn" onClick={onCloseAdvance}>
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
    </>
  )
}
