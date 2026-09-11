const DASHBOARD_URL =
  import.meta.env.VITE_DASHBOARD_URL !== undefined ? import.meta.env.VITE_DASHBOARD_URL : 'http://localhost:8004'

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
  const token = localStorage.getItem('access_token')
  const params = new URLSearchParams()
  if (programId) params.append('program_id', programId.toString())
  if (year) params.append('year', year.toString())

  const url = `${DASHBOARD_URL}/api/dashboard${params.toString() ? '?' + params.toString() : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('No se pudieron obtener los datos del dashboard')
  }

  return response.json()
}

export async function getCompanyDashboard(): Promise<CompanyDashboardData> {
  const token = localStorage.getItem('access_token')
  const response = await fetch(`${DASHBOARD_URL}/api/company/dashboard`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) throw new Error('No se pudieron obtener los datos del dashboard de empresa')
  return response.json()
}

export async function getGraduateDashboard(): Promise<GraduateDashboardData> {
  const token = localStorage.getItem('access_token')
  const response = await fetch(`${DASHBOARD_URL}/api/graduate/dashboard`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) throw new Error('No se pudieron obtener los datos del dashboard de egresado')
  return response.json()
}