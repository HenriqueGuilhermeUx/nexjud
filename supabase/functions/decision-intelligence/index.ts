import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const onlyNumbers = (value: string) => String(value || "").replace(/\D/g, "")
function detectAlias(cnj: string, fallback = "tjsp") {
  const code = onlyNumbers(cnj).slice(13, 16)
  const map: Record<string,string> = {"826":"tjsp","821":"tjrs","819":"tjrj","813":"tjmg","815":"tjpb","804":"tjam","401":"trf1","402":"trf2","403":"trf3","404":"trf4","405":"trf5","406":"trf6","502":"trt2","515":"trt15"}
  return map[code] || fallback
}
const names=(v:any)=>Array.isArray(v)?v.map((x:any)=>x?.nome||x?.descricao).filter(Boolean):[]
function normalize(source:any, alias:string, index:number) {
  const movements=Array.isArray(source?.movimentos)?source.movimentos:[]
  const decisionMovement=movements.find((m:any)=>/senten|decis|ac[oó]rd/i.test(JSON.stringify(m)))
  return {
    id: source?.id || source?._id || source?.numeroProcesso || `${alias}-${index}`,
    processNumber: source?.numeroProcesso || source?.numero || null,
    court: source?.tribunal || source?.siglaTribunal || alias.toUpperCase(),
    judgingBody: source?.orgaoJulgador?.nome || null,
    decisionDate: decisionMovement?.dataHora || decisionMovement?.data || source?.dataHoraUltimaAtualizacao || null,
    caseClass: source?.classe?.nome || source?.classeProcessual?.nome || null,
    subjects: names(source?.assuntos),
    source: "datajud",
    sourceDocumentId: source?.id || source?._id || null,
    collectedAt: new Date().toISOString(),
  }
}
async function datajud(alias:string, key:string, query:any, size=50) {
  const response=await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`,{method:"POST",headers:{Authorization:key,"Content-Type":"application/json"},body:JSON.stringify({size,query})})
  const text=await response.text()
  if(!response.ok) throw new Error(`DataJud indisponível (${response.status}).`)
  return JSON.parse(text)
}
function period(items:any[]) {
  const dates=items.map(x=>x.decisionDate).filter(Boolean).map((x:string)=>new Date(x)).filter((d:Date)=>!Number.isNaN(d.getTime())).sort((a:Date,b:Date)=>a.getTime()-b.getTime())
  if(!dates.length) return null
  const fmt=(d:Date)=>d.toLocaleDateString("pt-BR",{month:"short",year:"numeric",timeZone:"UTC"})
  return `${fmt(dates[0])} – ${fmt(dates[dates.length-1])}`
}
Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders})
  try {
    const key=Deno.env.get("DATAJUD_API_KEY")
    if(!key) return Response.json({error:"DATAJUD_API_KEY não configurada."},{status:500,headers:corsHeaders})
    const body=await req.json().catch(()=>({}))
    const cnj=String(body.cnj||"").trim()
    if(!cnj) return Response.json({error:"Número CNJ obrigatório."},{status:400,headers:corsHeaders})
    const alias=String(body.tribunalAlias||"").trim()||detectAlias(cnj)
    const exact=await datajud(alias,key,{match:{numeroProcesso:onlyNumbers(cnj)}},1)
    const source=exact?.hits?.hits?.[0]?._source
    if(!source) return Response.json({success:true,found:false,alias,warning:"Processo não localizado no DataJud para este tribunal."},{headers:corsHeaders})
    const classe=source?.classe?.nome||source?.classeProcessual?.nome||""
    const assuntos=names(source?.assuntos)
    const must:any[]=[]
    if(classe) must.push({match:{"classe.nome":classe}})
    if(assuntos[0]) must.push({match:{"assuntos.nome":assuntos[0]}})
    const similar=await datajud(alias,key,{bool:{must:must.length?must:[{match_all:{}}]}},50)
    const raw=(similar?.hits?.hits||[]).map((h:any)=>h._source).filter(Boolean)
    const evidence=raw.map((x:any,i:number)=>normalize(x,alias,i))
    const argument=String(body.argument||"").trim()
    return Response.json({
      success:true, found:true, alias,
      process:{number:source.numeroProcesso,court:source.tribunal||alias.toUpperCase(),courtUnit:source?.orgaoJulgador?.nome||"-",className:classe||"-",subject:assuntos.join(", ")||"-"},
      decisionsAnalyzed:evidence.length,
      decisionsFound:similar?.hits?.total?.value||evidence.length,
      period:period(evidence),
      source:"DataJud/CNJ",
      adherences:[],
      divergences:[],
      risks:[],
      opportunities:argument?["Use as decisões encontradas para conferir onde sua tese encontra apoio e onde precisa ser delimitada."]:["Acrescente sua tese ou argumento para aprofundar a comparação estratégica."],
      evidence,
      warning:"A NexJud analisa padrões observados em decisões públicas. Não prevê nem garante o resultado do processo."
    },{headers:corsHeaders})
  } catch(error) {
    return Response.json({error:error instanceof Error?error.message:"Não foi possível concluir a análise."},{status:500,headers:corsHeaders})
  }
})