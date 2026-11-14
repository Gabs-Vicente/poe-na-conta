import { useMemo, useState } from 'react'
import {
  INVESTMENT_TYPE_META,
  type Investment,
  type InvestmentEntryType,
  type ReserveGoal,
} from '../finance'
import { money } from '../utils/format'

type InvestmentsViewProps = {
  theme: 'light' | 'dark'
  investments: Investment[]
  reserveGoals: ReserveGoal[]
  month: string
  onOpenInvestmentModal: (item?: Investment) => void
  onDeleteInvestment: (id: string) => void
  onOpenInvestmentMove: (investment: Investment, mode: InvestmentEntryType) => void
  onOpenGoalModal: (goal?: ReserveGoal) => void
  onDeleteGoal: (id: string) => void
  onDeleteEntry: (investmentId: string, entryId: string) => void
}

const ENTRY_LABEL: Record<InvestmentEntryType, string> = {
  aporte: 'Aporte',
  resgate: 'Resgate',
  atualizacao: 'Atualização',
}

export function InvestmentsView({
  theme,
  investments,
  reserveGoals,
  month,
  onOpenInvestmentModal,
  onDeleteInvestment,
  onOpenInvestmentMove,
  onOpenGoalModal,
  onDeleteGoal,
  onDeleteEntry,
}: InvestmentsViewProps) {
  const [entryQuery, setEntryQuery] = useState('')
  const [entryTypeFilter, setEntryTypeFilter] = useState<'all' | InvestmentEntryType>('all')
  const [entryInvFilter, setEntryInvFilter] = useState('all')

  const totalCurrent = Math.round(investments.reduce((sum, inv) => sum + inv.currentAmount, 0) * 100) / 100
  const totalInvested = Math.round(investments.reduce((sum, inv) => sum + inv.investedAmount, 0) * 100) / 100
  const totalYield = Math.round((totalCurrent - totalInvested) * 100) / 100
  const yieldPercent = totalInvested > 0 ? (totalYield / totalInvested) * 100 : null

  const goalSummaries = useMemo(() => {
    return reserveGoals.map(goal => {
      const linked = investments.filter(inv => inv.goalId === goal.id)
      const current = Math.round(linked.reduce((sum, inv) => sum + inv.currentAmount, 0) * 100) / 100
      const remaining = Math.max(0, Math.round((goal.targetAmount - current) * 100) / 100)
      const percent = goal.targetAmount > 0 ? Math.min(100, Math.round((current / goal.targetAmount) * 100)) : 0
      return { goal, linked, current, remaining, percent }
    })
  }, [reserveGoals, investments])

  const totalGoalsCurrent = Math.round(goalSummaries.reduce((sum, g) => sum + g.current, 0) * 100) / 100
  const totalGoalsTarget = Math.round(goalSummaries.reduce((sum, g) => sum + g.goal.targetAmount, 0) * 100) / 100
  const overallGoalPercent = totalGoalsTarget > 0 ? Math.min(100, Math.round((totalGoalsCurrent / totalGoalsTarget) * 100)) : 0

  const monthDeposits = useMemo(() => {
    let sum = 0
    for (const inv of investments) {
      for (const entry of inv.entries || []) {
        if (entry.type === 'aporte' && entry.date.startsWith(month)) {
          sum += entry.amount
        }
      }
    }
    return Math.round(sum * 100) / 100
  }, [investments, month])

  const allEntries = useMemo(() => {
    const rows = investments.flatMap(inv =>
      (inv.entries || []).map(entry => ({
        ...entry,
        investmentId: inv.id,
        investmentName: inv.name,
        investmentType: inv.type,
      })),
    )
    return rows
      .filter(row => {
        if (entryTypeFilter !== 'all' && row.type !== entryTypeFilter) return false
        if (entryInvFilter !== 'all' && row.investmentId !== entryInvFilter) return false
        if (entryQuery.trim()) {
          const q = entryQuery.trim().toLowerCase()
          const matchesName = row.investmentName.toLowerCase().includes(q)
          const matchesNote = (row.note || '').toLowerCase().includes(q)
          if (!matchesName && !matchesNote) return false
        }
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [investments, entryTypeFilter, entryInvFilter, entryQuery])

  return (
    <section className="investments-page">
      <section className="stats health-stats">
        <article className="stat-card balance-card">
          <div className="stat-top">
            <span>Patrimônio investido</span>
            <span className="stat-symbol">↗</span>
          </div>
          <strong>{money(totalCurrent)}</strong>
          <div className="stat-foot">
            {investments.length === 1 ? '1 investimento ativo' : `${investments.length} investimentos ativos`}
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Total aportado</span>
            <span className="stat-symbol muted">＋</span>
          </div>
          <strong>{money(totalInvested)}</strong>
          <div className="stat-foot">Aportado neste mês: {money(monthDeposits)}</div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Rendimento acumulado</span>
            <span className={`stat-symbol ${totalYield >= 0 ? '' : 'orange'}`}>
              {totalYield >= 0 ? '▲' : '▼'}
            </span>
          </div>
          <strong>
            {totalYield >= 0 ? '+' : '−'} {money(Math.abs(totalYield))}
          </strong>
          <div className="stat-foot">
            {yieldPercent === null
              ? 'Adicione aportes para acompanhar'
              : `${yieldPercent >= 0 ? '+' : ''}${yieldPercent.toFixed(1)}% sobre o total aportado`}
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Metas de reserva</span>
            <span className="stat-symbol muted">🛡</span>
          </div>
          <strong>{reserveGoals.length ? `${overallGoalPercent}%` : 'Sem metas'}</strong>
          <div className="stat-foot">
            {reserveGoals.length
              ? `${money(totalGoalsCurrent)} de ${money(totalGoalsTarget)}`
              : 'Crie sua reserva de emergência'}
          </div>
        </article>
      </section>

      <div className="panel goals-panel">
        <div className="panel-head">
          <div>
            <h2>Metas de reserva</h2>
            <p>Vincule seus investimentos ou caixinhas para acompanhar quanto falta para cada objetivo</p>
          </div>
          <button type="button" className="outline-btn" onClick={() => onOpenGoalModal()}>
            ＋ Nova meta
          </button>
        </div>
        {goalSummaries.length > 0 ? (
          <div className="goals-grid">
            {goalSummaries.map(({ goal, linked, current, remaining, percent }) => {
              const goalColor = goal.color || '#4d9b6f'
              return (
                <div className="goal-card" key={goal.id}>
                  <div className="goal-card-top">
                    <div className="goal-card-title">
                      <span className="goal-dot" style={{ background: goalColor }} />
                      <div>
                        <b>{goal.name}</b>
                        <small>
                          {linked.length === 0
                            ? 'Nenhum investimento vinculado ainda'
                            : linked.map(item => item.name).join(' · ')}
                        </small>
                      </div>
                    </div>
                    <div className="goal-card-actions">
                      <span className="goal-percent-badge" style={{ color: goalColor, background: `${goalColor}1c` }}>
                        {percent}%
                      </span>
                      <details className="row-actions">
                        <summary aria-label={`Ações para meta ${goal.name}`} title="Ações">···</summary>
                        <div className={`row-action-menu ${theme === 'dark' ? 'is-dark' : 'is-light'}`}>
                          <button
                            type="button"
                            onClick={event => {
                              event.currentTarget.closest('details')?.removeAttribute('open')
                              onOpenGoalModal(goal)
                            }}
                          >
                            Editar meta
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={event => {
                              event.currentTarget.closest('details')?.removeAttribute('open')
                              onDeleteGoal(goal.id)
                            }}
                          >
                            Excluir meta
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                  <div className="goal-progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                    <i style={{ width: `${percent}%`, background: goalColor }} />
                  </div>
                  <div className="goal-card-foot">
                    <span>
                      Guardado: <b>{money(current)}</b>
                    </span>
                    <span>
                      Meta: <b>{money(goal.targetAmount)}</b>
                    </span>
                    <span>
                      {remaining === 0 ? (
                        <b className="goal-done-text">Meta atingida ✓</b>
                      ) : (
                        <>
                          Falta: <b>{money(remaining)}</b>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty compact">
            Nenhuma meta de reserva criada.{' '}
            <button type="button" className="text-btn" onClick={() => onOpenGoalModal()}>
              Criar Reserva de Emergência →
            </button>
          </div>
        )}
      </div>

      <div className="panel investments-list-panel">
        <div className="panel-head">
          <div>
            <h2>Seus investimentos</h2>
            <p>Aporte, resgate ou atualize o saldo atual de cada aplicação em 1 toque</p>
          </div>
          <button type="button" className="primary" onClick={() => onOpenInvestmentModal()}>
            ＋ Novo investimento
          </button>
        </div>
        {investments.length > 0 ? (
          <div className="investments-grid">
            {investments.map(inv => {
              const meta = INVESTMENT_TYPE_META[inv.type]
              const goal = inv.goalId ? reserveGoals.find(g => g.id === inv.goalId) : undefined
              const invYield = Math.round((inv.currentAmount - inv.investedAmount) * 100) / 100
              const invYieldPct = inv.investedAmount > 0 ? (invYield / inv.investedAmount) * 100 : null
              return (
                <article className="investment-card" key={inv.id}>
                  <div className="investment-card-head">
                    <div className="investment-card-title">
                      <div className="investment-badges-row">
                        <span className="investment-type-badge" style={{ color: meta.color, background: `${meta.color}1c` }}>
                          {meta.shortLabel}
                        </span>
                        {goal && (
                          <span className="investment-goal-badge" title={`Vinculado à meta ${goal.name}`}>
                            🛡 {goal.name}
                          </span>
                        )}
                      </div>
                      <b>{inv.name}</b>
                      {inv.institution && <small>{inv.institution}</small>}
                    </div>
                    <details className="row-actions">
                      <summary aria-label={`Ações para ${inv.name}`} title="Ações">···</summary>
                      <div className={`row-action-menu ${theme === 'dark' ? 'is-dark' : 'is-light'}`}>
                        <button
                          type="button"
                          onClick={event => {
                            event.currentTarget.closest('details')?.removeAttribute('open')
                            onOpenInvestmentModal(inv)
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={event => {
                            event.currentTarget.closest('details')?.removeAttribute('open')
                            onDeleteInvestment(inv.id)
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </details>
                  </div>
                  <div className="investment-card-balance">
                    <span>Saldo atual</span>
                    <strong>{money(inv.currentAmount)}</strong>
                  </div>
                  <div className="investment-card-metrics">
                    <span>
                      Aportado: <b>{money(inv.investedAmount)}</b>
                    </span>
                    <span className={invYield >= 0 ? 'is-positive' : 'is-negative'}>
                      Rendimento:{' '}
                      <b>
                        {invYield >= 0 ? '+' : '−'} {money(Math.abs(invYield))}
                        {invYieldPct !== null ? ` (${invYieldPct >= 0 ? '+' : ''}${invYieldPct.toFixed(1)}%)` : ''}
                      </b>
                    </span>
                  </div>
                  <div className="investment-card-actions">
                    <button type="button" className="outline-btn inv-action-btn" onClick={() => onOpenInvestmentMove(inv, 'aporte')}>
                      ＋ Aportar
                    </button>
                    <button type="button" className="outline-btn inv-action-btn" onClick={() => onOpenInvestmentMove(inv, 'resgate')}>
                      − Resgatar
                    </button>
                    <button type="button" className="outline-btn inv-action-btn" onClick={() => onOpenInvestmentMove(inv, 'atualizacao')}>
                      ↻ Atualizar saldo
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="empty">
            Você ainda não cadastrou nenhum investimento.{' '}
            <button type="button" className="text-btn" onClick={() => onOpenInvestmentModal()}>
              Adicionar primeiro investimento →
            </button>
          </div>
        )}
      </div>

      <div className="panel transactions data-page-table">
        <div className="panel-head">
          <div>
            <h2>Histórico de movimentações</h2>
            <p>Todos os aportes, resgates e atualizações de saldo registrados</p>
          </div>
        </div>
        <div className="filters">
          <label className="search">
            <span>⌕</span>
            <input
              aria-label="Buscar movimentações de investimento"
              placeholder="Buscar por ativo ou observação..."
              value={entryQuery}
              onChange={e => setEntryQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar por tipo de movimentação"
            value={entryTypeFilter}
            onChange={e => setEntryTypeFilter(e.target.value as 'all' | InvestmentEntryType)}
          >
            <option value="all">Todos os tipos</option>
            <option value="aporte">Aportes</option>
            <option value="resgate">Resgates</option>
            <option value="atualizacao">Atualizações de saldo</option>
          </select>
          {investments.length > 0 && (
            <select
              aria-label="Filtrar por investimento"
              value={entryInvFilter}
              onChange={e => setEntryInvFilter(e.target.value)}
            >
              <option value="all">Todos os investimentos</option>
              {investments.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="table-wrap">
          <table className="inv-history-table">
            <thead>
              <tr>
                <th>INVESTIMENTO</th>
                <th>TIPO</th>
                <th className="col-date">DATA</th>
                <th className="col-note">OBSERVAÇÃO</th>
                <th className="right">VALOR</th>
                <th className="col-actions" />
              </tr>
            </thead>
            <tbody>
              {allEntries.map(entry => {
                const formattedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
                  new Date(`${entry.date}T12:00:00`),
                )
                return (
                  <tr key={entry.id}>
                    <td>
                      <b>{entry.investmentName}</b>
                      <small className="mobile-tx-meta">
                        {formattedDate}
                        {entry.note ? ` · ${entry.note}` : ''}
                      </small>
                    </td>
                    <td>
                      <span className={`inv-entry-badge is-${entry.type}`}>{ENTRY_LABEL[entry.type]}</span>
                    </td>
                    <td className="date-cell col-date">{formattedDate}</td>
                    <td className="col-note">{entry.note || '—'}</td>
                    <td className={`right value ${entry.type === 'aporte' ? 'inv-val-positive' : entry.type === 'resgate' ? 'inv-val-negative' : ''}`}>
                      {entry.type === 'aporte' ? '+ ' : entry.type === 'resgate' ? '− ' : ''}
                      {money(entry.amount)}
                    </td>
                    <td className="col-actions">
                      <details className="row-actions">
                        <summary aria-label={`Ações para movimentação de ${entry.investmentName}`} title="Ações">···</summary>
                        <div className={`row-action-menu ${theme === 'dark' ? 'is-dark' : 'is-light'}`}>
                          <button
                            type="button"
                            className="danger"
                            onClick={event => {
                              event.currentTarget.closest('details')?.removeAttribute('open')
                              onDeleteEntry(entry.investmentId, entry.id)
                            }}
                          >
                            Remover registro
                          </button>
                        </div>
                      </details>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!allEntries.length && <div className="empty">Nenhuma movimentação registrada ainda.</div>}
        </div>
      </div>
    </section>
  )
}
