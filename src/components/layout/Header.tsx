interface Props {
  title: string
  description?: string
  action?: React.ReactNode
}

export function Header({ title, description, action }: Props) {
  return (
    <div className="flex items-start justify-between border-b border-gray-200 bg-white px-8 py-6 dark:border-gray-700 dark:bg-gray-900">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
