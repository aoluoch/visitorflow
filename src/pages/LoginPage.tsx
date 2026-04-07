import React, { useState } from 'react'
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Welcome back!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gold-500/5" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gold-500/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-navy-800/50" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-navy-800 rounded-2xl shadow-2xl border border-navy-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-navy-900 to-navy-800 px-8 pt-10 pb-8 text-center border-b border-navy-700">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center p-2 shadow-lg">
                <img src="/gamlogo.png" alt="Grace Arena Ministries" className="w-full h-full object-contain" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">VisitorFlow</h1>
            <p className="text-navy-300 text-sm mt-1">Grace Arena Ministries</p>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <ShieldCheck size={14} className="text-gold-400" />
              <span className="text-gold-400 text-xs font-medium">Admin Portal</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div>
              <label className="block text-navy-200 text-sm font-medium mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-navy-200 text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-navy-900 border border-navy-600 rounded-lg px-4 py-3 pr-11 text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-gold-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:bg-gold-800 text-navy-900 font-semibold py-3 rounded-lg transition-all duration-150 text-sm shadow-lg shadow-gold-500/20 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="px-8 pb-6 text-center">
            <p className="text-navy-500 text-xs">
              Access restricted to administrators only
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
