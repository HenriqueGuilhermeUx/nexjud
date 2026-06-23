import { useState } from "react";
import {
  Brain,
  Target,
  ShieldAlert,
  AlertTriangle,
  Scale,
  TrendingUp,
  FileText,
} from "lucide-react";

export default function StrategicAnalysis() {
  const [caseText, setCaseText] = useState("");

  return (
    <div className="p-6 space-y-6">

      {/* HERO */}

      <div className="rounded-3xl border border-[#2a2a35] bg-[#111118] p-8">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="text-primary" size={36} />
          <h1 className="text-3xl font-bold">
            Strategic Analysis™
          </h1>
        </div>

        <p className="text-gray-400 mb-6">
          Inteligência jurídica estratégica para tomada de decisão.
        </p>

        <textarea
          value={caseText}
          onChange={(e) => setCaseText(e.target.value)}
          placeholder="Cole aqui o processo, petição, resumo do caso ou número CNJ..."
          className="w-full h-40 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"
        />

        <button
          className="mt-4 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:opacity-90"
        >
          ANALISAR CASO
        </button>
      </div>

      {/* CASE DNA */}

      <div className="grid md:grid-cols-4 gap-4">

        <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
          <p className="text-sm text-gray-400">
            Chance de Êxito
          </p>

          <h2 className="text-4xl font-bold text-green-400">
            78%
          </h2>
        </div>

        <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
          <p className="text-sm text-gray-400">
            Risco
          </p>

          <h2 className="text-3xl font-bold text-yellow-400">
            Médio
          </h2>
        </div>

        <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
          <p className="text-sm text-gray-400">
            Complexidade
          </p>

          <h2 className="text-3xl font-bold">
            Baixa
          </h2>
        </div>

        <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
          <p className="text-sm text-gray-400">
            Potencial Financeiro
          </p>

          <h2 className="text-3xl font-bold text-primary">
            R$ 180k
          </h2>
        </div>

      </div>

      {/* HEATMAP */}

      <div className="bg-[#111118] rounded-2xl border border-[#2a2a35] p-6">

        <div className="flex items-center gap-2 mb-6">
          <TrendingUp />
          <h2 className="font-bold text-xl">
            Heatmap Jurídico™
          </h2>
        </div>

        <div className="space-y-4">

          {[
            ["Provas", 92],
            ["Jurisprudência", 84],
            ["Prescrição", 65],
            ["Nexo Causal", 78],
            ["Dano Moral", 55],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="flex justify-between mb-1">
                <span>{label}</span>
                <span>{value}%</span>
              </div>

              <div className="h-3 bg-[#222] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}

        </div>
      </div>

      {/* DEAL BREAKERS */}

      <div className="bg-[#111118] rounded-2xl border border-red-900 p-6">

        <div className="flex items-center gap-2 mb-4 text-red-400">
          <AlertTriangle />
          <h2 className="font-bold text-xl">
            Deal Breakers™
          </h2>
        </div>

        <ul className="space-y-3">
          <li>❌ Ausência de prova documental relevante</li>
          <li>❌ Jurisprudência recente desfavorável</li>
          <li>❌ Prescrição parcial possível</li>
        </ul>
      </div>

      {/* RED TEAM */}

      <div className="bg-[#111118] rounded-2xl border border-[#2a2a35] p-6">

        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert />
          <h2 className="font-bold text-xl">
            Red Team™
          </h2>
        </div>

        <div className="space-y-4">

          <div className="p-4 rounded-xl bg-[#0f0f15]">
            <h3 className="font-bold mb-2">
              Ataque #1
            </h3>

            <p>
              Parte contrária alegará inexistência de vínculo.
            </p>

            <p className="text-red-400 mt-2">
              Probabilidade: 81%
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0f0f15]">
            <h3 className="font-bold mb-2">
              Contra-Ataque
            </h3>

            <p>
              Utilizar WhatsApp, recibos e testemunhas para reforçar vínculo.
            </p>
          </div>

        </div>
      </div>

      {/* JUDGE DNA */}

      <div className="bg-[#111118] rounded-2xl border border-[#2a2a35] p-6">

        <div className="flex items-center gap-2 mb-4">
          <Scale />
          <h2 className="font-bold text-xl">
            Judge DNA™
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          <div>
            <h3 className="font-semibold mb-2 text-green-400">
              Valoriza
            </h3>

            <ul className="space-y-2">
              <li>✓ Documentos</li>
              <li>✓ Perícia Técnica</li>
              <li>✓ Prova Material</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-red-400">
              Rejeita
            </h3>

            <ul className="space-y-2">
              <li>✗ Alegações genéricas</li>
              <li>✗ Dano moral sem prova</li>
              <li>✗ Testemunho isolado</li>
            </ul>
          </div>

        </div>
      </div>

      {/* SOCIO IA */}

      <div className="bg-gradient-to-r from-primary/10 to-indigo-500/10 rounded-2xl border border-primary/30 p-6">

        <div className="flex items-center gap-2 mb-4">
          <Target />
          <h2 className="font-bold text-xl">
            Se eu fosse seu sócio™
          </h2>
        </div>

        <h3 className="text-2xl font-bold text-green-400 mb-2">
          ACEITARIA ESTE CASO
        </h3>

        <p className="text-gray-300">
          Forte conjunto probatório, boa jurisprudência e risco controlado.
        </p>

      </div>

      {/* RELATÓRIO */}

      <button
        className="w-full py-4 rounded-2xl bg-primary font-bold text-lg"
      >
        <FileText className="inline mr-2" />
        GERAR RELATÓRIO EXECUTIVO
      </button>

    </div>
  );
}
