import React, { useState } from 'react'
import { Mail, Lock, User as UserIcon, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('Email and password required'); return }
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) return toast.error(error)
    toast.success('Account created! Check your email to verify (if required).')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="bg-navy-800 rounded-2xl shadow-2xl border border-navy-700 overflow-hidden">
          <div className="bg-gradient-to-br from-navy-900 to-navy-800 px-8 pt-10 pb-8 text-center border-b border-navy-700">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center p-2 shadow-lg">
                <img src="/gamlogo.png" alt="Grace Arena Ministries" className="w-full h-full object-contain" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="text-navy-300 text-sm mt-1">Join VisitorFlow</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-4">
            <div>
              <label className="block text-navy-200 text-sm font-medium mb-1.5">Full name</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full bg-navy-900 border border-navy-600 rounded-lg pl-9 pr-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-navy-200 text-sm font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full bg-navy-900 border border-navy-600 rounded-lg pl-9 pr-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-navy-200 text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full bg-navy-900 border border-navy-600 rounded-lg pl-9 pr-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:bg-gold-800 text-navy-900 font-semibold py-3 rounded-lg transition-all duration-150 text-sm shadow-lg shadow-gold-500/20 mt-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" /> : (<><UserPlus size={18} /> Create Account</>)}
            </button>
            <div className="text-center text-xs text-navy-300">
              Already have an account? <Link to="/login" className="text-gold-400 hover:text-gold-300">Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
