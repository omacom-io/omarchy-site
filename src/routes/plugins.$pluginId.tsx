import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CopyIcon,
  HeartIcon,
  SearchIcon,
  ShieldIcon,
  StarIcon,
  VerifiedIcon,
} from '@/components/icons'
import type { PluginWithStats } from '@/lib/plugins'
import { getPlugin } from '@/lib/plugins'
import { InstallCommand } from '@/components/InstallCommand'
import { PluginCard } from '@/components/PluginCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SITE_DESCRIPTION, seo } from '@/lib/seo'

const SECURITY_REPORT_URL =
  'https://github.com/omacom/omarchy-plugin-marketplace/security/advisories/new'
const VERIFICATION_REQUEST_URL =
  'https://github.com/omacom/omarchy-plugin-marketplace/issues/new?template=verify-plugin.yml'

export const Route = createFileRoute('/plugins/$pluginId')({
  loader: async ({ params }) => {
    const result = await getPlugin({ data: params.pluginId })
    if (!result.plugin) throw notFound()
    return result
  },
  head: ({ loaderData, params }) =>
    seo({
      title: `${loaderData?.plugin.name ?? 'Plugin'} - Omarchy Plugins`,
      description: loaderData?.plugin.description || SITE_DESCRIPTION,
      path: `/plugins/${params.pluginId}`,
    }),
  component: PluginDetailPage,
})

const shortSha = (sha: string | null) =>
  sha && /^[a-f0-9]{40}$/i.test(sha) ? sha.slice(0, 7) : null

function formatDateTime(value: string | null) {
  if (!value) return 'Unknown'
  try {
    return new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function CommitLink({
  repo,
  sha,
  label,
}: {
  repo: string | null
  sha: string | null
  label: string
}) {
  const short = shortSha(sha)
  if (!short || !repo) return <span>Unknown</span>
  return (
    <a
      href={`${repo.replace(/\/+$/, '')}/commit/${sha}`}
      className="text-text-secondary hover:text-text"
      aria-label={`${label}: ${short}`}
    >
      <code className="bg-surface-2 px-1 py-0.5">{short}</code>
    </a>
  )
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[13px] text-text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-mono text-[13px] text-text-secondary [overflow-wrap:break-word]">
        {value}
      </dd>
    </div>
  )
}

function StatusChip({ plugin }: { plugin: PluginWithStats }) {
  const status =
    plugin.status ?? (plugin.installAvailable ? 'Ready' : 'Manual setup')
  const good = plugin.builtIn || plugin.upstreamCheckStatus === 'passed'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-xs',
        good
          ? 'border-brand/40 text-brand'
          : 'border-border-strong text-text-secondary',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5', good ? 'bg-brand' : 'bg-text-muted')}
      />
      {plugin.builtIn ? 'Built-in' : status}
    </span>
  )
}

function VerificationBadges({ plugin }: { plugin: PluginWithStats }) {
  if (plugin.builtIn) {
    return (
      <Badge className="gap-1 border-brand/40 bg-brand-soft text-brand">
        <VerifiedIcon className="size-4" />
        First-party
      </Badge>
    )
  }
  if (!plugin.verified) return null
  const updateUnverified = plugin.verificationCoverage === 'update-unverified'
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge className="gap-1 border-brand/40 bg-brand-soft text-brand">
        <VerifiedIcon className="size-4" />
        Snapshot verified
      </Badge>
      {updateUnverified ? (
        <Badge
          variant="secondary"
          className="border-tn-orange/40 bg-tn-orange/10 text-tn-orange"
        >
          Update unverified
        </Badge>
      ) : null}
    </span>
  )
}

function EngagementRow({ plugin }: { plugin: PluginWithStats }) {
  const items = [
    { icon: SearchIcon, value: plugin.stats.views, label: 'views' },
    { icon: CopyIcon, value: plugin.stats.copies, label: 'copies' },
    { icon: HeartIcon, value: plugin.stats.hearts, label: 'hearts' },
    ...(plugin.stars > 0
      ? [{ icon: StarIcon, value: plugin.stars, label: 'stars' }]
      : []),
  ]
  return (
    <dl className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-1.5 font-mono text-sm text-text-muted tabular-nums"
        >
          <item.icon className="size-4" aria-hidden="true" />
          <dd className="text-text-secondary">
            {item.value.toLocaleString('en-US')}
          </dd>
          <dt>{item.label}</dt>
        </div>
      ))}
    </dl>
  )
}

function securityContext(plugin: PluginWithStats) {
  if (plugin.upstreamCheckStatus === 'failed') {
    return 'Marketplace installation is unavailable because compatibility has not been confirmed. Installation through another method is not bound to the listed or verified snapshot and may install or execute different code.'
  }
  if (plugin.installAvailable && plugin.installCommand) {
    return "This Omarchy command clones the repository's current HEAD. It is not bound to the verified snapshot and may install a different commit. Check the installed commit before enabling it."
  }
  return "Manual installation follows the upstream project's instructions. It is not bound to the listed or verified snapshot and may install or execute different code. Check the installed commit before enabling it."
}

function PluginDetailPage() {
  const { plugin, related } = Route.useLoaderData()
  const repo = plugin.repo
  const isThirdParty = !plugin.builtIn && !plugin.placeholder
  const verificationEligible =
    isThirdParty && plugin.repositoryLayout !== 'suite'
  const upstreamChanged =
    plugin.upstreamObservedCommit &&
    plugin.listingValidatedCommit &&
    plugin.upstreamObservedCommit !== plugin.listingValidatedCommit

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link
        to="/plugins/"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors duration-150 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeftIcon className="size-5" />
        All plugins
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-text">
              {plugin.name}
            </h1>
            <StatusChip plugin={plugin} />
            <VerificationBadges plugin={plugin} />
          </div>

          <p className="mt-1.5 font-mono text-[13px] text-text-muted">
            {plugin.id}
            {plugin.version ? ` - v${plugin.version}` : ''} - by{' '}
            {plugin.builtIn ? 'Omarchy' : (plugin.author ?? 'unknown')}
          </p>

          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
            {plugin.description}
          </p>

          <div className="mt-4">
            <EngagementRow plugin={plugin} />
          </div>

          {plugin.tags.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
              {plugin.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    to="/plugins/"
                    search={{ q: tag }}
                    className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Badge
                      variant="secondary"
                      className="font-mono text-xs transition-colors duration-150 ease-out hover:text-text"
                    >
                      {tag}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {plugin.image ? (
            <img
              src={plugin.image}
              alt={`${plugin.name} screenshot`}
              width={plugin.thumbW ?? 1600}
              height={plugin.thumbH ?? 900}
              className="img-outlined mt-8 w-full bg-bg-deep object-cover"
            />
          ) : null}

          {isThirdParty ? (
            <section
              aria-labelledby="security-notice-title"
              className="mt-8 border border-tn-orange/35 bg-tn-orange/6 p-5"
            >
              <h2
                id="security-notice-title"
                className="flex items-center gap-2 text-sm font-semibold text-tn-orange"
              >
                <ShieldIcon className="size-5" aria-hidden="true" />
                Security notice
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-text-secondary [text-wrap:pretty]">
                {securityContext(plugin)}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-text-secondary [text-wrap:pretty]">
                Third-party plugins run as unsandboxed code. Automated checks
                are limited and are not a security audit or guarantee. Inspect
                the source and capabilities, and{' '}
                <a
                  href={SECURITY_REPORT_URL}
                  className="text-text underline decoration-border-strong underline-offset-3 hover:decoration-brand"
                >
                  report suspicious plugins ASAP
                </a>
                .
              </p>
            </section>
          ) : null}

          {verificationEligible ? (
            <section className="mt-8" aria-labelledby="verification-title">
              <h2
                id="verification-title"
                className="text-xl font-semibold tracking-tight text-text"
              >
                Verification status
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-[13px] leading-relaxed text-text-secondary">
                {plugin.verified ? (
                  <li>
                    <strong className="text-brand">Snapshot verified:</strong>{' '}
                    Marketplace verification covers only the exact commit shown
                    under listing checks.
                  </li>
                ) : (
                  <li>
                    <strong className="text-text">Snapshot unverified:</strong>{' '}
                    This listed commit has not been verified.
                  </li>
                )}
                {plugin.verified &&
                plugin.verificationCoverage === 'update-unverified' ? (
                  <li>
                    <strong className="text-tn-orange">
                      Update unverified:
                    </strong>{' '}
                    The latest upstream changes have not been verified.
                  </li>
                ) : null}
                <li>
                  <strong className="text-text">Contributor action:</strong>{' '}
                  Submit {plugin.verified ? 'the new' : 'the'} exact commit
                  through the{' '}
                  <a
                    href={VERIFICATION_REQUEST_URL}
                    className="text-text underline decoration-border-strong underline-offset-3 hover:decoration-brand"
                  >
                    plugin verification form
                  </a>
                  .
                </li>
              </ul>
            </section>
          ) : isThirdParty ? (
            <p className="mt-8 text-[13px] text-text-muted">
              Verification unavailable: suite listings are outside the plugin
              verification workflow.
            </p>
          ) : null}
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="ring-elevation bg-surface p-5">
            {plugin.builtIn ? (
              <>
                <h2 className="text-sm font-medium text-text">
                  Included with Omarchy Quattro
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-text-secondary [text-wrap:pretty]">
                  This first-party plugin ships with Omarchy.
                  {plugin.installCommand
                    ? ' The command configures the included plugin; it does not download marketplace code.'
                    : ''}
                </p>
                {plugin.installCommand ? (
                  <InstallCommand
                    command={plugin.installCommand}
                    className="mt-3"
                  />
                ) : null}
              </>
            ) : plugin.placeholder ? (
              <>
                <h2 className="text-sm font-medium text-text">Coming soon</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-text-secondary [text-wrap:pretty]">
                  {plugin.installNote}
                </p>
              </>
            ) : plugin.installAvailable && plugin.installCommand ? (
              <>
                <h2 className="text-sm font-medium text-text">Install</h2>
                <InstallCommand
                  command={plugin.installCommand}
                  className="mt-3"
                />
                {plugin.installNote &&
                plugin.repositoryLayout !== 'root-plugin' ? (
                  <p className="mt-2.5 text-[13px] leading-relaxed text-text-muted [text-wrap:pretty]">
                    {plugin.installNote}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <h2 className="text-sm font-medium text-text">
                  {plugin.status ?? 'Manual setup'}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-text-secondary [text-wrap:pretty]">
                  {plugin.installNote ||
                    "This listing isn't a one-command install. Check the repository for setup instructions."}
                </p>
              </>
            )}

            {(plugin.sourceUrl ?? repo) ? (
              <Button
                variant="outline"
                className="mt-4 w-full"
                nativeButton={false}
                render={<a href={plugin.sourceUrl ?? repo ?? '#'} />}
              >
                View source on GitHub
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
            ) : null}

            <dl className="mt-5 divide-y divide-border-subtle border-t border-border-subtle">
              <MetaRow
                label="Author"
                value={
                  plugin.builtIn ? 'Omarchy' : (plugin.author ?? 'unknown')
                }
              />
              <MetaRow label="Category" value={plugin.category} />
              {plugin.kind ? (
                <MetaRow label="Kind" value={plugin.kind} />
              ) : null}
              {plugin.license ? (
                <MetaRow label="License" value={plugin.license} />
              ) : null}
              {plugin.addedAt ? (
                <MetaRow label="Listed" value={plugin.addedAt} />
              ) : null}
              {plugin.updatedAt ? (
                <MetaRow
                  label="Updated"
                  value={plugin.updatedAt.slice(0, 10)}
                />
              ) : null}
            </dl>
          </div>

          {isThirdParty && plugin.listingValidatedCommit ? (
            <section
              aria-labelledby="listing-checks-title"
              className="ring-elevation mt-4 bg-surface p-5"
            >
              <h2
                id="listing-checks-title"
                className="text-sm font-medium text-text"
              >
                Listing checks
              </h2>
              <dl className="mt-2 divide-y divide-border-subtle">
                <MetaRow
                  label="Compatibility"
                  value={
                    <span
                      className={
                        plugin.upstreamCheckStatus === 'passed'
                          ? 'text-brand'
                          : 'text-tn-orange'
                      }
                    >
                      {plugin.upstreamCheckStatus === 'passed'
                        ? 'Passing'
                        : (plugin.upstreamCheckStatus ?? 'Unknown')}
                    </span>
                  }
                />
                <MetaRow
                  label="Last checked"
                  value={formatDateTime(plugin.upstreamCheckedAt)}
                />
                <MetaRow
                  label="Last release"
                  value={
                    plugin.repositoryRelease?.tag &&
                    plugin.repositoryRelease.url ? (
                      <a
                        href={plugin.repositoryRelease.url}
                        className="text-text-secondary underline decoration-border-strong underline-offset-3 hover:text-text"
                      >
                        {plugin.repositoryRelease.tag}
                      </a>
                    ) : (
                      'No release tag'
                    )
                  }
                />
                <MetaRow
                  label="Observed commit"
                  value={
                    <CommitLink
                      repo={repo}
                      sha={plugin.upstreamObservedCommit}
                      label="View observed commit"
                    />
                  }
                />
                <MetaRow
                  label={
                    plugin.verified ? 'Verified snapshot' : 'Listing snapshot'
                  }
                  value={
                    <CommitLink
                      repo={repo}
                      sha={plugin.listingValidatedCommit}
                      label="View listing snapshot"
                    />
                  }
                />
                {(plugin.upstreamObservedBranch ??
                plugin.listingValidatedBranch) ? (
                  <MetaRow
                    label="Branch"
                    value={
                      plugin.upstreamObservedBranch ??
                      plugin.listingValidatedBranch
                    }
                  />
                ) : null}
                <MetaRow
                  label="Upstream changes"
                  value={
                    upstreamChanged && repo ? (
                      <a
                        href={`${repo.replace(/\/+$/, '')}/compare/${plugin.listingValidatedCommit}...${plugin.upstreamObservedCommit}`}
                        className="text-text-secondary underline decoration-border-strong underline-offset-3 hover:text-text"
                      >
                        View changes
                      </a>
                    ) : (
                      'No changes detected'
                    )
                  }
                />
              </dl>
            </section>
          ) : null}
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight text-text">
            More like this
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <PluginCard key={p.id} plugin={p} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
