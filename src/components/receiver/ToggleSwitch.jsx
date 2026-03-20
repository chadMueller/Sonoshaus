export function ToggleSwitch({
  label,
  active,
  onToggle,
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
    <div className={`toggle-container ${compact ? 'compact' : ''} ${active ? 'active' : ''}`}>
      {!hideLabel ? (
        <span className="engraved-text" title={label}>
          {label}
        </span>
      ) : null}
      <span className={`toggle-status-light ${active ? 'on' : 'off'}`} aria-hidden="true" />
      <button
        type="button"
        className="toggle-hit-area"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          activate();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activate();
          }
        }}
        aria-pressed={active}
        aria-label={ariaLabel || label}
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
