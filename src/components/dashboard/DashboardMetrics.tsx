export default function DashboardMetrics({
  stats,
}: {
  stats: {
    total: number
    draftsTotal: number
    judgeTotal: number
    avgJudgeScore: number
    avgSuccess: number
    accepted: number
    rejected: number
  }
}) {
  return (
    <>
      <section className="grid md:grid-cols-4 gap-4">
        <Metric title="Análises salvas" value={String(stats.total)} />
        <Metric title="Minutas salvas" value={String(stats.draftsTotal)} color="text-primary" />
        <Metric title="Treinos Judge" value={String(stats.judgeTotal)} color="text-yellow-400" />
        <Metric title="Score médio Judge" value={`${stats.avgJudgeScore}/100`} color="text-green-400" />
      </section>

      <section className="grid md:grid-cols-4 gap-4">
        <Metric title="Chance média" value={`${stats.avgSuccess}%`} color="text-green-400" />
        <Metric title="Casos aceitos" value={String(stats.accepted)} color="text-primary" />
        <Metric title="Casos recusados" value={String(stats.rejected)} color="text-red-400" />
        <Metric
          title="Patrimônio NexJud"
          value={String(stats.total + stats.draftsTotal + stats.judgeTotal)}
          color="text-indigo-400"
        />
      </section>
    </>
  )
}

function Metric({ title, value, color = "" }: { title: string; value: string; color?: string }) {
  return (
    <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
      <p className="text-sm text-gray-400">{title}</p>
      <h2 className={`text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  )
}
