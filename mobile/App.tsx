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
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import {
  ArrowRight,
  Brain,
  Briefcase,
  Camera,
  CheckCircle2,
  Clock3,
  FileText,
  Gavel,
  Home,
  Link as LinkIcon,
  LogOut,
  MessageSquare,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
} from "lucide-react-native"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./src/lib/supabase"

const Stack = createNativeStackNavigator()
const Tabs = createBottomTabNavigator()
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://nexjud.netlify.app"

const colors = {
  bg: "#09090f",
  card: "#13131c",
  cardAlt: "#171723",
  border: "#29293a",
  primary: "#6366f1",
  primarySoft: "#24244d",
  text: "#f8fafc",
  muted: "#94a3b8",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
}

function PrimaryButton({ label, onPress, disabled = false, icon }: any) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.button, disabled && styles.disabled]}>
      {icon}
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  )
}

function SecondaryButton({ label, onPress, icon }: any) {
  return (
    <Pressable onPress={onPress} style={styles.secondaryButton}>
      {icon}
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
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

function EmptyState({ icon, title, description }: any) {
  return (
    <View style={styles.emptyState}>
      {icon}
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.muted, { textAlign: "center" }]}>{description}</Text>
    </View>
  )
}

function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function login() {
    if (!email.trim() || !password) {
      Alert.alert("Atenção", "Informe e-mail e senha.")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    setLoading(false)

    if (error) Alert.alert("Não foi possível entrar", error.message)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.loginWrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.logo}>
          <Scale color="#fff" size={34} />
        </View>
        <Text style={styles.hero}>NexJud Companion</Text>
        <Text style={styles.subtitle}>Seu escritório no bolso. Use o mesmo login do NexJud Workspace.</Text>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={colors.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={login}
        />
        <PrimaryButton label={loading ? "Entrando..." : "Entrar"} onPress={login} disabled={loading} />
        <Pressable onPress={() => Linking.openURL(`${WEB_URL}/login`)}>
          <Text style={styles.linkText}>Criar conta ou recuperar senha no Workspace</Text>
        </Pressable>
        <View style={styles.trustLine}>
          <ShieldCheck color={colors.success} size={17} />
          <Text style={styles.helper}>Conta, casos e documentos sincronizados.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function HomeScreen({ navigation }: any) {
  const [profile, setProfile] = useState<any>(null)
  const [summary, setSummary] = useState({ cases: 0, documents: 0, chats: 0, cnj: 0 })
  const [recentCases, setRecentCases] = useState<any[]>([])
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setRefreshing(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const [profileResult, casesResult, docsResult, chatsResult, cnjResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
      supabase.from("legal_cases").select("*").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(4),
      supabase.from("knowledge_documents").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id),
      supabase.from("chat_sessions").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id),
      supabase.from("cnj_processes").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id),
    ])

    const p = profileResult.data
    setProfile(p)
    setRecentCases(casesResult.data || [])
    setSummary({
      cases: casesResult.data?.length || 0,
      documents: docsResult.count || 0,
      chats: chatsResult.count || 0,
      cnj: cnjResult.count || 0,
    })

    if (p?.trial_ends_at) {
      setDaysLeft(Math.max(0, Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / 86400000)))
    } else {
      setDaysLeft(null)
    }
    setRefreshing(false)
  }

  const name = (profile?.name || profile?.full_name || "Advogado").split(" ")[0]
  const planText = profile?.subscription_status === "active"
    ? "Plano ativo"
    : daysLeft === null
      ? "Conta NexJud"
      : `${daysLeft} dia(s) restantes no Trial Premium`

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
    >
      <Text style={styles.eyebrow}>NEXJUD COMPANION</Text>
      <Text style={styles.hero}>Olá, {name}.</Text>
      <Text style={styles.subtitle}>O que você precisa resolver agora?</Text>

      <View style={styles.planBadge}>
        <CheckCircle2 color={colors.success} size={18} />
        <Text style={styles.planBadgeText}>{planText}</Text>
      </View>

      <View style={styles.grid}>
        <Quick
          icon={<Brain color={colors.primary} size={28} />}
          title="Perguntar à IA"
          subtitle="Legal Brain com o seu contexto"
          onPress={() => navigation.navigate("IA")}
        />
        <Quick
          icon={<Camera color={colors.primary} size={28} />}
          title="Escanear"
          subtitle="Foto, PDF ou DOCX para um caso"
          onPress={() => navigation.navigate("Scanner")}
        />
        <Quick
          icon={<Briefcase color={colors.primary} size={28} />}
          title="Meus casos"
          subtitle="Processos, documentos e estratégia"
          onPress={() => navigation.navigate("Casos")}
        />
        <Quick
          icon={<Gavel color={colors.primary} size={28} />}
          title="Modo audiência"
          subtitle="Briefing limpo e objetivo"
          onPress={() => navigation.getParent()?.navigate("HearingPicker")}
        />
      </View>

      <Text style={styles.sectionTitle}>Resumo do dia</Text>
      <View style={styles.metricsRow}>
        <Metric value={summary.documents} label="Documentos" icon={<FileText color={colors.primary} size={18} />} />
        <Metric value={summary.chats} label="Chats" icon={<MessageSquare color={colors.primary} size={18} />} />
        <Metric value={summary.cnj} label="Processos CNJ" icon={<Scale color={colors.primary} size={18} />} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Casos recentes</Text>
        <Pressable onPress={() => navigation.navigate("Casos")}>
          <Text style={styles.linkTextInline}>Ver todos</Text>
        </Pressable>
      </View>

      {recentCases.length === 0 ? (
        <EmptyState
          icon={<Briefcase color={colors.muted} size={32} />}
          title="Nenhum caso cadastrado"
          description="Cadastre o primeiro caso no Workspace e ele aparecerá aqui automaticamente."
        />
      ) : (
        recentCases.map((item) => (
          <CaseCard
            key={item.id}
            item={item}
            onPress={() => navigation.getParent()?.navigate("CaseDetail", { caseItem: item })}
          />
        ))
      )}
    </ScrollView>
  )
}

function Quick({ icon, title, subtitle, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={styles.quick}>
      {icon}
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSub}>{subtitle}</Text>
      <ArrowRight color={colors.muted} size={18} style={{ marginTop: "auto" }} />
    </Pressable>
  )
}

function Metric({ value, label, icon }: any) {
  return (
    <View style={styles.metric}>
      {icon}
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

function CaseCard({ item, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={styles.caseCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.title || item.client_name || item.name || "Caso jurídico"}</Text>
        <Text style={styles.body}>{item.process_number || "Sem número CNJ"}</Text>
        <Text style={styles.muted}>{item.legal_area || item.area || item.status || "Em acompanhamento"}</Text>
      </View>
      <ArrowRight color={colors.muted} size={20} />
    </Pressable>
  )
}

function CasesScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setRefreshing(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { data, error } = await supabase
      .from("legal_cases")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false })

    if (error) Alert.alert("Erro", error.message)
    setItems(data || [])
    setLoading(false)
    setRefreshing(false)
  }

  const filtered = items.filter((item) => {
    const value = `${item.title || ""} ${item.client_name || ""} ${item.process_number || ""} ${item.legal_area || ""}`.toLowerCase()
    return value.includes(query.toLowerCase())
  })

  if (loading) return <Loader label="Carregando seus casos..." />

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        contentContainerStyle={styles.page}
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            <Text style={styles.hero}>Meus casos</Text>
            <Text style={styles.subtitle}>Os mesmos casos, documentos e processos do Workspace.</Text>
            <View style={styles.searchBox}>
              <Search color={colors.muted} size={19} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cliente, número ou área..."
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
              />
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Briefcase color={colors.muted} size={34} />}
            title="Nenhum caso encontrado"
            description="Tente outra busca ou cadastre um caso pelo Workspace."
          />
        }
        renderItem={({ item }) => (
          <CaseCard item={item} onPress={() => navigation.getParent()?.navigate("CaseDetail", { caseItem: item })} />
        )}
      />
    </SafeAreaView>
  )
}

function CaseDetailScreen({ route, navigation }: any) {
  const caseItem = route.params?.caseItem
  const [documents, setDocuments] = useState<any[]>([])
  const [cnj, setCnj] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRelated()
  }, [caseItem?.id])

  async function loadRelated() {
    if (!caseItem?.id) return
    const [docsResult, cnjResult] = await Promise.all([
      supabase.from("knowledge_documents").select("*").eq("case_id", caseItem.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("cnj_processes").select("*").eq("case_id", caseItem.id).order("updated_at", { ascending: false }).limit(5),
    ])
    setDocuments(docsResult.data || [])
    setCnj(cnjResult.data || [])
    setLoading(false)
  }

  if (!caseItem) return <Loader />

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.page}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.linkTextInline}>← Voltar</Text>
      </Pressable>
      <Text style={styles.eyebrow}>CASO</Text>
      <Text style={styles.hero}>{caseItem.title || caseItem.client_name || "Caso jurídico"}</Text>
      <Text style={styles.subtitle}>{caseItem.process_number || "Sem número CNJ cadastrado"}</Text>

      <View style={styles.actionsRow}>
        <PrimaryButton
          label="Modo audiência"
          onPress={() => navigation.navigate("Hearing", { caseItem })}
          icon={<Gavel color="#fff" size={19} />}
        />
        <SecondaryButton
          label="Perguntar à IA"
          onPress={() => navigation.navigate("Main", { screen: "IA", params: { caseItem } })}
          icon={<Brain color={colors.primary} size={19} />}
        />
      </View>

      <InfoCard title="Resumo do caso" value={caseItem.summary || caseItem.description || caseItem.facts || "Resumo ainda não cadastrado."} />
      <InfoCard title="Objetivo" value={caseItem.objective || caseItem.goal || "Objetivo ainda não cadastrado."} />
      <InfoCard title="Estratégia atual" value={caseItem.strategy || caseItem.strategy_summary || "Estratégia ainda não cadastrada."} />
      <InfoCard title="Riscos" value={caseItem.risks || caseItem.risk_summary || "Riscos ainda não cadastrados."} />

      <Text style={styles.sectionTitle}>Documentos vinculados</Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : documents.length === 0 ? (
        <Text style={styles.muted}>Nenhum documento vinculado diretamente a este caso.</Text>
      ) : documents.map((doc) => (
        <View key={doc.id} style={styles.listRow}>
          <FileText color={colors.primary} size={20} />
          <View style={{ flex: 1 }}>
            <Text style={styles.body}>{doc.title || doc.file_name || "Documento"}</Text>
            <Text style={styles.muted}>{doc.processing_status || doc.document_type || "Knowledge Base"}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Movimentações CNJ</Text>
      {cnj.length === 0 ? (
        <Text style={styles.muted}>Nenhuma movimentação vinculada diretamente a este caso.</Text>
      ) : cnj.map((process) => (
        <View key={process.id} style={styles.card}>
          <Text style={styles.cardTitle}>{process.process_number}</Text>
          <Text style={styles.body}>{process.last_movement || "Sem movimentação recente."}</Text>
          <Text style={styles.muted}>{process.court || process.class_name || "Processo judicial"}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

function InfoCard({ title, value }: { title: string; value: any }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.body}>{String(value)}</Text>
    </View>
  )
}

function HearingPickerScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: auth }) => {
      if (!auth.user) return
      const { data } = await supabase.from("legal_cases").select("*").eq("user_id", auth.user.id).order("updated_at", { ascending: false })
      setItems(data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <Loader label="Preparando seus casos..." />

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        contentContainerStyle={styles.page}
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <Pressable onPress={() => navigation.goBack()}><Text style={styles.linkTextInline}>← Voltar</Text></Pressable>
            <Text style={styles.hero}>Modo audiência</Text>
            <Text style={styles.subtitle}>Escolha o caso para abrir um briefing objetivo, com fonte grande e sem distrações.</Text>
          </>
        }
        ListEmptyComponent={<EmptyState icon={<Gavel color={colors.muted} size={34} />} title="Nenhum caso disponível" description="Cadastre um caso no Workspace para preparar a audiência." />}
        renderItem={({ item }) => <CaseCard item={item} onPress={() => navigation.navigate("Hearing", { caseItem: item })} />}
      />
    </SafeAreaView>
  )
}

function HearingScreen({ route, navigation }: any) {
  const caseItem = route.params?.caseItem || {}
  const blocks = [
    ["Resumo do caso", caseItem.summary || caseItem.description || caseItem.facts],
    ["Objetivo", caseItem.objective || caseItem.goal],
    ["Teses principais", caseItem.theses || caseItem.legal_thesis || caseItem.strategy],
    ["Pontos fortes", caseItem.strengths || caseItem.positive_factors],
    ["Fragilidades", caseItem.weaknesses || caseItem.risks || caseItem.risk_summary],
    ["Provas", caseItem.evidence || caseItem.proofs],
    ["Perguntas estratégicas", caseItem.questions || caseItem.hearing_questions],
    ["Pedidos", caseItem.requests || caseItem.claims],
  ]

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.hearingPage}>
      <Pressable onPress={() => navigation.goBack()}><Text style={styles.linkTextInline}>← Sair do modo audiência</Text></Pressable>
      <View style={styles.hearingHeader}>
        <Gavel color="#fff" size={28} />
        <View style={{ flex: 1 }}>
          <Text style={styles.hearingTitle}>{caseItem.title || caseItem.client_name || "Audiência"}</Text>
          <Text style={styles.hearingProcess}>{caseItem.process_number || "Sem número CNJ"}</Text>
        </View>
      </View>

      {blocks.map(([title, value]) => (
        <View key={String(title)} style={styles.hearingBlock}>
          <Text style={styles.hearingBlockTitle}>{title}</Text>
          <Text style={styles.hearingText}>{value ? String(value) : "Informação ainda não cadastrada no caso."}</Text>
        </View>
      ))}

      <PrimaryButton
        label="Perguntar ao Legal Brain"
        onPress={() => navigation.navigate("Main", { screen: "IA", params: { caseItem } })}
        icon={<Brain color="#fff" size={20} />}
      />
      <Text style={styles.disclaimer}>Ferramenta de apoio. Confira os autos e valide a estratégia profissionalmente.</Text>
    </ScrollView>
  )
}

function ChatScreen({ route }: any) {
  const caseItem = route?.params?.caseItem
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const { data } = await supabase.from("chat_sessions").select("*").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(10)
    setSessions(data || [])
    setLoadingHistory(false)
  }

  async function openSession(session: any) {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    setActiveSession(session)
    const { data } = await supabase.from("chat_messages").select("*").eq("session_id", session.id).eq("user_id", auth.user.id).order("created_at", { ascending: true })
    setMessages(data || [])
  }

  async function createSession(title: string, userId: string) {
    const { data, error } = await supabase.from("chat_sessions").insert({
      user_id: userId,
      title: title.slice(0, 60),
      case_id: caseItem?.id || null,
    }).select().single()
    if (error) throw error
    setSessions((current) => [data, ...current])
    setActiveSession(data)
    return data
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    setInput("")
    setLoading(true)

    try {
      const session = activeSession || await createSession(text, auth.user.id)
      const optimistic = { id: `local-${Date.now()}`, role: "user", content: text }
      setMessages((current) => [...current, optimistic])

      await supabase.from("chat_messages").insert({
        user_id: auth.user.id,
        session_id: session.id,
        role: "user",
        content: text,
      })

      const { data, error } = await supabase.functions.invoke("legal-chat-ai", {
        body: {
          userId: auth.user.id,
          sessionId: session.id,
          message: text,
          caseId: caseItem?.id || session.case_id || null,
        },
      })
      if (error) throw error

      const answer = data?.answer || "Não foi possível gerar a resposta."
      const { data: saved } = await supabase.from("chat_messages").insert({
        user_id: auth.user.id,
        session_id: session.id,
        role: "assistant",
        content: answer,
        context_used: data?.contextUsed || {},
      }).select().single()

      setMessages((current) => [...current, saved || { id: `ai-${Date.now()}`, role: "assistant", content: answer, context_used: data?.contextUsed }])
      await supabase.from("chat_sessions").update({ summary: answer.slice(0, 240), updated_at: new Date().toISOString() }).eq("id", session.id)
    } catch (error: any) {
      Alert.alert("Erro no Legal Brain", error.message || "Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.pageFlex}>
        <Text style={styles.hero}>Legal Brain</Text>
        <Text style={styles.subtitle}>{caseItem ? `Contexto selecionado: ${caseItem.title || caseItem.client_name}` : "Documentos, memória, jurisprudência, precedentes e CNJ."}</Text>

        {!activeSession && !caseItem && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 55 }} contentContainerStyle={{ gap: 8 }}>
            {loadingHistory ? <ActivityIndicator color={colors.primary} /> : sessions.map((session) => (
              <Pressable key={session.id} onPress={() => openSession(session)} style={styles.sessionChip}>
                <MessageSquare color={colors.primary} size={15} />
                <Text style={styles.sessionChipText} numberOfLines={1}>{session.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingVertical: 12 }}>
          {messages.length === 0 && (
            <EmptyState
              icon={<Brain color={colors.primary} size={38} />}
              title="Como posso ajudar?"
              description="Pergunte sobre um documento, caso, processo, estratégia ou peça jurídica."
            />
          )}
          {messages.map((message, index) => (
            <View key={message.id || index} style={[styles.message, message.role === "user" ? styles.userMessage : styles.aiMessage]}>
              <Text style={styles.messageLabel}>{message.role === "user" ? "Você" : "NexJud AI"}</Text>
              <Text style={styles.body}>{message.content}</Text>
              {message.role === "assistant" && message.context_used && (
                <ContextSummary context={message.context_used} />
              )}
            </View>
          ))}
          {loading && (
            <View style={styles.loadingMessage}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Consultando documentos, casos e fontes jurídicas...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={[styles.input, styles.composerInput]}
            multiline
            placeholder="Pergunte ao NexJud..."
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
          />
          <Pressable style={[styles.send, (!input.trim() || loading) && styles.disabled]} onPress={send} disabled={!input.trim() || loading}>
            <Send color="#fff" size={21} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

function ContextSummary({ context }: any) {
  const values = [
    ["Docs", context.documents || 0],
    ["Knowledge", context.knowledge || context.chunks || 0],
    ["Jurisprudência", context.jurisprudence || 0],
    ["Precedentes", context.precedents || 0],
    ["CNJ", context.cnjProcesses || context.cnj || 0],
  ].filter(([, value]) => Number(value) > 0)

  if (!values.length) return null
  return (
    <View style={styles.contextRow}>
      {values.map(([label, value]) => <Text key={String(label)} style={styles.contextChip}>{label}: {value}</Text>)}
    </View>
  )
}

function ScannerScreen() {
  const [uploading, setUploading] = useState(false)
  const [cases, setCases] = useState<any[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: auth }) => {
      if (!auth.user) return
      const { data } = await supabase.from("legal_cases").select("id,title,client_name,process_number").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(20)
      setCases(data || [])
    })
  }, [])

  async function uploadAsset(asset: { uri: string; name?: string; mimeType?: string }) {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    setUploading(true)
    try {
      const response = await fetch(asset.uri)
      const blob = await response.blob()
      const fileName = asset.name || `documento-${Date.now()}.jpg`
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-")
      const path = `${auth.user.id}/mobile/${Date.now()}-${safeName}`

      const { error: uploadError } = await supabase.storage.from("knowledge-files").upload(path, blob, {
        contentType: asset.mimeType || "application/octet-stream",
        upsert: false,
      })
      if (uploadError) throw uploadError

      const payload: any = {
        user_id: auth.user.id,
        title: fileName,
        document_type: "mobile_upload",
        file_path: path,
        content: "Documento enviado pelo NexJud Companion. Aguardando processamento/OCR.",
        processing_status: "pending",
      }
      if (selectedCaseId) payload.case_id = selectedCaseId

      let { error: dbError } = await supabase.from("knowledge_documents").insert(payload)
      if (dbError && selectedCaseId) {
        delete payload.case_id
        const fallback = await supabase.from("knowledge_documents").insert(payload)
        dbError = fallback.error
      }
      if (dbError) throw dbError

      Alert.alert("Documento enviado", selectedCaseId
        ? "O arquivo foi enviado e vinculado ao caso selecionado. Ele também aparecerá no Workspace."
        : "O arquivo foi enviado para a Knowledge Base e também aparecerá no Workspace.")
    } catch (error: any) {
      Alert.alert("Erro no envio", error.message || "Tente novamente.")
    } finally {
      setUploading(false)
    }
  }

  async function camera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Autorize o uso da câmera para digitalizar documentos.")
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, mediaTypes: ["images"] })
    if (!result.canceled) {
      const item = result.assets[0]
      uploadAsset({ uri: item.uri, name: `foto-${Date.now()}.jpg`, mimeType: item.mimeType || "image/jpeg" })
    }
  }

  async function file() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/*"],
    })
    if (!result.canceled) {
      const item = result.assets[0]
      uploadAsset({ uri: item.uri, name: item.name, mimeType: item.mimeType })
    }
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.page}>
      <Text style={styles.hero}>Scanner jurídico</Text>
      <Text style={styles.subtitle}>Fotografe ou importe. O documento ficará disponível também no Workspace.</Text>

      <Text style={styles.sectionTitle}>Vincular a um caso</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pressable onPress={() => setSelectedCaseId(null)} style={[styles.caseChip, !selectedCaseId && styles.caseChipActive]}>
          <Text style={styles.caseChipText}>Knowledge Base geral</Text>
        </Pressable>
        {cases.map((item) => (
          <Pressable key={item.id} onPress={() => setSelectedCaseId(item.id)} style={[styles.caseChip, selectedCaseId === item.id && styles.caseChipActive]}>
            <Text style={styles.caseChipText} numberOfLines={1}>{item.title || item.client_name || item.process_number || "Caso"}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.card}>
        <Camera color={colors.primary} size={42} />
        <Text style={styles.cardTitle}>Fotografar documento</Text>
        <Text style={styles.body}>Despacho, sentença, contrato, ata, intimação ou documento físico.</Text>
        <PrimaryButton label="Abrir câmera" onPress={camera} disabled={uploading} />
      </View>

      <View style={styles.card}>
        <Upload color={colors.primary} size={42} />
        <Text style={styles.cardTitle}>Escolher arquivo</Text>
        <Text style={styles.body}>Importe PDF, DOCX ou imagem armazenada no celular.</Text>
        <SecondaryButton label="Selecionar arquivo" onPress={file} icon={<FileText color={colors.primary} size={19} />} />
      </View>

      {uploading && (
        <View style={styles.loadingMessage}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Enviando com segurança...</Text>
        </View>
      )}

      <View style={styles.infoBanner}>
        <ShieldCheck color={colors.success} size={22} />
        <Text style={[styles.body, { flex: 1 }]}>O app usa o mesmo ambiente seguro do NexJud Workspace. Seus arquivos não ficam públicos.</Text>
      </View>
    </ScrollView>
  )
}

function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState("")

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: auth }) => {
      if (!auth.user) return
      setEmail(auth.user.email || "")
      const { data } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle()
      setProfile(data)
    })
  }, [])

  function open(path: string) {
    Linking.openURL(`${WEB_URL}${path}`)
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.page}>
      <View style={styles.profileIcon}><User color="#fff" size={34} /></View>
      <Text style={styles.hero}>{profile?.name || profile?.full_name || "Minha conta"}</Text>
      <Text style={styles.subtitle}>{email}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assinatura</Text>
        <Text style={styles.body}>{profile?.subscription_status === "active" ? "Plano NexJud ativo" : "Trial ou plano gerenciado pelo Workspace"}</Text>
        <SecondaryButton label="Gerenciar no Workspace" onPress={() => open("/pricing")} icon={<LinkIcon color={colors.primary} size={19} />} />
      </View>

      <MenuLink label="Abrir NexJud Workspace" onPress={() => Linking.openURL(WEB_URL)} />
      <MenuLink label="Política de Privacidade" onPress={() => open("/privacy")} />
      <MenuLink label="Termos de Uso" onPress={() => open("/terms")} />
      <MenuLink label="Solicitar exclusão da conta e dos dados" onPress={() => open("/account-deletion")} danger />
      <MenuLink label="Suporte" onPress={() => Linking.openURL("mailto:suporte@nexjud.com.br")} />

      <Pressable onPress={() => supabase.auth.signOut()} style={styles.logoutButton}>
        <LogOut color={colors.danger} size={20} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </Pressable>

      <Text style={styles.disclaimer}>NexJud Companion v1.0.0 · Apoio tecnológico ao profissional do Direito.</Text>
    </ScrollView>
  )
}

function MenuLink({ label, onPress, danger = false }: any) {
  return (
    <Pressable onPress={onPress} style={styles.menuLink}>
      <Text style={[styles.body, danger && { color: colors.danger }]}>{label}</Text>
      <ArrowRight color={danger ? colors.danger : colors.muted} size={19} />
    </Pressable>
  )
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 66, paddingTop: 7, paddingBottom: 7 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="Início" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Home color={color} size={21} /> }} />
      <Tabs.Screen name="IA" component={ChatScreen} options={{ tabBarIcon: ({ color }) => <Brain color={color} size={21} /> }} />
      <Tabs.Screen name="Casos" component={CasesScreen} options={{ tabBarIcon: ({ color }) => <Briefcase color={color} size={21} /> }} />
      <Tabs.Screen name="Scanner" component={ScannerScreen} options={{ tabBarIcon: ({ color }) => <Camera color={color} size={21} /> }} />
      <Tabs.Screen name="Perfil" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <User color={color} size={21} /> }} />
    </Tabs.Navigator>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => data.subscription.unsubscribe()
  }, [])

  const theme = useMemo(() => ({
    dark: true,
    colors: {
      primary: colors.primary,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  }), [])

  if (!ready) return <Loader label="Iniciando NexJud Companion..." />

  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
            <Stack.Screen name="HearingPicker" component={HearingPickerScreen} />
            <Stack.Screen name="Hearing" component={HearingScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  page: { padding: 22, gap: 14, paddingBottom: 36 },
  pageFlex: { flex: 1, padding: 20, gap: 12 },
  loginWrap: { flex: 1, justifyContent: "center", padding: 28 },
  logo: { width: 68, height: 68, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  hero: { color: colors.text, fontSize: 31, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginBottom: 6 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1.4 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "800", marginTop: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  input: { color: colors.text, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 15, minHeight: 54, marginBottom: 12 },
  button: { flexDirection: "row", gap: 9, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 6 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  secondaryButton: { flexDirection: "row", gap: 9, backgroundColor: colors.primarySoft, borderColor: "#3e3e75", borderWidth: 1, paddingHorizontal: 17, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 6 },
  secondaryButtonText: { color: colors.text, fontWeight: "800", fontSize: 14 },
  disabled: { opacity: 0.45 },
  helper: { color: colors.muted, fontSize: 12 },
  linkText: { color: colors.primary, textAlign: "center", fontWeight: "700", marginTop: 18 },
  linkTextInline: { color: colors.primary, fontWeight: "800", fontSize: 14 },
  trustLine: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, marginTop: 20 },
  planBadge: { flexDirection: "row", gap: 8, alignItems: "center", alignSelf: "flex-start", backgroundColor: "#11261a", borderColor: "#1d5731", borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  planBadgeText: { color: "#86efac", fontWeight: "700", fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quick: { width: "48%", minHeight: 170, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 18 },
  quickTitle: { color: colors.text, fontWeight: "800", fontSize: 16, marginTop: 15 },
  quickSub: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 6 },
  metricsRow: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 13, minHeight: 108 },
  metricValue: { color: colors.text, fontSize: 25, fontWeight: "800", marginTop: 8 },
  metricLabel: { color: colors.muted, fontSize: 11, marginTop: 3 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 19, gap: 9, marginVertical: 3 },
  cardTitle: { color: colors.text, fontWeight: "800", fontSize: 18 },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  caseCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 17 },
  emptyState: { alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 30, marginVertical: 8 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: colors.text, minHeight: 52, fontSize: 15 },
  actionsRow: { gap: 8 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 15, padding: 14 },
  hearingPage: { padding: 20, gap: 12, paddingBottom: 40 },
  hearingHeader: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: colors.primary, borderRadius: 20, padding: 20 },
  hearingTitle: { color: "#fff", fontSize: 23, fontWeight: "900" },
  hearingProcess: { color: "#dbeafe", fontSize: 14, marginTop: 3 },
  hearingBlock: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 18, gap: 8 },
  hearingBlockTitle: { color: colors.primary, fontWeight: "900", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.8 },
  hearingText: { color: colors.text, fontSize: 18, lineHeight: 27 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 8 },
  sessionChip: { flexDirection: "row", alignItems: "center", gap: 7, maxWidth: 210, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  sessionChipText: { color: colors.text, fontSize: 12, fontWeight: "700", maxWidth: 165 },
  message: { borderRadius: 18, padding: 15, borderWidth: 1, gap: 7 },
  userMessage: { backgroundColor: colors.primarySoft, borderColor: "#3d3d75", marginLeft: 38 },
  aiMessage: { backgroundColor: colors.card, borderColor: colors.border, marginRight: 20 },
  messageLabel: { color: colors.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  loadingMessage: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: 15, padding: 14 },
  contextRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  contextChip: { color: "#c7d2fe", backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, fontSize: 10, fontWeight: "700" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 9 },
  composerInput: { flex: 1, marginBottom: 0, maxHeight: 130 },
  send: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  caseChip: { maxWidth: 190, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10 },
  caseChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  caseChipText: { color: colors.text, fontWeight: "700", fontSize: 12 },
  infoBanner: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#102218", borderColor: "#1c4c2d", borderWidth: 1, borderRadius: 17, padding: 16 },
  profileIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  menuLink: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 15, padding: 16 },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderColor: "#5b2020", borderWidth: 1, backgroundColor: "#261111", borderRadius: 15, padding: 15, marginTop: 8 },
  logoutText: { color: colors.danger, fontWeight: "800" },
})
