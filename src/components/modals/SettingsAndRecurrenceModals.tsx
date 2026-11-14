import type React from 'react'
import {
  formatMoneyInput,
  type Card,
  type CardKind,
  type Category,
  type ClosingDayRule,
  type Method,
} from '../../finance'
import {
  blurActiveInputOnTouch,
  categorySymbol,
  dismissKeyboardOnEnter,
  hexToHsl,
  hslToHex,
  isTouchDevice,
} from '../../utils/format'

export type SettingEditor = {
  kind: 'category' | 'card' | 'participant'
  id?: string
  name: string
  color: string
  cardKind: CardKind
  closingDay: string
  dueDay: string
  closingDayRule: ClosingDayRule
}

export type RecurrenceEditor = {
  id?: string
  description: string
  amount: string
  category: string
  method: Method
  cardId: string
  day: string
}

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

type SettingsAndRecurrenceModalsProps = {
  closingModal: string | null
  formShake: string | null
  onClearShake: () => void
  categories: Category[]
  cards: Card[]
  recurrenceEditor: RecurrenceEditor | null
  setRecurrenceEditor: (editor: RecurrenceEditor) => void
  recurrenceErrors: Record<string, string>
  onClearRecurrenceError: (field: string) => void
  onCloseRecurrence: () => void
  onSaveRecurrence: (event: React.FormEvent) => void
  settingsModal: SettingEditor | null
  setSettingsModal: React.Dispatch<React.SetStateAction<SettingEditor | null>>
  settingsErrors: Record<string, string>
  onClearSettingsError: (field: string) => void
  onCloseSettings: () => void
  onSaveSettings: (event: React.FormEvent) => void
}

export function SettingsAndRecurrenceModals({
  closingModal,
  formShake,
  onClearShake,
  categories,
  cards,
  recurrenceEditor,
  setRecurrenceEditor,
  recurrenceErrors,
  onClearRecurrenceError,
  onCloseRecurrence,
  onSaveRecurrence,
  settingsModal,
  setSettingsModal,
  settingsErrors,
  onClearSettingsError,
  onCloseSettings,
  onSaveSettings,
}: SettingsAndRecurrenceModalsProps) {
  return (
    <>
      {recurrenceEditor && (
        <div
          className={`modal-backdrop ${closingModal === 'recurrence' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) onCloseRecurrence()
          }}
        >
          <form
            noValidate
            className={`modal recurrence-modal ${formShake === 'recurrence' ? 'is-shaking' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recurrence-modal-title"
            onSubmit={onSaveRecurrence}
            onAnimationEnd={event => {
              if (event.animationName === 'nexus-modal-shake') onClearShake()
            }}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">DESPESA MENSAL</span>
                <h2 id="recurrence-modal-title">{recurrenceEditor.id ? 'Editar recorrência' : 'Nova recorrência'}</h2>
              </div>
              <button type="button" aria-label="Fechar recorrência" onClick={onCloseRecurrence}>
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
                  onClearRecurrenceError('description')
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
                      onClearRecurrenceError('amount')
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
                    onClearRecurrenceError('day')
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
                  {categories.map(category => (
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
                  {cards.length > 0 && <option>Crédito à vista</option>}
                </select>
              </label>
            </div>
            {recurrenceEditor.method.startsWith('Crédito') && (
              <label>
                Cartão
                <select value={recurrenceEditor.cardId} onFocus={blurActiveInputOnTouch} onChange={event => setRecurrenceEditor({ ...recurrenceEditor, cardId: event.target.value })}>
                  {cards.map(card => (
                    <option key={card.id} value={card.id}>
                      {card.kind === 'store' ? '🛍️' : card.kind === 'borrowed' ? '🤝' : '🏦'} {card.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="form-help">A recorrência só vira lançamento quando você confirma na revisão mensal. Você pode pular uma cobrança ou pausar o modelo.</p>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={onCloseRecurrence}>
                Cancelar
              </button>
              <button className="primary" type="submit">
                {recurrenceEditor.id ? 'Salvar alterações' : 'Criar modelo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {settingsModal && (
        <div
          className={`modal-backdrop ${closingModal === 'settings' ? 'is-closing' : ''}`}
          onMouseDown={e => {
            if (e.target === e.currentTarget) onCloseSettings()
          }}
        >
          <form
            noValidate
            className={`modal settings-modal ${formShake === 'settings' ? 'is-shaking' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onSubmit={onSaveSettings}
            onAnimationEnd={event => {
              if (event.animationName === 'nexus-modal-shake') onClearShake()
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
              <button type="button" aria-label="Fechar ajustes" onClick={onCloseSettings}>
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
                    onClearSettingsError('closingDay')
                    onClearSettingsError('dueDay')
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
                    onClearSettingsError('closingDay')
                    onClearSettingsError('dueDay')
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
                  onClearSettingsError('name')
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
                        onClearSettingsError('name')
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
                    onClearSettingsError('color')
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
                                onClearSettingsError('color')
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
                                onClearSettingsError('color')
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
                              onClearSettingsError('color')
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
                          onClearSettingsError('closingDay')
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
                          onClearSettingsError('dueDay')
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
              <button type="button" className="cancel-btn" onClick={onCloseSettings}>
                Cancelar
              </button>
              <button className="primary" type="submit">
                {settingsModal.id ? 'Salvar alterações' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
