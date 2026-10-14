import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getSupabase } from "@/lib/supabase"

type Item = { externalId: string; sourceSystem: string; cnjDigits: string }
type Organization = { id: string; name: string; role: "owner" | "admin" | "legal" }
type AccessState = "loading" | "ready" | "empty" | "unavailable"
const normalize = (value: string) => value.replace(/\D/g, "")
const importRoles = ["owner", "admin", "legal"] as const

export default function EnterpriseImport() {
  const [organizationId, setOrganizationId] = useState("")
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [accessState, setAccessState] = useState<AccessState>("loading")
  const [key, setKey] = useState("")
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState("")
  const [items, setItems] = useState<Item[]>([])
  const [ready, setReady] = useState(false)

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

  function preview() {
    setReady(false)
    setItems([])
    setResult("")
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length < 2 || lines.length > 501) {
      setResult("Informe um cabeçalho e de 1 a 500 linhas.")
      return
    }
    const header = (lines.shift() || "").toLowerCase().replace(/\s/g, "")
    if (header !== "externalid,sourcesystem,cnjdigits") {
      setResult("Cabeçalho obrigatório: externalId,sourceSystem,cnjDigits")
      return
    }
    const parsed = lines.map(line => line.split(",").map(value => value.trim()))
    if (parsed.some(row => row.length !== 3)) {
      setResult("CSV inválido: use três colunas separadas por vírgulas e sem campos com vírgulas internas.")
      return
    }
    const selected = parsed.map(([externalId, sourceSystem, cnjDigits]) => ({
      externalId, sourceSystem, cnjDigits: normalize(cnjDigits || ""),
    }))
    if (selected.some(item => !item.externalId || item.externalId.length > 160 ||
      !item.sourceSystem || item.sourceSystem.length > 160 ||
      !/^\d{20}$/.test(item.cnjDigits))) {
      setResult("CSV inválido: verifique identificador, sistema de origem e número CNJ de 20 dígitos.")
      return
    }
    setItems(selected)
    setReady(true)
  }

  async function submit() {
    if (!ready || !items.length || busy) return
    if (accessState !== "ready" || !organizations.some(org => org.id === organizationId)) {
      setResult("Selecione uma organização autorizada.")
      return
    }
    if (!key.trim() || key.length > 128) {
      setResult("Informe uma chave de importação de até 128 caracteres.")
      return
    }
    const payload = { organizationId, idempotencyKey: key, items }
    if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > 512_000) {
      setResult("Lote muito grande. Divida a importação em arquivos menores.")
      return
    }
    setBusy(true)
    setResult("")
    try {
      const client = getSupabase()
      const { data: session, error: sessionError } = await client.auth.getSession()
      if (sessionError || !session.session?.access_token) throw new Error("Faça login novamente.")
      const { data, error } = await client.functions.invoke("enterprise-case-import", { body: payload })
      if (error) throw new Error("Importação indisponível ou não autorizada. Nenhum sucesso foi confirmado.")
      if (!data || !["created", "already_processed"].includes(data.status)) {
        throw new Error("Resposta inesperada da importação.")
      }
      setResult(data.status === "created"
        ? "Lote registrado. A vinculação aos casos jurídicos ainda depende da integração."
        : "Lote já processado; nenhum item duplicado.")
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Falha ao importar.")
    } finally { setBusy(false) }
  }

  return <main className="mx-auto max-w-3xl px-4 py-8 text-slate-100">
    <Link to="/dashboard/enterprise-command-center" className="text-indigo-300 underline">Voltar ao centro empresarial</Link>
    <h1 className="mt-5 text-3xl font-bold">Importação empresarial</h1>
    <p className="mt-2 text-sm text-slate-300">Web, aplicativo e PWA. Pré-visualize até 500 processos antes de enviar. A função só estará disponível em organizações habilitadas.</p>
    <div className="mt-6 space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <label className="block text-sm">Organização autorizada
        <select value={organizationId} onChange={event => { setOrganizationId(event.target.value); setReady(false) }}
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
        <input value={key} onChange={event => setKey(event.target.value)} maxLength={128}
          className="mt-1 w-full rounded-lg bg-slate-800 p-3" placeholder="ex.: carteira-outubro-2026" />
      </label>
      <label className="block text-sm">CSV simples (até 500 processos por lote)
        <textarea value={text} onChange={event => { setText(event.target.value); setReady(false) }}
          rows={8} className="mt-1 w-full rounded-lg bg-slate-800 p-3 font-mono text-xs"
          placeholder={"externalId,sourceSystem,cnjDigits\nprocesso-1,crm,00000000002026826000"} />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={preview} disabled={busy}
          className="rounded-lg bg-slate-700 px-5 py-3 font-semibold disabled:opacity-40">Validar e pré-visualizar</button>
        <button type="button" onClick={submit}
          disabled={!ready || !organizationId || accessState !== "ready" || busy}
          className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold disabled:opacity-40">
          {busy ? "Enviando..." : "Enviar lote"}
        </button>
      </div>
      {ready && <p role="status" className="text-emerald-300">{items.length} processo(s) válido(s) para envio.</p>}
      {result && <p role="alert" className="rounded-lg bg-slate-800 p-3 text-sm">{result}</p>}
    </div>
  </main>
}
