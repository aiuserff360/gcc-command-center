/**
 * Business units of the GCC – the practices and R&D groups the centre is built to host.
 * This is the single list used by Target Footprint (scope and FTE ramp-up), Resource Management
 * (headcount by business unit) and the GCC Setup inputs. Collection name: 'businessUnits'.
 */
export const BU_KINDS = ['Technology Practice', 'R&D', 'Shared Services'] as const
export type BuKind = (typeof BU_KINDS)[number]
export const BU_WAVES = ['Wave 1', 'Wave 2', 'Wave 3'] as const
export const BU_STATUSES = ['In Scope', 'Planned', 'Under Evaluation', 'Out of Scope'] as const
export const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'] as const
export const YEAR_KEYS = ['y1', 'y2', 'y3', 'y4', 'y5'] as const
export type YearKey = (typeof YEAR_KEYS)[number]

export interface BusinessUnit {
  id: string
  name: string
  kind: BuKind
  wave: (typeof BU_WAVES)[number]
  owner: string
  status: (typeof BU_STATUSES)[number]
  description: string
  y1: number; y2: number; y3: number; y4: number; y5: number // planned FTEs by year
}

export const seedBusinessUnits: BusinessUnit[] = [
  { id: 'bu-sap', name: 'SAP Practice', kind: 'Technology Practice', wave: 'Wave 1', owner: 'R. Mehta', status: 'In Scope', description: 'S/4HANA implementation and AMS, finance and supply-chain modules, integration', y1: 12, y2: 26, y3: 38, y4: 46, y5: 50 },
  { id: 'bu-ms', name: 'Microsoft Practice', kind: 'Technology Practice', wave: 'Wave 1', owner: 'R. Mehta', status: 'In Scope', description: 'Dynamics 365, Power Platform, Azure application services and M365 engineering', y1: 8, y2: 18, y3: 26, y4: 32, y5: 35 },
  { id: 'bu-data', name: 'Data & AI Practice', kind: 'Technology Practice', wave: 'Wave 1', owner: 'R. Mehta', status: 'In Scope', description: 'Data engineering, BI, data science and AI/ML delivery', y1: 4, y2: 10, y3: 16, y4: 20, y5: 22 },
  { id: 'bu-rd-prod', name: 'R&D – Product Engineering', kind: 'R&D', wave: 'Wave 2', owner: 'M. Khan', status: 'In Scope', description: 'Product squads, QA automation and SRE for the global product roadmap', y1: 3, y2: 8, y3: 12, y4: 16, y5: 18 },
  { id: 'bu-rd-cloud', name: 'R&D – Platform & Cloud', kind: 'R&D', wave: 'Wave 2', owner: 'M. Khan', status: 'In Scope', description: 'Cloud platform engineering, DevOps tooling and security engineering', y1: 2, y2: 4, y3: 7, y4: 9, y5: 10 },
  { id: 'bu-fin', name: 'Finance Shared Services', kind: 'Shared Services', wave: 'Wave 2', owner: 'V. Reddy', status: 'In Scope', description: 'Record-to-report, accounts payable and FP&A support', y1: 1, y2: 2, y3: 5, y4: 7, y5: 8 },
  { id: 'bu-hr', name: 'HR Shared Services', kind: 'Shared Services', wave: 'Wave 3', owner: 'S. Iyer', status: 'In Scope', description: 'HR operations, payroll support and talent acquisition services', y1: 0, y2: 0, y3: 3, y4: 4, y5: 7 },
]
export const BU_NAMES = seedBusinessUnits.map((b) => b.name)
export const buTotal = (b: BusinessUnit, k: YearKey) => b[k]
