import { useState } from 'react'
import { User, Mail, Phone, MapPin, Calendar, UserCircle, Save, Edit2, X, Camera } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function UserProfilePage() {
  const { userProfile, updateUserProfile, refreshUserProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: userProfile?.full_name || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email || '',
    address: userProfile?.address || '',
    date_of_birth: userProfile?.date_of_birth || '',
    gender: userProfile?.gender || '',
    emergency_contact_name: userProfile?.emergency_contact_name || '',
    emergency_contact_phone: userProfile?.emergency_contact_phone || '',
    bio: userProfile?.bio || '',
  })

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await updateUserProfile(formData)
    if (error) {
      toast.error('Failed to update profile: ' + error)
    } else {
      toast.success('Profile updated successfully')
      setIsEditing(false)
      await refreshUserProfile()
    }
    setSaving(false)
  }

  const handleCancel = () => {
    setFormData({
      full_name: userProfile.full_name || '',
      phone: userProfile.phone || '',
      email: userProfile.email || '',
      address: userProfile.address || '',
      date_of_birth: userProfile.date_of_birth || '',
      gender: userProfile.gender || '',
      emergency_contact_name: userProfile.emergency_contact_name || '',
      emergency_contact_phone: userProfile.emergency_contact_phone || '',
      bio: userProfile.bio || '',
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-navy-800">My Profile</h2>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors">
            <Edit2 size={18} /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <X size={18} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors disabled:opacity-50">
              <Save size={18} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center relative">
            <UserCircle size={48} />
            {isEditing && (
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center hover:bg-gold-600 transition-colors">
                <Camera size={16} />
              </button>
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold">{userProfile.full_name}</h3>
            <p className="text-navy-300">{userProfile.email}</p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!isEditing}
                rows={2}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
            <input
              type="text"
              value={formData.emergency_contact_name}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
            <input
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              disabled={!isEditing}
              rows={3}
              placeholder="Tell us a bit about yourself..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
