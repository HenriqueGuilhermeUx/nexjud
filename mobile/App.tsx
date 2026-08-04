import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import * as ImagePicker from "expo-image-picker"
import * as DocumentPicker from "expo-document-picker"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { DarkTheme, NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import {
  ArrowRight, Bell, Brain, Briefcase, CalendarDays, Camera, CheckCircle2,
  ChevronRight, CircleAlert, Clock3, FilePlus2, FileSearch, FileText, Gavel,
  Home, Link as LinkIcon, ListTodo, LogOut, MessageSquare, Mic, Plus,
  Scale, Search, Send, ShieldCheck, Sparkles, Upload, User, WandSparkles,
} from "lucide-react-native"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./src/lib/supabase"

const Stack = createNativeStackNavigator()
const Tabs = createBottomTabNavigator()
const WEB_URL = "https://nexjud.netlify.app"

const colors = {
  bg: "#080A10", card: "#111521", cardAlt: "#171C2B", border: "#293147",
  primary: "#4F7CFF", primarySoft: "#17254A", text: "#F8FAFC", muted: "#94A3B8",
  success: "#19C37D", warning: "#F59E0B", danger: "#EF4444",
}

type AgendaItem = {
  id: string
  title: string
  date: string
  type: "prazo" | "audiencia" | "tarefa"
  caseLabel?: string
  done?: boolean
}

const quickPrompts = [
  "Explique esta decisão e indique os próximos passos.",
  "Quais são os riscos e fragilidades deste caso?",
  "Pesquise jurisprudência favorável sobre este tema.",
  "Prepare perguntas para a próxima audiência.",
  "Crie a estrutura de uma contestação.",
  "Resuma os documentos e identifique provas faltantes.",
]

const pieceTypes = [
  "Petição inicial", "Contestação", "Réplica", "Recurso", "Manifestação",
  "Parecer jurídico", "Contrato", "Notificação extrajudicial", "Roteiro de audiência",
]

function Button({ label, onPress, secondary = false, disabled = false, icon }: any) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[secondary ? styles.secondaryButton : styles.button, disabled && styles.disabled]}>
      {icon}
      <Text style={secondary ? styles.secondaryButtonText : styles.buttonText}>{label}</Text>
    </Pressable>
  )
}

function ScreenTitle({ eyebrow, title, subtitle }: any) {
  return (
    <View style={{ gap: 5 }}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.hero}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

function Loader({ label = "Carregando..." }: { label?: string }) {
  return (
    <SafeAreaView style={[styles.safe, styles.center]}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[styles.muted, { marginTop: 12 }]}>{label}</Text>
    </SafeAreaView>
  )
}

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data.user?.id || null
}

function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function login() {
    if (!email.trim() || !password) return Alert.alert("Atenção", "Informe e-mail e senha.")
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setLoading(false)
    if (error) Alert.alert("Não foi possível entrar", error.message)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.loginWrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.brandMark}><Scale color="#fff" size={34} /></View>
        <Text style={styles.hero}>NexJud Companion</Text>
        <Text style={styles.subtitle}>Seu escritório no bolso, conectado ao NexJud Workspace.</Text>
        <TextInput style={styles.input} placeholder="E-mail" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Senha" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={login} />
        <Button label={loading ? "Entrando..." : "Entrar"} onPress={login} disabled={loading} />
        <Pressable onPress={() => Linking.openURL(`${WEB_URL}/login`)}><Text style={styles.linkText}>Criar conta ou recuperar senha</Text></Pressable>
        <View style={styles.inline}><ShieldCheck color={colors.success} size={17} /><Text style={styles.helper}>Mesma conta, casos e documentos do Workspace.</Text></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function HomeScreen({ navigation }: any) {
  const [profile, setProfile] = useState<any>(null)
  const [cases, setCases] = useState<any[]>([])
  const [counts, setCounts] = useState({ docs: 0, chats: 0, cnj: 0 })
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    setRefreshing(true)
    const uid = await getUserId()
    if (!uid) return setRefreshing(false)
    const [p, c, d, h, n] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("legal_cases").select("*").eq("user_id", uid).order("updated_at", { ascending: false }).limit(5),
      supabase.from("knowledge_documents").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("chat_sessions").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("cnj_processes").select("id", { count: "exact", head: true }).eq("user_id", uid),
    ])
    setProfile(p.data)
    setCases(c.data || [])
    setCounts({ docs: d.count || 0, chats: h.count || 0, cnj: n.count || 0 })
    const raw = await AsyncStorage.getItem(`nexjud-agenda-${uid}`)
    setAgenda(raw ? JSON.parse(raw) : [])
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const firstName = (profile?.name || profile?.full_name || "Advogado").split(" ")[0]
  const today = new Date().toISOString().slice(0, 10)
  const todayItems = agenda.filter(i => i.date === today && !i.done)
  const trialDays = profile?.trial_ends_at ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000)) : null

  const actions = [
    { title: "Analisar documento", subtitle: "Foto, PDF ou DOCX", icon: FileSearch, route: "Scanner" },
    { title: "Criar peça", subtitle: "Rascunho guiado por IA", icon: FilePlus2, parent: "Studio" },
    { title: "Preparar audiência", subtitle: "Briefing do caso", icon: Gavel, parent: "HearingPicker" },
    { title: "Perguntar à IA", subtitle: "Legal Brain contextual", icon: Brain, route: "IA" },
    { title: "Registrar reunião", subtitle: "Anotação e tarefas", icon: Mic, parent: "MeetingNote" },
    { title: "Consultar casos", subtitle: "Processos e estratégia", icon: Briefcase, route: "Casos" },
  ]

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}><Text style={styles.eyebrow}>NEXJUD COMPANION</Text><Text style={styles.hero}>Olá, {firstName}.</Text></View>
        <Pressable style={styles.iconButton} onPress={() => navigation.navigate("Agenda")}><Bell color={colors.text} size={21} /></Pressable>
      </View>
      <Text style={styles.subtitle}>O que você precisa resolver agora?</Text>

      <View style={styles.statusCard}>
        <View style={styles.inline}><CheckCircle2 color={colors.success} size={20} /><Text style={styles.cardTitle}>{profile?.subscription_status === "active" ? "Plano ativo" : trialDays !== null ? `${trialDays} dia(s) de Trial Premium` : "Conta NexJud"}</Text></View>
        <Text style={styles.body}>{todayItems.length ? `${todayItems.length} compromisso(s) pendente(s) hoje.` : "Nenhuma pendência registrada para hoje."}</Text>
      </View>

      <Text style={styles.sectionTitle}>Resolver agora</Text>
      <View style={styles.actionGrid}>
        {actions.map(({ title, subtitle, icon: Icon, route, parent }) => (
          <Pressable key={title} style={styles.actionCard} onPress={() => parent ? navigation.getParent()?.navigate(parent) : navigation.navigate(route)}>
            <View style={styles.actionIcon}><Icon color={colors.primary} size={24} /></View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.helper}>{subtitle}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Visão rápida</Text><Pressable onPress={() => navigation.navigate("Agenda")}><Text style={styles.linkTextSmall}>Ver agenda</Text></Pressable></View>
      <View style={styles.metricsRow}>
        <Metric value={todayItems.length} label="Hoje" icon={<CalendarDays color={colors.primary} size={18} />} />
        <Metric value={counts.docs} label="Documentos" icon={<FileText color={colors.primary} size={18} />} />
        <Metric value={counts.cnj} label="CNJ" icon={<Scale color={colors.primary} size={18} />} />
      </View>

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Casos recentes</Text><Pressable onPress={() => navigation.navigate("Casos")}><Text style={styles.linkTextSmall}>Ver todos</Text></Pressable></View>
      {cases.length ? cases.map(item => <CaseCard key={item.id} item={item} onPress={() => navigation.getParent()?.navigate("CaseDetail", { caseId: item.id })} />) :
        <Empty title="Nenhum caso cadastrado" text="Cadastre seu primeiro caso no Workspace para sincronizar aqui." />}
    </ScrollView>
  )
}

function Metric({ value, label, icon }: any) {
  return <View style={styles.metric}>{icon}<Text style={styles.metricValue}>{value}</Text><Text style={styles.helper}>{label}</Text></View>
}

function Empty({ title, text }: any) {
  return <View style={styles.empty}><CircleAlert color={colors.muted} size={26} /><Text style={styles.cardTitle}>{title}</Text><Text style={[styles.helper, { textAlign: "center" }]}>{text}</Text></View>
}

function CaseCard({ item, onPress }: any) {
  const label = item.title || item.client_name || item.process_number || "Caso jurídico"
  const phase = item.phase || item.status || "Em acompanhamento"
  const attention = item.risk_level || item.priority || "Normal"
  return (
    <Pressable style={styles.caseCard} onPress={onPress}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{label}</Text>
        <Text style={styles.helper} numberOfLines={1}>{item.process_number || item.court || "Processo não informado"}</Text>
        <View style={styles.chipRow}><Text style={styles.chip}>{phase}</Text><Text style={styles.chip}>Atenção: {attention}</Text></View>
      </View>
      <ChevronRight color={colors.muted} size={22} />
    </Pressable>
  )
}

function ChatScreen() {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [caseId, setCaseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getUserId().then(async uid => {
      if (!uid) return
      const { data } = await supabase.from("legal_cases").select("id,title,client_name,process_number").eq("user_id", uid).order("updated_at", { ascending: false }).limit(20)
      setCases(data || [])
    })
  }, [])

  async function send(text = message) {
    const prompt = text.trim()
    if (!prompt || loading) return
    setMessages(prev => [...prev, { role: "user", content: prompt }])
    setMessage("")
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke("legal-chat-ai", { body: { message: prompt, caseId, source: "mobile" } })
      if (error) throw error
      const answer = data?.response || data?.answer || data?.message || "Resposta concluída. Consulte o Workspace para detalhes."
      setMessages(prev => [...prev, { role: "assistant", content: answer, context: data?.context }])
    } catch (e: any) {
      Alert.alert("Falha no Legal Brain", e.message || "Tente novamente.")
    } finally { setLoading(false) }
  }

  return (
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.pageFlex}>
        <ScreenTitle eyebrow="LEGAL BRAIN" title="Pergunte. Analise. Decida." subtitle="Use o contexto do caso, seus documentos e as fontes jurídicas do NexJud." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
          <Pressable style={[styles.selectorChip, !caseId && styles.selectorChipActive]} onPress={() => setCaseId(null)}><Text style={styles.selectorText}>Sem caso</Text></Pressable>
          {cases.map(c => <Pressable key={c.id} style={[styles.selectorChip, caseId === c.id && styles.selectorChipActive]} onPress={() => setCaseId(c.id)}><Text style={styles.selectorText} numberOfLines={1}>{c.title || c.client_name || c.process_number || "Caso"}</Text></Pressable>)}
        </ScrollView>

        {!messages.length ? (
          <ScrollView contentContainerStyle={{ gap: 9 }}>
            <Text style={styles.sectionTitle}>Sugestões inteligentes</Text>
            {quickPrompts.map(p => <Pressable key={p} style={styles.promptCard} onPress={() => send(p)}><Sparkles color={colors.primary} size={18} /><Text style={[styles.body, { flex: 1 }]}>{p}</Text><ArrowRight color={colors.muted} size={18} /></Pressable>)}
          </ScrollView>
        ) : (
          <FlatList data={messages} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ gap: 10, paddingVertical: 8 }} renderItem={({ item }) => (
            <View style={[styles.message, item.role === "user" ? styles.userMessage : styles.aiMessage]}>
              <Text style={styles.body}>{item.content}</Text>
              {item.context ? <Text style={styles.contextText}>Fontes e contexto considerados pelo Legal Brain.</Text> : null}
            </View>
          )} />
        )}

        {loading ? <View style={styles.inline}><ActivityIndicator color={colors.primary} /><Text style={styles.helper}>Consultando documentos, casos e fontes...</Text></View> : null}
        <View style={styles.composer}>
          <TextInput style={styles.composerInput} placeholder="Pergunte ao Legal Brain..." placeholderTextColor={colors.muted} multiline value={message} onChangeText={setMessage} />
          <Pressable style={styles.sendButton} onPress={() => send()}><Send color="#fff" size={20} /></Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

function CasesScreen({ navigation }: any) {
  const [cases, setCases] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserId().then(async uid => {
      if (!uid) return
      const { data } = await supabase.from("legal_cases").select("*").eq("user_id", uid).order("updated_at", { ascending: false })
      setCases(data || [])
      setLoading(false)
    })
  }, [])

  const filtered = cases.filter(c => JSON.stringify(c).toLowerCase().includes(query.toLowerCase()))
  if (loading) return <Loader label="Carregando casos..." />
  return (
    <View style={styles.safe}>
      <View style={styles.pageFlex}>
        <ScreenTitle eyebrow="CARTEIRA JURÍDICA" title="Casos" subtitle="Processos, estratégia, documentos e próximas ações em um só lugar." />
        <View style={styles.searchBox}><Search color={colors.muted} size={19} /><TextInput style={styles.searchInput} placeholder="Cliente, processo, tribunal ou assunto" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} /></View>
        <FlatList data={filtered} keyExtractor={i => i.id} contentContainerStyle={{ gap: 10, paddingBottom: 30 }} renderItem={({ item }) => <CaseCard item={item} onPress={() => navigation.getParent()?.navigate("CaseDetail", { caseId: item.id })} />} ListEmptyComponent={<Empty title="Nenhum caso encontrado" text="Revise sua busca ou cadastre um caso no Workspace." />} />
      </View>
    </View>
  )
}

function CaseDetailScreen({ route, navigation }: any) {
  const [item, setItem] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [cnj, setCnj] = useState<any[]>([])
  const caseId = route.params?.caseId

  useEffect(() => {
    Promise.all([
      supabase.from("legal_cases").select("*").eq("id", caseId).maybeSingle(),
      supabase.from("knowledge_documents").select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(10),
      supabase.from("cnj_processes").select("*").eq("case_id", caseId).limit(5),
    ]).then(([c, d, n]) => { setItem(c.data); setDocs(d.data || []); setCnj(n.data || []) })
  }, [caseId])

  if (!item) return <Loader label="Abrindo dossiê do caso..." />
  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.page}>
      <Pressable onPress={() => navigation.goBack()}><Text style={styles.linkTextSmall}>← Voltar</Text></Pressable>
      <ScreenTitle eyebrow="DOSSIÊ VIVO" title={item.title || item.client_name || "Caso jurídico"} subtitle={item.process_number || item.court || "Processo em acompanhamento"} />
      <View style={styles.statusCard}><Text style={styles.cardTitle}>Resumo executivo</Text><Text style={styles.body}>{item.summary || item.description || "O resumo será enriquecido conforme documentos, conversas e movimentações forem vinculados."}</Text></View>
      <View style={styles.actionRow}>
        <Button label="Modo audiência" onPress={() => navigation.navigate("Hearing", { caseId })} icon={<Gavel color="#fff" size={18} />} />
        <Button label="Perguntar à IA" secondary onPress={() => navigation.navigate("Main", { screen: "IA" })} icon={<Brain color={colors.primary} size={18} />} />
      </View>
      <InfoBlock title="Estratégia" text={item.strategy || item.legal_strategy || "Ainda não registrada."} />
      <InfoBlock title="Riscos e fragilidades" text={item.risks || item.risk_analysis || "Aguardando análise."} />
      <Text style={styles.sectionTitle}>Documentos ({docs.length})</Text>
      {docs.length ? docs.map(d => <View key={d.id} style={styles.rowCard}><FileText color={colors.primary} size={20} /><View style={{ flex: 1 }}><Text style={styles.body}>{d.title || d.file_name || "Documento"}</Text><Text style={styles.helper}>{d.processing_status || "Disponível"}</Text></View></View>) : <Empty title="Sem documentos vinculados" text="Use o Scanner para adicionar documentos a este caso." />}
      <Text style={styles.sectionTitle}>Movimentações CNJ ({cnj.length})</Text>
      {cnj.length ? cnj.map(n => <View key={n.id} style={styles.rowCard}><Scale color={colors.primary} size={20} /><Text style={[styles.body, { flex: 1 }]}>{n.last_movement || n.status || n.process_number || "Processo monitorado"}</Text></View>) : <Empty title="Sem movimentações disponíveis" text="Vincule ou consulte o processo CNJ no Workspace." />}
    </ScrollView>
  )
}

function InfoBlock({ title, text }: any) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.body}>{text}</Text></View>
}

function AgendaScreen() {
  const [items, setItems] = useState<AgendaItem[]>([])
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState<AgendaItem["type"]>("tarefa")
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => { getUserId().then(async id => { setUid(id); if (id) { const raw = await AsyncStorage.getItem(`nexjud-agenda-${id}`); setItems(raw ? JSON.parse(raw) : []) } }) }, [])

  async function save(next: AgendaItem[]) {
    setItems(next)
    if (uid) await AsyncStorage.setItem(`nexjud-agenda-${uid}`, JSON.stringify(next))
  }

  function add() {
    if (!title.trim()) return
    save([{ id: String(Date.now()), title: title.trim(), date, type }, ...items])
    setTitle("")
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.page}>
      <ScreenTitle eyebrow="AGENDA JURÍDICA" title="Prazos, audiências e tarefas" subtitle="Organize o dia e vincule cada compromisso à sua rotina jurídica." />
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Novo compromisso" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="AAAA-MM-DD" placeholderTextColor={colors.muted} value={date} onChangeText={setDate} />
        <View style={styles.chipRow}>{(["tarefa", "prazo", "audiencia"] as const).map(t => <Pressable key={t} style={[styles.selectorChip, type === t && styles.selectorChipActive]} onPress={() => setType(t)}><Text style={styles.selectorText}>{t}</Text></Pressable>)}</View>
        <Button label="Adicionar" onPress={add} icon={<Plus color="#fff" size={18} />} />
      </View>
      {items.length ? items.sort((a, b) => a.date.localeCompare(b.date)).map(i => (
        <Pressable key={i.id} style={[styles.rowCard, i.done && { opacity: .5 }]} onPress={() => save(items.map(x => x.id === i.id ? { ...x, done: !x.done } : x))}>
          {i.type === "prazo" ? <Clock3 color={colors.warning} size={20} /> : i.type === "audiencia" ? <Gavel color={colors.primary} size={20} /> : <ListTodo color={colors.success} size={20} />}
          <View style={{ flex: 1 }}><Text style={styles.body}>{i.title}</Text><Text style={styles.helper}>{i.date} · {i.type}</Text></View>
          <CheckCircle2 color={i.done ? colors.success : colors.muted} size={21} />
        </Pressable>
      )) : <Empty title="Agenda vazia" text="Adicione prazos, audiências e tarefas. A automação CNJ será conectada depois pelo n8n." />}
    </ScrollView>
  )
}

function ScannerScreen() {
  const [uploading, setUploading] = useState(false)
  const [cases, setCases] = useState<any[]>([])
  const [caseId, setCaseId] = useState<string | null>(null)

  useEffect(() => { getUserId().then(async uid => { if (!uid) return; const { data } = await supabase.from("legal_cases").select("id,title,client_name,process_number").eq("user_id", uid).limit(20); setCases(data || []) }) }, [])

  async function upload(asset: any) {
    const uid = await getUserId()
    if (!uid) return
    setUploading(true)
    try {
      const response = await fetch(asset.uri)
      const blob = await response.blob()
      const name = asset.name || `documento-${Date.now()}.jpg`
      const safe = name.replace(/[^a-zA-Z0-9._-]/g, "-")
      const path = `${uid}/mobile/${Date.now()}-${safe}`
      const { error } = await supabase.storage.from("knowledge-files").upload(path, blob, { contentType: asset.mimeType || "application/octet-stream" })
      if (error) throw error
      const payload: any = { user_id: uid, title: name, document_type: "mobile_upload", file_path: path, content: "Documento enviado pelo Companion. Aguardando processamento.", processing_status: "pending" }
      if (caseId) payload.case_id = caseId
      const inserted = await supabase.from("knowledge_documents").insert(payload)
      if (inserted.error) throw inserted.error
      Alert.alert("Documento recebido", "Ele já está sincronizado com o Workspace e pronto para o processamento jurídico.")
    } catch (e: any) { Alert.alert("Erro no envio", e.message || "Tente novamente.") } finally { setUploading(false) }
  }

  async function camera() {
    const p = await ImagePicker.requestCameraPermissionsAsync()
    if (!p.granted) return Alert.alert("Permissão necessária", "Autorize a câmera.")
    const r = await ImagePicker.launchCameraAsync({ quality: .9, mediaTypes: ["images"] })
    if (!r.canceled) upload({ ...r.assets[0], name: `foto-${Date.now()}.jpg` })
  }

  async function file() {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/*"] })
    if (!r.canceled) upload(r.assets[0])
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.page}>
      <ScreenTitle eyebrow="LEGAL LENS" title="Scanner inteligente" subtitle="Capture um documento e leve-o diretamente ao caso, ao Dossiê Vivo e ao Legal Brain." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
        <Pressable style={[styles.selectorChip, !caseId && styles.selectorChipActive]} onPress={() => setCaseId(null)}><Text style={styles.selectorText}>Knowledge Base</Text></Pressable>
        {cases.map(c => <Pressable key={c.id} style={[styles.selectorChip, caseId === c.id && styles.selectorChipActive]} onPress={() => setCaseId(c.id)}><Text style={styles.selectorText}>{c.title || c.client_name || c.process_number || "Caso"}</Text></Pressable>)}
      </ScrollView>
      <View style={styles.featureCard}><Camera color={colors.primary} size={38} /><Text style={styles.cardTitle}>Fotografar documento</Text><Text style={styles.body}>Despacho, sentença, contrato, ata, intimação ou prova física.</Text><Button label="Abrir câmera" onPress={camera} disabled={uploading} /></View>
      <View style={styles.featureCard}><Upload color={colors.primary} size={38} /><Text style={styles.cardTitle}>Importar arquivo</Text><Text style={styles.body}>PDF, DOCX ou imagem armazenada no aparelho.</Text><Button label="Selecionar arquivo" secondary onPress={file} disabled={uploading} /></View>
      {uploading ? <View style={styles.inline}><ActivityIndicator color={colors.primary} /><Text style={styles.helper}>Enviando com segurança...</Text></View> : null}
      <View style={styles.statusCard}><WandSparkles color={colors.primary} size={22} /><Text style={[styles.body, { flex: 1 }]}>Após o envio, use o Legal Brain para resumir, revisar riscos, gerar tese ou iniciar uma peça.</Text></View>
    </ScrollView>
  )
}

function StudioScreen({ navigation }: any) {
  const [piece, setPiece] = useState(pieceTypes[0])
  const [facts, setFacts] = useState("")
  const [objective, setObjective] = useState("")
  function start() {
    if (!facts.trim()) return Alert.alert("Conte os fatos", "Inclua ao menos um resumo do caso.")
    navigation.navigate("Main", { screen: "IA", params: { seed: `Elabore um rascunho de ${piece}. Fatos: ${facts}. Objetivo: ${objective || "proteger os interesses do cliente"}. Estruture com linguagem jurídica clara e indique pontos que exigem revisão profissional.` } })
  }
  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.page}>
      <ScreenTitle eyebrow="ESTÚDIO JURÍDICO" title="Comece uma peça no celular" subtitle="Estruture o rascunho aqui e continue a revisão completa no Workspace." />
      <Text style={styles.sectionTitle}>Tipo de documento</Text>
      <View style={styles.wrap}>{pieceTypes.map(p => <Pressable key={p} style={[styles.selectorChip, piece === p && styles.selectorChipActive]} onPress={() => setPiece(p)}><Text style={styles.selectorText}>{p}</Text></Pressable>)}</View>
      <TextInput style={[styles.input, styles.textarea]} placeholder="Resuma os fatos relevantes..." placeholderTextColor={colors.muted} multiline value={facts} onChangeText={setFacts} />
      <TextInput style={[styles.input, styles.textareaSmall]} placeholder="Qual é o objetivo principal?" placeholderTextColor={colors.muted} multiline value={objective} onChangeText={setObjective} />
      <Button label="Criar estrutura com IA" onPress={start} icon={<Sparkles color="#fff" size={18} />} />
      <Text style={styles.disclaimer}>O conteúdo gerado é um rascunho de apoio e deve ser revisado pelo profissional responsável.</Text>
    </ScrollView>
  )
}

function MeetingNoteScreen({ navigation }: any) {
  const [note, setNote] = useState("")
  function process() {
    if (!note.trim()) return
    navigation.navigate("Main", { screen: "IA", params: { seed: `Transforme esta anotação de reunião em: resumo executivo, decisões, pendências, riscos e lista de tarefas. Anotação: ${note}` } })
  }
  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.page}>
      <ScreenTitle eyebrow="REUNIÃO" title="Registre antes que se perca" subtitle="Cole ou dite uma anotação e transforme-a em resumo e tarefas." />
      <TextInput style={[styles.input, { minHeight: 220, textAlignVertical: "top" }]} multiline placeholder="Ex.: cliente aceita acordo até R$ 80 mil..." placeholderTextColor={colors.muted} value={note} onChangeText={setNote} />
      <Button label="Gerar resumo e tarefas" onPress={process} icon={<WandSparkles color="#fff" size={18} />} />
    </ScrollView>
  )
}

function HearingPickerScreen({ navigation }: any) {
  const [cases, setCases] = useState<any[]>([])
  useEffect(() => { getUserId().then(async uid => { if (!uid) return; const { data } = await supabase.from("legal_cases").select("*").eq("user_id", uid).order("updated_at", { ascending: false }); setCases(data || []) }) }, [])
  return <ScrollView style={styles.safe} contentContainerStyle={styles.page}><ScreenTitle eyebrow="MODO AUDIÊNCIA" title="Escolha o caso" subtitle="Abra um briefing limpo, objetivo e fácil de consultar." />{cases.map(c => <CaseCard key={c.id} item={c} onPress={() => navigation.navigate("Hearing", { caseId: c.id })} />)}</ScrollView>
}

function HearingScreen({ route, navigation }: any) {
  const [item, setItem] = useState<any>(null)
  useEffect(() => { supabase.from("legal_cases").select("*").eq("id", route.params?.caseId).maybeSingle().then(({ data }) => setItem(data)) }, [])
  if (!item) return <Loader label="Preparando audiência..." />
  const blocks = [
    ["Objetivo", item.objective || item.goal || "Defina o resultado principal da audiência."],
    ["Teses centrais", item.strategy || item.legal_strategy || "Estratégia ainda não registrada."],
    ["Pontos fortes", item.strengths || "Revise documentos e provas favoráveis."],
    ["Fragilidades", item.risks || item.risk_analysis || "Revise riscos antes do ato."],
    ["Perguntas sugeridas", item.hearing_questions || "Quem definiu as obrigações? Quais fatos podem ser comprovados? Há contradições?"],
    ["Pedidos", item.requests || item.claims || "Confirme os pedidos e alternativas de acordo."],
  ]
  return (
    <ScrollView style={styles.hearingSafe} contentContainerStyle={styles.hearingPage}>
      <Pressable onPress={() => navigation.goBack()}><Text style={styles.linkTextSmall}>← Sair do modo audiência</Text></Pressable>
      <Text style={styles.hearingTitle}>{item.title || item.client_name || "Audiência"}</Text>
      <Text style={styles.hearingSubtitle}>{item.process_number || item.court || ""}</Text>
      {blocks.map(([t, v]) => <View key={t} style={styles.hearingBlock}><Text style={styles.eyebrow}>{t}</Text><Text style={styles.hearingText}>{v}</Text></View>)}
    </ScrollView>
  )
}

function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState("")
  useEffect(() => { supabase.auth.getUser().then(async ({ data }) => { if (!data.user) return; setEmail(data.user.email || ""); const p = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle(); setProfile(p.data) }) }, [])
  const open = (path: string) => Linking.openURL(`${WEB_URL}${path}`)
  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.page}>
      <View style={styles.profileIcon}><User color="#fff" size={32} /></View>
      <Text style={styles.hero}>{profile?.name || profile?.full_name || "Minha conta"}</Text><Text style={styles.subtitle}>{email}</Text>
      <View style={styles.statusCard}><CheckCircle2 color={colors.success} size={21} /><View style={{ flex: 1 }}><Text style={styles.cardTitle}>NexJud sincronizado</Text><Text style={styles.helper}>Workspace e Companion compartilham conta e dados.</Text></View></View>
      <Menu label="Abrir Workspace" onPress={() => Linking.openURL(WEB_URL)} />
      <Menu label="Gerenciar assinatura" onPress={() => open("/pricing")} />
      <Menu label="Política de Privacidade" onPress={() => open("/privacy")} />
      <Menu label="Termos de Uso" onPress={() => open("/terms")} />
      <Menu label="Excluir conta e dados" onPress={() => open("/account-deletion")} danger />
      <Menu label="Suporte" onPress={() => Linking.openURL("mailto:suporte@nexjud.com.br")} />
      <Pressable style={styles.logout} onPress={() => supabase.auth.signOut()}><LogOut color={colors.danger} size={20} /><Text style={styles.logoutText}>Sair da conta</Text></Pressable>
      <Text style={styles.disclaimer}>NexJud Companion V2 · Apoio tecnológico ao profissional do Direito.</Text>
    </ScrollView>
  )
}

function Menu({ label, onPress, danger = false }: any) {
  return <Pressable style={styles.menu} onPress={onPress}><Text style={[styles.body, danger && { color: colors.danger }]}>{label}</Text><ChevronRight color={danger ? colors.danger : colors.muted} size={20} /></Pressable>
}

function MainTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: styles.tabLabel }}>
      <Tabs.Screen name="Início" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Home color={color} size={21} /> }} />
      <Tabs.Screen name="IA" component={ChatScreen} options={{ tabBarIcon: ({ color }) => <Brain color={color} size={21} /> }} />
      <Tabs.Screen name="Casos" component={CasesScreen} options={{ tabBarIcon: ({ color }) => <Briefcase color={color} size={21} /> }} />
      <Tabs.Screen name="Agenda" component={AgendaScreen} options={{ tabBarIcon: ({ color }) => <CalendarDays color={color} size={21} /> }} />
      <Tabs.Screen name="Perfil" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <User color={color} size={21} /> }} />
    </Tabs.Navigator>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const theme = useMemo(() => ({ ...DarkTheme, colors: { ...DarkTheme.colors, primary: colors.primary, background: colors.bg, card: colors.card, text: colors.text, border: colors.border, notification: colors.primary } }), [])
  if (!ready) return <Loader label="Iniciando NexJud Companion..." />

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session ? <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
            <Stack.Screen name="HearingPicker" component={HearingPickerScreen} />
            <Stack.Screen name="Hearing" component={HearingScreen} />
            <Stack.Screen name="Studio" component={StudioScreen} />
            <Stack.Screen name="MeetingNote" component={MeetingNoteScreen} />
          </> : <Stack.Screen name="Login" component={LoginScreen} />}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  hearingSafe: { flex: 1, backgroundColor: "#03050A" },
  center: { alignItems: "center", justifyContent: "center" },
  page: { padding: 20, gap: 14, paddingBottom: 36 },
  pageFlex: { flex: 1, padding: 18, gap: 12 },
  loginWrap: { flex: 1, justifyContent: "center", padding: 28, gap: 13 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: { width: 68, height: 68, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  profileIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  iconButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1.3 },
  hero: { color: colors.text, fontSize: 30, fontWeight: "800", letterSpacing: -.6 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 14 },
  helper: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  linkText: { color: colors.primary, fontSize: 14, textAlign: "center", fontWeight: "700", paddingVertical: 8 },
  linkTextSmall: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  input: { backgroundColor: colors.card, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  textarea: { minHeight: 170, textAlignVertical: "top" },
  textareaSmall: { minHeight: 100, textAlignVertical: "top" },
  button: { minHeight: 50, borderRadius: 15, backgroundColor: colors.primary, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  secondaryButton: { minHeight: 50, borderRadius: 15, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryButtonText: { color: colors.primary, fontWeight: "800", fontSize: 15 },
  disabled: { opacity: .5 },
  statusCard: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 17, gap: 9, flexDirection: "row", alignItems: "center" },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 17, gap: 10 },
  featureCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 20, gap: 12 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: { width: "48.5%", minHeight: 145, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 15, gap: 8 },
  actionIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  metricsRow: { flexDirection: "row", gap: 9 },
  metric: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 13, gap: 5 },
  metricValue: { color: colors.text, fontSize: 22, fontWeight: "800" },
  caseCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 },
  rowCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14 },
  empty: { alignItems: "center", justifyContent: "center", gap: 8, padding: 26, borderRadius: 18, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { color: colors.muted, fontSize: 11, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, backgroundColor: colors.cardAlt },
  horizontalChips: { gap: 8, paddingVertical: 3 },
  selectorChip: { maxWidth: 190, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  selectorChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  selectorText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  promptCard: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 13 },
  message: { maxWidth: "90%", borderRadius: 17, padding: 13 },
  userMessage: { alignSelf: "flex-end", backgroundColor: colors.primary },
  aiMessage: { alignSelf: "flex-start", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  contextText: { color: colors.muted, fontSize: 11, marginTop: 8 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 18, padding: 8 },
  composerInput: { flex: 1, color: colors.text, minHeight: 40, maxHeight: 110, paddingHorizontal: 8, paddingVertical: 9 },
  sendButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 13 },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 13 },
  actionRow: { flexDirection: "row", gap: 8 },
  menu: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 16 },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16 },
  logoutText: { color: colors.danger, fontWeight: "800" },
  disclaimer: { color: colors.muted, fontSize: 12, textAlign: "center", lineHeight: 18 },
  tabBar: { backgroundColor: colors.card, borderTopColor: colors.border, height: 68, paddingTop: 7, paddingBottom: 8 },
  tabLabel: { fontSize: 10, fontWeight: "800" },
  hearingPage: { padding: 22, gap: 16, paddingBottom: 50 },
  hearingTitle: { color: "#fff", fontSize: 34, fontWeight: "900" },
  hearingSubtitle: { color: colors.muted, fontSize: 17 },
  hearingBlock: { backgroundColor: "#0C101A", borderRadius: 20, borderWidth: 1, borderColor: "#20283A", padding: 20, gap: 10 },
  hearingText: { color: "#fff", fontSize: 20, lineHeight: 30 },
})
