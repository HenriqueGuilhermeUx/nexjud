import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking,
  Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, useWindowDimensions, View,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  ArrowLeft, BriefcaseBusiness, CalendarDays, Check, CheckCircle2,
  ChevronRight, CircleAlert, Clock3, LogOut, Plus, RefreshCw,
  Search, Settings, ShieldCheck, Trash2, X,
} from "lucide-react-native"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./src/lib/supabase"

const C = {
  background: "#080B12", surface: "#131A28", elevated: "#1B263A",
  outline: "#2C3B54", accent: "#6588FF", text: "#F8FAFC",
  muted: "#AFBDD4", positive: "#36D399", destructive: "#FF8585",
}

type LegalCase = {
  id: string
  title?: string | null
  client_name?: string | null
  process_number?: string | null
  status?: string | null
  summary?: string | null
  updated_at?: string | null
  [key: string]: unknown
}

type AgendaEntry = {
  id: string
  title: string
  date: string
  type: "tarefa" | "prazo" | "audiencia"
  caseLabel?: string
  done?: boolean
}

function todayLocal(offsetDays = 0): string {
  const day = new Date()
  day.setDate(day.getDate() + offsetDays)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
}
function validDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false
  const [year, month, date] = text.split("-").map(Number)
  const parsed = new Date(year, month - 1, date)
  return parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === date
}
function prettyDate(date: string): string {
  const [year, month, day] = date.split("-")
  return year && month && day ? `${day}/${month}/${year}` : date
}
function plain(input: unknown): string {
  return typeof input === "string" ? input : ""
}
function ActionButton({ label, onPress, disabled, secondary }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
    onPress={onPress} style={[styles.primaryButton, secondary && styles.secondaryButton, disabled && { opacity: 0.55 }]}>
    <Text style={[styles.primaryButtonText, secondary && { color: C.text }]}>{label}</Text>
  </Pressable>
}
function Entry({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  async function login() {
    if (!email.trim() || !password) return Alert.alert("Dados obrigatórios", "Informe seu e-mail e sua senha.")
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (error) throw error
      if (data.session) onAuthenticated(data.session)
    } catch (error: any) {
      Alert.alert("Não foi possível entrar", error?.message || "Verifique sua conexão e tente novamente.")
    } finally {
      setBusy(false)
    }
  }
  return <SafeAreaView style={styles.safe}>
    <StatusBar style="light" />
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.login, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.symbol}><BriefcaseBusiness color={C.text} size={32} /></View>
        <Text style={styles.kicker}>NEXJUD COMPANION</Text>
        <Text style={styles.headline}>Seu trabalho jurídico, organizado.</Text>
        <Text style={styles.subhead}>Acesse seus casos e organize seus compromissos em um aplicativo simples e gratuito.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput accessibilityLabel="E-mail" style={styles.input} placeholder="seu@email.com" placeholderTextColor={C.muted}
            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
          <Text style={styles.label}>Senha</Text>
          <TextInput accessibilityLabel="Senha" style={styles.input} placeholder="Sua senha" placeholderTextColor={C.muted}
            value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={login} />
          <ActionButton label={busy ? "Entrando…" : "Entrar na minha conta"} disabled={busy} onPress={login} />
          <Text style={styles.footnote}>Acesso para contas NexJud já existentes. Não há cobrança, planos ou contratação no aplicativo.</Text>
        </View>
        <Pressable accessibilityRole="button" style={styles.linkRow} onPress={() => Linking.openURL("mailto:suporte@nexjud.com.br?subject=Ajuda%20com%20acesso%20NexJud")}>
          <Text style={styles.link}>Precisa de ajuda com o acesso?</Text>
        </Pressable>
        <Pressable accessibilityRole="link" style={styles.linkRow} onPress={() => Linking.openURL("https://nexjudsolucoes.com.br/privacy")}>
          <Text style={styles.smallLink}>Política de Privacidade</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
}
export default function IosLite() {
  const { width } = useWindowDimensions()
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [active, setActive] = useState<"casos" | "agenda">("casos")
  const [accountVisible, setAccountVisible] = useState(false)
  const [search, setSearch] = useState("")
  const [cases, setCases] = useState<LegalCase[]>([])
  const [casesBusy, setCasesBusy] = useState(false)
  const [casesError, setCasesError] = useState("")
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null)
  const [agenda, setAgenda] = useState<AgendaEntry[]>([])
  const [agendaLoaded, setAgendaLoaded] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDate, setNewDate] = useState(todayLocal())
  const [kind, setKind] = useState<AgendaEntry["type"]>("tarefa")
  const [creating, setCreating] = useState(false)
  const uid = session?.user.id || ""

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) { setSession(data.session); setInitializing(false) }
    }).catch(() => {
      if (alive) { setSession(null); setInitializing(false) }
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (alive) setSession(next)
    })
    return () => { alive = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    setCases([]); setSelectedCase(null); setAgenda([]); setAgendaLoaded(false); setSearch("")
    if (!uid) return
    let alive = true
    void (async () => {
      try {
        const value = await AsyncStorage.getItem(`nexjud-agenda-${uid}`)
        if (!alive) return
        const decoded: unknown = value ? JSON.parse(value) : []
        setAgenda(Array.isArray(decoded) ? decoded.filter((x: unknown): x is AgendaEntry =>
          !!x && typeof x === "object" && typeof (x as AgendaEntry).id === "string" &&
          typeof (x as AgendaEntry).title === "string" && validDate((x as AgendaEntry).date || "")) : [])
      } catch {
        if (alive) Alert.alert("Agenda", "Não foi possível abrir a agenda deste dispositivo.")
      } finally {
        if (alive) setAgendaLoaded(true)
      }
    })()
    return () => { alive = false }
  }, [uid])

  async function fetchCases() {
    if (!uid) return
    setCasesBusy(true); setCasesError("")
    try {
      const { data, error } = await supabase.from("legal_cases")
        .select("*").eq("user_id", uid).order("updated_at", { ascending: false }).limit(100)
      if (error) throw error
      setCases((data || []) as LegalCase[])
    } catch {
      setCasesError("Não foi possível atualizar os casos. Confira sua conexão.")
    } finally { setCasesBusy(false) }
  }
  useEffect(() => { if (uid) void fetchCases() }, [uid])

  async function saveAgenda(next: AgendaEntry[]) {
    if (!uid || !agendaLoaded) return
    try {
      await AsyncStorage.setItem(`nexjud-agenda-${uid}`, JSON.stringify(next))
      setAgenda(next)
    } catch {
      Alert.alert("Não foi possível salvar", "Sua alteração não foi gravada. Tente novamente.")
    }
  }
  async function createAgenda() {
    const title = newTitle.trim()
    if (!title) return Alert.alert("Informe um título", "Por exemplo: Revisar petição.")
    if (!validDate(newDate)) return Alert.alert("Data inválida", "Utilize o formato AAAA-MM-DD, por exemplo 2026-10-20.")
    if (creating) return
    setCreating(true)
    await saveAgenda([{ id: `ios-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, date: newDate, type: kind, done: false }, ...agenda])
    setNewTitle(""); setCreating(false)
  }
  function deleteAgenda(entry: AgendaEntry) {
    Alert.alert("Excluir compromisso?", entry.title, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => { void saveAgenda(agenda.filter(x => x.id !== entry.id)) } },
    ])
  }
  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? cases.filter(c => [c.title, c.client_name, c.process_number].some(value =>
      plain(value).toLowerCase().includes(q))) : cases
  }, [cases, search])
  const arrangedAgenda = useMemo(() => [...agenda].sort((a, b) =>
    Number(Boolean(a.done)) - Number(Boolean(b.done)) || a.date.localeCompare(b.date)), [agenda])
  const typeLabel = { tarefa: "Tarefa", prazo: "Prazo", audiencia: "Audiência" }
  const wide = width >= 700

  if (initializing) return <SafeAreaView style={[styles.safe, styles.center]}>
    <StatusBar style="light" />
    <ActivityIndicator color={C.accent} size="large" />
    <Text style={styles.subhead}>Abrindo NexJud…</Text>
  </SafeAreaView>
  if (!session) return <Entry onAuthenticated={setSession} />

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="light" />
    <View style={styles.screen}>
      <View style={styles.navHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>NEXJUD COMPANION</Text>
          <Text style={styles.screenHeading}>{selectedCase ? "Detalhes do caso" : active === "casos" ? "Meus casos" : "Minha agenda"}</Text>
        </View>
        <Pressable accessibilityLabel="Minha conta" accessibilityRole="button" style={styles.iconButton}
          onPress={() => setAccountVisible(true)}><Settings color={C.text} size={22} /></Pressable>
      </View>
      <View style={[styles.body, { maxWidth: wide ? 860 : undefined, alignSelf: "center", width: "100%" }]}>
        {selectedCase ? <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable accessibilityRole="button" style={styles.back} onPress={() => setSelectedCase(null)}>
            <ArrowLeft size={19} color={C.accent} /><Text style={styles.link}>Voltar aos casos</Text>
          </Pressable>
          <View style={styles.card}>
            <Text style={styles.kicker}>CASO JURÍDICO</Text>
            <Text style={styles.cardTitle}>{plain(selectedCase.title) || "Caso sem título"}</Text>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.bodyText}>{plain(selectedCase.client_name) || "Não informado"}</Text>
            <Text style={styles.label}>Processo</Text>
            <Text selectable style={styles.bodyText}>{plain(selectedCase.process_number) || "Não informado"}</Text>
            <Text style={styles.label}>Situação</Text>
            <Text style={styles.bodyText}>{plain(selectedCase.status) || "Não informada"}</Text>
            {selectedCase.summary ? <><Text style={styles.label}>Resumo</Text><Text style={styles.bodyText}>{String(selectedCase.summary)}</Text></> : null}
            <Text style={styles.footnote}>Consulta de informações já existentes. A edição completa permanece fora deste aplicativo.</Text>
          </View>
        </ScrollView> : active === "casos" ? <>
          <View style={styles.fieldRow}>
            <Search color={C.muted} size={18} />
            <TextInput accessibilityLabel="Pesquisar casos" placeholder="Buscar caso, cliente ou processo"
              placeholderTextColor={C.muted} style={styles.searchInput} value={search} onChangeText={setSearch} />
            <Pressable accessibilityRole="button" accessibilityLabel="Atualizar casos" disabled={casesBusy} onPress={() => void fetchCases()}>
              <RefreshCw color={C.accent} size={19} />
            </Pressable>
          </View>
          {casesError ? <Text style={styles.error}>{casesError}</Text> : null}
          {casesBusy && !cases.length ? <View style={styles.center}><ActivityIndicator color={C.accent} /></View> : null}
          <FlatList data={filteredCases} keyExtractor={item => item.id} contentContainerStyle={[styles.scroll, { flexGrow: 1 }]}
            ListEmptyComponent={!casesBusy ? <View style={styles.empty}>
              <BriefcaseBusiness size={34} color={C.accent} />
              <Text style={styles.cardTitle}>{search ? "Nenhum caso encontrado" : "Ainda não há casos cadastrados"}</Text>
              <Text style={styles.subhead}>{search ? "Tente outro termo de busca." : "Quando houver casos na sua conta NexJud, eles aparecerão aqui para consulta."}</Text>
            </View> : null}
            renderItem={({ item }) => <Pressable accessibilityRole="button"
              accessibilityLabel={`Abrir caso ${plain(item.title) || "Sem título"}`} onPress={() => setSelectedCase(item)}
              style={styles.caseRow}>
              <View style={styles.tile}><BriefcaseBusiness color={C.accent} size={20} /></View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text numberOfLines={2} style={styles.rowTitle}>{plain(item.title) || "Caso sem título"}</Text>
                <Text numberOfLines={1} style={styles.rowSubtitle}>{plain(item.client_name) || plain(item.process_number) || "Consultar informações"}</Text>
                {item.process_number && item.client_name ? <Text numberOfLines={1} style={styles.footnote}>{String(item.process_number)}</Text> : null}
              </View>
              <ChevronRight color={C.muted} size={18} />
            </Pressable>} />
        </> : <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Novo compromisso</Text>
            <Text style={styles.subhead}>Anote tarefas e prazos neste iPhone ou iPad. A agenda fica armazenada neste aparelho.</Text>
            <Text style={styles.label}>O que você precisa fazer?</Text>
            <TextInput accessibilityLabel="Título do compromisso" value={newTitle} onChangeText={setNewTitle}
              style={styles.input} placeholderTextColor={C.muted} placeholder="Ex.: Revisar audiência" />
            <Text style={styles.label}>Data (AAAA-MM-DD)</Text>
            <TextInput accessibilityLabel="Data do compromisso" style={styles.input} value={newDate}
              placeholderTextColor={C.muted} onChangeText={setNewDate} keyboardType="numbers-and-punctuation" />
            <View style={styles.chips}>
              {[{ name: "Hoje", days: 0 }, { name: "Amanhã", days: 1 }, { name: "+7 dias", days: 7 }].map(item =>
                <Pressable key={item.name} accessibilityRole="button" style={styles.chip} onPress={() => setNewDate(todayLocal(item.days))}>
                  <Text style={styles.chipText}>{item.name}</Text>
                </Pressable>)}
            </View>
            <View style={styles.chips}>
              {(["tarefa", "prazo", "audiencia"] as const).map(type =>
                <Pressable key={type} accessibilityRole="button" onPress={() => setKind(type)}
                  style={[styles.chip, kind === type && styles.chipActive]}>
                  <Text style={styles.chipText}>{typeLabel[type]}</Text>
                </Pressable>)}
            </View>
            <ActionButton label="Adicionar à agenda" onPress={() => { void createAgenda() }}
              disabled={!agendaLoaded || creating} />
          </View>
          <Text style={styles.section}>Próximos compromissos</Text>
          {arrangedAgenda.length ? arrangedAgenda.map(entry => <View key={entry.id} style={styles.caseRow}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!entry.done }}
              accessibilityLabel={`Marcar ${entry.title} como ${entry.done ? "pendente" : "concluído"}`}
              style={[styles.check, entry.done && styles.checkActive]}
              onPress={() => { void saveAgenda(agenda.map(x => x.id === entry.id ? { ...x, done: !x.done } : x)) }}>
              {entry.done ? <Check size={16} color={C.background} /> : null}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, entry.done && { textDecorationLine: "line-through", opacity: 0.6 }]}>{entry.title}</Text>
              <Text style={styles.rowSubtitle}>{typeLabel[entry.type] || "Compromisso"} · {prettyDate(entry.date)}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Excluir ${entry.title}`}
              onPress={() => deleteAgenda(entry)}><Trash2 color={C.destructive} size={19} /></Pressable>
          </View>) : <View style={styles.empty}>
            <CalendarDays size={32} color={C.accent} />
            <Text style={styles.cardTitle}>Sua agenda está livre</Text>
            <Text style={styles.subhead}>Adicione o primeiro compromisso acima.</Text>
          </View>}
        </ScrollView>}
      </View>
      <View style={styles.tabBar}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: active === "casos" }}
          onPress={() => { setSelectedCase(null); setActive("casos") }} style={[styles.tab, active === "casos" && styles.tabSelected]}>
          <BriefcaseBusiness color={active === "casos" ? C.accent : C.muted} size={22} />
          <Text style={[styles.tabLabel, active === "casos" && { color: C.text }]}>Casos</Text>
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: active === "agenda" }}
          onPress={() => { setSelectedCase(null); setActive("agenda") }} style={[styles.tab, active === "agenda" && styles.tabSelected]}>
          <CalendarDays color={active === "agenda" ? C.accent : C.muted} size={22} />
          <Text style={[styles.tabLabel, active === "agenda" && { color: C.text }]}>Agenda</Text>
        </Pressable>
      </View>
    </View>
    <Modal visible={accountVisible} animationType="slide" transparent onRequestClose={() => setAccountVisible(false)}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar conta" style={styles.modalClose}
            onPress={() => setAccountVisible(false)}><X color={C.text} size={22} /></Pressable>
          <Text style={styles.cardTitle}>Minha conta</Text>
          <Text style={styles.subhead}>{session.user.email || "Conta NexJud"}</Text>
          <View style={styles.divider} />
          <Pressable style={styles.linkRow} onPress={() => Linking.openURL("https://nexjudsolucoes.com.br/privacy")}>
            <ShieldCheck color={C.accent} size={20} /><Text style={styles.bodyText}>Política de Privacidade</Text>
          </Pressable>
          <Pressable style={styles.linkRow} onPress={() => Linking.openURL("https://nexjudsolucoes.com.br/account-deletion")}>
            <CircleAlert color={C.accent} size={20} /><Text style={styles.bodyText}>Solicitar exclusão da conta</Text>
          </Pressable>
          <Pressable style={styles.linkRow} onPress={() => Linking.openURL("mailto:suporte@nexjud.com.br")}>
            <ShieldCheck color={C.accent} size={20} /><Text style={styles.bodyText}>Suporte NexJud</Text>
          </Pressable>
          <ActionButton label="Sair da conta" secondary onPress={() => {
            setAccountVisible(false)
            void supabase.auth.signOut().catch(() => Alert.alert("Erro", "Não foi possível encerrar a sessão."))
          }} />
          <Text style={styles.footnote}>NexJud Companion iOS · Consulta de casos e agenda pessoal · Sem assinaturas ou compras.</Text>
        </View>
      </View>
    </Modal>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 28 },
  login: { justifyContent: "center", width: "100%", maxWidth: 490, alignSelf: "center", gap: 18, padding: 24 },
  symbol: { width: 64, height: 64, backgroundColor: C.elevated, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  kicker: { color: C.accent, fontSize: 11, letterSpacing: 1.7, fontWeight: "800" },
  headline: { color: C.text, fontSize: 30, fontWeight: "800", lineHeight: 38 },
  subhead: { color: C.muted, fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.outline, borderRadius: 20, padding: 18, gap: 14 },
  label: { fontSize: 13, fontWeight: "700", color: C.muted },
  input: { backgroundColor: C.background, borderWidth: 1, borderColor: C.outline, borderRadius: 12, minHeight: 50, paddingHorizontal: 15, color: C.text, fontSize: 16 },
  primaryButton: { backgroundColor: C.accent, borderRadius: 13, padding: 15, minHeight: 50, alignItems: "center", justifyContent: "center" },
  secondaryButton: { backgroundColor: C.elevated, borderWidth: 1, borderColor: C.outline },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  footnote: { color: C.muted, fontSize: 12, lineHeight: 19 },
  link: { color: C.accent, fontWeight: "700", fontSize: 14 },
  smallLink: { color: C.muted, fontSize: 13, textDecorationLine: "underline" },
  linkRow: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 12 },
  navHeader: { borderBottomWidth: 1, borderBottomColor: C.outline, padding: 18, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", gap: 12 },
  screenHeading: { fontSize: 24, fontWeight: "800", color: C.text, marginTop: 5 },
  iconButton: { minHeight: 44, width: 44, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderRadius: 14 },
  body: { flex: 1 },
  scroll: { padding: 18, gap: 13, paddingBottom: 45 },
  fieldRow: { marginHorizontal: 18, marginTop: 16, paddingHorizontal: 14, minHeight: 52, gap: 10, flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 13, borderWidth: 1, borderColor: C.outline },
  searchInput: { flex: 1, fontSize: 16, color: C.text, minHeight: 45 },
  error: { color: C.destructive, fontSize: 13, margin: 18 },
  empty: { alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: C.surface, borderRadius: 18, gap: 9 },
  cardTitle: { fontSize: 19, lineHeight: 25, fontWeight: "800", color: C.text },
  caseRow: { padding: 15, backgroundColor: C.surface, borderWidth: 1, borderColor: C.outline, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 13, minHeight: 76 },
  tile: { width: 44, height: 44, borderRadius: 13, backgroundColor: C.elevated, alignItems: "center", justifyContent: "center" },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: "700" },
  rowSubtitle: { color: C.muted, fontSize: 13, lineHeight: 19 },
  bodyText: { color: C.text, fontSize: 15, lineHeight: 23 },
  back: { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 38, paddingHorizontal: 14, justifyContent: "center", backgroundColor: C.elevated, borderRadius: 11, borderWidth: 1, borderColor: C.outline },
  chipActive: { borderColor: C.accent, backgroundColor: "#233B79" },
  chipText: { color: C.text, fontSize: 13, fontWeight: "700" },
  section: { color: C.text, fontSize: 18, fontWeight: "800", paddingTop: 7 },
  check: { height: 29, width: 29, borderRadius: 9, borderWidth: 2, borderColor: C.outline, alignItems: "center", justifyContent: "center" },
  checkActive: { backgroundColor: C.positive, borderColor: C.positive },
  tabBar: { minHeight: 71, borderTopWidth: 1, borderTopColor: C.outline, backgroundColor: C.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 6 },
  tab: { flex: 1, maxWidth: 250, minHeight: 60, alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 14 },
  tabSelected: { backgroundColor: C.elevated },
  tabLabel: { fontSize: 12, fontWeight: "800", color: C.muted },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#000000AA" },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 23, paddingVertical: 28, gap: 14 },
  modalClose: { alignSelf: "flex-end", padding: 4 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.outline },
})
