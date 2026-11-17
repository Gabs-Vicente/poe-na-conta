import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { type Data, type Expense } from '../../finance'
import { money } from '../../utils/format'
import {
  buildQuickTransferUrl,
  decodeQuickTransfer,
  encodeQuickTransfer,
  type QuickExpenseTransferPayload,
} from '../../utils/quickTransfer'

type QuickTransferModalsProps = {
  closingModal: string | null
  data: Data
  shareExpenses: Expense[] | null
  onCloseShare: () => void
  pendingImport: QuickExpenseTransferPayload | null
  onCloseImport: () => void
  onConfirmImport: (duplicatePolicy: 'skip' | 'update') => void
  pasteImportOpen: boolean
  onClosePasteImport: () => void
  onSubmitPasteCode: (payload: QuickExpenseTransferPayload) => void
  onToast: (message: string) => void
}

export function QuickTransferModals({
  closingModal,
  data,
  shareExpenses,
  onCloseShare,
  pendingImport,
  onCloseImport,
  onConfirmImport,
  pasteImportOpen,
  onClosePasteImport,
  onSubmitPasteCode,
  onToast,
}: QuickTransferModalsProps) {
  const [qrState, setQrState] = useState<{ url: string; dataUrl: string; error: boolean }>({
    url: '',
    dataUrl: '',
    error: false,
  })
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'update'>('skip')
  const [pasteInput, setPasteInput] = useState('')
  const [pasteError, setPasteError] = useState('')

  const shareUrl = shareExpenses && shareExpenses.length > 0
    ? buildQuickTransferUrl(encodeQuickTransfer(shareExpenses, data))
    : ''
  const isTooLongForQr = shareUrl.length > 2200
  const qrDataUrl = !isTooLongForQr && qrState.url === shareUrl ? qrState.dataUrl : ''
  const qrError = !isTooLongForQr && qrState.url === shareUrl ? qrState.error : false

  useEffect(() => {
    if (!shareUrl || isTooLongForQr) return
    let cancelled = false
    QRCode.toDataURL(shareUrl, {
      margin: 2,
      width: 240,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#171815',
        light: '#ffffff',
      },
    })
      .then(url => {
        if (!cancelled) {
          setQrState({ url: shareUrl, dataUrl: url, error: false })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrState({ url: shareUrl, dataUrl: '', error: true })
        }
      })
    return () => {
      cancelled = true
    }
  }, [shareUrl, isTooLongForQr])

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      onToast('Link do lançamento copiado!')
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      onToast('Link do lançamento copiado!')
    }
  }

  const handleNativeShare = async () => {
    if (!shareUrl || !shareExpenses) return
    const label =
      shareExpenses.length === 1
        ? `${shareExpenses[0].description} (${money(shareExpenses[0].amount)})`
        : `${shareExpenses.length} lançamentos`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Põe na Conta — Enviar lançamento',
          text: `Importar no Põe na Conta: ${label}`,
          url: shareUrl,
        })
        return
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }
    await handleCopyLink()
  }

  const handlePasteSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const decoded = decodeQuickTransfer(pasteInput)
    if (!decoded) {
      setPasteError('Código ou link inválido. Cole o link completo gerado pelo Põe na Conta.')
      return
    }
    setPasteError('')
    setPasteInput('')
    onClosePasteImport()
    onSubmitPasteCode(decoded)
  }

  return (
    <>
      {shareExpenses && shareExpenses.length > 0 && (
        <div
          className={`modal-backdrop ${closingModal === 'quick-share' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) onCloseShare()
          }}
        >
          <section className="modal quick-transfer-modal" role="dialog" aria-modal="true" aria-labelledby="quick-share-title">
            <div className="modal-header">
              <div>
                <span className="eyebrow">ENVIAR PARA OUTRO APARELHO</span>
                <h2 id="quick-share-title">
                  {shareExpenses.length === 1 ? 'Compartilhar lançamento' : `Compartilhar ${shareExpenses.length} lançamentos`}
                </h2>
              </div>
              <button type="button" aria-label="Fechar compartilhamento" onClick={onCloseShare}>
                ×
              </button>
            </div>
            <p className="form-help">
              Aponte a câmera do celular para o QR Code abaixo ou envie o link. O registro será <b>adicionado</b> no outro aparelho sem apagar nada que já esteja lá.
            </p>
            <div className="quick-share-summary">
              {shareExpenses.slice(0, 3).map(exp => (
                <div className="quick-share-item" key={exp.id}>
                  <div>
                    <b>{exp.description}</b>
                    <small>
                      {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${exp.date}T12:00:00`))} · {exp.method}
                      {exp.installments > 1 ? ` (${exp.installments}x)` : ''}
                    </small>
                  </div>
                  <strong>{money(exp.amount)}</strong>
                </div>
              ))}
              {shareExpenses.length > 3 && (
                <small className="quick-share-more">+ {shareExpenses.length - 3} outro(s) lançamento(s) incluído(s)</small>
              )}
            </div>

            {!isTooLongForQr && qrDataUrl ? (
              <div className="quick-qr-box">
                <img src={qrDataUrl} alt="QR Code para importar lançamento no Põe na Conta" width={220} height={220} />
                <small>Escaneie com a câmera normal do celular e toque no link.</small>
              </div>
            ) : (
              <div className="reset-warning-box" role="note">
                <b>{qrError ? 'Não foi possível gerar o QR Code' : 'Muitos itens para um único QR Code'}</b>
                <p>
                  {qrError
                    ? 'Use os botões abaixo para copiar ou enviar o link diretamente.'
                    : 'Você selecionou muitos lançamentos de uma vez. Use "Copiar link" ou selecione até ~6 lançamentos para gerar o QR Code.'}
                </p>
              </div>
            )}

            <div className="modal-actions quick-transfer-actions">
              <button type="button" className="cancel-btn" onClick={onCloseShare}>
                Fechar
              </button>
              <button type="button" className="outline-btn" onClick={handleCopyLink}>
                Copiar link
              </button>
              <button type="button" className="primary" onClick={handleNativeShare}>
                Compartilhar
              </button>
            </div>
          </section>
        </div>
      )}

      {pendingImport && (() => {
        const existingIds = new Set(data.expenses.map(e => e.id))
        const duplicateCount = pendingImport.items.filter(item => existingIds.has(item.expense.id)).length
        const newCount = pendingImport.items.length - duplicateCount

        return (
          <div
            className={`modal-backdrop ${closingModal === 'quick-import' ? 'is-closing' : ''}`}
            onMouseDown={event => {
              if (event.target === event.currentTarget) onCloseImport()
            }}
          >
            <section className="modal quick-transfer-modal" role="dialog" aria-modal="true" aria-labelledby="quick-import-title">
              <div className="modal-header">
                <div>
                  <span className="eyebrow">RECEBER LANÇAMENTO</span>
                  <h2 id="quick-import-title">
                    {pendingImport.items.length === 1 ? 'Importar este lançamento?' : `Importar ${pendingImport.items.length} lançamentos?`}
                  </h2>
                </div>
                <button type="button" aria-label="Fechar importação" onClick={onCloseImport}>
                  ×
                </button>
              </div>
              <p className="form-help">
                Seus lançamentos atuais serão preservados. Categorias, cartões ou participantes ausentes serão vinculados pelo nome ou criados automaticamente.
              </p>
              <div className="quick-share-summary">
                {pendingImport.items.map(({ expense: exp, categoryName, cardName }) => {
                  const isDup = existingIds.has(exp.id)
                  return (
                    <div className="quick-share-item" key={exp.id}>
                      <div>
                        <b>
                          {exp.description}{' '}
                          {isDup && <span className="quick-dup-badge">Já existe</span>}
                        </b>
                        <small>
                          {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${exp.date}T12:00:00`))}
                          {categoryName ? ` · ${categoryName}` : ''} · {exp.method}
                          {cardName ? ` (${cardName})` : ''}
                          {exp.installments > 1 ? ` · ${exp.installments}x` : ''}
                        </small>
                      </div>
                      <strong>{money(exp.amount)}</strong>
                    </div>
                  )
                })}
              </div>

              {duplicateCount > 0 && (
                <div className="quick-dup-options" role="radiogroup" aria-label="Como tratar lançamentos já existentes">
                  <label className="quick-dup-option">
                    <input
                      type="radio"
                      name="quick-dup-policy"
                      checked={duplicatePolicy === 'skip'}
                      onChange={() => setDuplicatePolicy('skip')}
                    />
                    <span>
                      Ignorar {duplicateCount === 1 ? 'o já existente' : `os ${duplicateCount} já existentes`}
                      {newCount > 0 ? ` e importar ${newCount} novo(s)` : ''}
                    </span>
                  </label>
                  <label className="quick-dup-option">
                    <input
                      type="radio"
                      name="quick-dup-policy"
                      checked={duplicatePolicy === 'update'}
                      onChange={() => setDuplicatePolicy('update')}
                    />
                    <span>Atualizar {duplicateCount === 1 ? 'o existente' : `os ${duplicateCount} existentes`} com estes dados</span>
                  </label>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={onCloseImport}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => onConfirmImport(duplicatePolicy)}
                >
                  {newCount === 0 && duplicatePolicy === 'skip'
                    ? 'Fechar (nada novo)'
                    : 'Confirmar importação'}
                </button>
              </div>
            </section>
          </div>
        )
      })()}

      {pasteImportOpen && (
        <div
          className={`modal-backdrop ${closingModal === 'quick-paste' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setPasteError('')
              onClosePasteImport()
            }
          }}
        >
          <form noValidate className="modal quick-transfer-modal" role="dialog" aria-modal="true" aria-labelledby="quick-paste-title" onSubmit={handlePasteSubmit}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">RECEBER POR LINK OU CÓDIGO</span>
                <h2 id="quick-paste-title">Colar lançamento recebido</h2>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => {
                  setPasteError('')
                  onClosePasteImport()
                }}
              >
                ×
              </button>
            </div>
            <p className="form-help">
              Cole aqui o link completo (<code>#import-tx=...</code>) ou o código enviado de outro dispositivo.
            </p>
            <label className={pasteError ? 'is-invalid' : ''}>
              Link ou código do lançamento
              <textarea
                rows={3}
                placeholder="https://gabs-vicente.github.io/poe-na-conta/#import-tx=..."
                value={pasteInput}
                onChange={e => {
                  setPasteError('')
                  setPasteInput(e.target.value)
                }}
              />
              {pasteError && (
                <small className="field-error-msg" role="alert">
                  {pasteError}
                </small>
              )}
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setPasteError('')
                  onClosePasteImport()
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="primary">
                Validar e importar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
