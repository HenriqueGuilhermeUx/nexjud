export function generateDraftPdf(draft: any) {
  const win = window.open("", "_blank")

  if (!win) {
    alert("Permita pop-ups para gerar o PDF.")
    return
  }

  const result = draft.result || draft

  const structure = Array.isArray(result.structure) ? result.structure : []
  const weakPoints = Array.isArray(result.weakPointsToDefend) ? result.weakPointsToDefend : []
  const evidence = Array.isArray(result.evidenceToAttach) ? result.evidenceToAttach : []
  const checklist = Array.isArray(result.argumentChecklist) ? result.argumentChecklist : []
  const requests = Array.isArray(result.closingRequests) ? result.closingRequests : []
  const warnings = Array.isArray(result.riskWarnings) ? result.riskWarnings : []

  win.document.write(`
    <html>
      <head>
        <title>NexJud Draft</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #111827;
          }

          .header {
            border-bottom: 3px solid #6366f1;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }

          .brand {
            font-size: 28px;
            font-weight: bold;
          }

          .subtitle {
            color: #6b7280;
            margin-top: 6px;
          }

          h2 {
            margin-top: 30px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
          }

          .box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 16px;
            margin: 12px 0;
          }

          .section-title {
            font-weight: bold;
            font-size: 18px;
          }

          .purpose {
            color: #6b7280;
            font-size: 13px;
            margin-top: 4px;
          }

          .content {
            margin-top: 12px;
            white-space: pre-wrap;
          }

          li {
            margin-bottom: 8px;
          }

          .footer {
            margin-top: 50px;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 16px;
          }

          @media print {
            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <button onclick="window.print()" style="padding:12px 20px;margin-bottom:24px;background:#6366f1;color:white;border:0;border-radius:8px;font-weight:bold;">
          Imprimir / Salvar PDF
        </button>

        <div class="header">
          <div class="brand">⚖ NexJud Draft™</div>
          <div class="subtitle">${result.title || draft.title || "Minuta Estratégica"}</div>
          <div class="subtitle">${draft.created_at ? new Date(draft.created_at).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR")}</div>
        </div>

        <h2>Objetivo Estratégico</h2>
        <div class="box">${result.strategicObjective || "-"}</div>

        <h2>Tese Central</h2>
        <div class="box">${result.mainThesis || "-"}</div>

        <h2>Pontos Fracos a Defender</h2>
        <ul>
          ${weakPoints.map((item: string) => `<li>❌ ${item}</li>`).join("")}
        </ul>

        <h2>Estrutura da Peça</h2>
        ${structure
          .map(
            (section: any, index: number) => `
              <div class="box">
                <div class="section-title">${index + 1}. ${section.section || "Seção"}</div>
                <div class="purpose">${section.purpose || ""}</div>
                <div class="content">${section.content || ""}</div>
              </div>
            `
          )
          .join("")}

        <h2>Provas a Anexar</h2>
        <ul>
          ${evidence.map((item: string) => `<li>✓ ${item}</li>`).join("")}
        </ul>

        <h2>Checklist de Argumentos</h2>
        <ul>
          ${checklist.map((item: string) => `<li>• ${item}</li>`).join("")}
        </ul>

        <h2>Pedidos / Requerimentos</h2>
        <ul>
          ${requests.map((item: string) => `<li>➜ ${item}</li>`).join("")}
        </ul>

        <h2>Alertas de Risco</h2>
        <ul>
          ${warnings.map((item: string) => `<li>⚠️ ${item}</li>`).join("")}
        </ul>

        <h2>Nota Final</h2>
        <div class="box">${result.finalNote || "-"}</div>

        <div class="footer">
          Minuta gerada pelo NexJud como apoio estratégico. Revisão final obrigatória pelo advogado responsável.
        </div>
      </body>
    </html>
  `)

  win.document.close()
}
