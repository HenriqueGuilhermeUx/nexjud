import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { Brain, Briefcase, Camera, Home, LogOut, Send, Upload } from "lucide-react-native"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./src/lib/supabase"

const Stack = createNativeStackNavigator()
const Tabs = createBottomTabNavigator()
const colors = { bg: "#09090f", card: "#13131c", border: "#29293a", primary: "#6366f1", text: "#f8fafc", muted: "#94a3b8", success: "#22c55e" }

function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} style={[styles.button, disabled && { opacity: 0.5 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>
}

function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function login() {
    if (!email || !password) return Alert.alert("Atenção", "Informe e-mail e senha.")
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) Alert.alert("Não foi possível entrar", error.message)
  }

  return <SafeAreaView style={styles.safe}><View style={styles.loginWrap}>
    <View style={styles.logo}><Text style={{ fontSize: 28 }}>⚖</Text></View>
    <Text style={styles.hero}>NexJud Companion</Text>
    <Text style={styles.subtitle}>O advogado no seu bolso.</Text>
    <TextInput style={styles.input} placeholder="E-mail" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
    <TextInput style={styles.input} placeholder="Senha" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} />
    <Button label={loading ? "Entrando..." : "Entrar"} onPress={login} disabled={loading} />
    <Text style={styles.helper}>Use o mesmo login do NexJud Workspace.</Text>
  </View></SafeAreaView>
}

function HomeScreen({ navigation }: any) {
  const [profile, setProfile] = useState<any>(null)
  const [casesCount, setCasesCount] = useState(0)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  useEffect(() => { load() }, [])
  async function load() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const [{ data: p }, { count }] = await Promise.all([
      supabase.from("profiles").select("name,trial_ends_at,subscription_status").eq("id", auth.user.id).maybeSingle(),
      supabase.from("legal_cases").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id),
    ])
    setProfile(p)
    setCasesCount(count || 0)
    if (p?.trial_ends_at) setDaysLeft(Math.max(0, Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / 86400000)))
  }

  const name = profile?.name?.split(" ")?.[0] || "Advogado"
  return <ScrollView style={styles.safe} contentContainerStyle={styles.page}>
    <Text style={styles.eyebrow}>NEXJUD COMPANION</Text>
    <Text style={styles.hero}>Olá, {name}.</Text>
    <Text style={styles.subtitle}>O que você precisa agora?</Text>
    <View style={styles.grid}>
      <Quick icon={<Camera color={colors.primary} />} title="Escanear documento" subtitle="Foto ou arquivo para o seu caso" onPress={() => navigation.navigate("Scanner")} />
      <Quick icon={<Brain color={colors.primary} />} title="Perguntar à IA" subtitle="Legal Brain com o seu contexto" onPress={() => navigation.navigate("Chat")} />
      <Quick icon={<Briefcase color={colors.primary} />} title="Meus casos" subtitle="Acesse processos e estratégias" onPress={() => navigation.navigate("Casos")} />
      <Quick icon={<Upload color={colors.primary} />} title="Modo audiência" subtitle="Resumo rápido do caso" onPress={() => Alert.alert("Modo audiência", "Selecione um caso em Meus casos. A tela dedicada será conectada ao Dossiê Vivo na próxima publicação.")} />
    </View>
    <View style={styles.card}><Text style={styles.cardTitle}>Visão rápida</Text><Text style={styles.body}>{casesCount} caso(s) cadastrado(s)</Text><Text style={styles.body}>{daysLeft === null ? "Assinatura NexJud" : `${daysLeft} dia(s) restantes no Trial Premium`}</Text></View>
    <Pressable onPress={() => supabase.auth.signOut()} style={styles.logout}><LogOut color={colors.muted} size={18} /><Text style={styles.muted}>Sair</Text></Pressable>
  </ScrollView>
}

function Quick({ icon, title, subtitle, onPress }: any) {
  return <Pressable onPress={onPress} style={styles.quick}>{icon}<Text style={styles.quickTitle}>{title}</Text><Text style={styles.quickSub}>{subtitle}</Text></Pressable>
}

function CasesScreen() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { load() }, [])
  async function load() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const { data, error } = await supabase.from("legal_cases").select("*").eq("user_id", auth.user.id).order("updated_at", { ascending: false })
    if (error) Alert.alert("Erro", error.message)
    setItems(data || []); setLoading(false)
  }
  if (loading) return <Loader />
  return <SafeAreaView style={styles.safe}><FlatList contentContainerStyle={styles.page} data={items} keyExtractor={(item) => item.id} ListHeaderComponent={<><Text style={styles.hero}>Meus casos</Text><Text style={styles.subtitle}>Os mesmos casos do Workspace.</Text></>} ListEmptyComponent={<Text style={styles.muted}>Nenhum caso cadastrado.</Text>} renderItem={({ item }) => <View style={styles.card}><Text style={styles.cardTitle}>{item.title || item.client_name || "Caso jurídico"}</Text><Text style={styles.body}>{item.process_number || "Sem número CNJ"}</Text><Text style={styles.muted}>{item.legal_area || item.status || "Em acompanhamento"}</Text></View>} /></SafeAreaView>
}

function ChatScreen() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  async function send() {
    const text = input.trim(); if (!text || loading) return
    const { data: auth } = await supabase.auth.getUser(); if (!auth.user) return
    setMessages((m) => [...m, { role: "user", content: text }]); setInput(""); setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke("legal-chat-ai", { body: { userId: auth.user.id, message: text } })
      if (error) throw error
      setMessages((m) => [...m, { role: "assistant", content: data?.answer || "Não foi possível gerar a resposta." }])
    } catch (e: any) { Alert.alert("Erro no Legal Brain", e.message || "Tente novamente.") } finally { setLoading(false) }
  }
  return <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={styles.pageFlex}><Text style={styles.hero}>Legal Brain</Text><Text style={styles.subtitle}>Documentos, memória, jurisprudência, precedentes e CNJ.</Text><ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingVertical: 16 }}>{messages.map((m, i) => <View key={i} style={[styles.message, m.role === "user" ? styles.userMessage : styles.aiMessage]}><Text style={styles.messageLabel}>{m.role === "user" ? "Você" : "NexJud AI"}</Text><Text style={styles.body}>{m.content}</Text></View>)}{loading && <ActivityIndicator color={colors.primary} />}</ScrollView><View style={styles.composer}><TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} multiline placeholder="Pergunte ao NexJud..." placeholderTextColor={colors.muted} value={input} onChangeText={setInput} /><Pressable style={styles.send} onPress={send}><Send color="#fff" /></Pressable></View></View></KeyboardAvoidingView>
}

function ScannerScreen() {
  const [uploading, setUploading] = useState(false)
  async function uploadAsset(asset: { uri: string; name?: string; mimeType?: string }) {
    const { data: auth } = await supabase.auth.getUser(); if (!auth.user) return
    setUploading(true)
    try {
      const response = await fetch(asset.uri); const blob = await response.blob()
      const fileName = asset.name || `documento-${Date.now()}.jpg`
      const path = `${auth.user.id}/mobile/${Date.now()}-${fileName.replace(/\s+/g, "-")}`
      const { error: uploadError } = await supabase.storage.from("knowledge-files").upload(path, blob, { contentType: asset.mimeType || "image/jpeg" })
      if (uploadError) throw uploadError
      const { error: dbError } = await supabase.from("knowledge_documents").insert({ user_id: auth.user.id, title: fileName, document_type: "mobile_upload", file_path: path, content: "Documento enviado pelo NexJud Companion. Aguardando processamento/OCR." })
      if (dbError) throw dbError
      Alert.alert("Documento enviado", "O arquivo já está disponível no Workspace e na Knowledge Base.")
    } catch (e: any) { Alert.alert("Erro no envio", e.message || "Tente novamente.") } finally { setUploading(false) }
  }
  async function camera() { const perm = await ImagePicker.requestCameraPermissionsAsync(); if (!perm.granted) return Alert.alert("Permissão necessária", "Autorize o uso da câmera."); const r = await ImagePicker.launchCameraAsync({ quality: 0.8 }); if (!r.canceled) uploadAsset({ uri: r.assets[0].uri, name: `foto-${Date.now()}.jpg`, mimeType: r.assets[0].mimeType }) }
  async function file() { const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true }); if (!r.canceled) uploadAsset({ uri: r.assets[0].uri, name: r.assets[0].name, mimeType: r.assets[0].mimeType }) }
  return <SafeAreaView style={styles.safe}><View style={styles.pageFlex}><Text style={styles.hero}>Scanner jurídico</Text><Text style={styles.subtitle}>Envie o documento uma vez. Ele aparece também no NexJud Workspace.</Text><View style={styles.card}><Camera color={colors.primary} size={40} /><Text style={styles.cardTitle}>Fotografar documento</Text><Text style={styles.body}>Despacho, contrato, sentença, ata ou intimação.</Text><Button label="Abrir câmera" onPress={camera} disabled={uploading} /></View><View style={styles.card}><Upload color={colors.primary} size={40} /><Text style={styles.cardTitle}>Escolher arquivo</Text><Text style={styles.body}>PDF, DOCX ou imagem armazenada no celular.</Text><Button label="Selecionar arquivo" onPress={file} disabled={uploading} /></View>{uploading && <ActivityIndicator color={colors.primary} />}</View></SafeAreaView>
}

function Loader() { return <SafeAreaView style={[styles.safe, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={colors.primary} /></SafeAreaView> }

function MainTabs() {
  return <Tabs.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border }, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted }}>
    <Tabs.Screen name="Início" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Home color={color} size={20} /> }} />
    <Tabs.Screen name="Chat" component={ChatScreen} options={{ tabBarIcon: ({ color }) => <Brain color={color} size={20} /> }} />
    <Tabs.Screen name="Casos" component={CasesScreen} options={{ tabBarIcon: ({ color }) => <Briefcase color={color} size={20} /> }} />
    <Tabs.Screen name="Scanner" component={ScannerScreen} options={{ tabBarIcon: ({ color }) => <Camera color={color} size={20} /> }} />
  </Tabs.Navigator>
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) }); const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s)); return () => data.subscription.unsubscribe() }, [])
  const theme = useMemo(() => ({ dark: true, colors: { primary: colors.primary, background: colors.bg, card: colors.card, text: colors.text, border: colors.border, notification: colors.primary } }), [])
  if (!ready) return <Loader />
  return <NavigationContainer theme={theme}><StatusBar style="light" /><Stack.Navigator screenOptions={{ headerShown: false }}>{session ? <Stack.Screen name="Main" component={MainTabs} /> : <Stack.Screen name="Login" component={LoginScreen} />}</Stack.Navigator></NavigationContainer>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, page: { padding: 22, gap: 16 }, pageFlex: { flex: 1, padding: 22, gap: 16 }, loginWrap: { flex: 1, justifyContent: "center", padding: 28 }, logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 20 }, hero: { color: colors.text, fontSize: 32, fontWeight: "800" }, subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginBottom: 8 }, eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1.4 }, input: { color: colors.text, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 15, minHeight: 54, marginBottom: 12 }, button: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: "center", marginTop: 10 }, buttonText: { color: "#fff", fontWeight: "800" }, helper: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 16 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, quick: { width: "48%", minHeight: 150, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 18 }, quickTitle: { color: colors.text, fontWeight: "800", fontSize: 16, marginTop: 16 }, quickSub: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 6 }, card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 20, gap: 10, marginVertical: 6 }, cardTitle: { color: colors.text, fontWeight: "800", fontSize: 18 }, body: { color: colors.text, fontSize: 15, lineHeight: 22 }, muted: { color: colors.muted, fontSize: 13 }, logout: { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 18 }, message: { padding: 16, borderRadius: 18, borderWidth: 1 }, userMessage: { backgroundColor: "#27275f", borderColor: "#4444aa", marginLeft: 28 }, aiMessage: { backgroundColor: colors.card, borderColor: colors.border, marginRight: 18 }, messageLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", marginBottom: 7 }, composer: { flexDirection: "row", gap: 10, alignItems: "flex-end" }, send: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
})
