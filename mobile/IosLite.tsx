import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Modal,
  Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput,
  View, useWindowDimensions,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  ArrowLeft, BriefcaseBusiness, CalendarDays, Check, ChevronRight,
  FileText, Plus, Search, Settings, ShieldCheck, Trash2, X,
} from "lucide-react-native"

const C = {
  bg: "#080B12", card: "#131A28", inset: "#1B263A", border: "#303C52",
  accent: "#6588FF", text: "#F8FAFC", muted: "#B6C2D5",
  positive: "#36D399", negative: "#FF8585",
}
const CASES_KEY = "nexjud-ios-free-local-cases-v1"
const AGENDA_KEY = "nexjud-ios-free-local-agenda-v1"

type CaseRecord = {
  id: string
  title: string
  processNumber: string
  notes: string
  createdAt: string
  updatedAt: string
}
type AgendaRecord = {
  id: string
  title: string
  date: string
  kind: "tarefa" | "prazo" | "audiencia"
  done: boolean
}
type Tab = "casos" | "agenda"

function localDay(days = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function dateIsValid(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const [year, month, day] = date.split("-").map(Number)
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() + 1 === month && d.getDate() === day
}
function displayDay(date: string): string {
  const parts = date.split("-")
  return parts.length === 3 ? [parts[2], parts[1], parts[0]].join("/") : date
}
function makeId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
function Action({ title, onPress, secondary, disabled }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title}
    disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.buttonSecondary, disabled && { opacity: 0.6 }]}>
    <Text style={[styles.buttonText, secondary && { color: C.text }]}>{title}</Text>
  </Pressable>
}
function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  multiline?: boolean
  keyboardType?: "default" | "numbers-and-punctuation"
}) {
  return <View style={{ gap: 7 }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      keyboardType={keyboardType || "default"}
      multiline={multiline}
      style={[styles.input, multiline && { minHeight: 110, textAlignVertical: "top" }]}
    />
  </View>
}

export default function IosLite() {
  const { width } = useWindowDimensions()
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<Tab>("casos")
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [agenda, setAgenda] = useState<AgendaRecord[]>([])
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<CaseRecord | null>(null)
  const [editing, setEditing] = useState<CaseRecord | null>(null)
  const [caseForm, setCaseForm] = useState(false)
  const [caseTitle, setCaseTitle] = useState("")
  const [caseNumber, setCaseNumber] = useState("")
  const [caseNotes, setCaseNotes] = useState("")
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDate, setTaskDate] = useState(localDay())
  const [taskKind, setTaskKind] = useState<AgendaRecord["kind"]>("tarefa")
  const [settings, setSettings] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const [rawCases, rawAgenda] = await Promise.all([
          AsyncStorage.getItem(CASES_KEY), AsyncStorage.getItem(AGENDA_KEY),
        ])
        const savedCases: unknown = rawCases ? JSON.parse(rawCases) : []
        const savedAgenda: unknown = rawAgenda ? JSON.parse(rawAgenda) : []
        if (!mounted) return
        setCases(Array.isArray(savedCases) ? savedCases.filter((c: unknown): c is CaseRecord =>
          !!c && typeof c === "object" && typeof (c as CaseRecord).id === "string" &&
          typeof (c as CaseRecord).title === "string") : [])
        setAgenda(Array.isArray(savedAgenda) ? savedAgenda.filter((t: unknown): t is AgendaRecord =>
          !!t && typeof t === "object" && typeof (t as AgendaRecord).id === "string" &&
          typeof (t as AgendaRecord).title === "string" && dateIsValid((t as AgendaRecord).date || "")) : [])
      } catch {
        if (mounted) Alert.alert("Dados locais", "Não foi possível carregar suas anotações deste aparelho.")
      } finally {
        if (mounted) setLoaded(true)
      }
    })()
    return () => { mounted = false }
  }, [])

  async function saveCases(next: CaseRecord[]): Promise<boolean> {
    if (!loaded) return false
    try {
      await AsyncStorage.setItem(CASES_KEY, JSON.stringify(next))
      setCases(next)
      return true
    } catch {
      Alert.alert("Não foi possível salvar", "O caso não foi gravado neste aparelho.")
      return false
    }
  }
  async function saveAgenda(next: AgendaRecord[]): Promise<boolean> {
    if (!loaded) return false
    try {
      await AsyncStorage.setItem(AGENDA_KEY, JSON.stringify(next))
      setAgenda(next)
      return true
    } catch {
      Alert.alert("Não foi possível salvar", "A agenda não foi atualizada neste aparelho.")
      return false
    }
  }
  function openCaseForm(existing?: CaseRecord) {
    setEditing(existing || null)
    setCaseTitle(existing?.title || "")
    setCaseNumber(existing?.processNumber || "")
    setCaseNotes(existing?.notes || "")
    setCaseForm(true)
  }
  async function commitCase() {
    if (busy) return
    const title = caseTitle.trim()
    if (!title) return Alert.alert("Título obrigatório", "Informe o nome do caso.")
    setBusy(true)
    try {
      const now = new Date().toISOString()
      const record: CaseRecord = {
        id: editing?.id || makeId(),
        title,
        processNumber: caseNumber.trim(),
        notes: caseNotes.trim(),
        createdAt: editing?.createdAt || now,
        updatedAt: now,
      }
      const next = editing ? cases.map(c => c.id === editing.id ? record : c) : [record, ...cases]
      if (await saveCases(next)) {
        setCaseForm(false)
        setSelected(editing ? record : null)
        setEditing(null)
      }
    } finally { setBusy(false) }
  }
  function removeCase(record: CaseRecord) {
    Alert.alert("Excluir este caso?", "As anotações salvas neste aparelho serão apagadas.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => {
        void (async () => { if (await saveCases(cases.filter(c => c.id !== record.id))) setSelected(null) })()
      } },
    ])
  }
  async function createTask() {
    if (busy) return
    if (!taskTitle.trim()) return Alert.alert("Título obrigatório", "Informe o compromisso.")
    if (!dateIsValid(taskDate)) return Alert.alert("Data inválida", "Use AAAA-MM-DD, como 2026-10-23.")
    setBusy(true)
    try {
      const next: AgendaRecord[] = [{
        id: makeId(), title: taskTitle.trim(), date: taskDate, kind: taskKind, done: false,
      }, ...agenda]
      if (await saveAgenda(next)) setTaskTitle("")
    } finally { setBusy(false) }
  }
  function removeTask(task: AgendaRecord) {
    Alert.alert("Excluir compromisso?", task.title, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => { void saveAgenda(agenda.filter(t => t.id !== task.id)) } },
    ])
  }
  function removeAll() {
    Alert.alert("Apagar todos os dados locais?", "Esta ação é irreversível. Casos e compromissos serão removidos apenas deste aparelho.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar tudo", style: "destructive", onPress: () => {
        void (async () => {
          try {
            await AsyncStorage.multiRemove([CASES_KEY, AGENDA_KEY])
            setCases([])
            setAgenda([])
            setSelected(null)
            setSettings(false)
            Alert.alert("Concluído", "Dados locais apagados.")
          } catch {
            Alert.alert("Erro", "Não foi possível apagar os dados locais.")
          }
        })()
      } },
    ])
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return term ? cases.filter(c => [c.title, c.processNumber, c.notes]
      .some(v => v.toLowerCase().includes(term))) : cases
  }, [cases, query])
  const tasks = useMemo(() =>
    [...agenda].sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date)),
  [agenda])
  const kindNames = { tarefa: "Tarefa", prazo: "Prazo", audiencia: "Audiência" }
  const pageWidth = width > 720 ? 820 : undefined

  if (!loaded) return <SafeAreaView style={[styles.safe, styles.center]}>
    <StatusBar style="light" />
    <ActivityIndicator color={C.accent} size="large" />
    <Text style={styles.caption}>Abrindo suas anotações…</Text>
  </SafeAreaView>

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="light" />
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>NEXJUD · ORGANIZADOR GRATUITO</Text>
          <Text style={styles.headline}>{selected ? "Detalhes do caso" : tab === "casos" ? "Meus casos" : "Minha agenda"}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Informações e privacidade"
          style={styles.iconButton} onPress={() => setSettings(true)}>
          <Settings size={22} color={C.text} />
        </Pressable>
      </View>
      <View style={[styles.main, { maxWidth: pageWidth, width: "100%", alignSelf: "center" }]}>
        {selected ? <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" style={styles.back} onPress={() => setSelected(null)}>
            <ArrowLeft size={19} color={C.accent} /><Text style={styles.link}>Voltar</Text>
          </Pressable>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>ANOTAÇÃO LOCAL</Text>
            <Text style={styles.cardTitle}>{selected.title}</Text>
            <Text style={styles.label}>Processo</Text>
            <Text selectable style={styles.body}>{selected.processNumber || "Não informado"}</Text>
            <Text style={styles.label}>Observações</Text>
            <Text selectable style={styles.body}>{selected.notes || "Sem observações"}</Text>
            <Text style={styles.caption}>Informações guardadas somente neste aparelho.</Text>
            <Action title="Editar caso" onPress={() => openCaseForm(selected)} />
            <Pressable accessibilityRole="button" style={styles.dangerRow} onPress={() => removeCase(selected)}>
              <Trash2 size={17} color={C.negative} /><Text style={styles.dangerText}>Excluir caso</Text>
            </Pressable>
          </View>
        </ScrollView> : tab === "casos" ? <>
          <View style={styles.toolbar}>
            <View style={styles.search}>
              <Search color={C.muted} size={18} />
              <TextInput accessibilityLabel="Pesquisar casos" placeholder="Pesquisar casos locais"
                placeholderTextColor={C.muted} style={styles.searchInput}
                value={query} onChangeText={setQuery} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Novo caso"
              style={styles.addButton} onPress={() => openCaseForm()}>
              <Plus size={23} color="#FFFFFF" />
            </Pressable>
          </View>
          <FlatList data={filtered} keyExtractor={c => c.id} contentContainerStyle={[styles.pad, { flexGrow: 1 }]}
            ListHeaderComponent={<Text style={styles.caption}>Organização gratuita, sem conta ou assinatura. As anotações ficam neste dispositivo.</Text>}
            ListEmptyComponent={<View style={styles.empty}>
              <BriefcaseBusiness size={36} color={C.accent} />
              <Text style={styles.cardTitle}>{query ? "Nenhum caso encontrado" : "Organize seu primeiro caso"}</Text>
              <Text style={styles.caption}>{query ? "Tente outro termo." : "Toque no botão + para criar uma anotação de caso."}</Text>
              {!query ? <Action title="Cadastrar caso" onPress={() => openCaseForm()} /> : null}
            </View>}
            renderItem={({ item }) => <Pressable accessibilityRole="button"
              accessibilityLabel={`Abrir ${item.title}`} onPress={() => setSelected(item)} style={styles.caseRow}>
              <View style={styles.tile}><FileText size={22} color={C.accent} /></View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.caption} numberOfLines={1}>{item.processNumber || "Anotação de caso"}</Text>
              </View>
              <ChevronRight size={20} color={C.muted} />
            </Pressable>} />
        </> : <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Adicionar compromisso</Text>
            <Text style={styles.caption}>Crie tarefas, prazos e audiências para organizar sua rotina. A agenda funciona sem internet.</Text>
            <Field label="Título" placeholder="Ex.: Revisar petição" value={taskTitle} onChangeText={setTaskTitle} />
            <Field label="Data (AAAA-MM-DD)" value={taskDate} onChangeText={setTaskDate} keyboardType="numbers-and-punctuation" />
            <View style={styles.chips}>
              {[{ title: "Hoje", days: 0 }, { title: "Amanhã", days: 1 }, { title: "+7 dias", days: 7 }].map(b =>
                <Pressable accessibilityRole="button" key={b.title} style={styles.chip} onPress={() => setTaskDate(localDay(b.days))}>
                  <Text style={styles.chipText}>{b.title}</Text>
                </Pressable>)}
            </View>
            <View style={styles.chips}>
              {(["tarefa", "prazo", "audiencia"] as const).map(kind =>
                <Pressable accessibilityRole="button" key={kind} onPress={() => setTaskKind(kind)}
                  style={[styles.chip, taskKind === kind && styles.chipActive]}>
                  <Text style={styles.chipText}>{kindNames[kind]}</Text>
                </Pressable>)}
            </View>
            <Action title={busy ? "Salvando…" : "Adicionar à agenda"} onPress={() => { void createTask() }} disabled={busy} />
          </View>
          <Text style={styles.section}>Meus compromissos</Text>
          {tasks.length ? tasks.map(task => <View key={task.id} style={styles.caseRow}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.done }}
              accessibilityLabel={`Marcar ${task.title} como ${task.done ? "pendente" : "concluído"}`}
              style={[styles.check, task.done && styles.checked]}
              onPress={() => { void saveAgenda(agenda.map(t => t.id === task.id ? { ...t, done: !t.done } : t)) }}>
              {task.done ? <Check size={16} color={C.bg} /> : null}
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.rowTitle, task.done && styles.strike]}>{task.title}</Text>
              <Text style={styles.caption}>{kindNames[task.kind] || "Compromisso"} · {displayDay(task.date)}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Excluir ${task.title}`}
              onPress={() => removeTask(task)}><Trash2 size={19} color={C.negative} /></Pressable>
          </View>) : <View style={styles.empty}>
            <CalendarDays size={35} color={C.accent} />
            <Text style={styles.cardTitle}>Sem compromissos cadastrados</Text>
            <Text style={styles.caption}>Comece pelo formulário acima.</Text>
          </View>}
        </ScrollView>}
      </View>
      <View style={styles.nav}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === "casos" }}
          style={[styles.tab, tab === "casos" && styles.activeTab]}
          onPress={() => { setSelected(null); setTab("casos") }}>
          <BriefcaseBusiness size={22} color={tab === "casos" ? C.accent : C.muted} />
          <Text style={[styles.tabText, tab === "casos" && { color: C.text }]}>Casos</Text>
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === "agenda" }}
          style={[styles.tab, tab === "agenda" && styles.activeTab]}
          onPress={() => { setSelected(null); setTab("agenda") }}>
          <CalendarDays size={22} color={tab === "agenda" ? C.accent : C.muted} />
          <Text style={[styles.tabText, tab === "agenda" && { color: C.text }]}>Agenda</Text>
        </Pressable>
      </View>
    </View>
    <Modal transparent animationType="slide" visible={caseForm} onRequestClose={() => setCaseForm(false)}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.sheet}>
          <View style={styles.modalRow}>
            <Text style={styles.cardTitle}>{editing ? "Editar caso" : "Novo caso"}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setCaseForm(false)}>
              <X size={22} color={C.text} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 15 }}>
            <Field label="Nome do caso" placeholder="Ex.: Revisão contratual" value={caseTitle} onChangeText={setCaseTitle} />
            <Field label="Número do processo (opcional)" placeholder="Número fictício ou referência" value={caseNumber} onChangeText={setCaseNumber} />
            <Field label="Observações" placeholder="Anotações pessoais" multiline value={caseNotes} onChangeText={setCaseNotes} />
            <Text style={styles.caption}>Não há sincronização. Evite guardar informações confidenciais sem proteção adicional do dispositivo.</Text>
            <Action title={busy ? "Salvando…" : "Salvar caso"} disabled={busy} onPress={() => { void commitCase() }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    <Modal transparent animationType="slide" visible={settings} onRequestClose={() => setSettings(false)}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.modalRow}>
            <Text style={styles.cardTitle}>Informações e privacidade</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setSettings(false)}><X size={23} color={C.text} /></Pressable>
          </View>
          <View style={styles.privacy}>
            <ShieldCheck size={25} color={C.accent} />
            <Text style={styles.body}>Esta versão gratuita não solicita login, não possui compras, anúncios, IA ou conexão com a base de clientes NexJud.</Text>
            <Text style={styles.caption}>Casos e agenda ficam somente no armazenamento local do aparelho. Não há backup ou sincronização automática; remover o app pode apagar os registros.</Text>
            <Text style={styles.caption}>Este organizador não fornece aconselhamento jurídico nem notificações oficiais de prazos judiciais.</Text>
          </View>
          <Pressable accessibilityRole="button" style={styles.back}
            onPress={() => Linking.openURL("mailto:suporte@nexjud.com.br?subject=NexJud%20iOS%20Gratuito")}>
            <Text style={styles.link}>Fale com o suporte</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.dangerRow} onPress={removeAll}>
            <Trash2 color={C.negative} size={18} /><Text style={styles.dangerText}>Apagar todos os dados locais</Text>
          </Pressable>
          <Text style={styles.caption}>NexJud Organizador · iOS gratuito · Casos e Agenda</Text>
        </View>
      </View>
    </Modal>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  header: { padding: 20, paddingHorizontal: 22, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: "row", gap: 12, alignItems: "center" },
  eyebrow: { fontSize: 11, color: C.accent, fontWeight: "800", letterSpacing: 1.6 },
  headline: { color: C.text, fontSize: 24, marginTop: 5, fontWeight: "800" },
  iconButton: { width: 44, height: 44, backgroundColor: C.card, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  main: { flex: 1 },
  pad: { padding: 19, gap: 15, paddingBottom: 38 },
  toolbar: { flexDirection: "row", marginHorizontal: 18, marginTop: 16, gap: 10, alignItems: "center" },
  search: { flex: 1, minHeight: 52, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 13, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, color: C.text, fontSize: 16, minHeight: 48 },
  addButton: { backgroundColor: C.accent, width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, gap: 13 },
  cardTitle: { color: C.text, fontSize: 19, fontWeight: "800", lineHeight: 26 },
  body: { fontSize: 15, color: C.text, lineHeight: 24 },
  label: { fontSize: 13, fontWeight: "700", color: C.muted },
  caption: { fontSize: 13, lineHeight: 20, color: C.muted },
  input: { minHeight: 49, color: C.text, fontSize: 16, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  button: { minHeight: 50, borderRadius: 13, paddingHorizontal: 18, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  buttonSecondary: { backgroundColor: C.inset, borderWidth: 1, borderColor: C.border },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  link: { color: C.accent, fontSize: 14, fontWeight: "800" },
  back: { minHeight: 44, flexDirection: "row", gap: 9, alignItems: "center" },
  empty: { backgroundColor: C.card, padding: 27, alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 16 },
  caseRow: { padding: 15, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, flexDirection: "row", gap: 13, alignItems: "center", minHeight: 75 },
  tile: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.inset, alignItems: "center", justifyContent: "center" },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: "700" },
  section: { color: C.text, fontSize: 18, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 38, backgroundColor: C.inset, borderColor: C.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, justifyContent: "center" },
  chipActive: { borderColor: C.accent, backgroundColor: "#263D7B" },
  chipText: { color: C.text, fontWeight: "700", fontSize: 13 },
  check: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", borderColor: C.border, borderWidth: 2 },
  checked: { backgroundColor: C.positive, borderColor: C.positive },
  strike: { textDecorationLine: "line-through", opacity: 0.55 },
  nav: { flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, padding: 7, justifyContent: "center", minHeight: 72 },
  tab: { minHeight: 58, flex: 1, maxWidth: 280, alignItems: "center", justifyContent: "center", borderRadius: 12, gap: 5 },
  activeTab: { backgroundColor: C.inset },
  tabText: { fontSize: 12, fontWeight: "800", color: C.muted },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#000000BB" },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, gap: 15, maxHeight: "86%" },
  modalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  privacy: { backgroundColor: C.inset, padding: 18, borderRadius: 14, gap: 10 },
  dangerRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  dangerText: { color: C.negative, fontWeight: "700" },
})
