import { useEffect, useState } from "react"
import { BookOpen, FileText, Plus, Search, Trash2, Sparkles } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  createKnowledgeDocument,
  getKnowledgeDocuments,
  uploadKnowledgeFile,
  createKnowledgeChunks,
} from "@/services/aiWorkspaceService"
import { supabase } from "@/lib/supabase"

export default function KnowledgeBase() {
  const { user } = useAuth()

  const [documents, setDocuments] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [title, setTitle] = useState("")
  const [documentType, setDocumentType] = useState("peticao")
  const [clientName, setClientName] = useState("")
  const [processNumber, setProcessNumber] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")

  useEffect(() => {
    load()
  }, [user])

  useEffect(() => {
    const q = query.toLowerCase().trim()

    if (!q) {
      setFiltered(documents)
      return
    }

    setFiltered(
      documents.filter((doc) =>
        JSON.stringify(doc).toLowerCase().includes(q)
      )
    )
  }, [query, documents])

  async function load() {
    if (!user?.id) return

    setLoading(true)

    try {
      const data = await getKnowledgeDocuments(user.id)
      setDocuments(data || [])
      setFiltered(data || [])
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar Knowledge Base.")
    } finally {
      setLoading(false)
    }
  }

async function uploadFileDocument() {
  if (!user?.id) {
    alert("Faça login novamente.")
    return
  }

  if (!selectedFile) {
    alert("Selecione um arquivo.")
    return
  }

  setUploading(true)

  try {
    const uploaded = await uploadKnowledgeFile({
      userId: user.id,
      file: selectedFile,
    })

    const savedDocument = await createKnowledgeDocument({
      user_id: user.id,
      title: title || uploaded.fileName,
      document_type: documentType,
      client_name: clientName || null,
      process_number: processNumber || null,
      file_name: uploaded.fileName,
      file_url: uploaded.url,
      content: content || `Arquivo enviado: ${uploaded.fileName}`,
      summary: content
        ? content.slice(0, 500)
        : `Arquivo ${uploaded.fileName} enviado para a Knowledge Base.`,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: "uploaded",
      metadata: {
        path: uploaded.path,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
      },
    })

    setSelectedFile(null)
    setTitle("")
    setContent("")
    setTags("")
    await load()

    alert("Arquivo enviado e salvo na Knowledge Base.")
  } catch (error: any) {
    console.error(error)
    alert(error.message || "Erro ao enviar arquivo.")
  } finally {
    setUploading(false)
  }
if (finalContent.length > 100) {
  await createKnowledgeChunks({
    userId: user.id,
    documentId: savedDocument.id,
    content: finalContent,
  })
}

  async function extractTextFromFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase()

  if (extension === "txt") {
    return await file.text()
  }

  return ""
}
  
  async function saveDocument() {
  if (!user?.id) {
    alert("Faça login novamente.")
    return
  }

  if (!title.trim() && !selectedFile) {
    alert("Informe o título ou selecione um arquivo.")
    return
  }

  if (!content.trim() && !selectedFile) {
    alert("Cole o conteúdo ou selecione um arquivo.")
    return
  }

  setUploading(true)

  try {
    let uploaded: any = null

    let extractedText = ""

if (selectedFile) {
  uploaded = await uploadKnowledgeFile({
    userId: user.id,
    file: selectedFile,
  })

  extractedText = await extractTextFromFile(selectedFile)
}

    const finalTitle = title || uploaded?.fileName || "Documento sem título"
    const finalContent =
  content ||
  extractedText ||
  (uploaded
    ? `Arquivo enviado: ${uploaded.fileName}. Extração automática de PDF/DOCX será processada na próxima etapa.`
    : "")

    const summary =
      finalContent.length > 500
        ? finalContent.slice(0, 500) + "..."
        : finalContent

    await createKnowledgeDocument({
      user_id: user.id,
      title: finalTitle,
      document_type: documentType,
      client_name: clientName || null,
      process_number: processNumber || null,
      file_name: uploaded?.fileName || null,
      file_url: uploaded?.url || null,
      content: finalContent,
      summary,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: uploaded ? "uploaded" : "processed",
      metadata: uploaded
        ? {
            path: uploaded.path,
            mimeType: uploaded.mimeType,
            size: uploaded.size,
          }
        : {},
    })

    setSelectedFile(null)
    setTitle("")
    setDocumentType("peticao")
    setClientName("")
    setProcessNumber("")
    setContent("")
    setTags("")

    await load()

    alert("Documento salvo na Knowledge Base.")
  } catch (error: any) {
    console.error(error)
    alert(error.message || "Erro ao salvar documento.")
  } finally {
    setUploading(false)
  }
}
  async function deleteDocument(id: string) {
    if (!confirm("Excluir este documento da Knowledge Base?")) return

    try {
      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", id)

      if (error) throw error

      await load()
    } catch (error) {
      console.error(error)
      alert("Erro ao excluir documento.")
    }
  }

  function loadExample() {
    setTitle("Exemplo - Ação contra banco")
    setDocumentType("peticao")
    setClientName("Cliente Exemplo")
    setProcessNumber("0000000-00.2026.8.26.0000")
    setTags("banco, dano moral, consumidor")
    setContent(
      "Cliente relata descontos indevidos em conta corrente, sem autorização expressa. Possui extratos bancários, protocolos de atendimento e reclamação no consumidor.gov. Banco sustenta contratação regular, mas não apresentou instrumento contratual assinado. Pontos relevantes: falha na prestação de serviço, repetição de indébito, dano moral e pedido de cessação dos descontos."
    )
  }

  if (loading) {
    return <div className="p-6">Carregando Knowledge Base...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="text-primary" size={44} />
            <div>
              <h1 className="text-4xl font-bold">Knowledge Base Jurídica™</h1>
              <p className="text-muted-foreground mt-1">
                Salve documentos, petições, contratos, decisões e pareceres para alimentar o Chat Jurídico.
              </p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[420px_1fr] gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 h-fit">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="text-primary" />
              <h2 className="text-xl font-bold">Adicionar documento</h2>
            </div>

            <div className="space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do documento"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              >
                <option value="peticao">Petição</option>
                <option value="contrato">Contrato</option>
                <option value="sentenca">Sentença</option>
                <option value="acordao">Acórdão</option>
                <option value="parecer">Parecer</option>
                <option value="prova">Prova</option>
                <option value="geral">Geral</option>
              </select>

              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Cliente"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <input
                value={processNumber}
                onChange={(e) => setProcessNumber(e.target.value)}
                placeholder="Número do processo"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags separadas por vírgula"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
  <label className="text-sm font-bold text-primary">
    Upload de documento
  </label>

  <input
    type="file"
    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
    className="mt-3 w-full text-sm"
  />

  {selectedFile && (
    <p className="text-xs text-muted-foreground mt-2">
      Arquivo selecionado: {selectedFile.name}
    </p>
  )}

  </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Cole aqui o conteúdo do documento..."
                className="w-full h-64 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <div className="flex gap-3">
                <button
  onClick={saveDocument}
  disabled={uploading}
  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-50"
>
  {uploading ? "Salvando..." : "Salvar documento"}
</button>

                <button
                  onClick={loadExample}
                  className="px-5 py-3 rounded-xl bg-[#171721] border border-border font-bold flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  Exemplo
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <Search className="text-primary" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por cliente, processo, tese, tag ou conteúdo..."
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                Nenhum documento salvo ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="text-primary" />
                          <h2 className="font-bold text-xl">{doc.title}</h2>
                        </div>

                        <p className="text-sm text-muted-foreground mt-2">
                          {doc.document_type || "geral"} · {doc.client_name || "sem cliente"} ·{" "}
                          {doc.process_number || "sem processo"}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <p className="text-gray-300 mt-4 line-clamp-4">
                      {doc.summary || doc.content || "-"}
                    </p>

                    {Array.isArray(doc.tags) && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {doc.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
