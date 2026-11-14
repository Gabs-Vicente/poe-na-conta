import type React from 'react'
import { type BackupPayload } from '../../finance'
import {
  blurActiveInputOnTouch,
  dismissKeyboardOnEnter,
  isTouchDevice,
  profileInitials,
} from '../../utils/format'

export type OnboardingStartMode = 'empty' | 'demo' | 'keep'
export type ConfirmDialog = { eyebrow: string; title: string; description: string; confirmLabel: string; onConfirm: () => void }

type AppUtilityModalsProps = {
  closingModal: string | null
  formShake: string | null
  onClearShake: () => void
  confirmDialog: ConfirmDialog | null
  onCloseConfirmDialog: () => void
  pendingBackupImport: BackupPayload | null
  onCloseBackupConfirm: () => void
  onConfirmBackupImport: () => void
  resetDataModalOpen: boolean
  onCloseResetDataModal: () => void
  onConfirmResetAllData: (event: React.FormEvent) => void
  onDownloadBackup: () => void
  resetConfirmText: string
  setResetConfirmText: (value: string) => void
  resetConfirmError: boolean
  setResetConfirmError: (value: boolean) => void
  onboardingOpen: boolean
  onCompleteOnboarding: (event: React.FormEvent) => void
  profilePhoto: string
  profileName: string
  onUpdateProfileName: (name: string) => void
  profilePhotoInputRef: React.RefObject<HTMLInputElement | null>
  onRemoveProfilePhoto: () => void
  profileMessage: string
  theme: 'light' | 'dark'
  onUpdateDefaultTheme: (theme: 'light' | 'dark') => void
  hasExistingData: boolean
  onboardingStartMode: OnboardingStartMode
  setOnboardingStartMode: (mode: OnboardingStartMode) => void
  backupInputRef: React.RefObject<HTMLInputElement | null>
  easterEggOpen: boolean
  onCloseEasterEgg: () => void
  easterEggMessage: string
  setEasterEggMessage: (value: string) => void
  easterEggPassword: string
  setEasterEggPassword: (value: string) => void
  easterEggError: boolean
  setEasterEggError: (value: boolean) => void
  easterEggShake: boolean
  setEasterEggShake: (value: boolean) => void
  easterEggInputRef: React.RefObject<HTMLInputElement | null>
  onSubmitEasterEgg: (event: React.FormEvent) => void
  pwaGuideOpen: boolean
  onClosePwaGuide: () => void
}

export function AppUtilityModals({
  closingModal,
  formShake,
  onClearShake,
  confirmDialog,
  onCloseConfirmDialog,
  pendingBackupImport,
  onCloseBackupConfirm,
  onConfirmBackupImport,
  resetDataModalOpen,
  onCloseResetDataModal,
  onConfirmResetAllData,
  onDownloadBackup,
  resetConfirmText,
  setResetConfirmText,
  resetConfirmError,
  setResetConfirmError,
  onboardingOpen,
  onCompleteOnboarding,
  profilePhoto,
  profileName,
  onUpdateProfileName,
  profilePhotoInputRef,
  onRemoveProfilePhoto,
  profileMessage,
  theme,
  onUpdateDefaultTheme,
  hasExistingData,
  onboardingStartMode,
  setOnboardingStartMode,
  backupInputRef,
  easterEggOpen,
  onCloseEasterEgg,
  easterEggMessage,
  setEasterEggMessage,
  easterEggPassword,
  setEasterEggPassword,
  easterEggError,
  setEasterEggError,
  easterEggShake,
  setEasterEggShake,
  easterEggInputRef,
  onSubmitEasterEgg,
  pwaGuideOpen,
  onClosePwaGuide,
}: AppUtilityModalsProps) {
  return (
    <>
      {confirmDialog && (
        <div
          className={`modal-backdrop ${closingModal === 'confirm' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) onCloseConfirmDialog()
          }}
        >
          <section className="modal confirm-dialog-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
            <div className="modal-header">
              <div>
                <span className="eyebrow">{confirmDialog.eyebrow}</span>
                <h2 id="confirm-dialog-title">{confirmDialog.title}</h2>
              </div>
              <button type="button" aria-label="Fechar confirmação" onClick={onCloseConfirmDialog}>
                ×
              </button>
            </div>
            <p className="confirm-dialog-description">{confirmDialog.description}</p>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={onCloseConfirmDialog}>
                Cancelar
              </button>
              <button type="button" className="danger-btn" onClick={confirmDialog.onConfirm}>
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}

      {pendingBackupImport && (
        <div
          className={`modal-backdrop ${closingModal === 'backup' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) onCloseBackupConfirm()
          }}
        >
          <section className="modal backup-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="backup-confirm-title">
            <div className="modal-header">
              <div>
                <span className="eyebrow">SEUS DADOS</span>
                <h2 id="backup-confirm-title">Importar backup?</h2>
              </div>
              <button type="button" aria-label="Fechar" onClick={onCloseBackupConfirm}>
                ×
              </button>
            </div>
            <p>Esta ação vai substituir os dados salvos neste navegador.</p>
            {pendingBackupImport.preferences && (
              <p>O arquivo também contém suas preferências, como tema, tela inicial, limite mensal e perfil.</p>
            )}
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={onCloseBackupConfirm}>
                Cancelar
              </button>
              <button type="button" className="primary" onClick={onConfirmBackupImport}>
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
            if (event.target === event.currentTarget) onCloseResetDataModal()
          }}
        >
          <form
            noValidate
            className={`modal reset-data-modal ${formShake === 'reset' ? 'is-shaking' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-data-title"
            onSubmit={onConfirmResetAllData}
            onAnimationEnd={event => {
              if (event.animationName === 'nexus-modal-shake') onClearShake()
            }}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">ZONA DE SEGURANÇA</span>
                <h2 id="reset-data-title">Excluir todos os dados?</h2>
              </div>
              <button type="button" aria-label="Fechar confirmação de exclusão" onClick={onCloseResetDataModal}>
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
            <button type="button" className="outline-btn reset-backup-shortcut" onClick={onDownloadBackup}>
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
              <button type="button" className="cancel-btn" onClick={onCloseResetDataModal}>
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
          <form noValidate className="modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" onSubmit={onCompleteOnboarding}>
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
                    onChange={event => onUpdateProfileName(event.target.value)}
                  />
                </label>
                <div className="profile-photo-actions">
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => {
                      blurActiveInputOnTouch()
                      profilePhotoInputRef.current?.click()
                    }}
                  >
                    {profilePhoto ? 'Trocar foto' : 'Adicionar foto'}
                  </button>
                  {profilePhoto && (
                    <button type="button" className="text-btn" onClick={onRemoveProfilePhoto}>
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
                    onUpdateDefaultTheme('light')
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
                    onUpdateDefaultTheme('dark')
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
              <button type="button" className="outline-btn" onClick={() => backupInputRef.current?.click()}>
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
            if (event.target === event.currentTarget) onCloseEasterEgg()
          }}
        >
          {easterEggMessage ? (
            <section className="modal easter-egg-modal is-revealed" role="dialog" aria-modal="true" aria-labelledby="easter-egg-title">
              <div className="modal-header">
                <div>
                  <span className="eyebrow">SEGREDO DESBLOQUEADO</span>
                  <h2 id="easter-egg-title">Mensagem secreta</h2>
                </div>
                <button type="button" aria-label="Fechar" onClick={onCloseEasterEgg}>
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
                <button type="button" className="primary" onClick={onCloseEasterEgg}>
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
              onSubmit={onSubmitEasterEgg}
              onAnimationEnd={event => {
                if (event.animationName === 'nexus-modal-shake') setEasterEggShake(false)
              }}
            >
              <div className="modal-header">
                <div>
                  <span className="eyebrow">SEGREDO DESBLOQUEADO</span>
                  <h2 id="easter-egg-title">Digite a senha</h2>
                </div>
                <button type="button" aria-label="Fechar" onClick={onCloseEasterEgg}>
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
                <button type="button" className="cancel-btn" onClick={onCloseEasterEgg}>
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

      {pwaGuideOpen && (
        <div
          className={`modal-backdrop ${closingModal === 'pwa-guide' ? 'is-closing' : ''}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) onClosePwaGuide()
          }}
        >
          <section className="modal pwa-guide-modal" role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title">
            <div className="modal-header">
              <div>
                <span className="eyebrow">APLICATIVO NA TELA INICIAL</span>
                <h2 id="pwa-guide-title">Como instalar o Põe na Conta</h2>
              </div>
              <button type="button" aria-label="Fechar instruções" onClick={onClosePwaGuide}>
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
              <button type="button" className="primary" onClick={onClosePwaGuide}>
                Entendi
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
