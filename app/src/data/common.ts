// Shared constants and helpers used across pages. Wording mirrors the mock-ups exactly.

export const PHASES = ['Design', 'Build', 'Transition', 'Operate', 'Transform', 'Transfer'] as const

export const WORKSTREAMS = [
  'Talent & Hiring',
  'Technology & Infrastructure',
  'Legal & Compliance',
  'Facilities & Workplace',
  'Transition Readiness',
  'Operations Setup',
  'Finance & Procurement',
] as const
export type Workstream = (typeof WORKSTREAMS)[number]

export const WORKSTREAM_META: Record<Workstream, { icon: string; color: string; short: string }> = {
  'Talent & Hiring': { icon: 'Users', color: '#1E5BBE', short: 'Talent' },
  'Technology & Infrastructure': { icon: 'Cpu', color: '#5B9BF0', short: 'Tech' },
  'Legal & Compliance': { icon: 'Scale', color: '#14B8A6', short: 'Compliance' },
  'Facilities & Workplace': { icon: 'Building2', color: '#F59E0B', short: 'Facilities' },
  'Transition Readiness': { icon: 'ArrowLeftRight', color: '#8B5CF6', short: 'Transition' },
  'Operations Setup': { icon: 'Settings2', color: '#0EA5E9', short: 'Operations' },
  'Finance & Procurement': { icon: 'Wallet', color: '#16A34A', short: 'Finance' },
}

export const OWNERS = ['A. Sharma', 'R. Mehta', 'S. Iyer', 'P. Rao', 'K. Nair', 'M. Khan', 'V. Reddy', 'D. Singh'] as const

export const LOCATIONS = ['Bengaluru', 'Hyderabad', 'Pune', 'Chennai'] as const

export type Status = 'On Track' | 'At Risk' | 'Delayed' | 'Pending' | 'Not Started' | 'Completed' | 'In Progress' | 'Open' | 'Closed' | 'Resolved' | 'Awaiting Decision' | 'Overdue'
export type Impact = 'Critical' | 'High' | 'Medium' | 'Low'

export const CHART_COLORS = {
  blue: '#1E5BBE',
  blueLight: '#5B9BF0',
  blueFaint: '#BFD7F7',
  teal: '#14B8A6',
  green: '#16A34A',
  amber: '#F59E0B',
  red: '#DC2626',
  violet: '#8B5CF6',
  orange: '#F97316',
  gray: '#CBD5E1',
  navy: '#0B2240',
}

export const SERIES = [CHART_COLORS.blue, CHART_COLORS.blueLight, CHART_COLORS.teal, CHART_COLORS.amber, CHART_COLORS.violet, CHART_COLORS.orange, CHART_COLORS.gray]

export const fmtCr = (v: number, digits = 1) => `₹ ${v.toFixed(digits)} Cr`
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parts = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m) return null
  return { y: m[1], mo: MONTHS[parseInt(m[2], 10) - 1] ?? '', d: m[3] }
}
/** "23 Oct 2026" */
export const fmtDate = (iso: string) => {
  const p = parts(iso)
  return p ? `${p.d} ${p.mo} ${p.y}` : iso ?? ''
}
/** "23 Oct 26" */
export const fmtDateShort = (iso: string) => {
  const p = parts(iso)
  return p ? `${p.d} ${p.mo} ${p.y.slice(2)}` : iso ?? ''
}
export const TODAY = '2026-10-20'

/* ------------------------------------------------------------------ */
/* Programs (the top-bar "GCC Program" selector). Each program keeps   */
/* its own data set in the store; non-India programs are seeded from   */
/* the India baseline through src/data/variants.ts.                    */
/* ------------------------------------------------------------------ */
export interface ProgramDef {
  name: string
  country: string
  city: string
  phase: 'Design' | 'Build' | 'Transition' | 'Operate' | 'Transform' | 'Transfer'
  /** scale applied to counts / money / headcount */
  scale: number
  /** scale applied to %-type fields (progress, completion, readiness) capped at 100 */
  pctScale: number
  locations: [string, string, string, string]
  sponsor: string
}
export const PROGRAMS: ProgramDef[] = [
  { name: 'GCC Program - India', country: 'India', city: 'Pune', phase: 'Build', scale: 1, pctScale: 1, locations: ['Pune', 'Bengaluru', 'Hyderabad', 'Chennai'], sponsor: 'Global COO' },
  { name: 'GCC Program - Poland', country: 'Poland', city: 'Kraków', phase: 'Design', scale: 0.55, pctScale: 0.42, locations: ['Kraków', 'Warsaw', 'Wrocław', 'Gdańsk'], sponsor: 'Global CFO' },
  { name: 'GCC Program - Philippines', country: 'Philippines', city: 'Manila', phase: 'Transition', scale: 0.8, pctScale: 0.88, locations: ['Manila', 'Cebu', 'Clark', 'Davao'], sponsor: 'Global CIO' },
]
export const PROGRAM_NAMES = PROGRAMS.map((p) => p.name)
export const programDef = (name: string) => PROGRAMS.find((p) => p.name === name) ?? PROGRAMS[0]
