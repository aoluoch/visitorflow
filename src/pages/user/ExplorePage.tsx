import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Users2, BookOpen, ClipboardList, Search, Filter, MapPin, Clock, Users, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { PublicDepartment, PublicCellGroup, PublicMembershipClass, VolunteerOpportunity, Application } from '../../types'
import toast from 'react-hot-toast'

type TabType = 'all' | 'departments' | 'cell_groups' | 'classes' | 'volunteer'

export default function ExplorePage() {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [departments, setDepartments] = useState<PublicDepartment[]>([])
  const [cellGroups, setCellGroups] = useState<PublicCellGroup[]>([])
  const [classes, setClasses] = useState<PublicMembershipClass[]>([])
  const [volunteerOps, setVolunteerOps] = useState<VolunteerOpportunity[]>([])
  const [userApplications, setUserApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadExploreData() {
      if (!userProfile) return
      try {
        const [{ data: depts }, { data: cells }, { data: memClasses }, { data: volunteers }, { data: applications }] = await Promise.all([
          supabase.from('departments').select('*').eq('is_public', true).eq('status', 'active'),
          supabase.from('cell_groups').select('*').eq('is_public', true).in('status', ['active', 'full']),
          supabase.from('membership_classes_public').select('*').eq('is_public', true).in('status', ['upcoming', 'active']),
          supabase.from('volunteer_opportunities').select('*, department:departments(name), cell_group:cell_groups(name)').eq('status', 'open'),
          supabase.from('applications').select('*').eq('applicant_id', userProfile.id)
        ])
        setDepartments(depts || [])
        setCellGroups(cells || [])
        setClasses(memClasses || [])
        setVolunteerOps(volunteers || [])
        setUserApplications(applications || [])
      } catch (err) {
        console.error('Explore load error:', err)
        toast.error('Failed to load explore data')
      } finally {
        setLoading(false)
      }
    }
    loadExploreData()
  }, [userProfile])

  const hasApplied = (targetId: string, targetType: string) => {
    return userApplications.some(app => app.target_id === targetId && app.target_type === targetType && !['rejected', 'withdrawn'].includes(app.status))
  }

  const getApplicationStatus = (targetId: string, targetType: string) => {
    return userApplications.find(app => app.target_id === targetId && app.target_type === targetType && !['rejected', 'withdrawn'].includes(app.status))?.status
  }

  const [applyTarget, setApplyTarget] = useState<{ id: string; type: 'department' | 'cell_group' | 'membership_class' | 'volunteer_opportunity'; name: string } | null>(null)
  const [applyMessage, setApplyMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleApply = async (item: { id: string; type: 'department' | 'cell_group' | 'membership_class' | 'volunteer_opportunity'; name: string }) => {
    setApplyTarget(item)
    setApplyMessage('')
  }

  const submitApplication = async () => {
    if (!userProfile || !applyTarget) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('applications').insert({
        applicant_id: userProfile.id,
        target_type: applyTarget.type,
        target_id: applyTarget.id,
        target_name: applyTarget.name,
        status: 'pending',
        message: applyMessage || `Application for ${applyTarget.name}`
      })
      if (error) throw error
      toast.success('Application submitted successfully!')
      setApplyTarget(null)
      setApplyMessage('')
      const { data } = await supabase.from('applications').select('*').eq('applicant_id', userProfile.id)
      setUserApplications(data || [])
    } catch (err) {
      console.error('Apply error:', err)
      toast.error('Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredDepartments = departments.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredCellGroups = cellGroups.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description?.toLowerCase().includes(searchQuery.toLowerCase()) || c.location?.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredClasses = classes.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredVolunteerOps = volunteerOps.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()) || v.description?.toLowerCase().includes(searchQuery.toLowerCase()))

  const tabs: { id: TabType; label: string; icon: typeof Building2 }[] = [
    { id: 'all', label: 'All', icon: Filter },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'cell_groups', label: 'Cell Groups', icon: Users2 },
    { id: 'classes', label: 'Classes', icon: BookOpen },
    { id: 'volunteer', label: 'Volunteer', icon: ClipboardList },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-navy-800 to-navy-700 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-xl font-bold">Explore Opportunities</h2>
        <p className="text-navy-300 text-sm mt-1">Discover departments, cell groups, classes, and volunteer opportunities</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-gold-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
              <tab.icon size={16} />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        {(activeTab === 'all' || activeTab === 'departments') && filteredDepartments.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold text-navy-800 mb-4 flex items-center gap-2"><Building2 size={20} /> Departments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDepartments.map(dept => {
                const applied = hasApplied(dept.id, 'department')
                const status = getApplicationStatus(dept.id, 'department')
                return (
                  <div key={dept.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><Building2 size={24} className="text-blue-600" /></div>
                      {applied && <span className={`text-xs px-2 py-1 rounded-full font-medium ${status === 'approved' ? 'bg-emerald-100 text-emerald-700' : status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{status === 'approved' ? 'Joined' : status?.replace('_', ' ')}</span>}
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">{dept.name}</h4>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{dept.description || 'No description'}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-gray-500"><Users size={14} /><span>{dept.current_members || 0} members</span></div>
                      {applied ? <Link to="/user/applications" className="flex items-center gap-1 text-sm text-gold-600 hover:text-gold-700">View <ChevronRight size={16} /></Link> : <button onClick={() => handleApply({ id: dept.id, type: 'department', name: dept.name })} className="px-4 py-2 bg-gold-500 text-white text-sm font-medium rounded-lg hover:bg-gold-600 transition-colors">Apply</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
        {(activeTab === 'all' || activeTab === 'cell_groups') && filteredCellGroups.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold text-navy-800 mb-4 flex items-center gap-2"><Users2 size={20} /> Cell Groups</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCellGroups.map(group => {
                const applied = hasApplied(group.id, 'cell_group')
                const status = getApplicationStatus(group.id, 'cell_group')
                const isFull = group.status === 'full'
                return (
                  <div key={group.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow ${isFull ? 'opacity-75' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center"><Users2 size={24} className="text-emerald-600" /></div>
                      {applied && <span className={`text-xs px-2 py-1 rounded-full font-medium ${status === 'approved' ? 'bg-emerald-100 text-emerald-700' : status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{status === 'approved' ? 'Member' : status?.replace('_', ' ')}</span>}
                      {isFull && !applied && <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700">Full</span>}
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">{group.name}</h4>
                    <p className="text-sm text-gray-500 mb-3">{group.description || 'No description'}</p>
                    <div className="space-y-1 text-sm text-gray-500 mb-4">
                      {group.leader && <p>Leader: {group.leader}</p>}
                      {group.location && <p className="flex items-center gap-1"><MapPin size={14} /> {group.location}</p>}
                      {(group.meeting_day || group.meeting_time) && <p className="flex items-center gap-1"><Clock size={14} /> {group.meeting_day} {group.meeting_time}</p>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-gray-500"><Users size={14} /><span>{group.current_members || 0}{group.capacity ? `/${group.capacity}` : ''}</span></div>
                      {applied ? <Link to="/user/applications" className="flex items-center gap-1 text-sm text-gold-600 hover:text-gold-700">View <ChevronRight size={16} /></Link> : isFull ? <span className="text-sm text-gray-400">No spots</span> : <button onClick={() => handleApply({ id: group.id, type: 'cell_group', name: group.name })} className="px-4 py-2 bg-gold-500 text-white text-sm font-medium rounded-lg hover:bg-gold-600 transition-colors">Join</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
        {(activeTab === 'all' || activeTab === 'classes') && filteredClasses.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold text-navy-800 mb-4 flex items-center gap-2"><BookOpen size={20} /> Classes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map(cls => {
                const applied = hasApplied(cls.id, 'membership_class')
                const status = getApplicationStatus(cls.id, 'membership_class')
                return (
                  <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center"><BookOpen size={24} className="text-purple-600" /></div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${cls.status === 'active' ? 'bg-emerald-100 text-emerald-700' : cls.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{cls.status}</span>
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">{cls.name}</h4>
                    <p className="text-sm text-gray-500 mb-3">{cls.description || 'No description'}</p>
                    <div className="space-y-1 text-sm text-gray-500 mb-4">
                      {cls.instructor && <p>Instructor: {cls.instructor}</p>}
                      {cls.schedule && <p className="flex items-center gap-1"><Clock size={14} /> {cls.schedule}</p>}
                      {cls.start_date && <p>Starts: {new Date(cls.start_date).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-gray-500"><Users size={14} /><span>{cls.enrolled_count || 0}{cls.capacity ? `/${cls.capacity}` : ''} enrolled</span></div>
                      {applied ? <span className={`text-xs px-2 py-1 rounded-full font-medium ${status === 'approved' ? 'bg-emerald-100 text-emerald-700' : status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{status === 'approved' ? 'Enrolled' : status?.replace('_', ' ')}</span> : <button onClick={() => handleApply({ id: cls.id, type: 'membership_class', name: cls.name })} className="px-4 py-2 bg-gold-500 text-white text-sm font-medium rounded-lg hover:bg-gold-600 transition-colors">Enroll</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
        {(activeTab === 'all' || activeTab === 'volunteer') && filteredVolunteerOps.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold text-navy-800 mb-4 flex items-center gap-2"><ClipboardList size={20} /> Volunteer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVolunteerOps.map(op => {
                const applied = hasApplied(op.id, 'volunteer_opportunity')
                const status = getApplicationStatus(op.id, 'volunteer_opportunity')
                return (
                  <div key={op.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center"><ClipboardList size={24} className="text-orange-600" /></div>
                      {applied && <span className={`text-xs px-2 py-1 rounded-full font-medium ${status === 'approved' ? 'bg-emerald-100 text-emerald-700' : status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{status === 'approved' ? 'Volunteering' : status?.replace('_', ' ')}</span>}
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">{op.title}</h4>
                    <p className="text-sm text-gray-500 mb-3">{op.description || 'No description'}</p>
                    <div className="space-y-1 text-sm text-gray-500 mb-4">
                      {op.department?.name && <p>Dept: {op.department.name}</p>}
                      {op.time_commitment && <p>Time: {op.time_commitment}</p>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-gray-500"><Users size={14} /><span>{op.spots_filled}/{op.spots_available} spots</span></div>
                      {applied ? <Link to="/user/applications" className="flex items-center gap-1 text-sm text-gold-600 hover:text-gold-700">View <ChevronRight size={16} /></Link> : <button onClick={() => handleApply({ id: op.id, type: 'volunteer_opportunity', name: op.title })} disabled={op.spots_filled >= op.spots_available} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${op.spots_filled >= op.spots_available ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gold-500 text-white hover:bg-gold-600'}`}>{op.spots_filled >= op.spots_available ? 'Full' : 'Volunteer'}</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* Application Form Modal */}
      {applyTarget && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-navy-800">Apply / Enroll</h2>
              <button onClick={() => setApplyTarget(null)} className="text-gray-400 hover:text-gray-600">
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-800">{applyTarget.name}</p>
                <p className="text-xs text-gray-500 capitalize mt-0.5">{applyTarget.type.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Name:</span> {userProfile?.full_name}</p>
                <p className="text-sm text-gray-600"><span className="font-medium">Email:</span> {userProfile?.email}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Message (optional)</label>
                <textarea
                  value={applyMessage}
                  onChange={e => setApplyMessage(e.target.value)}
                  placeholder="Why would you like to join? Tell us a bit about yourself..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyTarget(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitApplication}
                  disabled={submitting}
                  className="flex-1 bg-gold-500 hover:bg-gold-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
