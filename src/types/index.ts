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

// ============================================================================
// USER PROFILE TYPES (defined before Application to avoid circular reference)
// ============================================================================

export interface UserProfile {
  id: string
  full_name: string
  phone: string | null
  email: string
  address: string | null
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  bio: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserProfileFormData {
  full_name: string
  phone: string
  email: string
  address: string
  date_of_birth: string
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | ''
  emergency_contact_name: string
  emergency_contact_phone: string
  bio: string
}

export type ApplicationTargetType =
  | 'department'
  | 'cell_group'
  | 'membership_class'
  | 'task'
  | 'volunteer_opportunity'

export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'active' | 'completed' | 'withdrawn'

export interface Application {
  id: string
  applicant_id: string
  target_type: ApplicationTargetType
  target_id: string
  target_name: string
  status: ApplicationStatus
  message: string | null
  admin_notes: string | null
  processed_by: string | null
  processed_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  applicant?: UserProfile
  processor?: UserProfile
}

export interface ApplicationStatusHistory {
  id: string
  application_id: string
  from_status: ApplicationStatus | null
  to_status: ApplicationStatus
  changed_by: string
  note: string | null
  created_at: string
}

export type GroupScopeType = 'department' | 'cell_group' | 'membership_class' | 'volunteer_opportunity'

export interface GroupAdminAssignment {
  id: string
  user_id: string
  scope_type: GroupScopeType
  scope_id: string
  role: string
  can_approve: boolean
  can_manage_members: boolean
  can_assign_tasks: boolean
  can_send_notifications: boolean
  assigned_by: string | null
  assigned_at: string
  created_at: string
  group_name?: string
  pending_applications?: number
  active_members?: number
}

export interface VolunteerOpportunity {
  id: string
  title: string
  description: string | null
  department_id: string | null
  cell_group_id: string | null
  required_skills: string[] | null
  time_commitment: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  spots_available: number
  spots_filled: number
  status: 'open' | 'filled' | 'closed' | 'cancelled'
  created_by: string | null
  created_at: string
  updated_at: string
  department?: Department
  cell_group?: CellGroup
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType =
  | 'application_submitted'
  | 'application_received'
  | 'application_approved'
  | 'application_rejected'
  | 'application_under_review'
  | 'membership_started'
  | 'membership_ended'
  | 'task_assigned'
  | 'task_reminder'
  | 'class_reminder'
  | 'announcement'
  | 'system'

export interface Notification {
  id: string
  recipient_id: string
  type: NotificationType
  title: string
  message: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  read_at: string | null
  related_type: ApplicationTargetType | null
  related_id: string | null
  actor_id: string | null
  email_sent: boolean
  email_sent_at: string | null
  created_at: string
  actor?: UserProfile
}

// ============================================================================
// USER MEMBERSHIP TYPES
// ============================================================================

export interface UserMembership {
  id: string
  user_id: string
  membership_type: ApplicationTargetType
  group_id: string
  group_name: string
  application_id: string | null
  joined_at: string
  left_at: string | null
  is_active: boolean
  role_in_group: string
  attendance_count: number
  last_attendance_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// EXPLORE / DISCOVER TYPES
// ============================================================================

export interface PublicCellGroup extends CellGroup {
  is_public: boolean
  description: string | null
  capacity: number | null
  status: 'active' | 'inactive' | 'full'
  current_members?: number
}

export interface PublicDepartment extends Department {
  is_public: boolean
  status: 'active' | 'inactive'
  current_members?: number
}

export interface PublicMembershipClass {
  id: string
  name: string
  description: string | null
  instructor: string | null
  start_date: string | null
  end_date: string | null
  schedule: string | null
  location: string | null
  capacity: number | null
  is_public: boolean
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
  enrolled_count?: number
  created_at: string
  updated_at: string
}

export interface ExploreItem {
  id: string
  type: ApplicationTargetType
  name: string
  description: string | null
  status: string
  metadata: Record<string, unknown>
  has_applied: boolean
  application_status?: ApplicationStatus
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export interface UserDashboardStats {
  pending_applications: number
  approved_memberships: number
  active_memberships: number
  completed_memberships: number
  unread_notifications: number
}

export interface GroupAdminStats {
  total_groups: number
  pending_applications: number
  active_members: number
  total_managed_groups: number
}
