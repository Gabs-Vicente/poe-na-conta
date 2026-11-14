import type React from 'react'
import {
  formatMoneyInput,
  INVESTMENT_TYPE_META,
  type InvestmentEntryType,
  type InvestmentType,
  type ReserveGoal,
} from '../../finance'
import { blurActiveInputOnTouch, dismissKeyboardOnEnter, isTouchDevice, money } from '../../utils/format'

export type InvestmentEditor = {
  id?: string
  name: string
  type: InvestmentType
  institution: string
  investedAmount: string
  currentAmount: string
  goalId: string
}

export type InvestmentMoveEditor = {
  investmentId: string
  investmentName: string
  mode: InvestmentEntryType
  amount: string
  date: string
  note: string
  goalId: string
}

export type ReserveGoalEditor = {
  id?: string
  name: string
  targetAmount: string
  color: string
}

type InvestmentModalsProps = {
  closingModal: string | null
  formShake: string | null
  onClearShake: () => void
  reserveGoals: ReserveGoal[]
  investmentEditor: InvestmentEditor | null
  setInvestmentEditor: React.Dispatch<React.SetStateAction<InvestmentEditor | null>>
  investmentErrors: Record<string, string>
  clearInvestmentError: (key: string) => void
  closeInvestmentModal: () => void
  saveInvestment: (event: React.FormEvent) => void
  investmentMoveEditor: InvestmentMoveEditor | null
  setInvestmentMoveEditor: React.Dispatch<React.SetStateAction<InvestmentMoveEditor | null>>
  investmentMoveErrors: Record<string, string>
  clearInvestmentMoveError: (key: string) => void
  closeInvestmentMoveModal: () => void
  saveInvestmentMove: (event: React.FormEvent) => void
  goalEditor: ReserveGoalEditor | null
  setGoalEditor: React.Dispatch<React.SetStateAction<ReserveGoalEditor | null>>
  goalErrors: Record<string, string>
  clearGoalError: (key: string) => void
  closeGoalModal: () => void
  saveGoal: (event: React.FormEvent) => void
}

export function InvestmentModals({
  closingModal,
  formShake,
  onClearShake,
  reserveGoals,
  investmentEditor,
  setInvestmentEditor,
  investmentErrors,
  clearInvestmentError,
  closeInvestmentModal,
  saveInvestment,
  investmentMoveEditor,
  setInvestmentMoveEditor,
  investmentMoveErrors,
  clearInvestmentMoveError,
  closeInvestmentMoveModal,
  saveInvestmentMove,
  goalEditor,
  setGoalEditor,
  goalErrors,
  clearGoalError,
  closeGoalModal,
  saveGoal,
}: InvestmentModalsProps) {
  return (
    <>
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
              if (event.animationName === 'nexus-modal-shake') onClearShake()
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
                placeholder="Ex.: Caixinha Nubank, Tesouro Selic 2029, MXRF11..."
                value={investmentEditor.name}
                onChange={e => {
                  clearInvestmentError('name')
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
                      clearInvestmentError('investedAmount')
                      setInvestmentEditor({ ...investmentEditor, investedAmount: formatMoneyInput(e.target.value) })
                    }}
                  />
                </div>
                <small className="form-help">
                  Quanto saiu do seu bolso (soma dos aportes já feitos).
                </small>
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
                      clearInvestmentError('currentAmount')
                      setInvestmentEditor({ ...investmentEditor, currentAmount: formatMoneyInput(e.target.value) })
                    }}
                  />
                </div>
                <small className="form-help">
                  Quanto vale hoje com rendimento. Vazio = igual ao aportado.
                </small>
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
              if (event.animationName === 'nexus-modal-shake') onClearShake()
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
                      clearInvestmentMoveError('amount')
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
                    clearInvestmentMoveError('date')
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
              if (event.animationName === 'nexus-modal-shake') onClearShake()
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
                  clearGoalError('name')
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
                        clearGoalError('name')
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
                    clearGoalError('targetAmount')
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
    </>
  )
}
