export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const variantClass = variant === 'secondary' ? 'button-secondary' : variant === 'ghost' ? 'button-ghost' : 'button-primary'

  return (
    <button className={`button ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  )
}
