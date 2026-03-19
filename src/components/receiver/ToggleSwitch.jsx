export function ToggleSwitch({
  label,
  active,
  onToggle,
  compact = false,
  secondaryLabel,
  secondaryActive = false,
  onSecondaryClick,
}) {
  return (
    <div className={`toggle-container ${compact ? 'compact' : ''} ${active ? 'active' : ''}`}>
      <span className="engraved-text">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        aria-label={label}
        style={{ background: 'none', border: 'none', padding: 0 }}
      >
        <div className="toggle-track">
          <div className="toggle-lever" />
        </div>
      </button>
      {onSecondaryClick ? (
        <button
          type="button"
          className={`toggle-focus-button ${secondaryActive ? 'active' : ''}`}
          onClick={onSecondaryClick}
          aria-label={`${secondaryLabel || 'Focus'} ${label}`}
        >
          {secondaryLabel || 'Focus'}
        </button>
      ) : null}
    </div>
  );
}
