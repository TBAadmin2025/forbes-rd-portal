'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/shared/Card'
import FormField from '@/components/shared/FormField'
import Button from '@/components/shared/Button'
import Tag from '@/components/shared/Tag'
import AddTeamMemberModal from '@/components/admin/AddTeamMemberModal'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [showAddTeamMember, setShowAddTeamMember] = useState(false)
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string | null; role: string; created_at: string }[]>([])

  const loadTeamMembers = async () => {
    const res = await fetch('/api/admin/team')
    if (res.ok) {
      const data = await res.json()
      setTeamMembers(data)
    }
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || '')
        setRole(profile.role || '')
      }
    }
    load()
    loadTeamMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaved(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id)

    // Also update auth metadata
    await supabase.auth.updateUser({
      data: { full_name: fullName },
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSaved(false)

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setChangingPassword(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    setChangingPassword(false)

    if (error) {
      setPasswordError(error.message)
    } else {
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 3000)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : role

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1
          className="font-serif"
          style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}
        >
          Settings
        </h1>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginTop: 4 }}>
          Manage your profile and account
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <div
            className="font-serif"
            style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)' }}
          >
            Profile
          </div>
          <Tag variant="complete">{roleLabel}</Tag>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
          <FormField label="Full Name">
            <input
              className="finput"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </FormField>
          <FormField label="Email Address" hint="Contact an admin to change your email">
            <input
              className="finput"
              value={email}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </FormField>
        </div>

        <div className="flex items-center" style={{ gap: 12 }}>
          <Button
            variant="cherry"
            size="sm"
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          {saved && (
            <span style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 500 }}>
              Saved
            </span>
          )}
        </div>
      </Card>

      {/* Password Card */}
      <div style={{ marginTop: 20 }}>
        <Card>
          <div
            className="font-serif"
            style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 20 }}
          >
            Change Password
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
            <FormField label="New Password">
              <input
                className="finput"
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </FormField>
            <FormField label="Confirm Password">
              <input
                className="finput"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </FormField>
          </div>

          {passwordError && (
            <div
              style={{
                background: 'rgba(185,28,28,0.06)',
                borderLeft: '3px solid #b91c1c',
                padding: '10px 14px',
                fontSize: 12,
                color: '#b91c1c',
                fontWeight: 300,
                borderRadius: '0 3px 3px 0',
                marginBottom: 16,
              }}
            >
              {passwordError}
            </div>
          )}

          <div className="flex items-center" style={{ gap: 12 }}>
            <Button
              variant="dark"
              size="sm"
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword}
            >
              {changingPassword ? 'Updating...' : 'Update Password'}
            </Button>
            {passwordSaved && (
              <span style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 500 }}>
                Password updated
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Team Members */}
      <div style={{ marginTop: 20 }}>
        <Card>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div
              className="font-serif"
              style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)' }}
            >
              Team Members
            </div>
            <Button
              variant="cherry"
              size="sm"
              onClick={() => setShowAddTeamMember(true)}
            >
              Add Team Member
            </Button>
          </div>

          {teamMembers.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300 }}>
              No team members yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {teamMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>
                      {m.full_name || 'Unnamed'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300, marginTop: 2 }}>
                      Added {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <Tag variant={m.role === 'super_admin' ? 'complete' : 'progress'}>
                    {m.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </Tag>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <AddTeamMemberModal
        isOpen={showAddTeamMember}
        onClose={() => setShowAddTeamMember(false)}
        onSuccess={loadTeamMembers}
      />

      {/* Sign Out */}
      <div style={{ marginTop: 20 }}>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div
                className="font-serif"
                style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}
              >
                Sign Out
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>
                End your current session
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
