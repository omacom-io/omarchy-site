import { Link } from '@tanstack/react-router'

const tabs = [
  { to: '/plugins/', label: 'Browse', exact: true },
  { to: '/plugins/explore/', label: 'Explore', exact: false },
  { to: '/plugins/develop/', label: 'Develop', exact: false },
  { to: '/plugins/publish/', label: 'Publish', exact: false },
] as const

/** Section navigation shared by every marketplace page. */
export function PluginsNav() {
  return (
    <nav aria-label="Marketplace sections" className="flex flex-wrap gap-1">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          activeOptions={{ exact: tab.exact }}
          className="border border-transparent px-3 py-1.5 font-mono text-[13px] text-text-secondary transition-colors duration-150 ease-out hover:text-text"
          activeProps={{
            className: 'border-border-strong bg-surface text-text',
          }}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
