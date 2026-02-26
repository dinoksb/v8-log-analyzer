import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
}

export function Card({ children, className = '', title, action }: Props) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          {title && <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
