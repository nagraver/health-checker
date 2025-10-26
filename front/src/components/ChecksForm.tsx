
import { useState } from 'react'
import TemplatesBar from './TemplatesBar'
import type { CheckName } from '../types'

const ALL_CHECKS: CheckName[] = ['ping','http','tcp','traceroute','dns']

interface Props {
  onSubmit: (target: string, checks: CheckName[]) => void
  loading?: boolean
}

export default function ChecksForm({ onSubmit, loading }: Props) {
  const [target, setTarget] = useState('example.com')
  const [selected, setSelected] = useState<CheckName[]>(['ping','http'])

  const toggle = (name: CheckName) => {
    setSelected(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name])
  }

  const applyTemplate = (checks: CheckName[]) => setSelected(checks)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!target.trim()) return
    onSubmit(target.trim(), selected.length ? selected : ['ping'])
  }

  return (
    <form onSubmit={submit} className="card p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-lg font-semibold text-zinc-900">Проверка сервиса</div>
        <span className="text-xs text-zinc-500">Aéza • demo</span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input className="input" placeholder="example.com или https://example.com" value={target} onChange={e=>setTarget(e.target.value)} />
        <button className="btn" disabled={loading}>
          {loading ? 'Запускаю…' : 'Запустить проверки'}
        </button>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-zinc-700">Что проверяем</div>
        <div className="flex flex-wrap gap-3">
          {ALL_CHECKS.map(name => (
            <label key={name} className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 bg-white">
              <input type="checkbox" className="checkbox" checked={selected.includes(name)} onChange={()=>toggle(name)} />
              <span className="capitalize">{name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-zinc-600">Шаблоны</div>
        <TemplatesBar onApply={applyTemplate} />
      </div>
    </form>
  )
}
