import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  variant?: 'default' | 'critical' | 'high' | 'medium' | 'low' | 'success' | 'info'
  className?: string
}

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  default:  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  high:     'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  medium:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  low:      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  success:  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  info:     'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
}

export function Badge({ children, variant = 'default', className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
