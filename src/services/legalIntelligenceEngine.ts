import { runStrategicAnalysis } from "@/services/strategicAiService"
import { runWarRoomAi } from "@/services/warRoomAiService"
import { runPartnerCouncilAi } from "@/services/partnerCouncilAiService"
import { runOpponentIntelligenceAi } from "@/services/opponentIntelligenceAiService"
import { runBoardReportAi } from "@/services/boardReportAiService"

export interface LegalIntelligenceInput {
  caseText: string
  opponentName?: string
  clientName?: string
  tribunal?: string
}

export async function runLegalIntelligenceEngine(input: LegalIntelligenceInput) {
  const caseText = input.caseText.trim()

  if (!caseText) {
    throw new Error("Texto do caso obrigatório.")
  }

  const [strategic, warRoom, partnerCouncil, opponent] = await Promise.all([
    runStrategicAnalysis(caseText),
    runWarRoomAi(caseText),
    runPartnerCouncilAi(caseText),
    input.opponentName
      ? runOpponentIntelligenceAi({
          opponentName: input.opponentName,
          processContext: caseText,
        })
      : Promise.resolve(null),
  ])

  const boardReport = await runBoardReportAi({
    portfolioContext: caseText,
    tribunalContext: input.tribunal || "",
    opponentContext: opponent ? JSON.stringify(opponent) : "",
    clientRiskContext: input.clientName || "",
  })

  return {
    generatedAt: new Date().toISOString(),
    input,
    strategic,
    warRoom,
    partnerCouncil,
    opponent,
    boardReport,
  }
}
