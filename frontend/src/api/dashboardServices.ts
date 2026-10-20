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

export async function getDashboard(programId?: number, year?: number): Promise<DashboardData> {
  const params: Record<string, any> = {}
  if (programId) params.program_id = programId
  if (year) params.year = year

  const response = await dashboardApi.get<DashboardData>('/dashboard', { params })
  return response.data
}

export async function getCompanyDashboard(): Promise<CompanyDashboardData> {
  const response = await dashboardApi.get<CompanyDashboardData>('/company/dashboard')
  return response.data
}

export async function getGraduateDashboard(): Promise<GraduateDashboardData> {
  const response = await dashboardApi.get<GraduateDashboardData>('/graduate/dashboard')
  return response.data
}
