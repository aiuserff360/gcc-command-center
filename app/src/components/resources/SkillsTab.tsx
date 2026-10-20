import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Plus } from 'lucide-react'
import { Card, Badge, Table, Progress } from '../ui'
import { tooltipStyle } from '../charts'
import { CHART_COLORS, fmtDate } from '../../data/common'
import type { SkillRow, TrainingPlan } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { WrapTick, CardLegend, MiniStat } from './widgets'
import { SkillForm, TrainingForm } from './forms'
import { coverageColor } from './OverviewTab'

export default function SkillsTab({ d }: { d: ResourceData }) {
  const { skills, trainingPlans } = d
  const [skill, setSkill] = useState<SkillRow | null>(null)
  const [addSkill, setAddSkill] = useState(false)
  const [tp, setTp] = useState<TrainingPlan | null>(null)
  const [addTp, setAddTp] = useState(false)

  const rows = skills.items.map((s) => ({ ...s, gap: Math.max(0, s.required - s.available), coverage: s.required ? Math.round((s.available / s.required) * 100) : 0 }))
  const req = rows.reduce((s, r) => s + r.required, 0), avail = rows.reduce((s, r) => s + r.available, 0), gap = rows.reduce((s, r) => s + r.gap, 0)
  const inTraining = trainingPlans.items.filter((t) => t.status !== 'Completed').reduce((s, t) => s + t.participants, 0)
  const chartData = rows.map((r) => ({ name: r.category.replace(' (AWS/Azure)', ''), Required: r.required, Available: r.available, Gap: r.gap }))

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <MiniStat label="Skill categories tracked" value={rows.length} />
        <MiniStat label="Required capacity" value={req} sub="Roles needing the skill" />
        <MiniStat label="Available" value={avail} sub={`${req ? Math.round((avail / req) * 100) : 0}% overall coverage`} tone="text-brand-600" />
        <MiniStat label="Capability gap" value={gap} sub="Hire or upskill" tone="text-red-600" />
        <MiniStat label="In training / planned" value={inTraining} sub={`${trainingPlans.items.filter((t) => t.status !== 'Completed').length} active programmes`} tone="text-green-600" />
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-4">
        <Card title="Skills Availability" subtitle="Click a row to edit required / available" action={<button className="btn-primary" onClick={() => setAddSkill(true)}><Plus size={14} /> Add Skill</button>}>
          <Table compact rows={rows} onRowClick={(r) => setSkill(r)} columns={[
            { key: 'category', header: 'Skill Category', render: (r) => <span className="font-medium">{r.category}</span> },
            { key: 'owner', header: 'Owner' },
            { key: 'required', header: 'Required', className: 'text-right' },
            { key: 'available', header: 'Available', className: 'text-right' },
            { key: 'gap', header: 'Gap', className: 'text-right', render: (r) => <span className="text-red-600 font-medium">{r.gap}</span> },
            { key: 'coverage', header: 'Coverage', render: (r) => <span className="flex items-center gap-2"><Progress value={r.coverage} color={coverageColor(r.coverage)} className="w-[80px]" /><span className="w-9 text-right">{r.coverage}%</span></span> },
            { key: 'rag', header: 'Status', render: (r) => <Badge value={r.coverage >= 80 ? 'On Track' : r.coverage >= 60 ? 'At Risk' : 'Critical'} /> },
          ]} />
        </Card>
        <Card title="Capability Gap by Skill" headerRight={<CardLegend items={[{ label: 'Required', color: '#9CC3F7' }, { label: 'Available', color: CHART_COLORS.blue }, { label: 'Gap', color: CHART_COLORS.red }]} />}>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 14, right: 4, left: -24, bottom: 14 }} barGap={2} barCategoryGap="25%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={<WrapTick size={10} />} height={30} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar dataKey="Required" fill="#9CC3F7" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Available" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Gap" fill={CHART_COLORS.red} radius={[3, 3, 0, 0]}><LabelList dataKey="Gap" position="top" style={{ fontSize: 11, fill: '#DC2626', fontWeight: 600 }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Training & Upskilling Plan" subtitle="Programmes closing the capability gap · click a row to edit" action={<button className="btn-primary" onClick={() => setAddTp(true)}><Plus size={14} /> Add Programme</button>}>
        <Table<TrainingPlan> compact rows={trainingPlans.items} onRowClick={(r) => setTp(r)} columns={[
          { key: 'program', header: 'Programme', render: (r) => <span className="font-medium">{r.program}</span> },
          { key: 'skill', header: 'Skill Category' },
          { key: 'participants', header: 'Participants', className: 'text-right' },
          { key: 'startDate', header: 'Start', render: (r) => fmtDate(r.startDate) },
          { key: 'endDate', header: 'End', render: (r) => fmtDate(r.endDate) },
          { key: 'owner', header: 'Owner' },
          { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
        ]} />
      </Card>

      <SkillForm open={addSkill || !!skill} onClose={() => { setAddSkill(false); setSkill(null) }} value={skill} onSave={(s) => { if (skill) skills.update(s); else skills.add(s); setAddSkill(false); setSkill(null) }} onDelete={(id) => skills.remove(id)} />
      <TrainingForm open={addTp || !!tp} onClose={() => { setAddTp(false); setTp(null) }} value={tp} skills={skills.items.map((s) => s.category)} onSave={(t) => { if (tp) trainingPlans.update(t); else trainingPlans.add(t); setAddTp(false); setTp(null) }} onDelete={(id) => trainingPlans.remove(id)} />
    </>
  )
}
