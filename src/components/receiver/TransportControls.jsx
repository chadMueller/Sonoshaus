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
};

function MachinedButton({ label, icon, onClick }) {
  return (
    <button type="button" className="machined-button" aria-label={label} onClick={onClick}>
      {icon}
    </button>
  );
}

export function TransportControls({ isPlaying, onPrevious, onPlayPause, onNext }) {
  return (
    <div className="transport-controls">
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
