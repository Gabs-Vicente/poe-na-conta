import type React from 'react'
import { QUICK_THIRD_PARTY_ID, QUICK_THIRD_PARTY_NAME, type Card, type Category, type Data, type InstallmentReliefSummary, type ManualReimbursement, type Occurrence, type Participant } from '../finance'
import { categorySymbol, donutSlice, money, monthName, shortMonthYear, type MainView } from '../utils/format'

type PieSlice = {
  category: Category & { total: number }
  start: number
  end: number
  percentage: number
}

type CardSummaryItem = {
  card: Card
  invoiceTotal: number
  personalPart: number
  sharedPart: number
  count: number
  nextInvoiceTotal: number
}

type ParticipantReimbursementItem = {
  participant: Participant
  current: number
  future: number
}

type OverviewViewProps = {
  data: Data
  theme: 'light' | 'dark'
  month: string
  previousMonth: string
  total: number
  monthChange: number | null
  reimbursementTotal: number
  upcomingTotal: number
  activeTrendYear: string
  currentYear: string
  trendYears: string[]
  trendYearTotal: number
  monthlyTrend: { month: string; total: number }[]
  todayMonthKey: string
  trendChartRef: React.RefObject<HTMLDivElement | null>
  categoryTotals: (Category & { total: number })[]
  categoryTotal: number
  categoryPanelMode: 'categories' | 'transactions'
  currentExpenses: Occurrence[]
  pieSlices: PieSlice[]
  hoveredCategory: PieSlice | undefined
  nextMonths: string[]
  occurrences: Occurrence[]
  installmentRelief: InstallmentReliefSummary
  cardSummaries: CardSummaryItem[]
  reimbursementByParticipant: ParticipantReimbursementItem[]
  currentReimbursements: ManualReimbursement[]
  onTrendYearChange: (year: string) => void
  onCategoryPanelModeChange: (mode: 'categories' | 'transactions') => void
  onHoveredCategoryIdChange: (id: string | null) => void
  onOpenCardTransactions: (cardId: string) => void
  onOpenCardSettings: () => void
  onOpenNewExpenseModal: () => void
  onOpenManualReimbursement: (item?: ManualReimbursement) => void
  onDeleteManualReimbursement: (id: string) => void
  onOpenParticipantSummary: (participant: Participant) => void
  onNavigateView: (view: MainView) => void
  personalValue: (occurrence: Occurrence) => number
  owedBy: (occurrence: Occurrence) => string
}

export function OverviewView({
  data,
  theme,
  month,
  previousMonth,
  total,
  monthChange,
  reimbursementTotal,
  upcomingTotal,
  activeTrendYear,
  currentYear,
  trendYears,
  trendYearTotal,
  monthlyTrend,
  todayMonthKey,
  trendChartRef,
  categoryTotals,
  categoryTotal,
  categoryPanelMode,
  currentExpenses,
  pieSlices,
  hoveredCategory,
  nextMonths,
  occurrences,
  installmentRelief,
  cardSummaries,
  reimbursementByParticipant,
  currentReimbursements,
  onTrendYearChange,
  onCategoryPanelModeChange,
  onHoveredCategoryIdChange,
  onOpenCardTransactions,
  onOpenCardSettings,
  onOpenManualReimbursement,
  onDeleteManualReimbursement,
  onOpenParticipantSummary,
  personalValue,
  owedBy,
}: OverviewViewProps) {
  const nextRelief = installmentRelief.milestones[0]

  return (
    <>
      <section className="stats health-stats">
        <article className="stat-card balance-card">
          <div className="stat-top">
            <span>Gastos pessoais do mês</span>
            <span className="stat-symbol">↘</span>
          </div>
          <strong>{money(total)}</strong>
          <div className="stat-foot">Sua parte em {monthName(month)}</div>
          <div className="sparkline">
            <svg viewBox="0 0 240 50" preserveAspectRatio="none">
              <path d="M0 40 C18 37 22 29 37 34 S56 31 67 30 S82 39 97 29 S118 24 129 29 S151 12 162 20 S178 29 187 19 S210 23 219 7 S233 17 240 6" fill="none" stroke="#7be1c4" strokeWidth="2" />
            </svg>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Em relação ao mês anterior</span>
            <span className={`stat-symbol ${monthChange !== null && monthChange > 0 ? 'orange' : 'muted'}`}>
              {monthChange === null ? '—' : monthChange > 0 ? '↑' : '↓'}
            </span>
          </div>
          <strong>{monthChange === null ? 'Sem histórico' : `${Math.abs(monthChange).toFixed(0)}% ${monthChange > 0 ? 'a mais' : 'a menos'}`}</strong>
          <div className="stat-foot">{monthChange === null ? 'Sem comparação no mês anterior' : `Comparado com ${monthName(previousMonth)}`}</div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>A receber de terceiros</span>
            <span className="stat-symbol orange">＋</span>
          </div>
          <strong>{money(reimbursementTotal)}</strong>
          <div className="stat-foot">Despesas de terceiros neste mês</div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Compromissos futuros</span>
            <span className="stat-symbol muted">◷</span>
          </div>
          <strong>{money(upcomingTotal)}</strong>
          <div className="stat-foot">Sua parte das despesas cadastradas</div>
        </article>
      </section>
      <section className="health-grid">
        <div className="panel trend-panel">
          <div className="trend-panel-head">
            <div>
              <h2>Ritmo dos gastos</h2>
              <p>Despesas registradas ao longo de {activeTrendYear}</p>
            </div>
            <span className="trend-total">
              {money(trendYearTotal)} <small>no ano</small>
            </span>
          </div>
          <div className="trend-controls year-controls">
            <label className="year-select">
              Ano
              <select aria-label="Ano do ritmo de gastos" value={activeTrendYear} disabled={!trendYears.length} onChange={e => onTrendYearChange(e.target.value)}>
                {trendYears.length ? trendYears.map(year => <option value={year} key={year}>{year}</option>) : <option value={currentYear}>Sem lançamentos</option>}
              </select>
            </label>
          </div>
          <div className="trend-chart" ref={trendChartRef}>
            {monthlyTrend.map(item => {
              const max = Math.max(...monthlyTrend.map(x => x.total), 1)
              const label = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${item.month}-01T12:00:00`)).replace('.', '')
              return (
                <div className="trend-column" key={item.month} data-month={item.month} title={`${monthName(item.month)} · ${money(item.total)}`}>
                  <b>{item.total ? new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(item.total) : '—'}</b>
                  <div className="bar-track">
                    <i className={item.month === todayMonthKey ? 'current-bar' : ''} style={{ height: `${Math.max(item.total / max * 100, item.total ? 8 : 2)}%` }} />
                  </div>
                  <span>{label}</span>
                </div>
              )
            })}
          </div>
          <div className="trend-foot">O gráfico mostra os 12 meses do ano selecionado. Anos sem lançamentos não aparecem na lista.</div>
        </div>
        <div className="panel health-insight">
          <div className="panel-head">
            <div>
              <h2>Leitura do seu mês</h2>
              <p>Indicadores com base nos lançamentos</p>
            </div>
            <span className="calendar-icon">✳</span>
          </div>
          {categoryTotals.length ? (
            (() => {
              const topCategory = categoryTotals[0]
              const topSharePercent = total ? Math.round((topCategory.total / total) * 100) : 0
              const topCategoryExpenses = currentExpenses
                .filter(e => e.category === topCategory.id && personalValue(e) > 0)
                .sort((a, b) => personalValue(b) - personalValue(a))
                .slice(0, 3)
              return (
                <>
                  <div className="insight-top-category">
                    <span
                      className="category-icon insight-category-icon"
                      style={{ color: topCategory.color, background: `${topCategory.color}22` }}
                    >
                      {categorySymbol(topCategory.id, topCategory.name)}
                    </span>
                    <div className="insight-number">
                      <div className="insight-title-row">
                        <span>{topCategory.name}</span>
                        <b className="insight-cat-amount">{money(topCategory.total)}</b>
                      </div>
                      <small>é sua maior categoria ({topSharePercent}% dos gastos pessoais)</small>
                    </div>
                  </div>
                  <div className="track insight-track">
                    <i style={{ width: `${Math.min(100, topSharePercent)}%`, background: topCategory.color }} />
                  </div>
                  {topCategoryExpenses.length > 0 && (
                    <div className="insight-top-expenses">
                      <span className="insight-top-expenses-title">
                        Top {topCategoryExpenses.length} {topCategoryExpenses.length === 1 ? 'maior gasto' : 'maiores gastos'} em {topCategory.name}
                      </span>
                      <div className="insight-top-expenses-list">
                        {topCategoryExpenses.map((item, idx) => (
                          <div className="insight-top-expense-row" key={`${item.id}-${item.part}`}>
                            <span
                              className="insight-rank-badge"
                              style={{ color: topCategory.color, background: `${topCategory.color}20` }}
                            >
                              {idx + 1}º
                            </span>
                            <div className="insight-expense-desc">
                              <b>{item.description}</b>
                              {item.installments > 1 && (
                                <small>
                                  Parcela {item.part}/{item.installments}
                                </small>
                              )}
                            </div>
                            <strong className="insight-expense-val">{money(personalValue(item))}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="health-callout">
                    <span>↗</span>
                    <p>
                      {monthChange === null
                        ? 'Registre seus gastos mês a mês para criar uma comparação.'
                        : monthChange > 0
                          ? `Os gastos previstos subiram ${Math.abs(monthChange).toFixed(0)}% frente ao mês anterior.`
                          : `Os gastos previstos caíram ${Math.abs(monthChange).toFixed(0)}% frente ao mês anterior.`}
                    </p>
                  </div>
                </>
              )
            })()
          ) : (
            <div className="empty">Adicione lançamentos para ver os indicadores do mês.</div>
          )}
        </div>
        <div className="panel category-panel">
          <div className="panel-head">
            <div>
              <h2>Onde estão os gastos</h2>
              <p>{categoryPanelMode === 'categories' ? 'Distribuição por categoria' : `${currentExpenses.length} despesas pessoais no período`}</p>
            </div>
            <div className="category-head-actions">
              <div className="category-view-toggle" aria-label="Resumo por categoria ou lançamentos">
                <button className={categoryPanelMode === 'categories' ? 'selected' : ''} onClick={() => onCategoryPanelModeChange('categories')}>
                  Categorias
                </button>
                <button className={categoryPanelMode === 'transactions' ? 'selected' : ''} onClick={() => onCategoryPanelModeChange('transactions')}>
                  Lançamentos
                </button>
              </div>
            </div>
          </div>
          {categoryPanelMode === 'transactions' ? (
            currentExpenses.length ? (
              <div className="category-transaction-list">
                {[...currentExpenses].sort((a, b) => b.date.localeCompare(a.date)).map(e => {
                  const cat = data.categories.find(c => c.id === e.category)
                  const debtor = owedBy(e)
                  return (
                    <div className="category-transaction" key={`${e.id}-${e.month}`}>
                      <span className="category-icon" style={{ color: cat?.color, background: `${cat?.color}18` }}>
                        {categorySymbol(e.category, cat?.name)}
                      </span>
                      <span className="category-transaction-info">
                        <b>{e.description}</b>
                        <small>
                          {cat?.name || 'Sem categoria'}
                          {debtor ? ` · ${debtor}` : ''}
                          {e.installments > 1 ? ` · Parcela ${e.part}/${e.installments}` : ''}
                        </small>
                      </span>
                      <b className="category-transaction-value">{money(personalValue(e))}</b>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty compact">Sem despesas neste mês.</div>
            )
          ) : categoryTotals.length ? (
            <div className="pie-layout">
              <div className="pie-chart">
                <svg className="pie-svg" viewBox="0 0 100 100" role="img" aria-label="Gastos pessoais por categoria">
                  <circle cx="50" cy="50" r="37" fill="none" stroke="#e8eee9" strokeWidth="18" />
                  {pieSlices.length === 1 ? (
                    <circle
                      className="pie-slice"
                      cx="50"
                      cy="50"
                      r="37"
                      fill="none"
                      stroke={pieSlices[0].category.color}
                      strokeWidth="18"
                      style={{ stroke: pieSlices[0].category.color, strokeWidth: 18 }}
                      tabIndex={0}
                      aria-label={`${pieSlices[0].category.name}: ${money(pieSlices[0].category.total)}, 100%`}
                      onMouseEnter={() => onHoveredCategoryIdChange(pieSlices[0].category.id)}
                      onMouseLeave={() => onHoveredCategoryIdChange(null)}
                      onFocus={() => onHoveredCategoryIdChange(pieSlices[0].category.id)}
                      onBlur={() => onHoveredCategoryIdChange(null)}
                    >
                      <title>{`${pieSlices[0].category.name}: ${money(pieSlices[0].category.total)} · ${pieSlices[0].percentage}%`}</title>
                    </circle>
                  ) : (
                    pieSlices.map(slice => (
                      <path
                        className="pie-slice"
                        key={slice.category.id}
                        d={donutSlice(slice.start, slice.end)}
                        fill={slice.category.color}
                        tabIndex={0}
                        aria-label={`${slice.category.name}: ${money(slice.category.total)}, ${slice.percentage}%`}
                        onMouseEnter={() => onHoveredCategoryIdChange(slice.category.id)}
                        onMouseLeave={() => onHoveredCategoryIdChange(null)}
                        onFocus={() => onHoveredCategoryIdChange(slice.category.id)}
                        onBlur={() => onHoveredCategoryIdChange(null)}
                      >
                        <title>{`${slice.category.name}: ${money(slice.category.total)} · ${slice.percentage}%`}</title>
                      </path>
                    ))
                  )}
                </svg>
                <div className="pie-center">
                  <b>{hoveredCategory ? `${hoveredCategory.percentage}%` : money(categoryTotal)}</b>
                  <small>{hoveredCategory ? hoveredCategory.category.name : 'Total pessoal'}</small>
                </div>
              </div>
              <div className="pie-legend">
                {pieSlices.map(slice => (
                  <div key={slice.category.id}>
                    <span>
                      <i style={{ background: slice.category.color }} />
                      {slice.category.name}
                    </span>
                    <b>{money(slice.category.total)}</b>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty compact">Sem dados para este mês.</div>
          )}
        </div>
        <div className="panel upcoming">
          <div className="panel-head">
            <div>
              <h2>O que vem pela frente</h2>
              <p>Valores pessoais já previstos</p>
            </div>
            <span className="calendar-icon">▦</span>
          </div>
          {nextMonths.slice(1, 5).map(m => {
            const due = occurrences.filter(e => e.month === m)
            return (
              <div className="upcoming-row" key={m}>
                <span className="mini-date">
                  <b>{m.slice(5)}</b>
                  <small>{m.slice(0, 4)}</small>
                </span>
                <span className="upcoming-name">
                  <b>{monthName(m)}</b>
                  <small>
                    {due.length} {due.length === 1 ? 'despesa' : 'despesas'}
                  </small>
                </span>
                <b className="upcoming-value">{money(due.reduce((s, e) => s + personalValue(e), 0))}</b>
              </div>
            )
          })}
          {nextRelief && (
            <div className="installment-relief-callout" role="status">
              <span className="relief-badge-icon">🎉</span>
              <div>
                <b>Alívio de fatura em {monthName(nextRelief.reliefMonth)}</b>
                <p>
                  {nextRelief.count === 1
                    ? `“${nextRelief.descriptions[0]}” tem sua última parcela em ${shortMonthYear(nextRelief.lastMonth)} e libera ${money(nextRelief.freedPersonalAmount)}/mês.`
                    : `${nextRelief.count} parcelamentos terminam em ${shortMonthYear(nextRelief.lastMonth)} e liberam ${money(nextRelief.freedPersonalAmount)}/mês.`}
                </p>
              </div>
            </div>
          )}
          <div className="future-note">
            <span>ⓘ</span> Sua parte após descontar os valores atribuídos a terceiros.
          </div>
        </div>
        <div className="panel cards-summary-panel">
          <div className="panel-head">
            <div>
              <h2>Resumo por cartão</h2>
              <p>Faturas previstas em {monthName(month)} e fechamento</p>
            </div>
            <span className="calendar-icon">▣</span>
          </div>
          {cardSummaries.length ? (
            <div className="cards-summary-grid">
              {cardSummaries.map(({ card, invoiceTotal, personalPart, sharedPart, count, nextInvoiceTotal }) => (
                <div className="card-summary-item" key={card.id}>
                  <div className="card-summary-top">
                    <div className="card-summary-title">
                      <span className="card-icon">{card.kind === 'store' ? '🛍️' : card.kind === 'borrowed' ? '🤝' : '🏦'}</span>
                      <div>
                        <b>{card.name}</b>
                        <small>
                          {card.kind === 'store'
                            ? 'Crédito de loja · Mês definido na compra'
                            : card.kind === 'borrowed'
                              ? 'Cartão emprestado · Mês definido na compra'
                              : `Fecha dia ${card.closingDay} · Vence dia ${card.dueDay}`}
                        </small>
                      </div>
                    </div>
                    <button type="button" className="text-btn card-summary-link" onClick={() => onOpenCardTransactions(card.id)}>
                      Ver fatura →
                    </button>
                  </div>
                  <div className="card-summary-amount">
                    <span>Total da fatura ({count} {count === 1 ? 'item' : 'itens'})</span>
                    <strong>{money(invoiceTotal)}</strong>
                  </div>
                  <div className="card-summary-breakdown">
                    <span>Sua parte: <b>{money(personalPart)}</b></span>
                    {sharedPart > 0 && <span>Terceiros: <b>{money(sharedPart)}</b></span>}
                    <span>Próx. mês: <b>{money(nextInvoiceTotal)}</b></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty compact">
              Nenhum cartão cadastrado.{' '}
              <button className="text-btn" onClick={onOpenCardSettings}>
                Adicionar cartão →
              </button>
            </div>
          )}
        </div>
        <div className="panel reimbursement-panel">
          <div className="panel-head">
            <div>
              <h2>Quem precisa te pagar</h2>
              <p>Reembolsos deste mês, parcelas futuras e abatimentos manuais de racha</p>
            </div>
            <button type="button" className="outline-btn reimbursement-add-btn" onClick={() => onOpenManualReimbursement()}>
              ＋ Abater valor avulso
            </button>
          </div>
          {reimbursementByParticipant.length ? (
            <>
              {reimbursementByParticipant.map(({ participant, current: thisMonth, future }) => (
                <div className="reimbursement-row" key={participant.id}>
                  <div className="reimbursement-person">
                    <span className="participant-avatar">{participant.id === QUICK_THIRD_PARTY_ID ? '⚡' : participant.name.slice(0, 1).toUpperCase()}</span>
                    <b>{participant.name}</b>
                  </div>
                  <div className="reimbursement-values">
                    <span>Neste mês <b>{money(thisMonth)}</b></span>
                    <span>Parcelas futuras <b>{money(future)}</b></span>
                    {thisMonth > 0 && (
                      <button
                        type="button"
                        className="reimbursement-summary-btn"
                        onClick={() => onOpenParticipantSummary(participant)}
                      >
                        Ver resumo
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {currentReimbursements.length > 0 && (
                <div className="manual-reimbursements-box">
                  <span className="manual-reimbursements-title">Abatimentos manuais neste mês ({currentReimbursements.length})</span>
                  <div className="manual-reimbursements-list">
                    {currentReimbursements.map(item => {
                      const personName =
                        item.participantId === QUICK_THIRD_PARTY_ID
                          ? QUICK_THIRD_PARTY_NAME
                          : data.participants.find(p => p.id === item.participantId)?.name || 'Participante'
                      const cardName = item.cardId ? data.cards.find(c => c.id === item.cardId)?.name : undefined
                      const catName = item.categoryId ? data.categories.find(c => c.id === item.categoryId)?.name : undefined
                      return (
                        <div className="manual-reimbursement-item" key={item.id}>
                          <div className="manual-reimbursement-info">
                            <b>{item.description}</b>
                            <small>
                              {personName}
                              {cardName ? ` · Fatura ${cardName}` : ''}
                              {catName ? ` · ${catName}` : ''}
                            </small>
                          </div>
                          <b className="manual-reimbursement-amount">− {money(item.amount)}</b>
                          <details className="row-actions">
                            <summary aria-label={`Ações para ${item.description}`} title="Ações">···</summary>
                            <div className={`row-action-menu ${theme === 'dark' ? 'is-dark' : 'is-light'}`}>
                              <button
                                type="button"
                                onClick={event => {
                                  event.currentTarget.closest('details')?.removeAttribute('open')
                                  onOpenManualReimbursement(item)
                                }}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={event => {
                                  event.currentTarget.closest('details')?.removeAttribute('open')
                                  onDeleteManualReimbursement(item.id)
                                }}
                              >
                                Excluir
                              </button>
                            </div>
                          </details>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="reimbursement-total">
                <span>Total de terceiros / abatido neste mês</span>
                <b>{money(reimbursementTotal)}</b>
              </div>
            </>
          ) : (
            <div className="empty compact">
              Recebeu um PIX de racha (ex.: Uber/almoço) e não lembra quais corridas foram?{' '}
              <button className="text-btn" onClick={() => onOpenManualReimbursement()}>
                Abater valor avulso →
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
