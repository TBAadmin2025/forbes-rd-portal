import { Resend } from 'resend'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key || key === '' || key === 'placeholder_for_now') {
    return null
  }
  return new Resend(key)
}

const FROM_ADDRESS = 'Forbes Management <noreply@forbesmgt.com>'

/**
 * Send a branded client invitation email.
 * Includes a link for the user to set their password and access the portal.
 */
export async function sendInviteEmail(opts: {
  to: string
  clientName: string
  companyName?: string
  inviteLink: string
}) {
  const resend = getResend()
  if (!resend) {
    console.log('[Email] Resend not configured — skipping invite email to', opts.to)
    console.log('[Email] Invite link:', opts.inviteLink)
    return { sent: false, reason: 'resend_not_configured' }
  }

  const { to, clientName, companyName, inviteLink } = opts
  const firstName = clientName.split(' ')[0]

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: 'Welcome to Forbes Management — Set Up Your Portal Access',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F0E7D7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0E7D7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#6C161C;padding:28px 32px;border-radius:6px 6px 0 0;text-align:center;">
              <img
                src="https://assets.cdn.filesafe.space/urR6xH3XyBfmLBzEzkKY/media/69c40c28d0b6d3d9f1a59b5a.svg"
                alt="Forbes Management"
                height="36"
                style="height:36px;width:auto;"
              />
              <div style="color:#E2C49B;font-size:9px;letter-spacing:3.5px;text-transform:uppercase;margin-top:8px;">
                R&D Tax Credit Portal
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#FFFFFF;padding:36px 32px;">
              <h1 style="margin:0 0 16px;font-size:22px;color:#111111;font-weight:700;line-height:1.3;">
                Hello, ${firstName}.
              </h1>
              <p style="margin:0 0 20px;font-size:14px;color:#7A7060;line-height:1.7;font-weight:300;">
                Forbes Management has invited you to the R&D Tax Credit Portal${companyName ? ` for <strong style="color:#111111;font-weight:600;">${companyName}</strong>` : ''}.
                To get started, click the button below to create your password and access your portal.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:12px 0 28px;">
                    <a
                      href="${inviteLink}"
                      style="display:inline-block;background:#6C161C;color:#F0E7D7;text-decoration:none;padding:14px 36px;border-radius:3px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;"
                    >
                      Set Your Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:12px;color:#7A7060;line-height:1.7;font-weight:300;">
                After setting your password, you can sign in anytime at your portal URL — no email link needed.
              </p>
              <p style="margin:0;font-size:12px;color:#7A7060;line-height:1.7;font-weight:300;">
                If you didn&rsquo;t expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1C1C1C;padding:20px 32px;border-radius:0 0 6px 6px;text-align:center;">
              <div style="color:#7A7060;font-size:11px;line-height:1.6;">
                Forbes Management &middot; admin@forbesmgt.com
              </div>
              <div style="color:#7A7060;font-size:10px;margin-top:4px;opacity:0.6;">
                Confidential
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Hello ${firstName},\n\nForbes Management has invited you to the R&D Tax Credit Portal${companyName ? ` for ${companyName}` : ''}.\n\nSet your password and access your portal:\n${inviteLink}\n\nAfter setting your password, you can sign in anytime — no email link needed.\n\n—\nForbes Management\nadmin@forbesmgt.com`,
  })

  if (error) {
    console.error('[Email] Failed to send invite:', error)
    return { sent: false, reason: error.message }
  }

  return { sent: true, id: data?.id }
}

/**
 * Send a password reset email with branded template.
 */
export async function sendResetEmail(opts: {
  to: string
  resetLink: string
}) {
  const resend = getResend()
  if (!resend) {
    console.log('[Email] Resend not configured — skipping reset email to', opts.to)
    return { sent: false, reason: 'resend_not_configured' }
  }

  const { to, resetLink } = opts

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: 'Reset Your Password — Forbes Management Portal',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F0E7D7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0E7D7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#6C161C;padding:28px 32px;border-radius:6px 6px 0 0;text-align:center;">
              <img
                src="https://assets.cdn.filesafe.space/urR6xH3XyBfmLBzEzkKY/media/69c40c28d0b6d3d9f1a59b5a.svg"
                alt="Forbes Management"
                height="36"
                style="height:36px;width:auto;"
              />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#FFFFFF;padding:36px 32px;">
              <h1 style="margin:0 0 16px;font-size:22px;color:#111111;font-weight:700;line-height:1.3;">
                Reset your password
              </h1>
              <p style="margin:0 0 20px;font-size:14px;color:#7A7060;line-height:1.7;font-weight:300;">
                We received a request to reset the password for your Forbes Management portal account. Click the button below to choose a new password.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:12px 0 28px;">
                    <a
                      href="${resetLink}"
                      style="display:inline-block;background:#6C161C;color:#F0E7D7;text-decoration:none;padding:14px 36px;border-radius:3px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;"
                    >
                      Reset Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#7A7060;line-height:1.7;font-weight:300;">
                If you didn&rsquo;t request this, you can safely ignore this email. Your password won&rsquo;t change.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1C1C1C;padding:20px 32px;border-radius:0 0 6px 6px;text-align:center;">
              <div style="color:#7A7060;font-size:11px;line-height:1.6;">
                Forbes Management &middot; admin@forbesmgt.com
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Reset your password\n\nWe received a request to reset the password for your Forbes Management portal account.\n\nReset your password:\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.\n\n—\nForbes Management`,
  })

  if (error) {
    console.error('[Email] Failed to send reset email:', error)
    return { sent: false, reason: error.message }
  }

  return { sent: true, id: data?.id }
}
