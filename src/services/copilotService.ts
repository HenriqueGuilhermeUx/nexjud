import { runStrategicAnalysis } from "@/services/strategicAiService"
import { runLitigationStrategyAi } from "@/services/litigationStrategyAiService"
import { runPartnerCouncilAi } from "@/services/partnerCouncilAiService"
import { runWarRoomAi } from "@/services/warRoomAiService"
import { runBoardReportAi } from "@/services/boardReportAiService"

async function safeRun(name: string, fn: () => Promise<any>) {
  try {
    return {
      ok: true,
      data: await fn(),
    }
  } catch (error: any) {
    console.error(`Erro no módulo ${name}:`, error)

    return {
      ok: false,
      module: name,
      error:
        error?.message ||
        error?.details ||
        JSON.stringify(error) ||
        "Erro desconhecido",
      data: null,
    }
  }
}

export async function runAICopilot(prompt: string) {
  const caseText = String(prompt || "").trim()

  if (!caseText) {
    throw new Error("Digite o caso ou a pergunta para o Copilot.")
  }

  const [strategicResult, litigationResult, partnerCouncilResult, warRoomResult] =
    await Promise.all([
      safeRun("strategic-analysis", () => runStrategicAnalysis(caseText)),
      safeRun("litigation-strategy-ai", () => runLitigationStrategyAi(caseText)),
      safeRun("partner-council-ai", () => runPartnerCouncilAi(caseText)),
      safeRun("war-room-ai", () => runWarRoomAi(caseText)),
    ])

  const strategic = strategicResult.data
  const litigation = litigationResult.data
  const partnerCouncil = partnerCouncilResult.data
  const warRoom = warRoomResult.data

  const boardReportResult = await safeRun("board-report-ai", () =>
    runBoardReportAi({
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
  )

  const boardReport = boardReportResult.data

  const errors = [
    strategicResult,
    litigationResult,
    partnerCouncilResult,
    warRoomResult,
    boardReportResult,
  ].filter((item) => !item.ok)

  return {
    generatedAt: new Date().toISOString(),
    prompt: caseText,
    errors,
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
        partnerCouncil?.final_vote ||
        "-",
      summary:
        strategic?.executiveSummary ||
        litigation?.executiveSummary ||
        boardReport?.executiveSummary ||
        "O Copilot executou a análise, mas um ou mais módulos retornaram erro. Verifique os detalhes técnicos.",
      nextMove:
        litigation?.nextMove ||
        strategic?.nextMoves?.[0] ||
        boardReport?.recommendedActions?.[0] ||
        "-",
    },
  }
}
