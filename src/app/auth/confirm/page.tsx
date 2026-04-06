import { redirect } from 'next/navigation'

// Legacy confirm page — redirect to login.
// Invite flow now goes through /auth/set-password.
// Password reset goes through /auth/reset-password.
export default function ConfirmPage() {
  redirect('/login')
}
