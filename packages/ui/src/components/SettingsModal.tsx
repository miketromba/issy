interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  autocompleteEnabled: boolean
  onAutocompleteChange: (enabled: boolean) => void
}

export function SettingsModal({
  isOpen,
  onClose,
  autocompleteEnabled,
  onAutocompleteChange,
}: SettingsModalProps) {
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
          <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-0 rounded-md text-text-muted text-2xl cursor-pointer transition-all hover:bg-surface-elevated hover:text-text-primary"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <section>
            <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">
              Search
            </h3>
            <ToggleRow
              label="Query autocomplete"
              description="Show suggestions as you type in the search box"
              enabled={autocompleteEnabled}
              onChange={onAutocompleteChange}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-3 bg-surface-elevated rounded-md">
      <div className="flex flex-col gap-0.5">
        <span className="text-text-primary text-[13px] font-medium">
          {label}
        </span>
        <span className="text-text-muted text-xs">{description}</span>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
          enabled ? 'bg-accent' : 'bg-border'
        }`}
        aria-pressed={enabled}
        aria-label={`${label}: ${enabled ? 'enabled' : 'disabled'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
