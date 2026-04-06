interface FormFieldProps {
  label: string
  hint?: string
  children: React.ReactNode
}

export default function FormField({ label, hint, children }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        className="block"
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <div
          className="italic"
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            marginTop: 4,
            fontWeight: 300,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
