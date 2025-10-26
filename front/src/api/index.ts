
import type { CheckName, ResultPayload } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE?.replace(/\/$/, '')) || '/api'
const WS_BASE = import.meta.env.VITE_WS_BASE || '/ws'

export async function postCheck(target: string, checks: CheckName[]) {
  const res = await fetch(`${API_BASE}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, checks })
  })
  if (!res.ok) throw new Error(`POST /check failed: ${res.status}`)
  return res.json() as Promise<{ status: string; id: string }>
}

export async function getResult(id: string) {
  const res = await fetch(`${API_BASE}/result/${id}`)
  if (!res.ok) throw new Error(`GET /result/${id} failed: ${res.status}`)
  return res.json() as Promise<ResultPayload>
}

export function wsCheck(target: string, checks: CheckName[], onMessage: (payload: ResultPayload) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const url = (WS_BASE || '').replace(/^http/, 'ws')
      const ws = new WebSocket(`${url}/check`)
      ws.onopen = () => {
        ws.send(JSON.stringify({ target, checks }))
      }
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          onMessage(data)
          ws.close()
          resolve()
        } catch (e) {
          reject(e)
        }
      }
      ws.onerror = (e) => {
        ws.close()
        reject(new Error('WebSocket error'))
      }
      ws.onclose = () => {}
    } catch (e) {
      reject(e as Error)
    }
  })
}
