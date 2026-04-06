export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'super_admin' | 'admin' | 'client'
  created_at: string
  updated_at: string
}

export interface Submission {
  id: string
  client_user_id: string | null
  status: 'invited' | 'in_progress' | 'submitted' | 'in_review' | 'complete'
  submission_method: 'upload' | 'manual' | null
  company_name: string | null
  dba_name: string | null
  fein: string | null
  state_tax_id: string | null
  business_state: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null

  // Entity
  entity_type: string | null
  section_280c_election: boolean | null

  // Address
  street_address: string | null
  street_address_2: string | null
  city: string | null
  address_state: string | null
  zip_code: string | null
  tax_return_address_same: boolean | null

  // Ownership
  has_additional_owners: boolean | null
  additional_owners: string | null

  // Business details
  industry: string | null
  total_employees: number | null
  total_ft_employees: number | null
  employee_states: string | null
  date_incorporated: string | null
  tax_year_end: string | null

  // Forbes-assisted fields
  field_consultant_name: string | null
  field_consultant_email: string | null
  sic_code: string | null

  // Filing status
  filing_status_2022: string | null
  filing_date_2022: string | null
  filing_status_2023: string | null
  filing_date_2023: string | null
  filing_status_2024: string | null
  filing_date_2024: string | null
  filing_status_2025: string | null

  // Tax details
  short_year_credit: boolean | null
  controlled_group: boolean | null
  tax_years_filed_for: string | null

  // Credit method eligibility
  year_started_revenue: number | null
  year_started_rd: number | null
  gross_revenue_over_5m: boolean | null

  // Contracts / rights
  owns_substantial_rights: boolean | null
  activities_under_contract: boolean | null
  contract_fee_structure: string | null

  // R&D Project Indicators
  rd_new_processes: boolean | null
  rd_products_designed: boolean | null
  rd_new_materials: boolean | null
  rd_formulas_methods: boolean | null
  rd_software: boolean | null
  rd_prototypes: boolean | null
  rd_equipment: boolean | null
  rd_lab_equipment: boolean | null
  rd_documented_research: boolean | null
  rd_certification_testing: boolean | null
  rd_environmental: boolean | null
  rd_acoustical: boolean | null
  rd_electrical_lighting: boolean | null
  rd_ventilation: boolean | null
  rd_water_plumbing: boolean | null
  rd_cybersecurity: boolean | null
  rd_underground_infra: boolean | null
  rd_value_engineering: boolean | null

  invited_at: string
  started_at: string | null
  submitted_at: string | null
  completed_at: string | null
  last_active_at: string
  admin_notes: string | null
  flagged: boolean
  export_generated_at: string | null
  export_sent_at: string | null
  export_pdf_url: string | null
  export_excel_url: string | null
  export_discovery_pdf_url: string | null
  export_document_zip_url: string | null
  export_full_package_url: string | null
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  submission_id: string
  tax_year: number
  full_name: string
  employee_type: 'Employee' | 'Contractor'
  state: string
  total_wages: number
  total_hours_worked: number | null
  rd_percentage: number | null
  project_name: string | null
  rd_hours: number | null
  qualified_amount: number | null
  ai_extracted: boolean
  ai_confidence: 'high' | 'medium' | 'low' | null
  created_at: string
  updated_at: string
}

export interface Supply {
  id: string
  submission_id: string
  tax_year: number
  description: string
  project_name: string | null
  amount: number
  ai_extracted: boolean
  ai_confidence: 'high' | 'medium' | 'low' | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  submission_id: string
  uploaded_by: string | null
  category: 'payroll' | 'pandl' | 'taxid' | 'gross_receipts' | 'other'
  tax_year: number | null
  file_name: string
  file_size: number | null
  file_type: string | null
  storage_path: string
  storage_url: string | null
  extraction_status: 'pending' | 'processing' | 'complete' | 'failed' | 'skipped'
  extraction_result: any | null
  created_at: string
}

export interface GrossReceipt {
  id: string
  submission_id: string
  tax_year: number
  amount: number
  created_at: string
  updated_at: string
}

export interface QRESummary {
  submission_id: string
  company_name: string | null
  fein: string | null
  business_state: string | null
  contact_name: string | null
  contact_email: string | null
  status: string
  tax_year: number | null
  employee_count: number
  payroll_qre: number
  total_rd_hours: number
  supplies_qre: number
  total_qre: number
}

export interface QRAProject {
  id: string
  submission_id: string
  project_name: string
  start_date: string | null
  end_date: string | null
  description: string | null
  business_problem: string | null
  technologies_used: string | null
  improvements: string | null
  measurable_outcomes: string | null
  created_at: string
  updated_at: string
}

export interface QRAChallenge {
  id: string
  project_id: string
  technical_problem: string | null
  why_no_existing_solution: string | null
  approaches_tried: string | null
  testing_methods: string | null
  iteration_count: number | null
  outcome: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreditEstimate {
  submission_id: string
  current_year: number
  current_qre: number
  prior_3yr_avg: number
  conservative_federal: number
  conservative_georgia: number
  conservative_total: number
  asc_federal: number
  asc_georgia: number
  asc_total: number
}
