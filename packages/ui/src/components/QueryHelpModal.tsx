interface QueryHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function QueryHelpModal({ isOpen, onClose }: QueryHelpModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-5"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-xl max-w-[600px] w-full max-h-[65vh] overflow-y-auto shadow-2xl custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            Query Syntax Help
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-0 rounded-md text-text-muted text-2xl cursor-pointer transition-all hover:bg-surface-elevated hover:text-text-primary"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <p className="text-text-secondary mb-6 leading-relaxed">
            Use qualifiers to filter issues, or type freely to search by text.
          </p>

          <section className="mb-6">
            <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">
              Qualifiers
            </h3>
            <div className="flex flex-col gap-2">
              <QualifierRow
                qualifier="is:"
                description="Filter by status"
                values="open, closed"
              />
              <QualifierRow
                qualifier="priority:"
                description="Filter by priority"
                values="high, medium, low"
              />
              <QualifierRow
                qualifier="scope:"
                description="Filter by scope"
                values="small, medium, large"
              />
              <QualifierRow
                qualifier="type:"
                description="Filter by issue type"
                values="bug, improvement"
              />
              <QualifierRow
                qualifier="label:"
                description="Filter by label"
                values="any label name"
              />
              <QualifierRow
                qualifier="sort:"
                description="Sort results"
                values="created, priority, scope"
              />
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">
              Examples
            </h3>
            <div className="flex flex-col gap-2">
              <ExampleRow
                code="is:open priority:high"
                description="High priority open issues"
              />
              <ExampleRow
                code="scope:small priority:high"
                description="Quick wins (small scope, high priority)"
              />
              <ExampleRow
                code="type:bug dashboard"
                description='Bugs mentioning "dashboard"'
              />
              <ExampleRow
                code="is:open sort:priority"
                description="Open issues sorted by priority"
              />
              <ExampleRow
                code="kubernetes cluster"
                description='Issues matching "kubernetes cluster"'
              />
            </div>
          </section>

          <section>
            <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">
              Tips
            </h3>
            <ul className="list-none p-0 m-0 flex flex-col gap-2">
              <li className="text-text-secondary text-[13px] pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-text-muted">
                Combine multiple qualifiers to narrow results
              </li>
              <li className="text-text-secondary text-[13px] pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-text-muted">
                Free text searches titles, descriptions, and content
              </li>
              <li className="text-text-secondary text-[13px] pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-text-muted">
                Use quotes for multi-word searches:{' '}
                <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-xs font-mono">
                  "api error"
                </code>
              </li>
              <li className="text-text-secondary text-[13px] pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-text-muted">
                Qualifiers are case-insensitive
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

function QualifierRow({
  qualifier,
  description,
  values,
}: {
  qualifier: string
  description: string
  values: string
}) {
  return (
    <div className="flex gap-3 px-3 py-2.5 bg-surface-elevated rounded-md">
      <code className="font-mono text-[13px] text-accent shrink-0 min-w-[80px]">
        {qualifier}
      </code>
      <span className="text-text-secondary text-[13px] flex flex-col gap-0.5">
        {description}
        <span className="text-text-muted text-xs">{values}</span>
      </span>
    </div>
  )
}

function ExampleRow({
  code,
  description,
}: {
  code: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2.5 bg-surface-elevated rounded-md">
      <code className="font-mono text-[13px] text-text-primary">{code}</code>
      <span className="text-text-muted text-xs">{description}</span>
    </div>
  )
}
