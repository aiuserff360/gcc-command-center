import { useState } from 'react'
import { Check, Building2, UserCog, Handshake, Users, Settings2, Plus } from 'lucide-react'
import { Card, Modal, Field, Input, Select, TextArea, FormGrid } from '../ui'
import { BarList } from '../charts'
import { useCollection, uid } from '../../store/useStore'
import { CHART_COLORS } from '../../data/common'
import { seedOperatingModels, seedStrategy, omWeightedScore, OM_STATUSES, type OperatingModel, type StrategySettings, type WeightedCriterion } from '../../data/strategy'
import { EditorFooter, OmPill, ScorePill, textProps } from './shared'

export const OM_ICON: Record<string, React.ReactNode> = { 'Captive GCC': <Building2 size={22} />, Hybrid: <UserCog size={22} />, BOT: <Handshake size={22} />, Outsourced: <Users size={22} /> }
const blank = (): OperatingModel => ({ id: uid('om'), name: '', subtitle: '', status: 'Option', traits: [], scores: {}, description: '' })

export default function OperatingModelTab() {
  const { items, add, update, remove } = useCollection<OperatingModel>('strategyOperatingModels', seedOperatingModels)
  const settingsC = useCollection<StrategySettings>('strategy', seedStrategy)
  const s = settingsC.items[0] ?? seedStrategy[0]
  const criteria = s.omCriteria
  const [editing, setEditing] = useState<OperatingModel | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [weights, setWeights] = useState(false)
  const scored = items.map((m) => ({ ...m, total: omWeightedScore(m, criteria) }))
  const best = Math.max(...scored.map((m) => m.total), 0)
  const weightSum = criteria.reduce((a, c) => a + c.weight, 0)

  return (
    <div className="space-y-4">
      <Card title="Operating Model Options" subtitle="Click a model to edit its traits, status and criteria scores." action={<button className="btn-secondary" onClick={() => { setEditing(blank()); setIsNew(true) }}><Plus size={14} /> Add Model</button>}>
        <div className="grid grid-cols-4 gap-4">
          {scored.map((m) => (
            <div key={m.id} className={`rounded-xl border p-4 cursor-pointer hover:bg-surface/60 ${m.status === 'Recommended' ? 'border-green-200 bg-green-50/30' : 'border-line'}`} onClick={() => { setEditing(items.find((x) => x.id === m.id) ?? m); setIsNew(false) }}>
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">{OM_ICON[m.name] ?? <Building2 size={22} />}</span>
                <div className="min-w-0"><div className="text-[14px] font-semibold text-ink-900 truncate">{m.name}</div><div className="text-[11.5px] text-ink-500 truncate">{m.subtitle}</div></div>
              </div>
              <p className="text-[12px] text-ink-700 mt-3 leading-snug min-h-[48px]">{m.description}</p>
              <ul className="mt-3 space-y-1.5">
                {m.traits.map((t) => <li key={t} className="flex items-start gap-1.5 text-[12.5px] text-ink-700"><Check size={14} className="text-green-600 shrink-0 mt-0.5" />{t}</li>)}
              </ul>
              <div className="flex items-center justify-between mt-3 mb-2 text-[12px] text-ink-500"><span>Weighted score</span><ScorePill value={m.total} good={4} /></div>
              <OmPill status={m.status} />
            </div>
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-[1fr_320px] gap-4">
        <Card title="Decision Criteria Scoring Matrix" subtitle="Scores 1–5 per criterion; weighted score = Σ(score × weight) ÷ Σ weights." action={<button className="link inline-flex items-center gap-1" onClick={() => setWeights(true)}><Settings2 size={12} /> Edit weights</button>}>
          <table className="w-full border-separate border-spacing-0 tbl">
            <thead><tr><th className="th">Criterion</th><th className="th text-right">Weight</th>{scored.map((m) => <th key={m.id} className="th text-center">{m.name}</th>)}</tr></thead>
            <tbody>
              {criteria.map((c) => (
                <tr key={c.name}>
                  <td className="td font-medium">{c.name}</td><td className="td text-right text-ink-500">{c.weight}%</td>
                  {scored.map((m) => { const v = m.scores[c.name] ?? 0; return <td key={m.id} className="td"><div className="flex items-center gap-2 justify-center"><span className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${(v / 5) * 100}%`, background: v >= 4 ? CHART_COLORS.green : v >= 3 ? CHART_COLORS.blueLight : CHART_COLORS.amber }} /></span><span className="w-4 text-[12.5px] font-medium">{v}</span></div></td> })}
                </tr>
              ))}
              <tr className="bg-surface/60">
                <td className="td font-semibold">Weighted score</td><td className={`td text-right font-semibold ${weightSum === 100 ? '' : 'text-amber-700'}`}>{weightSum}%</td>
                {scored.map((m) => <td key={m.id} className="td text-center"><span className={`inline-flex rounded-md px-2.5 py-0.5 text-[12.5px] font-bold ${m.total === best ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-ink-700'}`}>{m.total.toFixed(1)}</span></td>)}
              </tr>
            </tbody>
          </table>
        </Card>
        <Card title="Weighted Score Ranking">
          <BarList rows={scored.slice().sort((a, b) => b.total - a.total).map((m) => ({ label: m.name, value: m.total, color: m.total === best ? CHART_COLORS.green : CHART_COLORS.blueLight, right: `${m.total.toFixed(1)} / 5` }))} max={5} labelWidth={100} />
          <p className="text-[11.5px] text-ink-500 mt-3">Highest weighted score is highlighted. The Recommended status on each card is set manually by the steering committee.</p>
        </Card>
      </div>
      {editing && <ModelEditor value={editing} criteria={criteria} isNew={isNew} onClose={() => setEditing(null)} onDelete={() => { remove(editing.id); setEditing(null) }} onSave={(v) => { if (isNew) add(v); else update(v); setEditing(null) }} />}
      {weights && <WeightsEditor value={criteria} onClose={() => setWeights(false)} onSave={(c) => { settingsC.update({ ...s, omCriteria: c }); setWeights(false) }} />}
    </div>
  )
}

function ModelEditor({ value, criteria, isNew, onClose, onSave, onDelete }: { value: OperatingModel; criteria: WeightedCriterion[]; isNew: boolean; onClose: () => void; onSave: (v: OperatingModel) => void; onDelete: () => void }) {
  const [f, setF] = useState(value)
  const [traits, setTraits] = useState(value.traits.join('\n'))
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add Operating Model' : `Edit Operating Model – ${value.name}`} footer={<EditorFooter onCancel={onClose} onSave={() => onSave({ ...f, traits: traits.split('\n').map((t) => t.trim()).filter(Boolean) })} onDelete={isNew ? undefined : onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Model"><Input {...textProps(f, setF, 'name')} /></Field>
        <Field label="Subtitle"><Input {...textProps(f, setF, 'subtitle')} /></Field>
        <Field label="Status"><Select options={OM_STATUSES} {...textProps(f, setF, 'status')} /></Field>
      </FormGrid>
      <div className="h-3" />
      <Field label="Description"><TextArea {...textProps(f, setF, 'description')} /></Field>
      <div className="h-3" />
      <Field label="Traits (one per line)"><TextArea value={traits} onChange={(e) => setTraits(e.target.value)} /></Field>
      <div className="h-3" />
      <div className="label">Criteria scores (1–5)</div>
      <FormGrid cols={3}>
        {criteria.map((c) => <Field key={c.name} label={`${c.name} (${c.weight}%)`}><Select options={['1', '2', '3', '4', '5']} value={String(f.scores[c.name] ?? 3)} onChange={(e) => setF({ ...f, scores: { ...f.scores, [c.name]: parseInt(e.target.value) } })} /></Field>)}
      </FormGrid>
    </Modal>
  )
}

function WeightsEditor({ value, onClose, onSave }: { value: WeightedCriterion[]; onClose: () => void; onSave: (v: WeightedCriterion[]) => void }) {
  const [list, setList] = useState(value)
  const sum = list.reduce((a, c) => a + c.weight, 0)
  return (
    <Modal open onClose={onClose} title="Decision criteria weights" width="max-w-lg" footer={<EditorFooter onCancel={onClose} onSave={() => onSave(list)} />}>
      <div className="space-y-2">
        {list.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_100px_auto] gap-2 items-center">
            <Input value={c.name} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <Input type="number" value={c.weight} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, weight: parseFloat(e.target.value) || 0 } : x)))} />
            <button className="btn-secondary" onClick={() => setList(list.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        <button className="btn-secondary" onClick={() => setList([...list, { name: 'New criterion', weight: 0 }])}><Plus size={14} /> Add criterion</button>
        <div className={`text-[12.5px] font-medium ${sum === 100 ? 'text-green-700' : 'text-amber-700'}`}>Total weight: {sum}% {sum !== 100 && '(should total 100%)'}</div>
      </div>
    </Modal>
  )
}
