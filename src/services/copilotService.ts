import { runStrategicAnalysis } from "@/services/strategicAiService"
import { runLitigationStrategyAi } from "@/services/litigationStrategyAiService"
import { runPartnerCouncilAi } from "@/services/partnerCouncilAiService"
import { runWarRoomAi } from "@/services/warRoomAiService"
import { runBoardReportAi } from "@/services/boardReportAiService"

export async function runAICopilot(prompt: string) {
  const caseText = String(prompt || "").trim()

  if (!caseText) {
    throw new Error("Digite o caso ou a pergunta para o Copilot.")
  }

  const [strategic, litigation, partnerCouncil, warRoom] = await Promise.all([
    runStrategicAnalysis(caseText),
    runLitigationStrategyAi(caseText),
    runPartnerCouncilAi(caseText),
    runWarRoomAi(caseText),
  ])

  const boardReport = await runBoardReportAi({
    portfolioContext: caseText,
    tribunalContext: "",
    opponentContext: "",
    clientRiskContext: "",
  })

  return {
    generatedAt: new Date().toISOString(),
    prompt: caseText,
    strategic,
    litigation,
    partnerCouncil,
    warRoom,
    boardReport,
  }
}
