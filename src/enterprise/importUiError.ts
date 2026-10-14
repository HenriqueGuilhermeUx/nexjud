/** Map only HTTP status to a safe user message; never expose internal SQL or JWT errors. */
export function enterpriseImportErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null || !("context" in error)) {
    return "Não foi possível confirmar a importação. Confira sua conexão antes de tentar novamente com a mesma chave."
  }
  const context = error.context
  if (typeof context !== "object" || context === null || !("status" in context) ||
      typeof context.status !== "number") {
    return "Falha de conexão com o serviço de importação. Nenhum sucesso foi confirmado."
  }
  switch (context.status) {
    case 400:
      return "Os dados foram recusados. Revise o CSV, a chave e os identificadores dos processos."
    case 401:
      return "Sua sessão não está autorizada. Faça login novamente antes de importar."
    case 403:
      return "Você não tem permissão para importar nesta organização. Solicite acesso ao administrador."
    case 404:
      return "A importação empresarial ainda não está habilitada neste ambiente."
    case 409:
      return "Conflito: esta chave ou identificador já foi usado. Confira a carteira antes de iniciar outro lote."
    case 413:
      return "O lote ultrapassa o tamanho permitido. Separe os processos em lotes menores."
    case 429:
      return "Muitas solicitações. Tente novamente mais tarde, usando a mesma chave para evitar duplicações."
    case 503:
      return "O serviço de importação está temporariamente indisponível. Use a mesma chave ao tentar novamente para evitar duplicações."
    default:
      return "A importação não foi confirmada. Preserve a chave atual e consulte a carteira antes de tentar novamente."
  }
}
