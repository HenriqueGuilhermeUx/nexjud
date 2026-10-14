export type EnterpriseImportErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "IDEMPOTENCY_CONFLICT"
  | "TEMPORARILY_UNAVAILABLE"

const STATUS: Record<EnterpriseImportErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INVALID_REQUEST: 400,
  IDEMPOTENCY_CONFLICT: 409,
  TEMPORARILY_UNAVAILABLE: 503,
}

const PUBLIC_MESSAGE: Record<EnterpriseImportErrorCode, string> = {
  UNAUTHENTICATED: "Autenticação obrigatória.",
  FORBIDDEN: "Operação não autorizada.",
  INVALID_REQUEST: "Dados de importação inválidos.",
  IDEMPOTENCY_CONFLICT: "Chave de idempotência já utilizada com conteúdo diferente.",
  TEMPORARILY_UNAVAILABLE: "Serviço temporariamente indisponível.",
}

export function publicImportError(code: EnterpriseImportErrorCode): {
  status: number
  body: { error: { code: EnterpriseImportErrorCode; message: string } }
} {
  return { status: STATUS[code], body: { error: { code, message: PUBLIC_MESSAGE[code] } } }
}
