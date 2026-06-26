import { useState } from "react"
import {
  Brain,
  Loader2,
  Sparkles,
  ShieldAlert,
  Scale,
  Users,
  FileText,
  ClipboardList,
} from "lucide-react"

import { runAICopilot } from "@/services/copilotService"

export default function AICopilot() {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function execute() {
    if (!prompt.trim()) {
      alert("Descreva o caso.")
      return
    }

    setLoading(true)

    try {
      const response = await runAICopilot(prompt)
      setResult(response)
    } catch (e: any) {
      console.error(e)
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">

        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8">

          <div className="flex items-center gap-3 mb-4">
            <Brain className="text-primary" size={44}/>
            <div>
              <h1 className="text-4xl font-bold">
                AI Legal Copilot™
              </h1>

              <p className="text-muted-foreground mt-1">
                Um único comando executa toda a inteligência jurídica.
              </p>
            </div>
          </div>

        </section>

        <section className="rounded-2xl border border-border bg-card p-6">

          <textarea
            value={prompt}
            onChange={(e)=>setPrompt(e.target.value)}
            placeholder="Cole o caso ou faça uma pergunta..."
            className="w-full h-56 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 outline-none focus:border-primary"
          />

          <button
            onClick={execute}
            disabled={loading}
            className="mt-5 px-8 py-4 rounded-xl bg-primary text-white font-bold flex items-center gap-2"
          >

            {loading
              ? <Loader2 className="animate-spin"/>
              : <Sparkles/>
            }

            Executar AI Copilot

          </button>

        </section>

        {result && (

          <section className="grid lg:grid-cols-2 gap-5">

            <ResultCard
              icon={<Scale className="text-primary"/>}
              title="Strategic Analysis"
              data={result.strategic}
            />

            <ResultCard
              icon={<ShieldAlert className="text-red-400"/>}
              title="Litigation Strategy"
              data={result.litigation}
            />

            <ResultCard
              icon={<Users className="text-green-400"/>}
              title="Partner Council"
              data={result.partnerCouncil}
            />

            <ResultCard
              icon={<Brain className="text-yellow-400"/>}
              title="War Room"
              data={result.warRoom}
            />

            <div className="lg:col-span-2">

              <ResultCard
                icon={<FileText className="text-primary"/>}
                title="Board Report"
                data={result.boardReport}
              />

            </div>

          </section>

        )}

      </div>

    </div>
  )
}

function ResultCard({
  title,
  icon,
  data,
}:any){

return(

<div className="rounded-2xl border border-border bg-card p-6">

<div className="flex items-center gap-2 mb-5">

{icon}

<h2 className="font-bold text-xl">
{title}
</h2>

</div>

<pre className="whitespace-pre-wrap text-sm text-gray-300 overflow-auto">

{JSON.stringify(data,null,2)}

</pre>

</div>

)

}
