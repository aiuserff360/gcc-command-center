import { useState } from 'react'
import { Plus, MapPin, Star, Users, Scale } from 'lucide-react'
import { Card, KpiTile, Badge, Table, Modal, Field, Input, TextArea, FormGrid } from '../ui'
import { BarList } from '../charts'
import { useCollection, uid } from '../../store/useStore'
import { CHART_COLORS } from '../../data/common'
import { seedLocations, seedStrategy, locationOverall, bandTalent, bandInfra, bandEcosystem, type LocationOption, type StrategySettings } from '../../data/strategy'
import { EditorFooter, Toolbar, ScorePill, numProps, textProps } from './shared'

const blank = (): LocationOption => ({ id: uid('loc'), name: '', costIndex: 1, talentScore: 5, costScore: 5, infrastructureScore: 5, ecosystemScore: 5, talentPool: '', notes: '', shortlisted: false })

export function Dot({ level }: { level: string }) {
  const c = level === 'High' ? '#16A34A' : level === 'Medium' ? '#F59E0B' : '#DC2626'
  return <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{level}</span>
}

export default function LocationTab() {
  const { items, add, update, remove } = useCollection<LocationOption>('strategyLocations', seedLocations)
  const settingsC = useCollection<StrategySettings>('strategy', seedStrategy)
  const s = settingsC.items[0] ?? seedStrategy[0]
  const w = s.locationWeights
  const [editing, setEditing] = useState<LocationOption | null>(null)
  const [isNew, setIsNew] = useState(false)
  const scored = items.map((l) => ({ ...l, overall: locationOverall(l, w) })).sort((a, b) => b.overall - a.overall)
  const top = scored[0]
  const weightSum = w.talent + w.cost + w.infrastructure + w.ecosystem
  const setW = (k: keyof StrategySettings['locationWeights'], v: number) => settingsC.update({ ...s, locationWeights: { ...w, [k]: v } })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <KpiTile tone="blue" icon={<MapPin size={22} />} value={items.length} label="Locations Evaluated" sub={`${items.filter((l) => l.shortlisted).length} shortlisted`} />
        <KpiTile tone="green" icon={<Star size={22} />} value={top?.name ?? '—'} label="Highest Scoring Location" sub={top ? `Overall score ${top.overall.toFixed(1)}` : ''} />
        <KpiTile tone="violet" icon={<Users size={22} />} value={top ? bandTalent(top.talentScore) : '—'} label="Talent Availability (Top)" sub={top ? `Cost index ${top.costIndex.toFixed(1)}` : ''} />
        <KpiTile tone="amber" icon={<Scale size={22} />} value={`${weightSum}%`} label="Criteria Weights Total" sub={weightSum === 100 ? 'balanced' : 'should total 100%'} />
      </div>
      <div className="grid grid-cols-[1fr_320px] gap-4">
        <Card title="Location Scorecard" subtitle="Sub-scores (0–10) per criterion; Overall Score is the weighted average using the weights on the right.">
          <Toolbar left={`${items.length} locations · click a row to edit scores`}>
            <button className="btn-primary" onClick={() => { setEditing(blank()); setIsNew(true) }}><Plus size={14} /> Add Location</button>
          </Toolbar>
          <Table<LocationOption & { overall: number }> rows={scored} onRowClick={(r) => { setEditing(items.find((l) => l.id === r.id) ?? r); setIsNew(false) }} columns={[
            { key: 'name', header: 'Location', render: (r) => <span className="font-medium inline-flex items-center gap-2">{r.name}{r.shortlisted && <Badge value="Shortlisted" className="bg-brand-50 text-brand-600" />}</span> },
            { key: 'talent', header: 'Talent Availability', render: (r) => <span className="inline-flex items-center gap-2"><Dot level={bandTalent(r.talentScore)} /><span className="text-ink-500 text-[11.5px]">({r.talentScore})</span></span> },
            { key: 'costIndex', header: 'Cost Index', render: (r) => r.costIndex.toFixed(1) },
            { key: 'costScore', header: 'Cost Score', render: (r) => r.costScore },
            { key: 'infra', header: 'Infrastructure', render: (r) => <span>{bandInfra(r.infrastructureScore)} <span className="text-ink-500 text-[11.5px]">({r.infrastructureScore})</span></span> },
            { key: 'eco', header: 'Ecosystem', render: (r) => <span>{bandEcosystem(r.ecosystemScore)} <span className="text-ink-500 text-[11.5px]">({r.ecosystemScore})</span></span> },
            { key: 'overall', header: 'Overall Score', render: (r) => <ScorePill value={r.overall} /> },
          ]} />
        </Card>
        <Card title="Scoring Weights" subtitle="Edits apply immediately to the Overall Score.">
          <div className="space-y-3">
            {([['talent', 'Talent Availability'], ['cost', 'Cost'], ['infrastructure', 'Infrastructure'], ['ecosystem', 'Ecosystem']] as const).map(([k, label]) => (
              <Field key={k} label={`${label} (%)`}><Input type="number" min={0} max={100} value={w[k]} onChange={(e) => setW(k, parseFloat(e.target.value) || 0)} /></Field>
            ))}
            <div className={`text-[12.5px] font-medium ${weightSum === 100 ? 'text-green-700' : 'text-amber-700'}`}>Total: {weightSum}%</div>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-[320px_1fr] gap-4">
        <Card title="Overall Score Ranking">
          <BarList rows={scored.map((l) => ({ label: l.name, value: l.overall, color: l.overall >= 8 ? CHART_COLORS.green : CHART_COLORS.amber, right: l.overall.toFixed(1) }))} max={10} labelWidth={120} />
        </Card>
        <Card title="Talent Pool Notes" subtitle="Talent-market observations supporting the location decision.">
          <div className="grid grid-cols-2 gap-3">
            {scored.map((l) => (
              <div key={l.id} className="rounded-lg border border-line p-3 cursor-pointer hover:bg-surface" onClick={() => { setEditing(items.find((x) => x.id === l.id) ?? l); setIsNew(false) }}>
                <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{l.name}</span><ScorePill value={l.overall} /></div>
                <p className="text-[12.5px] text-ink-700 mt-1.5 leading-snug">{l.talentPool}</p>
                {l.notes && <p className="text-[12px] text-ink-500 mt-1 leading-snug">{l.notes}</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>
      {editing && <LocationEditor value={editing} isNew={isNew} onClose={() => setEditing(null)} onDelete={() => { remove(editing.id); setEditing(null) }} onSave={(v) => { if (isNew) add(v); else update(v); setEditing(null) }} />}
    </div>
  )
}

function LocationEditor({ value, isNew, onClose, onSave, onDelete }: { value: LocationOption; isNew: boolean; onClose: () => void; onSave: (v: LocationOption) => void; onDelete: () => void }) {
  const [f, setF] = useState<LocationOption>(value)
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add Location' : `Edit Location – ${value.name}`} footer={<EditorFooter onCancel={onClose} onSave={() => onSave(f)} onDelete={isNew ? undefined : onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Location"><Input {...textProps(f, setF, 'name')} /></Field>
        <Field label="Cost index (Bengaluru = 1.0)"><Input {...numProps(f, setF, 'costIndex')} /></Field>
        <Field label="Shortlisted"><select className="input" value={f.shortlisted ? 'Yes' : 'No'} onChange={(e) => setF({ ...f, shortlisted: e.target.value === 'Yes' })}><option>Yes</option><option>No</option></select></Field>
        <Field label="Talent score (0–10)"><Input {...numProps(f, setF, 'talentScore')} /></Field>
        <Field label="Cost score (0–10)"><Input {...numProps(f, setF, 'costScore')} /></Field>
        <Field label="Infrastructure score (0–10)"><Input {...numProps(f, setF, 'infrastructureScore')} /></Field>
        <Field label="Ecosystem score (0–10)"><Input {...numProps(f, setF, 'ecosystemScore')} /></Field>
      </FormGrid>
      <div className="h-3" />
      <Field label="Talent pool"><TextArea {...textProps(f, setF, 'talentPool')} /></Field>
      <div className="h-3" />
      <Field label="Notes"><TextArea {...textProps(f, setF, 'notes')} /></Field>
    </Modal>
  )
}
