const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (base64Url: string): Uint8Array => {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export const QR_SAFE_MAX_LENGTH = 2200

export const encodeBackupTransferToken = async (backupJson: string): Promise<string> => {
  const bytes = new TextEncoder().encode(backupJson)
  if (typeof CompressionStream !== 'undefined') {
    const compressedStream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
    const compressed = new Uint8Array(await new Response(compressedStream).arrayBuffer())
    return `gz:${toBase64Url(compressed)}`
  }
  return `raw:${toBase64Url(bytes)}`
}

export const extractBackupTokenFromText = (rawInput: string): string => {
  const trimmed = rawInput.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('{')) return trimmed
  const hashIdx = trimmed.indexOf('#backup=')
  if (hashIdx !== -1) {
    return decodeURIComponent(trimmed.slice(hashIdx + '#backup='.length).split('&')[0])
  }
  const queryIdx = trimmed.indexOf('?backup=')
  if (queryIdx !== -1) {
    return decodeURIComponent(trimmed.slice(queryIdx + '?backup='.length).split('&')[0].split('#')[0])
  }
  if (trimmed.startsWith('backup=')) {
    return decodeURIComponent(trimmed.slice('backup='.length).split('&')[0])
  }
  return trimmed
}

export const decodeBackupTransferText = async (rawInput: string): Promise<string | null> => {
  const token = extractBackupTokenFromText(rawInput)
  if (!token) return null
  if (token.startsWith('{')) return token

  try {
    if (token.startsWith('gz:')) {
      if (typeof DecompressionStream === 'undefined') return null
      const bytes = fromBase64Url(token.slice(3))
      const copy = new Uint8Array(bytes.length)
      copy.set(bytes)
      const decompressedStream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('gzip'))
      const decompressed = new Uint8Array(await new Response(decompressedStream).arrayBuffer())
      return new TextDecoder().decode(decompressed)
    }
    if (token.startsWith('raw:')) {
      const bytes = fromBase64Url(token.slice(4))
      return new TextDecoder().decode(bytes)
    }
  } catch {
    return null
  }
  return null
}

export const buildBackupTransferUrl = (token: string): string => {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#backup=${encodeURIComponent(token)}`
}
