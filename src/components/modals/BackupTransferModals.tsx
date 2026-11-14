import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { createBackup, parseBackupFile, type BackupPayload, type BackupPreferences, type Data } from '../../finance'
import {
  buildBackupTransferUrl,
  decodeBackupTransferText,
  encodeBackupTransferToken,
  QR_SAFE_MAX_LENGTH,
} from '../../utils/backupTransfer'

type BackupTransferSendModalProps = {
  open: boolean
  closing: boolean
  data: Data
  preferences: BackupPreferences
  onClose: () => void
  onToast: (message: string) => void
}

export function BackupTransferSendModal({
  open,
  closing,
  data,
  preferences,
  onClose,
  onToast,
}: BackupTransferSendModalProps) {
  const [includePhoto, setIncludePhoto] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [transferUrl, setTransferUrl] = useState<string>('')
  const [tooLargeForQr, setTooLargeForQr] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const prefKey = `${preferences.monthlyLimit}|${preferences.limitNoticePercent}|${preferences.defaultView}|${preferences.theme}|${preferences.profileName || ''}|${preferences.profilePhoto || ''}|${preferences.pixKey || ''}`

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const generate = async () => {
      try {
        setGenerating(true)
        setError('')
        const effectivePrefs: BackupPreferences = includePhoto
          ? preferences
          : { ...preferences, profilePhoto: '' }
        const json = createBackup(data, effectivePrefs)
        const token = await encodeBackupTransferToken(json)
        const url = buildBackupTransferUrl(token)
        if (cancelled) return
        setTransferUrl(url)

        if (url.length > QR_SAFE_MAX_LENGTH) {
          setTooLargeForQr(true)
          setQrDataUrl('')
          return
        }

        setTooLargeForQr(false)
        const dataUrl = await QRCode.toDataURL(url, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: 'L',
          color: { dark: '#171a13', light: '#ffffff' },
        })
        if (!cancelled) setQrDataUrl(dataUrl)
      } catch {
        if (!cancelled) setError('Não foi possível gerar o QR Code neste navegador.')
      } finally {
        if (!cancelled) setGenerating(false)
      }
    }
    void generate()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, includePhoto, data, prefKey])

  if (!open) return null

  const copyLink = async () => {
    if (!transferUrl) return
    try {
      await navigator.clipboard.writeText(transferUrl)
      onToast('Link de transferência copiado! Cole no WhatsApp ou no outro aparelho.')
    } catch {
      onToast('Não foi possível copiar automaticamente.')
    }
  }

  const shareLink = async () => {
    if (!transferUrl || typeof navigator.share !== 'function') return
    try {
      await navigator.share({
        title: 'Backup — Põe na Conta',
        text: 'Abra este link no outro aparelho para importar seus dados do Põe na Conta:',
        url: transferUrl,
      })
    } catch {
      // Usuário cancelou o compartilhamento nativo
    }
  }

  return (
    <div
      className={`modal-backdrop ${closing ? 'is-closing' : ''}`}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal transfer-modal" role="dialog" aria-modal="true" aria-labelledby="transfer-send-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow">SINCRONIZAR APARELHOS</span>
            <h2 id="transfer-send-title">Enviar para outro aparelho</h2>
          </div>
          <button type="button" aria-label="Fechar envio" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="form-help participant-modal-help">
          No celular, abra o <b>Põe na Conta</b> em <b>Ajustes → Ler QR Code</b> e aponte a câmera para o código abaixo.
        </p>

        {error && (
          <div className="transfer-alert" role="alert">
            {error}
          </div>
        )}

        {!error && generating && !qrDataUrl && !tooLargeForQr && (
          <div className="transfer-alert">Gerando QR Code...</div>
        )}

        {!error && tooLargeForQr && (
          <div className="transfer-alert">
            Seus dados ficaram grandes demais para caber em um único QR Code. Use o botão <b>Copiar link</b> abaixo e envie pelo WhatsApp/Telegram!
          </div>
        )}

        {!error && !tooLargeForQr && qrDataUrl && (
          <div className="qr-preview-box">
            <img src={qrDataUrl} alt="QR Code com backup do Põe na Conta" width={240} height={240} />
          </div>
        )}

        {Boolean(preferences.profilePhoto) && (
          <label className="transfer-checkbox">
            <input
              type="checkbox"
              checked={includePhoto}
              onChange={e => setIncludePhoto(e.target.checked)}
            />
            <span>Incluir foto de perfil (pode deixar o código grande demais para QR)</span>
          </label>
        )}

        <div className="transfer-actions-row">
          <button type="button" className="outline-btn" onClick={copyLink} disabled={!transferUrl}>
            🔗 Copiar link de transferência
          </button>
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button type="button" className="outline-btn" onClick={shareLink} disabled={!transferUrl}>
              📤 Compartilhar link
            </button>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="primary" onClick={onClose}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  )
}

type BackupTransferScanModalProps = {
  open: boolean
  closing: boolean
  onClose: () => void
  onBackupDecoded: (payload: BackupPayload) => void
}

export function BackupTransferScanModal({
  open,
  closing,
  onClose,
  onBackupDecoded,
}: BackupTransferScanModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraError, setCameraError] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [manualText, setManualText] = useState('')
  const [scanFeedback, setScanFeedback] = useState('')

  const handleClose = () => {
    setCameraActive(false)
    setCameraError('')
    setScanFeedback('')
    onClose()
  }

  useEffect(() => {
    if (!open) return

    let stopped = false
    let stream: MediaStream | null = null
    let timerId: number | null = null

    const handleDetectedText = async (rawText: string) => {
      const jsonText = await decodeBackupTransferText(rawText)
      if (!jsonText) {
        if (!stopped) setScanFeedback('QR Code lido, mas não contém um backup válido do Põe na Conta.')
        return false
      }
      const parsed = parseBackupFile(jsonText)
      if (!parsed) {
        if (!stopped) setScanFeedback('O backup encontrado está incompleto ou em formato incompatível.')
        return false
      }
      stopped = true
      onBackupDecoded(parsed)
      return true
    }

    const startCamera = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Câmera não disponível neste navegador. Você pode colar o link de transferência abaixo.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (stopped) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setCameraActive(true)
        setCameraError('')

        timerId = window.setInterval(() => {
          if (stopped) return
          const currentVideo = videoRef.current
          const canvas = canvasRef.current
          if (!currentVideo || !canvas || currentVideo.readyState < 2) return
          const w = currentVideo.videoWidth
          const h = currentVideo.videoHeight
          if (!w || !h) return
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) return
          ctx.drawImage(currentVideo, 0, 0, w, h)
          const imageData = ctx.getImageData(0, 0, w, h)
          const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' })
          if (code?.data) {
            void handleDetectedText(code.data)
          }
        }, 180)
      } catch {
        if (!stopped) {
          setCameraError('Sem acesso à câmera. Permita a câmera no navegador ou cole o link de transferência abaixo.')
        }
      }
    }

    void startCamera()

    return () => {
      stopped = true
      if (timerId !== null) window.clearInterval(timerId)
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [open, onBackupDecoded])

  if (!open) return null

  const handleManualImport = async () => {
    setScanFeedback('')
    const jsonText = await decodeBackupTransferText(manualText)
    if (!jsonText) {
      setScanFeedback('Cole o link completo (#backup=...) ou o conteúdo JSON do backup.')
      return
    }
    const parsed = parseBackupFile(jsonText)
    if (!parsed) {
      setScanFeedback('Não foi possível validar esse backup.')
      return
    }
    setManualText('')
    onBackupDecoded(parsed)
  }

  return (
    <div
      className={`modal-backdrop ${closing ? 'is-closing' : ''}`}
      onMouseDown={event => {
        if (event.target === event.currentTarget) handleClose()
      }}
    >
      <div className="modal transfer-modal" role="dialog" aria-modal="true" aria-labelledby="transfer-scan-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow">RECEBER DADOS</span>
            <h2 id="transfer-scan-title">Ler QR Code ou colar link</h2>
          </div>
          <button type="button" aria-label="Fechar leitor" onClick={handleClose}>
            ×
          </button>
        </div>

        {!cameraError ? (
          <div className="qr-scanner-frame">
            <video ref={videoRef} playsInline muted autoPlay />
            <canvas ref={canvasRef} hidden />
            <div className="qr-scanner-reticle" aria-hidden="true" />
            {!cameraActive && <span className="qr-scanner-loading">Iniciando câmera...</span>}
          </div>
        ) : (
          <div className="transfer-alert" role="note">
            {cameraError}
          </div>
        )}

        {scanFeedback && (
          <div className="transfer-alert is-error" role="alert">
            {scanFeedback}
          </div>
        )}

        <label className="transfer-paste-label">
          Ou cole aqui o link de transferência
          <div className="transfer-paste-row">
            <input
              type="text"
              placeholder="Cole o link (#backup=...) ou código"
              value={manualText}
              onChange={e => {
                setScanFeedback('')
                setManualText(e.target.value)
              }}
            />
            <button type="button" className="outline-btn" onClick={() => void handleManualImport()} disabled={!manualText.trim()}>
              Carregar
            </button>
          </div>
        </label>

        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={handleClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
