import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: Props) {
  return (
    <main className={`flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 ${className}`}>
      <div className="p-8">{children}</div>
    </main>
  )
}
