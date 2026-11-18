import { useState } from 'react'
import type React from 'react'
import { type Data, type Expense, type Occurrence } from '../finance'
import { blurActiveInputOnTouch, categorySymbol, money, shortMonthYear, type MainView, type SortOrder } from '../utils/format'

type PageSizeOption = '10' | '20' | '50' | 'all'

type TransactionsTableProps = {
  view: MainView
  theme: 'light' | 'dark'
  data: Data
  current: Occurrence[]
  filtered: Occurrence[]
  total: number
  reimbursementTotal: number
  filteredPersonalTotal: number
  filteredReimbursementTotal: number
  filteredInvoiceTotal: number
  hasActiveFilters: boolean
  searchAllMonths: boolean
  query: string
  categoryFilter: string
  methodFilter: string
  cardFilter: string
  statusFilter: 'all' | 'paid' | 'unpaid'
  sortOrder: SortOrder
  selectedExpenseIds: string[]
  selectedVisibleIds: string[]
  allVisibleSelected: boolean
  filteredExpenseIds: string[]
  onSearchAllMonthsChange: (value: boolean) => void
  onQueryChange: (value: string) => void
  onCategoryFilterChange: (value: string) => void
  onMethodFilterChange: (value: string) => void
  onCardFilterChange: (value: string) => void
  onStatusFilterChange: (value: 'all' | 'paid' | 'unpaid') => void
  onSortOrderChange: (value: SortOrder) => void
  onClearAllFilters: () => void
  onToggleSelectAllVisible: (checked: boolean) => void
  onToggleSelectExpense: (id: string, checked: boolean) => void
  onDeleteSelectedExpenses: () => void
  onMarkSelectedExpensesPaid: (paid: boolean) => void
  onShareExpenses: (expenses: Expense[]) => void
  onToggleExpensePaid: (expenseId: string, part: number) => void
  hasCreditInMonth: boolean
  paidTotal: number
  unpaidTotal: number
  onDownloadCsv: () => void
  onDownloadImage: () => void
  onEditExpense: (expense: Expense) => void
  onDuplicateExpense: (expense: Expense) => void
  onOpenAdvanceInstallments: (occurrence: Occurrence) => void
  onDeleteExpense: (id: string) => void
  personalValue: (occurrence: Occurrence) => number
  owedBy: (occurrence: Occurrence) => string
}

export function TransactionsTable({
  view,
  theme,
  data,
  current,
  filtered,
  total,
  reimbursementTotal,
  filteredPersonalTotal,
  filteredReimbursementTotal,
  filteredInvoiceTotal,
  hasActiveFilters,
  searchAllMonths,
  query,
  categoryFilter,
  methodFilter,
  cardFilter,
  statusFilter,
  sortOrder,
  selectedExpenseIds,
  selectedVisibleIds,
  allVisibleSelected,
  filteredExpenseIds,
  onSearchAllMonthsChange,
  onQueryChange,
  onCategoryFilterChange,
  onMethodFilterChange,
  onCardFilterChange,
  onStatusFilterChange,
  onSortOrderChange,
  onClearAllFilters,
  onToggleSelectAllVisible,
  onToggleSelectExpense,
  onDeleteSelectedExpenses,
  onMarkSelectedExpensesPaid,
  onShareExpenses,
  onToggleExpensePaid,
  hasCreditInMonth,
  paidTotal,
  unpaidTotal,
  onDownloadCsv,
  onDownloadImage,
  onEditExpense,
  onDuplicateExpense,
  onOpenAdvanceInstallments,
  onDeleteExpense,
  personalValue,
  owedBy,
}: TransactionsTableProps) {
  const [pageSize, setPageSize] = useState<PageSizeOption>(() => {
    const saved = localStorage.getItem('poe-na-conta-page-size')
    return saved === '10' || saved === '20' || saved === '50' || saved === 'all' ? saved : '10'
  })
  const [page, setPage] = useState(1)

  const handlePageSizeChange = (next: PageSizeOption) => {
    setPageSize(next)
    setPage(1)
    try {
      localStorage.setItem('poe-na-conta-page-size', next)
    } catch {
      /* ignore */
    }
  }

  const numericPageSize = pageSize === 'all' ? Math.max(1, filtered.length) : Number(pageSize)
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filtered.length / numericPageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const startIndex = pageSize === 'all' ? 0 : (safePage - 1) * numericPageSize
  const paginated = pageSize === 'all' ? filtered : filtered.slice(startIndex, startIndex + numericPageSize)
  const rangeStart = filtered.length === 0 ? 0 : startIndex + 1
  const rangeEnd = filtered.length === 0 ? 0 : startIndex + paginated.length

  const closeActionMenu = (event: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
    event.currentTarget.closest('details')?.removeAttribute('open')
    action()
  }

  const toggleColumnSort = (column: 'desc' | 'date' | 'value') => {
    setPage(1)
    if (column === 'date') {
      onSortOrderChange(sortOrder === 'date-desc' ? 'date-asc' : 'date-desc')
    } else if (column === 'value') {
      onSortOrderChange(sortOrder === 'value-desc' ? 'value-asc' : 'value-desc')
    } else {
      onSortOrderChange(sortOrder === 'desc-asc' ? 'date-desc' : 'desc-asc')
    }
  }

  return (
    <section className="panel transactions data-page-table">
      <div className="panel-head">
        <div>
          <h2>{view === 'Relatórios' ? 'Relatório de despesas' : 'Todos os lançamentos'}</h2>
          <p>{view === 'Relatórios' ? 'Gastos pessoais e valores atribuídos a participantes.' : 'Consulte, ordene ou filtre por categoria, forma de pagamento ou cartão.'}</p>
        </div>
        <div className="export-actions-group">
          <button className="export-btn" aria-label="Exportar planilha estilizada" onClick={onDownloadCsv}>
            📊 <span>Exportar Planilha</span>
          </button>
          <button className="export-btn" aria-label="Exportar relatório em imagem PNG" onClick={onDownloadImage}>
            🖼 <span>Exportar Imagem</span>
          </button>
        </div>
      </div>
      <div className="data-summary">
        <div className="data-summary-card is-primary">
          <div className="data-summary-head">
            <span>Gastos pessoais{hasActiveFilters ? ' (filtro)' : ''}</span>
            <i className="data-summary-icon" aria-hidden="true">↘</i>
          </div>
          <b>{money(hasActiveFilters ? filteredPersonalTotal : total)}</b>
          <small>
            {hasActiveFilters
              ? 'Sua parte nos itens filtrados'
              : hasCreditInMonth
                ? `Falta pagar: ${money(unpaidTotal)} · ✓ Pago: ${money(paidTotal)}`
                : 'Sua parte líquida no mês'}
          </small>
        </div>
        <div className="data-summary-card">
          <div className="data-summary-head">
            <span>A receber{hasActiveFilters ? ' (filtro)' : ''}</span>
            <i className="data-summary-icon is-orange" aria-hidden="true">＋</i>
          </div>
          <b>{money(hasActiveFilters ? filteredReimbursementTotal : reimbursementTotal)}</b>
          <small>Parte atribuída a terceiros</small>
        </div>
        <div className="data-summary-card">
          <div className="data-summary-head">
            <span>{cardFilter !== 'Todos os cartões' || methodFilter.startsWith('Crédito') ? 'Total na fatura' : 'Total movimentado'}</span>
            <i className="data-summary-icon is-blue" aria-hidden="true">◫</i>
          </div>
          <b>{money(filteredInvoiceTotal)}</b>
          <small>{cardFilter !== 'Todos os cartões' || methodFilter.startsWith('Crédito') ? 'Soma bruta das parcelas no cartão' : 'Valor bruto (você + terceiros)'}</small>
        </div>
        <div className="data-summary-card">
          <div className="data-summary-head">
            <span>Lançamentos</span>
            <i className="data-summary-icon is-purple" aria-hidden="true">#</i>
          </div>
          <b>{hasActiveFilters ? `${filtered.length} de ${current.length}` : current.length}</b>
          <small>{hasActiveFilters ? 'Filtrados neste período' : current.length === 1 ? 'Despesa registrada no mês' : 'Despesas registradas no mês'}</small>
        </div>
      </div>
      <div className="filters">
        <label className="search">
          <span>⌕</span>
          <input
            aria-label="Buscar lançamentos"
            placeholder={searchAllMonths && view === 'Lançamentos' ? 'Buscar em todos os meses...' : 'Buscar lançamento...'}
            value={query}
            onChange={e => {
              setPage(1)
              onQueryChange(e.target.value)
            }}
          />
        </label>
        {view === 'Lançamentos' && (
          <div className="search-scope-toggle" role="group" aria-label="Período da busca">
            <button
              type="button"
              className={!searchAllMonths ? 'is-active' : ''}
              onClick={() => {
                setPage(1)
                onSearchAllMonthsChange(false)
              }}
            >
              Neste mês
            </button>
            <button
              type="button"
              className={searchAllMonths ? 'is-active' : ''}
              onClick={() => {
                setPage(1)
                onSearchAllMonthsChange(true)
              }}
              title="Buscar lançamentos e parcelas em todos os meses cadastrados"
            >
              🌐 Todos os meses
            </button>
          </div>
        )}
        <select
          aria-label="Filtrar por categoria"
          value={categoryFilter}
          onChange={e => {
            setPage(1)
            onCategoryFilterChange(e.target.value)
          }}
        >
          <option>Todas as categorias</option>
          {data.categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar por forma de pagamento"
          value={methodFilter}
          onChange={e => {
            const next = e.target.value
            setPage(1)
            onMethodFilterChange(next)
            if (next === 'PIX' || next === 'Débito' || next === 'Dinheiro') onCardFilterChange('Todos os cartões')
          }}
        >
          <option>Todos os pagamentos</option>
          <option>PIX</option>
          <option>Débito</option>
          <option>Dinheiro</option>
          <option>Crédito (todos)</option>
          <option>Crédito à vista</option>
          <option>Crédito parcelado</option>
        </select>
        {data.cards.length > 0 && (
          <select
            aria-label="Filtrar por cartão"
            value={cardFilter}
            onChange={e => {
              const next = e.target.value
              setPage(1)
              onCardFilterChange(next)
              if (next !== 'Todos os cartões' && (methodFilter === 'PIX' || methodFilter === 'Débito' || methodFilter === 'Dinheiro')) {
                onMethodFilterChange('Todos os pagamentos')
              }
            }}
          >
            <option>Todos os cartões</option>
            {data.cards.map(c => (
              <option key={c.id} value={c.id}>
                {c.kind === 'store' ? '🛍️' : c.kind === 'borrowed' ? '🤝' : '🏦'} {c.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filtrar por status de pagamento"
          value={statusFilter}
          onChange={e => {
            setPage(1)
            onStatusFilterChange(e.target.value as 'all' | 'paid' | 'unpaid')
          }}
        >
          <option value="all">Todos os status</option>
          <option value="unpaid">Em aberto (a pagar)</option>
          <option value="paid">Pagas / quitadas</option>
        </select>
        <select
          aria-label="Ordenar lançamentos"
          value={sortOrder}
          onChange={e => {
            setPage(1)
            onSortOrderChange(e.target.value as SortOrder)
          }}
        >
          <option value="date-desc">Ordenar: Mais recentes</option>
          <option value="date-asc">Ordenar: Mais antigos</option>
          <option value="value-desc">Ordenar: Maior valor</option>
          <option value="value-asc">Ordenar: Menor valor</option>
          <option value="desc-asc">Ordenar: Descrição (A–Z)</option>
        </select>
        {(hasActiveFilters || sortOrder !== 'date-desc') && (
          <button
            type="button"
            className="cancel-btn filter-clear-btn"
            onClick={() => {
              setPage(1)
              onClearAllFilters()
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>
      {selectedVisibleIds.length > 0 && (
        <div className="bulk-actions-bar" role="region" aria-label="Ações em massa">
          <span className="bulk-actions-count">
            <b>{selectedVisibleIds.length}</b> {selectedVisibleIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
          </span>
          <div className="bulk-actions-buttons">
            <button type="button" className="cancel-btn bulk-clear-btn" onClick={() => onToggleSelectAllVisible(false)}>
              Limpar seleção
            </button>
            {filtered.some(e => selectedVisibleIds.includes(e.id) && e.method.startsWith('Crédito')) && (
              <button
                type="button"
                className="outline-btn bulk-share-btn"
                onClick={() => onMarkSelectedExpensesPaid(true)}
              >
                ✓ Marcar pagos ({filtered.filter(e => selectedVisibleIds.includes(e.id) && e.method.startsWith('Crédito')).length})
              </button>
            )}
            <button
              type="button"
              className="outline-btn bulk-share-btn"
              onClick={() => onShareExpenses(data.expenses.filter(exp => selectedVisibleIds.includes(exp.id)))}
            >
              Enviar / QR ({selectedVisibleIds.length})
            </button>
            <button type="button" className="danger-btn bulk-delete-btn" onClick={onDeleteSelectedExpenses}>
              Excluir selecionados ({selectedVisibleIds.length})
            </button>
          </div>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="col-select">
                <input
                  type="checkbox"
                  className="row-checkbox"
                  aria-label="Selecionar todos os lançamentos visíveis"
                  checked={allVisibleSelected}
                  disabled={!filteredExpenseIds.length}
                  onChange={e => onToggleSelectAllVisible(e.target.checked)}
                />
              </th>
              <th className="col-desc">
                <button type="button" className={`th-sort-btn ${sortOrder === 'desc-asc' ? 'is-sorted' : ''}`} onClick={() => toggleColumnSort('desc')}>
                  DESCRIÇÃO {sortOrder === 'desc-asc' ? '↑' : ''}
                </button>
              </th>
              <th className="col-category">CATEGORIA</th>
              <th className="col-date">
                <button type="button" className={`th-sort-btn ${sortOrder.startsWith('date-') ? 'is-sorted' : ''}`} onClick={() => toggleColumnSort('date')}>
                  DATA {sortOrder === 'date-desc' ? '↓' : sortOrder === 'date-asc' ? '↑' : ''}
                </button>
              </th>
              <th className="col-method">PAGAMENTO</th>
              <th className="right col-value">
                <button type="button" className={`th-sort-btn right ${sortOrder.startsWith('value-') ? 'is-sorted' : ''}`} onClick={() => toggleColumnSort('value')}>
                  PARTE PESSOAL {sortOrder === 'value-desc' ? '↓' : sortOrder === 'value-asc' ? '↑' : ''}
                </button>
              </th>
              <th className="col-actions" />
            </tr>
          </thead>
          <tbody>
            {paginated.map(e => {
              const cat = data.categories.find(c => c.id === e.category)
              const txCard = e.method.startsWith('Crédito') ? (data.cards.find(c => c.id === e.cardId) || data.cards[0]) : undefined
              const own = personalValue(e)
              const shared = e.allocatedShares.reduce((sum, share) => sum + share.amount, 0)
              const debtor = owedBy(e)
              const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${e.date}T12:00:00`)).replace('.', '')
              const isSelected = selectedExpenseIds.includes(e.id)
              const isCredit = e.method.startsWith('Crédito')
              return (
                <tr key={`${e.id}-${e.month}`} className={`${isSelected ? 'is-selected' : ''} ${isCredit && e.paid ? 'is-paid-row' : ''}`.trim()}>
                  <td className="col-select">
                    <input
                      type="checkbox"
                      className="row-checkbox"
                      aria-label={`Selecionar ${e.description}`}
                      checked={isSelected}
                      onChange={ev => onToggleSelectExpense(e.id, ev.target.checked)}
                    />
                  </td>
                  <td className="col-desc">
                    <div className="desc">
                      <span className="category-icon" style={{ color: cat?.color, background: `${cat?.color}18` }}>
                        {categorySymbol(e.category, cat?.name)}
                      </span>
                      <span className="desc-text">
                        <b>
                          {e.description}
                          {searchAllMonths && view === 'Lançamentos' && (
                            <span className="tx-month-badge" title="Mês de cobrança / fatura">
                              {shortMonthYear(e.month)}
                            </span>
                          )}
                        </b>
                        <small>
                          {e.installments > 1 ? `Parcela ${e.part} de ${e.installments}` : 'Despesa'}
                          {shared > 0 ? ` · ${debtor}` : ''}
                        </small>
                        <small className="mobile-tx-meta">
                          {shortDate} · {cat?.name || 'Sem categoria'} · {e.method}
                          {txCard ? ` (${txCard.name})` : ''}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td className="col-category">
                    <span className="category-label">
                      <i style={{ background: cat?.color }} />
                      {cat?.name || 'Sem categoria'}
                    </span>
                  </td>
                  <td className="date-cell col-date">
                    {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${e.date}T12:00:00`))}
                  </td>
                  <td className="col-method">
                    <span className={`method ${e.method.startsWith('Crédito') ? 'credit' : ''}`}>
                      {e.method}
                      {txCard ? ` · ${txCard.name}` : ''}
                    </span>
                  </td>
                  <td className="right value col-value">
                    <div className="tx-value-paid-cell">
                      <span className={isCredit && e.paid ? 'is-paid-amount' : ''}>{money(own)}</span>
                      {isCredit && (
                        <button
                          type="button"
                          className={`participant-paid-toggle tx-row-paid-btn ${e.paid ? 'is-paid' : ''}`}
                          aria-pressed={Boolean(e.paid)}
                          onClick={() => onToggleExpensePaid(e.id, e.part)}
                          title={e.paid ? 'Desmarcar como pago' : 'Marcar como pago'}
                        >
                          {e.paid ? '✓ Pago' : 'Pagar'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="col-actions">
                    <details className="row-actions">
                      <summary aria-label={`Ações para ${e.description}`} title="Ações">···</summary>
                      <div className={`row-action-menu ${theme === 'dark' ? 'is-dark' : 'is-light'}`}>
                        {isCredit && (
                          <button onClick={event => closeActionMenu(event, () => onToggleExpensePaid(e.id, e.part))}>
                            {e.paid ? 'Desmarcar como pago' : '✓ Marcar como pago'}
                          </button>
                        )}
                        {e.installments > 1 && e.part < e.installments && (
                          <button onClick={event => closeActionMenu(event, () => onOpenAdvanceInstallments(e))}>
                            ⚡ Adiantar parcelas ({e.installments - e.part})
                          </button>
                        )}
                        <button onClick={event => closeActionMenu(event, () => onEditExpense(e))}>Editar</button>
                        <button onClick={event => closeActionMenu(event, () => onShareExpenses([e]))}>Enviar / QR Code</button>
                        <button onClick={event => closeActionMenu(event, () => onDuplicateExpense(e))}>Duplicar</button>
                        <button className="danger" onClick={event => closeActionMenu(event, () => onDeleteExpense(e.id))}>Excluir</button>
                      </div>
                    </details>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="empty">
            {searchAllMonths && view === 'Lançamentos' ? (
              'Nenhum lançamento encontrado em nenhum mês.'
            ) : (
              <>
                Nenhum lançamento encontrado neste mês.
                {view === 'Lançamentos' && query.trim() && (
                  <>
                    {' '}
                    <button type="button" className="text-btn" onClick={() => onSearchAllMonthsChange(true)}>
                      Buscar em todos os meses →
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div className="table-foot">
        <div className="table-foot-left">
          <span>
            {filtered.length > 0 ? (
              <>
                Exibindo <b>{rangeStart}–{rangeEnd}</b> de <b>{filtered.length}</b>
                {hasActiveFilters ? ` (total: ${current.length})` : ' lançamentos'}
              </>
            ) : (
              <>
                Mostrando <b>0</b> de <b>{current.length}</b> lançamentos
              </>
            )}
          </span>
          <label className="page-size-control">
            <span>Por página:</span>
            <select
              aria-label="Quantidade de lançamentos por página"
              value={pageSize}
              onFocus={blurActiveInputOnTouch}
              onChange={e => handlePageSizeChange(e.target.value as PageSizeOption)}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="all">Todos</option>
            </select>
          </label>
        </div>
        {totalPages > 1 && (
          <div className="pagination-controls" role="navigation" aria-label="Paginação de lançamentos" data-no-swipe="true">
            <button
              type="button"
              className="page-nav-btn"
              disabled={safePage <= 1}
              onClick={() => setPage(Math.max(1, safePage - 1))}
              aria-label="Página anterior"
            >
              ‹ Anterior
            </button>
            <div className="page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`page-num-btn ${pageNumber === safePage ? 'is-active' : ''}`}
                  aria-current={pageNumber === safePage ? 'page' : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="page-nav-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              aria-label="Próxima página"
            >
              Próxima ›
            </button>
          </div>
        )}
        <span className="table-foot-totals">
          Gastos pessoais <b>{money(hasActiveFilters ? filteredPersonalTotal : total)}</b> · A receber <b>{money(hasActiveFilters ? filteredReimbursementTotal : reimbursementTotal)}</b>
        </span>
      </div>
    </section>
  )
}
