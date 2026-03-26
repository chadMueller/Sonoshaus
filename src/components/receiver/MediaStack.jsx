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

export function MediaStack({
  queue,
  queueStartIndex = 0,
  loading,
}) {
  const activeTab = 'queue';

  const queueItems = useMemo(() => sourceToItems(queue), [queue]);
  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [queueStartIndex]);
  const activeItems = useMemo(() => {
    switch (activeTab) {
      case 'queue':
      default:
        return queueItems;
    }
  }, [activeTab, queueItems]);

  return (
    <section className="stack-module stack-module--queue" aria-label="Queue">
      <div className="stack-faceplate">
        <div className="stack-header">
          <div className="stack-title" aria-hidden="true" />
          <h2 className="cd-title">Queue</h2>
        </div>

        <div className="stack-browser">
          <div className="stack-main-column">
            {activeTab === 'queue' ? (
              <>
                <div className="stack-list" ref={listRef}>
                {loading ? (
                  <div className="stack-empty">Loading queue…</div>
                ) : activeItems.length === 0 ? (
                  <div className="stack-empty">No items found</div>
                ) : (
                  activeItems.map((item, index) => (
                    <button
                      key={`${activeTab}-${item.title}`}
                      type="button"
                      className="stack-item"
                      title={item.subtitle ? `${item.subtitle} — ${item.title}` : item.title}
                    >
                      <div className="stack-item-text">
                        <div className="stack-item-title stack-item-title--single">
                          {index === 0 ? <span className="stack-item-now">Now</span> : null}
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
                  ))
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
