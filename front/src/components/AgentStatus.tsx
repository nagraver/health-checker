
export default function AgentStatus({ online = true }: { online?: boolean }) {
  return (
    <div className="card p-4 flex items-center justify-between">
      <div>
        <div className="text-sm text-zinc-500">Статус агента</div>
        <div className="text-lg font-semibold">master</div>
      </div>
      <div className={"px-2 py-1 rounded-lg text-sm " + (online ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
        {online ? "online" : "offline"}
      </div>
    </div>
  )
}
