
import { useEffect, useMemo, useRef, useState } from 'react'
import ChecksForm from './components/ChecksForm'
import ResultsTable from './components/ResultsTable'
import AgentStatus from './components/AgentStatus'
import { postCheck, getResult, wsCheck } from './api'
import type { CheckName, ResultPayload } from './types'
import './index.css'

export default function App() {
  const [selectedChecks, setSelectedChecks] = useState<CheckName[]>(['ping','http'])
  const [current, setCurrent] = useState<ResultPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => { if (pollTimer.current) window.clearInterval(pollTimer.current) }
  }, [])

  const startPolling = (id: string) => {
    pollTimer.current && window.clearInterval(pollTimer.current)
    pollTimer.current = window.setInterval(async () => {
      try {
        const res = await getResult(id)
        if (res?.results && (res as any).results.status !== 'pending') {
          setCurrent(res)
          if (pollTimer.current) window.clearInterval(pollTimer.current)
        }
      } catch (e: any) {
        console.error(e)
        setError(e.message || 'Ошибка запроса')
        if (pollTimer.current) window.clearInterval(pollTimer.current)
      }
    }, 2000)
  }

  const submit = async (target: string, checks: CheckName[]) => {
    setError(null)
    setLoading(true)
    setCurrent(null)
    setSelectedChecks(checks)

    // Try WebSocket first
    try {
      await wsCheck(target, checks, (payload) => {
        setCurrent(payload)
      })
      setLoading(false)
      return
    } catch (e) {
      console.warn('WS failed, fallback to polling...', e)
    }

    // Fallback to REST + polling
    try {
      const { id } = await postCheck(target, checks)
      startPolling(id)
    } catch (e: any) {
      setError(e.message || 'Не удалось создать задачу')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div className="text-2xl font-bold text-zinc-900">Aéza — Health Checker</div>
        <a href="https://aeza.net" target="_blank" className="text-sm text-zinc-500 hover:underline">aeza.net</a>
      </header>

      <ChecksForm onSubmit={submit} loading={loading} />

      <AgentStatus />

      <ResultsTable data={current} selectedChecks={selectedChecks} loading={loading} />

      {error && <div className="card p-4 text-red-700 bg-red-50 border-red-200">{error}</div>}

      <footer className="text-xs text-zinc-500 pt-4">
        SPA • WebSocket с фолбэком на polling 2s • Материалистичный минимализм • © 2025
      </footer>
    </div>
  )
}
