export type VisitorStage =
  | 'New Visitor'
  | 'Returning Visitor'
  | 'Member'
  | 'Cell Member'
  | 'Department Member'

export type HowHeard =
  | 'Friend'
  | 'Social Media'
  | 'Flyer'
  | 'Radio'
  | 'Walk-in'
  | 'Online'
  | 'Other'

export interface Visitor {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  visit_date: string
  prayer_requests: string | null
  how_heard: HowHeard | null
  current_stage: VisitorStage
  notes: string | null
  created_at: string
  updated_at: string
}

export type MembershipCompletionStatus =
  | 'Not Enrolled'
  | 'Enrolled'
  | 'In Progress'
  | 'Completed'

export interface MembershipClass {
  id: string
  visitor_id: string
  enrolled: boolean
  enrollment_date: string | null
  attendance_count: number
  completion_status: MembershipCompletionStatus
  completion_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CellGroup {
  id: string
  name: string
  leader: string | null
  location: string | null
  meeting_day: string | null
  meeting_time: string | null
  created_at: string
}

export interface VisitorCellGroup {
  id: string
  visitor_id: string
  cell_group_id: string
  assigned: boolean
  assigned_date: string
  created_at: string
  cell_groups?: CellGroup
}

export interface Department {
  id: string
  name: string
  description: string | null
  leader: string | null
  created_at: string
}

export interface VisitorDepartment {
  id: string
  visitor_id: string
  department_id: string
  enrolled: boolean
  enrollment_date: string
  created_at: string
  departments?: Department
}

export interface ServiceRecord {
  id: string
  visitor_department_id: string
  service_date: string
  description: string | null
  hours_served: number | null
  created_at: string
}

export type TaskType = 'call' | 'visit'
export type TaskStatus = 'pending' | 'completed' | 'cancelled'

export interface Task {
  id: string
  visitor_id: string
  task_type: TaskType
  title: string
  description: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  status: TaskStatus
  assigned_to: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  visitors?: Pick<Visitor, 'id' | 'name' | 'phone'>
}

export type AdminRole = 'super_admin' | 'admin'

export interface AdminProfile {
  id: string
  full_name: string
  email: string
  role: AdminRole
  created_by: string | null
  created_at: string
  updated_at: string
}
