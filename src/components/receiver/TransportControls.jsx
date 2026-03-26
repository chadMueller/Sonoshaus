const icons = {
  previous: (
    <svg viewBox="0 0 24 24">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" style={{ width: 10 }}>
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24">
      <path d="M7 5h4v14H7zm6 0h4v14h-4z" />
    </svg>
  ),
  next: (
    <svg viewBox="0 0 24 24">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  ),
  shuffle: (
    <svg viewBox="0 0 24 24">
      <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
    </svg>
  ),
  repeat: (
    <svg viewBox="0 0 24 24">
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
    </svg>
  ),
};

function MachinedButton({ label, icon, onClick, active }) {
  return (
    <button
      type="button"
      className={`machined-button${active ? ' machined-button--active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

export function TransportControls({
  isPlaying,
  shuffle,
  repeat,
  onPrevious,
  onPlayPause,
  onNext,
  onToggleShuffle,
  onToggleRepeat,
}) {
  return (
    <div className="transport-controls">
      <MachinedButton
        label="Shuffle"
        icon={icons.shuffle}
        onClick={onToggleShuffle}
        active={!!shuffle}
      />
      <MachinedButton label="Previous" icon={icons.previous} onClick={onPrevious} />
      <MachinedButton
        label={isPlaying ? 'Pause' : 'Play'}
        icon={isPlaying ? icons.pause : icons.play}
        onClick={onPlayPause}
      />
      <MachinedButton label="Next" icon={icons.next} onClick={onNext} />
    </div>
  );
}
