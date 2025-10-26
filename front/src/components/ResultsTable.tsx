
import type { CheckName, ResultPayload } from '../types'

interface Props {
  data?: ResultPayload | null
  selectedChecks: CheckName[]
  loading?: boolean
}

function Cell({ name, result }: { name: CheckName, result: any }) {
  if (!result) return <div className="text-zinc-400">—</div>

  const commonErr = (r: any) => r && r.status === 'error' ? `error: ${r.message ?? ''}` : null

  switch (name) {
    case 'ping': {
      if (commonErr(result)) return <span className="text-red-600">{commonErr(result)}</span>
      if (result.status === 'unreachable') return <span className="text-orange-600">unreachable</span>
      return <span className="text-emerald-700">ok</span>
    }
    case 'http': {
      if (commonErr(result)) return <span className="text-red-600">{commonErr(result)}</span>
      const code = result.status
      const t = result.time_ms ? `${result.time_ms} ms` : ''
      return <span className={Number(code) >= 200 && Number(code) < 400 ? 'text-emerald-700' : 'text-orange-700'}>{code} {t}</span>
    }
    case 'tcp': {
      if (commonErr(result)) return <span className="text-red-600">{commonErr(result)}</span>
      return <span className={result.status === 'ok' ? 'text-emerald-700' : 'text-orange-700'}>{result.status}{result.time_ms ? ` • ${result.time_ms} ms` : ''}{result.port ? ` • :${result.port}` : ''}</span>
    }
    case 'traceroute': {
      if (commonErr(result)) return <span className="text-red-600">{commonErr(result)}</span>
      const hops = Array.isArray(result.output) ? result.output.length : 0
      return <span className="text-zinc-800">hops: {hops}</span>
    }
    case 'dns': {
      if (commonErr(result)) return <span className="text-red-600">{commonErr(result)}</span>
      const recs = result.records || {}
      const ac = (recs.A || []).length
      const ns = (recs.NS || []).length
      return <span className="text-zinc-800">A:{ac} • NS:{ns}</span>
    }
    default:
      return <span className="text-zinc-800">{JSON.stringify(result)}</span>
  }
}

export default function ResultsTable({ data, selectedChecks, loading }: Props) {
  const checks = selectedChecks.length ? selectedChecks : (data?.checks ?? [])
  const agentName = 'master' // skeleton for multi-agent

  return (
    <div className="card p-4 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">Результаты</div>
        {loading && <div className="text-xs text-zinc-500">ожидание ответа…</div>}
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="th w-40">Агент</th>
              {checks.map(c => (
                <th key={c} className="th capitalize">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="td font-medium">{agentName}</td>
              {checks.map(c => (
                <td key={c} className="td">
                  <Cell name={c} result={data?.results?.[c]} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {data && (
        <details className="mt-4">
          <summary className="text-sm text-zinc-600 cursor-pointer">Сырые данные (JSON)</summary>
          <pre className="mt-2 bg-zinc-100 rounded-xl p-3 text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        </details>
      )}
    </div>
  )
}
