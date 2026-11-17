import { useEffect, useMemo, useRef } from 'react';

function sourceToItems(source) {
  if (!Array.isArray(source)) return [];
  return source
    .map((item) => {
      if (typeof item === 'string') {
        return { title: item, subtitle: '' };
      }
      if (item && typeof item === 'object') {
        return {
          title: item.title || item.name || item.uri || 'Untitled',
          subtitle: item.artist || item.artistName || item.album || item.containerType || '',
          raw: item,
        };
      }
      return null;
    })
    .filter(Boolean);
}

function queueRowBadge(localIndex) {
  if (localIndex === 0) return 'Now';
  if (localIndex === 1) return 'Next';
  return null;
}

export function MediaStack({
  queue,
  queueStartIndex = 0,
  loading,
  selectedRoom,
  onSeekToQueueIndex,
  /** Bumps when the queue panel opens so we scroll to the current track. */
  alignToNowKey,
}) {
  const activeTab = 'queue';

  const queueItems = useMemo(() => sourceToItems(queue), [queue]);
  const listRef = useRef(null);

  const startIndex = useMemo(() => {
    const len = queueItems.length;
    if (len === 0) return 0;
    const raw = Number.isFinite(queueStartIndex) ? Math.floor(queueStartIndex) : 0;
    return Math.min(Math.max(0, raw), len - 1);
  }, [queueItems.length, queueStartIndex]);

  /** Only show what's playing now and up next — hide already-played tracks. */
  const visibleItems = useMemo(() => queueItems.slice(startIndex), [queueItems, startIndex]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: 'auto' });
  }, [alignToNowKey, startIndex]);

  const activeItems = useMemo(() => {
    switch (activeTab) {
      case 'queue':
      default:
        return visibleItems;
    }
  }, [activeTab, visibleItems]);

  const seekEnabled = typeof onSeekToQueueIndex === 'function' && !!selectedRoom;

  return (
    <section className="stack-module stack-module--queue" aria-label="Queue">
      <div className="stack-faceplate">
        <div className="stack-header">
          <div className="stack-title" aria-hidden="true" />
          <h2 className="cd-title">Now &amp; up next</h2>
        </div>

        <div className="stack-browser">
          <div className="stack-main-column">
            {activeTab === 'queue' ? (
              <>
                <div className="stack-list" ref={listRef}>
                  {loading ? (
                    <div className="stack-empty">Loading queue…</div>
                  ) : activeItems.length === 0 ? (
                    <div className="stack-empty">Nothing queued</div>
                  ) : (
                    activeItems.map((item, localIndex) => {
                      const absoluteIndex = startIndex + localIndex;
                      const badge = queueRowBadge(localIndex);
                      return (
                        <button
                          key={`${activeTab}-${absoluteIndex}-${item.title}`}
                          type="button"
                          className={`stack-item${localIndex === 0 ? ' stack-item--now' : ''}`}
                          title={item.subtitle ? `${item.subtitle} — ${item.title}` : item.title}
                          disabled={!seekEnabled}
                          aria-label={
                            seekEnabled
                              ? `Skip to ${item.title}${item.subtitle ? ` by ${item.subtitle}` : ''}`
                              : undefined
                          }
                          onClick={() => {
                            if (!seekEnabled) return;
                            onSeekToQueueIndex(absoluteIndex);
                          }}
                        >
                          <div className="stack-item-text">
                            <div className="stack-item-title stack-item-title--single">
                              {badge ? (
                                <span
                                  className={
                                    localIndex === 0 ? 'stack-item-now' : 'stack-item-next'
                                  }
                                >
                                  {badge}
                                </span>
                              ) : null}
                              {item.subtitle ? (
                                <>
                                  <span className="stack-item-artist">{item.subtitle}</span>
                                  <span className="stack-item-sep" aria-hidden="true">
                                    {' '}
                                    —{' '}
                                  </span>
                                </>
                              ) : null}
                              <span className="stack-item-track">{item.title}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
