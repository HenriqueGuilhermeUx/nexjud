import { useState } from "react"
import { Link } from "react-router-dom"
import { getSupabase } from "@/lib/supabase"

type Item = { externalId: string; sourceSystem: string; cnjDigits: string }
const normalize = (value: string) => value.replace(/\D/g, "")
export default function EnterpriseImport() {
  const [organizationId, setOrganizationId] = useState("")
  const [key, setKey] = useState("")
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState("")
  const [items, setItems] = useState<Item[]>([])
  const [ready, setReady] = useState(false)
  function preview() {
    setResult("")
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length < 2 || lines.length > 501) { setResult("Informe cabeçalho e até 500 linhas."); return }
    const header = lines.shift()?.toLowerCase().replaceAll(" ", "")
    if (header !== "externalid,sourcesystem,cnjdigits") {
      setResult("Cabeçalho obrigatório: externalId,sourceSystem,cnjDigits")
      return
    }
    const parsed = lines.map(line => line.split(",").map(v => v.trim())).map(([externalId, sourceSystem, cnjDigits]) =>
      ({ externalId, sourceSystem, cnjDigits: normalize(cnjDigits || "") }))
    if (parsed.some((v, i) => lines[i].split(",").length !== 3 || !v.externalId || !v.sourceSystem || !/^\d{20}$/.test(v.cnjDigits))) {
      setResult("CSV inválido: confira as três colunas e os 20 dígitos CNJ.")
      return
    }
    setItems(parsed)
    setReady(true)
  }
  async function submit() {
    if (!ready || !items.length || busy) return
    if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !key.trim()) {
      setResult("Informe o ID da organização e a chave de importação.")
      return
    }
    setBusy(true)
    setResult("")
    try {
      const client = getSupabase()
      const { data: session, error: sessionError } = await client.auth.getSession()
      if (sessionError || !session.session?.access_token) throw new Error("Faça login novamente.")
      const { data, error } = await client.functions.invoke("enterprise-case-import", {
        body: { organizationId, idempotencyKey: key, items },
      })
      if (error) throw new Error("Importação indisponível ou não autorizada. Nenhum sucesso foi confirmado.")
      if (!data || !["created", "already_processed"].includes(data.status)) throw new Error("Resposta inesperada da importação.")
      setResult(data.status === "created" ? "Lote registrado. A vinculação aos casos jurídicos ainda depende da integração." : "Lote já processado; nenhum item duplicado.")
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Falha ao importar.")
    } finally { setBusy(false) }
  }
  return <main className="mx-auto max-w-3xl px-4 py-8 text-slate-100">
    <Link to="/dashboard/enterprise-command-center" className="text-indigo-300 underline">Voltar ao centro empresarial</Link>
    <h1 className="mt-5 text-3xl font-bold">Importação empresarial</h1>
    <p className="mt-2 text-sm text-slate-300">Web, aplicativo e PWA. Pré-visualize o lote antes de enviar. Disponível somente após habilitação do ambiente empresarial.</p>
    <div className="mt-6 space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <label className="block text-sm">ID da organização
        <input value={organizationId} onChange={e => setOrganizationId(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-800 p-3" placeholder="UUID fornecido pelo administrador" />
      </label>
      <label className="block text-sm">Chave única da importação
        <input value={key} onChange={e => setKey(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-800 p-3" placeholder="ex.: carteira-outubro-2026" />
      </label>
      <label className="block text-sm">CSV (até 500 processos por lote)
        <textarea value={text} onChange={e => { setText(e.target.value); setReady(false) }} rows={8} className="mt-1 w-full rounded-lg bg-slate-800 p-3 font-mono text-xs" placeholder={"externalId,sourceSystem,cnjDigits\nprocesso-1,crm,00000000002026826000"} />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={preview} className="rounded-lg bg-slate-700 px-5 py-3 font-semibold">Validar e pré-visualizar</button>
        <button type="button" onClick={submit} disabled={!ready || busy} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold disabled:opacity-40">{busy ? "Enviando..." : "Enviar lote"}</button>
      </div>
      {ready && <p role="status" className="text-emerald-300">{items.length} processo(s) válidos para envio.</p>}
      {result && <p role="alert" className="rounded-lg bg-slate-800 p-3 text-sm">{result}</p>}
    </div>
  </main>
}
