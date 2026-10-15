import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getSupabase } from "@/lib/supabase"
import { MAX_IMPORT_BYTES, parseEnterpriseCsv, type EnterpriseCsvItem } from "@/enterprise/csvImport"
import EnterpriseImportedCases from "@/components/EnterpriseImportedCases"
import EnterpriseImportHistory from "@/components/EnterpriseImportHistory"
import { enterpriseImportErrorMessage } from "@/enterprise/importUiError"

type Organization = { id: string; name: string; role: "owner" | "admin" | "legal" }
type AccessState = "loading" | "ready" | "empty" | "unavailable"
const importRoles = ["owner", "admin", "legal"] as const

export default function EnterpriseImport({ mode = "web" }: { mode?: "web" | "pwa" }) {
  const [organizationId, setOrganizationId] = useState("")
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [accessState, setAccessState] = useState<AccessState>("loading")
  const [key, setKey] = useState("")
  const [text, setText] = useState("")
  const [fileName, setFileName] = useState("")
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [result, setResult] = useState("")
  const [items, setItems] = useState<EnterpriseCsvItem[]>([])
  const [ready, setReady] = useState(false)
  const [completed, setCompleted] = useState(false)
  const returnTo = mode === "pwa" ? "/app" : "/dashboard/enterprise-command-center"
  const casesTo = mode === "pwa" ? "/app/casos" : "/dashboard/legal-cases"

  useEffect(() => {
    let cancelled = false
    async function loadOrganizations() {
      try {
        const client = getSupabase()
        const { data: identity, error: identityError } = await client.auth.getUser()
        if (identityError || !identity.user) throw new Error("Sessão não autenticada.")
        const { data: memberships, error: membershipError } = await client
          .from("enterprise_memberships")
          .select("organization_id, role")
          .eq("user_id", identity.user.id)
          .in("role", [...importRoles])
        if (membershipError) throw membershipError
        const permitted = (memberships || []).filter(
          (m): m is { organization_id: string; role: Organization["role"] } =>
            typeof m.organization_id === "string" &&
            importRoles.includes(m.role as Organization["role"])
        )
        if (!permitted.length) {
          if (!cancelled) { setOrganizations([]); setOrganizationId(""); setAccessState("empty") }
          return
        }
        const { data: names, error: namesError } = await client
          .from("enterprise_organizations")
          .select("id, name")
          .in("id", permitted.map(m => m.organization_id))
        if (namesError) throw namesError
        const eligible: Organization[] = (names || [])
          .filter(o => typeof o.id === "string" && typeof o.name === "string")
          .map(o => ({
            id: o.id as string,
            name: o.name as string,
            role: permitted.find(m => m.organization_id === o.id)!.role,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        if (!cancelled) {
          setOrganizations(eligible)
          setOrganizationId(eligible.length === 1 ? eligible[0].id : "")
          setAccessState(eligible.length ? "ready" : "empty")
        }
      } catch {
        if (!cancelled) { setOrganizations([]); setOrganizationId(""); setAccessState("unavailable") }
      }
    }
    void loadOrganizations()
    return () => { cancelled = true }
  }, [])

  function invalidate() {
    setItems([])
    setReady(false)
    setCompleted(false)
    setResult("")
  }
  async function selectFile(file: File | undefined) {
    invalidate()
    if (!file) return
    if (file.size > MAX_IMPORT_BYTES) {
      setResult("Arquivo grande demais. Divida em lotes de até 512 KB.")
      return
    }
    setReading(true)
    try {
      const content = await file.text()
      if (new TextEncoder().encode(content).byteLength > MAX_IMPORT_BYTES) {
        setResult("Arquivo grande demais. Divida a importação.")
        return
      }
      setText(content)
      setFileName(file.name)
    } catch {
      setResult("Não foi possível ler o CSV. Selecione outro arquivo.")
    } finally { setReading(false) }
  }
  function preview() {
    invalidate()
    const parsed = parseEnterpriseCsv(text)
    if ("error" in parsed) {
      setResult(parsed.error)
      return
    }
    setItems(parsed.items)
    setReady(true)
  }
  async function submit() {
    if (!ready || !items.length || busy || reading) return
    if (accessState !== "ready" || !organizations.some(org => org.id === organizationId)) {
      setResult("Selecione uma organização autorizada.")
      return
    }
    if (!key.trim() || key.length > 128) {
      setResult("Informe uma chave de importação de até 128 caracteres.")
      return
    }
    const payload = { organizationId, idempotencyKey: key, items }
    if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > MAX_IMPORT_BYTES) {
      setResult("Lote muito grande. Divida a importação em arquivos menores.")
      return
    }
    setBusy(true)
    setCompleted(false)
    setResult("")
    try {
      const client = getSupabase()
      const { data: session, error: sessionError } = await client.auth.getSession()
      if (sessionError || !session.session?.access_token) throw new Error("Faça login novamente.")
      const { data, error } = await client.functions.invoke("enterprise-case-import", { body: payload })
      if (error) throw new Error(enterpriseImportErrorMessage(error))
      if (!data || !["created", "already_processed"].includes(data.status)) {
        throw new Error("Resposta inesperada da importação.")
      }
      setCompleted(true)
      setResult(data.status === "created"
        ? "Lote aceito. Consulte os casos vinculados à sua conta para confirmar a disponibilidade."
        : "Lote já processado. Nenhum item foi duplicado.")
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Falha ao importar.")
    } finally { setBusy(false) }
  }

  return <main className={mode === "pwa" ? "w-full py-6 text-slate-100" : "mx-auto max-w-3xl px-4 py-8 text-slate-100"}>
    <Link to={returnTo} className="text-indigo-300 underline">{mode === "pwa" ? "Voltar ao início" : "Voltar ao centro empresarial"}</Link>
    <h1 className="mt-5 text-3xl font-bold">Importação empresarial</h1>
    <p className="mt-2 text-sm text-slate-300">Importe até 500 processos por lote, com autorização por organização e auditoria. O serviço depende de habilitação do ambiente empresarial.</p>
    <div className="mt-6 space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <label className="block text-sm">Organização autorizada
        <select value={organizationId} onChange={event => { setOrganizationId(event.target.value); invalidate() }}
          disabled={accessState !== "ready" || busy}
          className="mt-1 w-full rounded-lg bg-slate-800 p-3 text-slate-100 disabled:opacity-50">
          <option value="">Selecione sua organização</option>
          {organizations.map(org => <option key={org.id} value={org.id}>{org.name} · {org.role}</option>)}
        </select>
      </label>
      {accessState === "loading" && <p role="status" className="text-sm text-slate-300">Verificando permissões da organização...</p>}
      {accessState === "empty" && <p role="status" className="text-sm text-amber-300">Sua conta não possui organização com permissão de importação.</p>}
      {accessState === "unavailable" && <p role="alert" className="text-sm text-amber-300">Ambiente empresarial ainda indisponível. Nenhum dado foi enviado.</p>}
      <label className="block text-sm">Chave única da importação
        <input value={key} onChange={event => { setKey(event.target.value); invalidate() }} maxLength={128} disabled={busy || reading}
          className="mt-1 w-full rounded-lg bg-slate-800 p-3" placeholder="ex.: carteira-outubro-2026" />
      </label>
      <label className="block text-sm">Escolha um arquivo CSV
        <input type="file" accept=".csv,text/csv" disabled={busy || reading}
          onChange={event => { void selectFile(event.target.files?.[0]); event.target.value = "" }}
          className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-sm" />
      </label>
      {fileName && <p className="text-xs text-slate-300">Arquivo selecionado: {fileName}</p>}
      <label className="block text-sm">Ou cole o CSV simples
        <textarea value={text} onChange={event => { setText(event.target.value); setFileName(""); invalidate() }}
          rows={7} disabled={busy || reading} className="mt-1 w-full rounded-lg bg-slate-800 p-3 font-mono text-xs disabled:opacity-50"
          placeholder={"externalId,sourceSystem,cnjDigits\nprocesso-1,crm,00000000002026826000"} />
      </label>
      <p className="text-xs text-slate-400">Cabeçalho obrigatório: externalId,sourceSystem,cnjDigits. Não suporta campos com vírgulas internas.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={preview} disabled={busy || reading}
          className="rounded-lg bg-slate-700 px-5 py-3 font-semibold disabled:opacity-40">
          {reading ? "Lendo arquivo..." : "Validar e pré-visualizar"}
        </button>
        <button type="button" onClick={submit}
          disabled={!ready || !organizationId || accessState !== "ready" || busy || reading}
          className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold disabled:opacity-40">
          {busy ? "Enviando..." : "Enviar lote"}
        </button>
      </div>
      {ready && <div role="status" className="space-y-2 text-sm text-emerald-300">
        <p>{items.length} processo(s) válido(s). Confira a prévia:</p>
        <div className="max-h-40 overflow-auto rounded-lg bg-slate-800 p-3 text-xs text-slate-200">
          {items.slice(0, 5).map((item, idx) =>
            <p key={idx} className="break-all py-1">{item.cnjDigits} · {item.sourceSystem} / {item.externalId}</p>
          )}
          {items.length > 5 && <p>…e mais {items.length - 5} processo(s)</p>}
        </div>
      </div>}
      {result && <p role={completed ? "status" : "alert"} className="rounded-lg bg-slate-800 p-3 text-sm">{result}</p>}
      {completed && <Link to={casesTo} className="inline-block text-indigo-200 underline">Conferir meus casos jurídicos</Link>}
      {accessState === "ready" && organizationId && <EnterpriseImportedCases organizationId={organizationId} mode={mode} refresh={completed} />}
      {accessState === "ready" && organizationId && <EnterpriseImportHistory organizationId={organizationId} refresh={completed} />}
    </div>
  </main>
}
