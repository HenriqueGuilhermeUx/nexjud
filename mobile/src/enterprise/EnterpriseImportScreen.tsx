import { useEffect, useState } from "react"
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View,
} from "react-native"
import * as DocumentPicker from "expo-document-picker"
import { File } from "expo-file-system"
import { supabase } from "../lib/supabase"
import { normalizeImportHistory, type ImportBatch } from "./history"
import {
  MAX_ENTERPRISE_CSV_BYTES, parseEnterpriseCsv, utf8ByteLength,
  type EnterpriseImportItem,
} from "./csv"

const colors = {
  bg: "#080A10", card: "#111521", border: "#293147",
  primary: "#4F7CFF", text: "#F8FAFC", muted: "#94A3B8",
  success: "#19C37D", warning: "#F59E0B",
}
type Organization = { id: string; name: string; role: "owner" | "admin" | "legal" }
type CasePreview = { id: string; title: string; process_number: string | null }
type Access = "checking" | "ready" | "empty" | "offline"
const allowedRoles = ["owner", "admin", "legal"] as const

function safeError(error: unknown): string {
  if (typeof error !== "object" || !error || !("context" in error)) {
    return "Importação não confirmada. Verifique seus casos e repita somente com a mesma chave."
  }
  const context = error.context
  const status = context && typeof context === "object" && "status" in context
    ? context.status : null
  switch (status) {
    case 400: return "Dados inválidos. Revise o CSV e os números de processo."
    case 401: return "Sessão expirada. Entre novamente para importar."
    case 403: return "Você não possui permissão de importação nesta empresa."
    case 404: return "Importação empresarial ainda não habilitada neste ambiente."
    case 409: return "Conflito: chave ou processo já utilizado. Consulte os casos antes de reenviar."
    case 413: return "Arquivo maior que o limite. Divida a importação."
    case 503: return "Serviço temporariamente indisponível. Preserve a mesma chave."
    default: return "Importação não confirmada. Preserve a chave e consulte os casos."
  }
}

export default function EnterpriseImportScreen({ navigation }: { navigation: any }) {
  const [userId, setUserId] = useState("")
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationId, setOrganizationId] = useState("")
  const [access, setAccess] = useState<Access>("checking")
  const [csv, setCsv] = useState("")
  const [filename, setFilename] = useState("")
  const [key, setKey] = useState("")
  const [items, setItems] = useState<EnterpriseImportItem[]>([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fileBusy, setFileBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [cases, setCases] = useState<CasePreview[]>([])
  const [caseStatus, setCaseStatus] = useState("")
  const [history, setHistory] = useState<ImportBatch[]>([])
  const [historyStatus, setHistoryStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle")

  function invalidate() {
    setItems([])
    setReady(false)
    setConfirmed(false)
    setNotice("")
  }

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError || !auth.user) throw new Error("auth")
        const uid = auth.user.id
        const { data: memberships, error: membershipsError } = await supabase
          .from("enterprise_memberships")
          .select("organization_id,role")
          .eq("user_id", uid)
          .in("role", [...allowedRoles])
        if (membershipsError) throw membershipsError
        const list = (memberships || []).filter((m): m is {
          organization_id: string; role: Organization["role"]
        } => typeof m.organization_id === "string" &&
          allowedRoles.includes(m.role as Organization["role"]))
        if (!list.length) {
          if (active) { setAccess("empty"); setUserId(uid) }
          return
        }
        const { data: orgs, error: orgError } = await supabase
          .from("enterprise_organizations")
          .select("id,name")
          .in("id", list.map(m => m.organization_id))
        if (orgError) throw orgError
        const eligible: Organization[] = (orgs || [])
          .filter(o => typeof o.id === "string" && typeof o.name === "string")
          .map(o => ({
            id: o.id as string,
            name: o.name as string,
            role: list.find(m => m.organization_id === o.id)!.role,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        if (active) {
          setUserId(uid)
          setOrganizations(eligible)
          setOrganizationId(eligible.length === 1 ? eligible[0].id : "")
          setAccess(eligible.length ? "ready" : "empty")
        }
      } catch {
        if (active) setAccess("offline")
      }
    }
    void load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setCases([])
    setCaseStatus("")
    if (!organizationId || !userId || access !== "ready") return () => { active = false }
    async function loadCases() {
      setCaseStatus("Consultando os processos da sua conta...")
      const { data, error } = await supabase.from("legal_cases")
        .select("id,title,process_number,user_id,metadata")
        .eq("user_id", userId)
        .contains("metadata", { enterpriseImport: { organizationId } })
        .order("created_at", { ascending: false })
        .limit(20)
      if (!active) return
      if (error) {
        setCaseStatus("Processos indisponíveis nesta sessão.")
        return
      }
      const owned: CasePreview[] = (data || []).filter(item => {
        const meta = item.metadata as { enterpriseImport?: { organizationId?: string } } | null
        return item.user_id === userId && meta?.enterpriseImport?.organizationId === organizationId
      }).map(item => ({
        id: item.id as string,
        title: (item.title as string) || "Processo importado",
        process_number: (item.process_number as string | null) || null,
      }))
      setCases(owned)
      setCaseStatus(owned.length ? "" : "Nenhum processo importado encontrado nesta conta.")
    }
    void loadCases()
    return () => { active = false }
  }, [organizationId, userId, access, confirmed])

  // Same read-only, author-scoped RPC as the Web/PWA interface.
  useEffect(() => {
    let active = true
    setHistory([])
    setHistoryStatus("idle")
    if (!organizationId || !userId || access !== "ready") return () => { active = false }
    setHistoryStatus("loading")
    async function loadHistory() {
      try {
        const { data: identity, error: identityError } = await supabase.auth.getUser()
        if (identityError || identity.user?.id !== userId) throw new Error("invalid_session")
        const { data, error } = await supabase.rpc("enterprise_import_history", {
          p_organization: organizationId,
          p_limit: 20,
        })
        if (error) throw error
        const safe = normalizeImportHistory(data)
        if (!safe) throw new Error("unexpected_history")
        if (active) { setHistory(safe); setHistoryStatus("ready") }
      } catch {
        if (active) { setHistory([]); setHistoryStatus("unavailable") }
      }
    }
    void loadHistory()
    return () => { active = false }
  }, [organizationId, userId, access, confirmed])

  async function pickCsv() {
    if (busy || fileBusy) return
    invalidate()
    setFileBusy(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", copyToCacheDirectory: true, multiple: false,
      })
      if (result.canceled) return
      const asset = result.assets[0]
      if (!asset?.name?.toLowerCase().endsWith(".csv")) {
        setNotice("Selecione um arquivo com extensão .csv.")
        return
      }
      if (typeof asset.size === "number" && asset.size > MAX_ENTERPRISE_CSV_BYTES) {
        setNotice("CSV maior que 512 KB. Divida o arquivo.")
        return
      }
      const file = new File(asset.uri)
      try {
        if (file.size > MAX_ENTERPRISE_CSV_BYTES) {
          setNotice("CSV maior que 512 KB. Divida o arquivo.")
          return
        }
        const contents = await file.text()
        if (utf8ByteLength(contents) > MAX_ENTERPRISE_CSV_BYTES) {
          setNotice("CSV maior que 512 KB. Divida o arquivo.")
          return
        }
        setCsv(contents)
        setFilename(asset.name)
      } finally {
        // The picker uses an app-cache copy; avoid retaining legal data on disk.
        try { file.delete() } catch { /* temporary copy cleanup best-effort */ }
      }
    } catch {
      setNotice("Não foi possível ler o CSV. Tente novamente.")
    } finally {
      setFileBusy(false)
    }
  }

  function preview() {
    invalidate()
    const parsed = parseEnterpriseCsv(csv)
    if (!parsed.ok) {
      setNotice(parsed.error)
      return
    }
    setItems(parsed.items)
    setReady(true)
  }

  async function submit() {
    if (!ready || !items.length || busy || fileBusy) return
    if (access !== "ready" || !organizations.some(org => org.id === organizationId)) {
      setNotice("Selecione uma organização em que você pode importar.")
      return
    }
    if (!key.trim() || key.length > 128) {
      setNotice("A chave deve conter de 1 a 128 caracteres.")
      return
    }
    const payload = { organizationId, idempotencyKey: key, items }
    if (utf8ByteLength(JSON.stringify(payload)) > MAX_ENTERPRISE_CSV_BYTES) {
      setNotice("Lote excedeu 512 KB. Separe os processos.")
      return
    }
    setBusy(true)
    setNotice("")
    setConfirmed(false)
    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session.session?.access_token) {
        throw new Error("Faça login novamente antes da importação.")
      }
      const { data, error } = await supabase.functions.invoke("enterprise-case-import", {
        body: payload,
      })
      if (error) throw new Error(safeError(error))
      if (!data || !["created", "already_processed"].includes(data.status) ||
          typeof data.receipt !== "object" || data.receipt === null) {
        throw new Error("Resposta inesperada. Confira seus casos antes de tentar novamente.")
      }
      setConfirmed(true)
      setNotice(data.status === "created"
        ? "Lote registrado. Veja os processos da sua conta abaixo."
        : "Lote já processado: nenhuma duplicação realizada.")
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Importação não confirmada.")
    } finally {
      setBusy(false)
    }
  }

  const canSend = access === "ready" && Boolean(organizationId) && ready && !busy && !fileBusy
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
      <Text style={styles.link}>← Voltar</Text>
    </Pressable>
    <Text style={styles.eyebrow}>NEXJUD ENTERPRISE</Text>
    <Text style={styles.title}>Importar carteira</Text>
    <Text style={styles.subtitle}>Envie processos jurídicos por CSV, com permissão da organização, chave única e rastreabilidade.</Text>
    <View style={styles.card}>
      <Text style={styles.label}>Organização autorizada</Text>
      {access === "checking" && <ActivityIndicator color={colors.primary} />}
      {access === "empty" && <Text style={styles.warning}>Sua conta não possui organização com permissão para importar.</Text>}
      {access === "offline" && <Text style={styles.warning}>Ambiente empresarial ainda indisponível. Nenhum dado foi enviado.</Text>}
      {organizations.map(org => <Pressable key={org.id} accessibilityRole="button"
        disabled={busy || fileBusy}
        style={[styles.option, org.id === organizationId && styles.selectedOption]}
        onPress={() => { setOrganizationId(org.id); invalidate() }}>
        <Text style={styles.body}>{org.name}</Text>
        <Text style={styles.helper}>Permissão: {org.role}</Text>
      </Pressable>)}
      <Text style={styles.label}>Chave única do lote</Text>
      <TextInput style={styles.input} value={key} maxLength={128}
        placeholder="ex.: carteira-outubro-2026" placeholderTextColor={colors.muted}
        editable={!busy && !fileBusy} autoCapitalize="none"
        onChangeText={v => { setKey(v); invalidate() }} />
      <Pressable style={styles.secondary} onPress={() => { void pickCsv() }} disabled={busy || fileBusy}>
        <Text style={styles.primaryText}>{fileBusy ? "Lendo CSV..." : "Selecionar CSV do celular"}</Text>
      </Pressable>
      {filename ? <Text style={styles.helper}>Arquivo: {filename}</Text> : null}
      <Text style={styles.label}>Ou cole o CSV (até 500 processos)</Text>
      <TextInput style={[styles.input, styles.multiline]} multiline
        placeholder={"externalId,sourceSystem,cnjDigits\nprocesso-1,crm,00000000002026826000"}
        placeholderTextColor={colors.muted} value={csv} textAlignVertical="top"
        editable={!busy && !fileBusy}
        onChangeText={v => { setCsv(v); setFilename(""); invalidate() }} />
      <Text style={styles.helper}>Cabeçalho: externalId,sourceSystem,cnjDigits. Este CSV simples não aceita campos com vírgulas internas.</Text>
      <Pressable style={styles.secondary} onPress={preview} disabled={busy || fileBusy}>
        <Text style={styles.primaryText}>Validar e pré-visualizar</Text>
      </Pressable>
      {ready && <View style={styles.preview}>
        <Text style={styles.success}>{items.length} processo(s) válido(s) para envio.</Text>
        {items.slice(0, 5).map((item, index) =>
          <Text key={index} style={styles.helper}>{item.cnjDigits} · {item.sourceSystem} / {item.externalId}</Text>
        )}
        {items.length > 5 && <Text style={styles.helper}>Mais {items.length - 5} processo(s)</Text>}
      </View>}
      <Pressable style={[styles.primary, !canSend && styles.disabled]}
        disabled={!canSend} onPress={() => { void submit() }}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.whiteText}>Enviar lote</Text>}
      </Pressable>
      {notice ? <Text accessibilityRole="text" style={confirmed ? styles.success : styles.warning}>{notice}</Text> : null}
    </View>
    {access === "ready" && Boolean(organizationId) && <View style={styles.card}>
      <Text style={styles.section}>Meus casos importados</Text>
      <Text style={styles.helper}>Somente casos pertencentes à sua conta nesta organização; não inclui os registros internos de auditoria.</Text>
      {caseStatus ? <Text style={styles.helper}>{caseStatus}</Text> : null}
      {cases.map(item => <Pressable key={item.id} style={styles.case}
        onPress={() => navigation.navigate("CaseDetail", { caseId: item.id })}>
        <Text style={styles.body}>{item.process_number || item.title}</Text>
        <Text style={styles.link}>Abrir dossiê →</Text>
      </Pressable>)}
    </View>}
    {access === "ready" && Boolean(organizationId) && <View style={styles.card}>
      <Text style={styles.section}>Histórico dos meus lotes</Text>
      <Text style={styles.helper}>
        Apenas lotes enviados por sua conta nesta organização.
        O histórico permanece mesmo após excluir um processo.
      </Text>
      {historyStatus === "loading" && <ActivityIndicator color={colors.primary} />}
      {historyStatus === "unavailable" && <Text style={styles.warning}>
        Histórico indisponível neste ambiente. Nenhum lote foi alterado.
      </Text>}
      {historyStatus === "ready" && history.length === 0 && <Text style={styles.helper}>
        Nenhum lote registrado por sua conta nesta organização.
      </Text>}
      {historyStatus === "ready" && history.map(batch => <View key={batch.batchId} style={styles.case}>
        <Text style={styles.body}>{batch.idempotencyKey}</Text>
        <Text style={styles.helper}>
          {batch.itemCount} processo(s) no lote · {batch.linkedCaseCount} ainda vinculado(s)
        </Text>
        <Text style={styles.helper}>{new Date(batch.createdAt).toLocaleString("pt-BR")}</Text>
      </View>)}
    </View>}
  </ScrollView>
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 52, gap: 14 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  label: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 4 },
  body: { color: colors.text, fontSize: 15, fontWeight: "600" },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  input: { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: 13, padding: 13, fontSize: 14, color: colors.text },
  multiline: { minHeight: 135 },
  option: { borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 3 },
  selectedOption: { borderColor: colors.primary, backgroundColor: "#17254A" },
  primary: { minHeight: 48, backgroundColor: colors.primary, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  secondary: { minHeight: 48, backgroundColor: "#17254A", borderColor: colors.primary, borderWidth: 1, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  primaryText: { color: "#AFC4FF", fontWeight: "800", fontSize: 14 },
  whiteText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  disabled: { opacity: 0.4 },
  warning: { color: colors.warning, fontSize: 13, lineHeight: 19 },
  success: { color: colors.success, fontSize: 14, fontWeight: "700" },
  preview: { backgroundColor: colors.bg, borderRadius: 13, padding: 11, gap: 5 },
  link: { color: colors.primary, fontSize: 14, fontWeight: "700", paddingVertical: 5 },
  section: { color: colors.text, fontSize: 18, fontWeight: "800" },
  case: { padding: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 12, gap: 5 },
})
