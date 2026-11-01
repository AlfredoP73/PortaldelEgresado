import { dashboardApi } from './index'

export interface DashboardData {
  summary: {
    total_graduates: number
    employment_rate: number
    average_salary: number
    average_time_to_first_job: number
  }

  employment_by_program: {
    program: string
    percentage: number
  }[]

  industries: {
    sector: string
    percentage: number
  }[]

  salary_by_program: {
    program: string
    average_salary: number
  }[]

  application_status: {
    status: string
    count: number
  }[]
}

export interface CompanyDashboardData {
  summary: {
    active_offers: number
    total_applicants: number
    hired_candidates: number
    average_hiring_time_days: number
    conversion_rate: number
    visits_to_offers: number
  }
  applications_by_status: {
    status: string
    count: number
  }[]
  hiring_funnel: {
    status: string
    count: number
  }[]
  applicants_by_program: {
    program: string
    count: number
  }[]
  applications_timeline: {
    date: string
    count: number
  }[]
  frequent_skills: {
    skill: string
    count: number
  }[]
}

export interface GraduateDashboardData {
  summary: {
    total_applications: number
    interviews: number
    offers_viewed: number
    program_average_salary: number
    response_rate: number
    expected_salary: number
    profile_views: number
  }
  applications_by_status: {
    status: string
    count: number
  }[]
  skills_radar: {
    skill: string
    graduate: number
    market: number
  }[]
  applications_timeline: {
    date: string
    count: number
  }[]
  market_salaries: {
    range: string
    count: number
  }[]
}

const _dashboardInFlight = new Map<string, Promise<DashboardData>>()
const _dashboardCache = new Map<string, { data: DashboardData; expiresAt: number }>()
let _companyDashboardInFlight: Promise<CompanyDashboardData> | null = null
let _graduateDashboardInFlight: Promise<GraduateDashboardData> | null = null

export async function getDashboard(programId?: number, year?: number): Promise<DashboardData> {
  const key = `${programId ?? 'all'}:${year ?? 'all'}`
  const now = Date.now()
  const cached = _dashboardCache.get(key)
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  const existing = _dashboardInFlight.get(key)
  if (existing) {
    return existing
  }

  const params: Record<string, any> = {}
  if (programId) params.program_id = programId
  if (year) params.year = year

  const req = dashboardApi
    .get<DashboardData>('/dashboard', { params })
    .then((response) => {
      _dashboardCache.set(key, { data: response.data, expiresAt: Date.now() + 15_000 })
      return response.data
    })
    .finally(() => {
      _dashboardInFlight.delete(key)
    })

  _dashboardInFlight.set(key, req)
  return req
}

export async function getCompanyDashboard(): Promise<CompanyDashboardData> {
  if (_companyDashboardInFlight) return _companyDashboardInFlight
  _companyDashboardInFlight = dashboardApi
    .get<CompanyDashboardData>('/company/dashboard')
    .then((r) => r.data)
    .finally(() => {
      _companyDashboardInFlight = null
    })
  return _companyDashboardInFlight
}

export async function getGraduateDashboard(): Promise<GraduateDashboardData> {
  if (_graduateDashboardInFlight) return _graduateDashboardInFlight
  _graduateDashboardInFlight = dashboardApi
    .get<GraduateDashboardData>('/graduate/dashboard')
    .then((r) => r.data)
    .finally(() => {
      _graduateDashboardInFlight = null
    })
  return _graduateDashboardInFlight
}
