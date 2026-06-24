export function generateStrategicPdf(analysis: any) {
  const win = window.open("", "_blank")

  if (!win) {
    alert("Permita pop-ups para gerar o PDF.")
    return
  }

  const safeArray = (value: any) => (Array.isArray(value) ? value : [])
  const safeObj = (value: any) => value || {}

  const dealBreakers = safeArray(analysis.deal_breakers)
  const redTeam = safeArray(analysis.red_team)
  const strategy = safeArray(analysis.strategy_engine)
  const caseDna = safeObj(analysis.case_dna)

  const jurisprudence = safeObj(analysis.jurisprudence_prediction)
  const exposure = safeObj(analysis.financial_exposure)
  const council = safeArray(analysis.partner_council)
  const warRoom = safeObj(analysis.war_room)
  const timeline = safeArray(analysis.case_timeline)
  const tribunal = safeObj(analysis.tribunal_dna)
  const auditor = safeObj(analysis.auditor_findings)
  const diligence = safeObj(analysis.due_diligence)
  const command = safeObj(analysis.legal_command_center)

  const list = (items: any[], prefix = "•") =>
    safeArray(items).map((item: any) => `<li>${prefix} ${String(item)}</li>`).join("")

  win.document.write(`
    <html>
      <head>
        <title>NexJud Strategic Report 2.0</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #111827; }
          .header { border-bottom: 4px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 30px; font-weight: bold; }
          .subtitle { color: #6b7280; margin-top: 6px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
          .grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
          .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #f9fafb; }
          .label { font-size: 12px; color: #6b7280; }
          .value { font-size: 21px; font-weight: bold; margin-top: 6px; }
          h2 { margin-top: 32px; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          h3 { margin-bottom: 8px; }
          li { margin-bottom: 8px; }
          .case-box { white-space: pre-wrap; background: #f3f4f6; border-radius: 12px; padding: 16px; border: 1px solid #e5e7eb; }
          .box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 12px 0; }
          .warning { background: #fff7ed; border-color: #fed7aa; }
          .danger { background: #fef2f2; border-color: #fecaca; }
          .success { background: #f0fdf4; border-color: #bbf7d0; }
          .footer { margin-top: 50px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px; }
          @media print { button { display: none; } body { padding: 24px; } }
        </style>
      </head>

      <body>
        <button onclick="window.print()" style="padding:12px 20px;margin-bottom:24px;background:#6366f1;color:white;border:0;border-radius:8px;font-weight:bold;">
          Imprimir / Salvar PDF
        </button>

        <div class="header">
          <div class="brand">⚖ NexJud Strategic Report™ 2.0</div>
          <div class="subtitle">Relatório executivo premium de inteligência jurídica</div>
          <div class="subtitle">${new Date(analysis.created_at || Date.now()).toLocaleString("pt-BR")}</div>
        </div>

        <div class="grid">
          <div class="card"><div class="label">Chance de Êxito</div><div class="value">${analysis.success_probability || 0}%</div></div>
          <div class="card"><div class="label">Risco</div><div class="value">${analysis.risk_level || "-"}</div></div>
          <div class="card"><div class="label">Potencial</div><div class="value">${analysis.financial_potential || "-"}</div></div>
          <div class="card"><div class="label">Sócio IA</div><div class="value">${analysis.partner_decision || "-"}</div></div>
        </div>

        <h2>Resumo do Caso</h2>
        <div class="case-box">${analysis.case_text || "-"}</div>

        <h2>Legal Command Center™</h2>
        <div class="grid">
          <div class="card"><div class="label">Risco Geral</div><div class="value">${command.overallRisk || "-"}</div></div>
          <div class="card"><div class="label">Prioridade</div><div class="value">${command.priority || "-"}</div></div>
          <div class="card"><div class="label">Ação Imediata</div><div class="value">${command.actionNow || "-"}</div></div>
          <div class="card"><div class="label">Decisão Executiva</div><div class="value">${command.executiveDecision || "-"}</div></div>
        </div>
        <div class="box">${command.boardSummary || "-"}</div>

        <h2>Jurisprudência Preditiva™</h2>
        <div class="grid2">
          <div class="card success"><div class="label">Tendência Favorável Estimada</div><div class="value">${jurisprudence.favorableRate || 0}%</div></div>
          <div class="card"><div class="label">Tendência</div><div class="value">${jurisprudence.trend || "-"}</div></div>
        </div>
        <div class="box">${jurisprudence.thesisStrength || "-"}</div>
        <div class="grid2">
          <div class="box success"><h3>Fatores favoráveis</h3><ul>${list(jurisprudence.favorableFactors, "✓")}</ul></div>
          <div class="box danger"><h3>Fatores desfavoráveis</h3><ul>${list(jurisprudence.unfavorableFactors, "⚠️")}</ul></div>
        </div>
        <div class="box warning">${jurisprudence.warning || "Predição estratégica sem consulta externa real."}</div>

        <h2>Financial Exposure™</h2>
        <div class="grid3">
          <div class="card success"><div class="label">Melhor Cenário</div><div class="value">${exposure.bestCase || "-"}</div></div>
          <div class="card warning"><div class="label">Cenário Provável</div><div class="value">${exposure.probableCase || "-"}</div></div>
          <div class="card danger"><div class="label">Pior Cenário</div><div class="value">${exposure.worstCase || "-"}</div></div>
        </div>
        <div class="box">${exposure.costRisk || "-"}</div>
        <div class="box"><strong>Faixa de acordo:</strong> ${exposure.settlementRange || "-"}</div>
        <div class="box">${exposure.financialRecommendation || "-"}</div>

        <h2>AI Partner Council™</h2>
        <div class="grid2">
          ${council
            .map(
              (p: any) => `
                <div class="card">
                  <div class="label">${p.partner || "Sócio IA"}</div>
                  <div class="value">${p.decision || "-"}</div>
                  <p>${p.reason || "-"}</p>
                </div>
              `
            )
            .join("")}
        </div>

        <h2>Litigation War Room™</h2>
        <div class="grid2">
          <div class="box"><h3>Ataque</h3><ul>${list(warRoom.attackPlan, "⚔️")}</ul></div>
          <div class="box"><h3>Defesa</h3><ul>${list(warRoom.defensePlan, "🛡️")}</ul></div>
          <div class="box"><h3>Provas</h3><ul>${list(warRoom.evidencePlan, "📎")}</ul></div>
          <div class="box"><h3>Negociação</h3><ul>${list(warRoom.negotiationPlan, "🤝")}</ul></div>
        </div>
        <div class="box danger"><h3>Ações urgentes</h3><ul>${list(warRoom.emergencyActions, "🚨")}</ul></div>

        <h2>Case DNA™</h2>
        <ul>
          ${Object.entries(caseDna)
            .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
            .join("")}
        </ul>

        <h2>Tribunal DNA™</h2>
        <div class="card"><div class="label">Perfil estimado</div><div class="value">${tribunal.profile || "-"}</div></div>
        <div class="grid2">
          <div class="box success"><h3>Valoriza</h3><ul>${list(tribunal.values, "✓")}</ul></div>
          <div class="box danger"><h3>Rejeita</h3><ul>${list(tribunal.rejects, "✗")}</ul></div>
        </div>
        <div class="box">${tribunal.riskBehavior || "-"}</div>
        <div class="box">${tribunal.strategicAdvice || "-"}</div>

        <h2>Case Timeline™</h2>
        ${timeline
          .map(
            (t: any) => `
              <div class="box">
                <strong>${t.date || "-"}</strong><br/>
                ${t.event || "-"}<br/>
                <span style="color:#6b7280;">${t.impact || "-"}</span>
              </div>
            `
          )
          .join("")}

        <h2>Auditor Jurídico™</h2>
        <div class="card warning"><div class="label">Audit Score</div><div class="value">${auditor.auditScore || 0}/100</div></div>
        <div class="grid2">
          <div class="box danger"><h3>Riscos críticos</h3><ul>${list(auditor.criticalRisks, "🚨")}</ul></div>
          <div class="box warning"><h3>Inconsistências</h3><ul>${list(auditor.inconsistencies, "⚠️")}</ul></div>
          <div class="box"><h3>Documentos ausentes</h3><ul>${list(auditor.missingDocuments, "📄")}</ul></div>
          <div class="box danger"><h3>Passivos ocultos</h3><ul>${list(auditor.hiddenLiabilities, "💣")}</ul></div>
        </div>

        <h2>Due Diligence IA™</h2>
        <div class="grid2">
          <div class="card success"><div class="label">Score</div><div class="value">${diligence.score || 0}/100</div></div>
          <div class="card warning"><div class="label">Risco</div><div class="value">${diligence.riskLevel || "-"}</div></div>
        </div>
        <div class="box"><h3>Achados relevantes</h3><ul>${list(diligence.keyFindings, "✓")}</ul></div>
        <div class="box danger"><h3>Bloqueadores</h3><ul>${list(diligence.blockers, "⛔")}</ul></div>
        <div class="box">${diligence.recommendation || "-"}</div>

        <h2>Deal Breakers™</h2>
        <ul>${dealBreakers.map((item: string) => `<li>❌ ${item}</li>`).join("")}</ul>

        <h2>Red Team™</h2>
        <ul>${redTeam.map((item: string) => `<li>⚔️ ${item}</li>`).join("")}</ul>

        <h2>Strategy Engine™</h2>
        <ul>${strategy.map((item: string) => `<li>✓ ${item}</li>`).join("")}</ul>

        <h2>Conclusão Executiva</h2>
        <p>
          Com base nos fatores analisados, o NexJud recomenda validar provas, riscos,
          exposição financeira e estratégia processual antes da decisão final.
        </p>

        <div class="footer">
          Este relatório é apoio estratégico e não substitui a análise jurídica profissional.
          A decisão final é sempre do advogado responsável.
        </div>
      </body>
    </html>
  `)

  win.document.close()
}
