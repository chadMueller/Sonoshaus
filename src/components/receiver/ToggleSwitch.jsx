export function ToggleSwitch({
  label,
  active,
  onToggle,
  pending = false,
  compact = false,
  hideLabel = false,
  ariaLabel,
  secondaryLabel,
  secondaryActive = false,
  onSecondaryClick,
}) {
  const activate = () => {
    if (onToggle) onToggle();
  };

  return (
    <div
      className={`toggle-container ${compact ? 'compact' : ''} ${active ? 'active' : ''} ${pending ? 'pending' : ''}`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const target = event.target;
        if (target && typeof target.closest === 'function' && target.closest('.toggle-focus-button')) return;
        event.preventDefault();
        activate();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-busy={pending || undefined}
      aria-label={ariaLabel || label}
    >
      {!hideLabel ? (
        <span className="engraved-text" title={label}>
          {label}
        </span>
      ) : null}
      <span className={`toggle-status-light ${active ? 'on' : 'off'}`} aria-hidden="true" />
      <div className="toggle-hit-area" aria-hidden="true">
        <div className="toggle-track">
          <div className="toggle-lever" />
        </div>
      </div>
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
