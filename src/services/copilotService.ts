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
    tribunalContext: strategic?.tribunalDna
      ? JSON.stringify(strategic.tribunalDna)
      : "",
    opponentContext: strategic?.opponentIntelligence
      ? JSON.stringify(strategic.opponentIntelligence)
      : "",
    clientRiskContext: strategic?.clientRisk
      ? JSON.stringify(strategic.clientRisk)
      : "",
  })

  return {
    generatedAt: new Date().toISOString(),
    prompt: caseText,
    strategic,
    litigation,
    partnerCouncil,
    warRoom,
    boardReport,
    executive: {
      title:
        strategic?.title ||
        litigation?.title ||
        "AI Legal Copilot Report",
      successProbability:
        strategic?.successProbability ||
        litigation?.successProbability ||
        0,
      riskLevel:
        strategic?.riskLevel ||
        litigation?.riskLevel ||
        boardReport?.riskLevel ||
        "-",
      decision:
        strategic?.partnerDecision ||
        boardReport?.decision ||
        partnerCouncil?.finalVote ||
        "-",
      summary:
        strategic?.executiveSummary ||
        litigation?.executiveSummary ||
        boardReport?.executiveSummary ||
        "-",
      nextMove:
        litigation?.nextMove ||
        strategic?.nextMoves?.[0] ||
        boardReport?.recommendedActions?.[0] ||
        "-",
    },
  }
}
