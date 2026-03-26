export function RackSlot({
  showReorderRail,
  ariaRackName,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  children,
}) {
  if (!showReorderRail) {
    return <div className="rack-slot rack-slot--plain">{children}</div>;
  }

  return (
    <div className="rack-slot">
      <div className="rack-order-rail" role="group" aria-label={`Reorder: ${ariaRackName}`}>
        <span className="rack-order-label" aria-hidden="true">
          Order
        </span>
        <button
          type="button"
          className="rack-order-btn"
          disabled={!canMoveUp}
          onClick={onMoveUp}
          aria-label={`Move ${ariaRackName} up`}
        >
          ↑
        </button>
        <button
          type="button"
          className="rack-order-btn"
          disabled={!canMoveDown}
          onClick={onMoveDown}
          aria-label={`Move ${ariaRackName} down`}
        >
          ↓
        </button>
      </div>
      <div className="rack-slot-content">{children}</div>
    </div>
  );
}
