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
