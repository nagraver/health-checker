
export type CheckName = 'ping' | 'http' | 'tcp' | 'traceroute' | 'dns'

export type CheckResult =
  | { status: 'ok'; [k: string]: any }
  | { status: 'unreachable' }
  | { status: number; time_ms?: number; headers?: Record<string, string> } // http
  | { status: 'error'; message: string }
  | { [k: string]: any } // fallback

export interface ResultPayload {
  id: string
  target: string
  checks: CheckName[]
  results: Record<CheckName | string, CheckResult>
}

export interface CheckRequestBody {
  target: string
  checks: CheckName[]
}

export interface TemplateDef {
  id: string
  label: string
  checks: CheckName[]
}
