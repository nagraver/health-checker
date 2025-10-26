
import type { TemplateDef, CheckName } from '../types'

interface Props {
  onApply: (checks: CheckName[]) => void
}
const templates: TemplateDef[] = [
  { id: 'quick', label: 'Quick check', checks: ['ping','http'] },
  { id: 'full', label: 'Full site health', checks: ['ping','http','dns','tcp','traceroute'] },
  { id: 'dns', label: 'DNS only', checks: ['dns'] },
]

export default function TemplatesBar({ onApply }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {templates.map(t => (
        <button key={t.id} className="badge hover:bg-zinc-100" onClick={() => onApply(t.checks)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
