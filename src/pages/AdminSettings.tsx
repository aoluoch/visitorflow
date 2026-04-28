import React, { useEffect, useState } from 'react'
import { Shield, UserPlus, Trash2, X, Eye, EyeOff, Mail, User } from 'lucide-react'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { AdminProfile, AdminRole } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function AdminSettingsPage() {
  const { adminProfile } = useAuth()
  const [admins, setAdmins] = useState<AdminProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'admin' as AdminRole })
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function loadAdmins() {
    setLoading(true)
    const { data, error } = await supabase.from('admin_profiles').select('*').order('created_at')
    if (error) toast.error(error.message)
    else setAdmins((data ?? []) as AdminProfile[])
    setLoading(false)
  }

  useEffect(() => { loadAdmins() }, [])

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      toast.error('All fields are required')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSaving(true)
    if (!supabaseAdmin) {
      toast.error('Service role key not configured. Add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file.')
      setSaving(false)
      return
    }
    try {
      const { data, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
      })
      if (signUpError) throw signUpError
      if (!data.user) throw new Error('User creation failed')

      const { error: profileError } = await supabase.from('admin_profiles').insert([{
        id: data.user.id,
        full_name: form.full_name,
        email: form.email,
        role: form.role,
        created_by: adminProfile?.id ?? null,
      }])
      if (profileError) throw profileError

      toast.success('Admin created successfully!')
      setShowModal(false)
      setForm({ full_name: '', email: '', password: '', role: 'admin' })
      loadAdmins()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to create admin')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (id === adminProfile?.id) {
      toast.error("You can't delete your own account")
      setDeleteId(null)
      return
    }
    if (!supabaseAdmin) {
      toast.error('Service role key not configured.')
      setDeleteId(null)
      return
    }
    // Server-side super_admin check via RPC
    const { error: rpcError } = await supabase.rpc('delete_admin', { target_id: id })
    if (rpcError) {
      toast.error(rpcError.message)
      setDeleteId(null)
      return
    }
    // Now remove the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) toast.error(error.message)
    else { toast.success('Admin removed'); loadAdmins() }
    setDeleteId(null)
  }

  const ROLE_COLORS: Record<AdminRole, string> = {
    super_admin: 'bg-gold-100 text-gold-700',
    admin: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Shield size={22} className="text-gold-400" />
          <h2 className="text-lg font-bold">Admin & Settings</h2>
        </div>
        <p className="text-navy-300 text-sm">Manage administrator accounts and system access.</p>
      </div>

      {/* Current Admin Info */}
      {adminProfile && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-navy-800 mb-4 text-sm flex items-center gap-2">
            <User size={16} className="text-gold-500" /> Your Account
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-navy-700 flex items-center justify-center text-gold-400 text-xl font-bold flex-shrink-0">
              {adminProfile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{adminProfile.full_name}</p>
              <p className="text-sm text-gray-500">{adminProfile.email}</p>
              <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[adminProfile.role]}`}>
                {adminProfile.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Admins List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-navy-800">
            Administrators <span className="text-gray-400 font-normal text-sm">({admins.length})</span>
          </h3>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus size={15} /> Add Admin
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {admins.map(admin => (
              <div key={admin.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-bold text-sm flex-shrink-0">
                    {admin.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800 text-sm">{admin.full_name}</p>
                      {admin.id === adminProfile?.id && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">You</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail size={11} className="text-gray-400" />
                      <p className="text-xs text-gray-500">{admin.email}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[admin.role]}`}>
                      {admin.role.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">Since {format(new Date(admin.created_at), 'MMM yyyy')}</p>
                  </div>
                  {admin.id !== adminProfile?.id && (
                    <button
                      onClick={() => setDeleteId(admin.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permissions Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-navy-800 mb-4 text-sm flex items-center gap-2">
          <Shield size={16} className="text-gold-500" /> Role Permissions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-gold-200 rounded-xl p-4 bg-gold-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gold-100 text-gold-700">Super Admin</span>
            </div>
            <ul className="space-y-1 text-xs text-gray-600">
              <li className="flex items-center gap-2">✓ Full access to all modules</li>
              <li className="flex items-center gap-2">✓ Create and delete admin accounts</li>
              <li className="flex items-center gap-2">✓ Manage all visitor data</li>
              <li className="flex items-center gap-2">✓ System configuration</li>
            </ul>
          </div>
          <div className="border border-blue-200 rounded-xl p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">Admin</span>
            </div>
            <ul className="space-y-1 text-xs text-gray-600">
              <li className="flex items-center gap-2">✓ Manage visitors</li>
              <li className="flex items-center gap-2">✓ Membership, cell groups, departments</li>
              <li className="flex items-center gap-2">✓ Create and manage tasks</li>
              <li className="flex items-center gap-2">✗ Cannot manage admin accounts</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-navy-800">Add Administrator</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAdmin} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
                <input
                  required
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  placeholder="jane@gracearena.org"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password *</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                    placeholder="Min. 6 characters"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as AdminRole }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                The new admin will be able to sign in immediately with the provided credentials.
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserPlus size={15} /> Create Admin</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">Remove Administrator?</h3>
            <p className="text-gray-500 text-sm mb-5">This admin will lose all access to VisitorFlow.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
