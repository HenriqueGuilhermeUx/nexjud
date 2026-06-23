import { useState } from "react";
import {
  Brain,
  Target,
  ShieldAlert,
  AlertTriangle,
  Scale,
  TrendingUp,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { saveAnalysis } from "@/services/strategicAnalysisService";

export default function HomeDashboard() {
  const { user } = useAuth();

  const [caseText, setCaseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  async function handleAnalyze() {
    if (!caseText.trim()) {
      alert("Cole um caso, tese, petição ou número CNJ primeiro.");
      return;
    }

    if (!user?.id) {
      alert("Faça login novamente para salvar a análise.");
      return;
    }

    setLoading(true);

    try {
      const result = {
        successProbability: 78,
        riskLevel: "Médio",
        complexity: "Baixa",
        financialPotential: "R$ 180.000",

        heatmap: [
          ["Força das Provas", 92],
          ["Jurisprudência Favorável", 84],
          ["Risco de Prescrição", 35],
          ["Nexo Causal", 78],
          ["Dano Moral", 55],
        ],

        caseDna: {
          provas: 92,
          jurisprudencia: 84,
          prescricao: 65,
          nexo: 78,
          danoMoral: 55,
        },

        dealBreakers: [
          "Ausência de prova documental relevante pode enfraquecer o pedido principal.",
          "Jurisprudência recente desfavorável pode reduzir margem de êxito.",
          "Prescrição parcial deve ser analisada antes de protocolar.",
        ],

        redTeam: [
          "Parte contrária alegará ausência de vínculo direto entre fato e dano.",
          "Defesa pode sustentar fragilidade probatória e ausência de documento essencial.",
          "Pode haver tentativa de deslocar a discussão para culpa exclusiva do autor.",
        ],

        strategyEngine: [
          "Organizar linha do tempo objetiva dos fatos.",
          "Anexar documentos centrais antes de ampliar a tese.",
          "Antecipar a principal objeção da parte contrária na petição.",
          "Avaliar acordo se o custo operacional superar o retorno provável.",
        ],

        judgeDna: {
          valoriza: ["Documentos", "Perícia técnica", "Linha do tempo clara"],
          rejeita: ["Alegações genéricas", "Dano moral sem prova", "Pedidos excessivos"],
        },

        partnerDecision: "ACEITARIA",
        partnerReason:
          "O caso possui boa relação risco-retorno, desde que a prova documental seja reforçada antes do próximo movimento processual.",
      };

      await saveAnalysis({
        userId: user.id,
        title: `Strategic Analysis ${new Date().toLocaleDateString("pt-BR")}`,
        caseText,
        successProbability: result.successProbability,
        riskLevel: result.riskLevel,
        financialPotential: result.financialPotential,
        caseDna: result.caseDna,
        dealBreakers: result.dealBreakers,
        redTeam: result.redTeam,
        strategyEngine: result.strategyEngine,
        partnerDecision: result.partnerDecision,
      });

      setAnalysisResult(result);
      alert("Análise salva no histórico.");
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar/salvar análise.");
    } finally {
      setLoading(false);
    }
  }

  const heatmap = analysisResult?.heatmap || [
    ["Força das Provas", 0],
    ["Jurisprudência Favorável", 0],
    ["Risco de Prescrição", 0],
    ["Nexo Causal", 0],
    ["Dano Moral", 0],
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-[#2a2a35] bg-gradient-to-br from-[#111118] to-[#0c0c12] p-8 lg:p-10 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-5">
                <Sparkles size={16} />
                NexJud Strategic Intelligence™
              </div>

              <div className="flex items-center gap-3 mb-4">
                <Brain className="text-primary" size={38} />
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                  Decida se vale entrar, negociar ou abandonar um caso.
                </h1>
              </div>

              <p className="text-gray-400 text-lg mb-6">
                Cole um resumo, tese, petição ou número CNJ. O NexJud transforma o caso em score,
                riscos, Red Team, estratégia e parecer executivo.
              </p>

              <div className="grid sm:grid-cols-3 gap-3 text-sm text-gray-300">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  ✓ Case DNA™
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  ✓ Deal Breakers™
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  ✓ Sócio IA™
                </div>
              </div>
            </div>

            <div className="w-full lg:w-[380px] rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm text-gray-400 mb-2">Diagnóstico rápido</p>
              <div className="text-5xl font-bold text-green-400">
                {analysisResult?.successProbability || 0}%
              </div>
              <p className="text-sm text-gray-400 mt-2">
                chance estratégica estimada
              </p>
            </div>
          </div>

          <div className="mt-8">
            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="Cole aqui o processo, petição, tese, resumo dos fatos ou número CNJ..."
              className="w-full h-44 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 text-base outline-none focus:border-primary"
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-7 py-4 rounded-2xl bg-primary text-white font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    ANALISANDO...
                  </>
                ) : (
                  <>
                    <Brain size={18} />
                    ANALISAR CASO
                  </>
                )}
              </button>

              <button
                className="px-7 py-4 rounded-2xl bg-[#171721] border border-[#2a2a35] font-bold hover:bg-[#20202b]"
              >
                Exemplo de caso
              </button>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-4">
          <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
            <p className="text-sm text-gray-400">Chance de Êxito</p>
            <h2 className="text-4xl font-bold text-green-400">
              {analysisResult?.successProbability || 0}%
            </h2>
          </div>

          <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
            <p className="text-sm text-gray-400">Risco</p>
            <h2 className="text-3xl font-bold text-yellow-400">
              {analysisResult?.riskLevel || "-"}
            </h2>
          </div>

          <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
            <p className="text-sm text-gray-400">Complexidade</p>
            <h2 className="text-3xl font-bold">
              {analysisResult?.complexity || "-"}
            </h2>
          </div>

          <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
            <p className="text-sm text-gray-400">Potencial Financeiro</p>
            <h2 className="text-3xl font-bold text-primary">
              {analysisResult?.financialPotential || "-"}
            </h2>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-[#111118] rounded-2xl border border-[#2a2a35] p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="text-primary" />
              <h2 className="font-bold text-xl">Heatmap Jurídico™</h2>
            </div>

            <div className="space-y-4">
              {heatmap.map(([label, value]: any) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span>{label}</span>
                    <span>{value}%</span>
                  </div>
                  <div className="h-3 bg-[#222] rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111118] rounded-2xl border border-red-900/70 p-6">
            <div className="flex items-center gap-2 mb-4 text-red-400">
              <AlertTriangle />
              <h2 className="font-bold text-xl">Deal Breakers™</h2>
            </div>

            <ul className="space-y-3 text-gray-300">
              {(analysisResult?.dealBreakers || []).map((item: string, index: number) => (
                <li key={index}>❌ {item}</li>
              ))}
            </ul>

            {!analysisResult && (
              <p className="text-gray-500">
                Os fatores críticos aparecerão aqui após a análise.
              </p>
            )}
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-[#111118] rounded-2xl border border-[#2a2a35] p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="text-red-400" />
              <h2 className="font-bold text-xl">Red Team™</h2>
            </div>

            <div className="space-y-4">
              {(analysisResult?.redTeam || []).map((item: string, index: number) => (
                <div key={index} className="p-4 rounded-xl bg-[#0f0f15] border border-white/5">
                  <h3 className="font-bold mb-2">Ataque #{index + 1}</h3>
                  <p className="text-gray-300">{item}</p>
                </div>
              ))}

              {!analysisResult && (
                <p className="text-gray-500">
                  A simulação da parte contrária aparecerá aqui.
                </p>
              )}
            </div>
          </div>

          <div className="bg-[#111118] rounded-2xl border border-[#2a2a35] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="text-primary" />
              <h2 className="font-bold text-xl">Judge DNA™</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-green-400">Valoriza</h3>
                <ul className="space-y-2">
                  {(analysisResult?.judgeDna?.valoriza || ["Documentos", "Perícia técnica", "Linha do tempo clara"]).map(
                    (item: string, index: number) => (
                      <li key={index}>✓ {item}</li>
                    )
                  )}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-red-400">Rejeita</h3>
                <ul className="space-y-2">
                  {(analysisResult?.judgeDna?.rejeita || ["Alegações genéricas", "Dano moral sem prova", "Pedidos excessivos"]).map(
                    (item: string, index: number) => (
                      <li key={index}>✗ {item}</li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-primary/10 to-indigo-500/10 rounded-2xl border border-primary/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="text-primary" />
              <h2 className="font-bold text-xl">Se eu fosse seu sócio™</h2>
            </div>

            <h3 className="text-3xl font-bold text-green-400 mb-3">
              {analysisResult?.partnerDecision || "-"}
            </h3>

            <p className="text-gray-300">
              {analysisResult?.partnerReason ||
                "A decisão estratégica aparecerá aqui após a análise."}
            </p>
          </div>

          <div className="bg-[#111118] rounded-2xl border border-[#2a2a35] p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-primary" />
              <h2 className="font-bold text-xl">Strategy Engine™</h2>
            </div>

            <ul className="space-y-3 text-gray-300">
              {(analysisResult?.strategyEngine || []).map((item: string, index: number) => (
                <li key={index}>✓ {item}</li>
              ))}
            </ul>

            {!analysisResult && (
              <p className="text-gray-500">
                O plano de ação recomendado aparecerá aqui.
              </p>
            )}
          </div>
        </section>

        <button className="w-full py-5 rounded-2xl bg-primary font-bold text-lg hover:opacity-90">
          <FileText className="inline mr-2" />
          GERAR RELATÓRIO EXECUTIVO
        </button>
      </div>
    </div>
  );
}
