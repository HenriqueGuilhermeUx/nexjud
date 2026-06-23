import { useNavigate } from "react-router-dom";
import {
  Brain,
  Target,
  ShieldAlert,
  FileSearch,
  TrendingUp,
  Scale,
} from "lucide-react";

export default function HomeDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">

      <div className="rounded-3xl border border-[#2a2a35] bg-[#111118] p-8">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="text-[#6366f1]" size={32} />
          <h1 className="text-3xl font-bold">
            NexJud Strategic Analysis™
          </h1>
        </div>

        <p className="text-gray-400 mb-6">
          Inteligência Jurídica para tomada de decisão.
        </p>

        <div className="grid md:grid-cols-3 gap-4">

          <button
            onClick={() => navigate("/dashboard/process-check")}
            className="p-6 rounded-2xl bg-[#171721] hover:bg-[#20202b] transition"
          >
            <FileSearch size={30} />
            <h3 className="font-semibold mt-3">
              Verificar Processo
            </h3>
          </button>

          <button
            onClick={() => navigate("/dashboard/predictive")}
            className="p-6 rounded-2xl bg-[#171721] hover:bg-[#20202b] transition"
          >
            <TrendingUp size={30} />
            <h3 className="font-semibold mt-3">
              IA Preditiva
            </h3>
          </button>

          <button
            onClick={() => navigate("/dashboard/red-team")}
            className="p-6 rounded-2xl bg-[#171721] hover:bg-[#20202b] transition"
          >
            <ShieldAlert size={30} />
            <h3 className="font-semibold mt-3">
              Red Team
            </h3>
          </button>

        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">

        <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
          <p className="text-sm text-gray-400">
            Probabilidade Média
          </p>

          <h2 className="text-4xl font-bold text-green-400">
            78%
          </h2>
        </div>

        <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
          <p className="text-sm text-gray-400">
            Casos Analisados
          </p>

          <h2 className="text-4xl font-bold">
            124
          </h2>
        </div>

        <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
          <p className="text-sm text-gray-400">
            Relatórios
          </p>

          <h2 className="text-4xl font-bold">
            53
          </h2>
        </div>

        <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
          <p className="text-sm text-gray-400">
            Estratégias Geradas
          </p>

          <h2 className="text-4xl font-bold">
            89
          </h2>
        </div>

      </div>

      <div className="grid md:grid-cols-2 gap-6">

        <div className="bg-[#111118] rounded-2xl border border-[#2a2a35] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target />
            <h3 className="font-semibold">
              Case DNA™
            </h3>
          </div>

          <ul className="space-y-2 text-gray-300">
            <li>✓ Chance de êxito</li>
            <li>✓ Potencial financeiro</li>
            <li>✓ Grau de risco</li>
            <li>✓ Complexidade</li>
          </ul>
        </div>

        <div className="bg-[#111118] rounded-2xl border border-[#2a2a35] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Scale />
            <h3 className="font-semibold">
              Se eu fosse seu sócio™
            </h3>
          </div>

          <p className="text-gray-400">
            A IA informa se aceitaria ou recusaria o caso,
            explicando os motivos estratégicos.
          </p>
        </div>

      </div>

    </div>
  );
}
