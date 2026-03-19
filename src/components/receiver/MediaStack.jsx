import { useMemo, useState } from 'react';

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
  selectedRoom,
  favorites,
  playlists,
  queue,
  loading,
  playNextSupported,
  onPlayFavorite,
  onPlayPlaylist,
  onPlayFavoriteNext,
  onPlayPlaylistNext,
}) {
  const [activeTab, setActiveTab] = useState('favorites');
  const [query, setQuery] = useState('');

  const favoriteItems = useMemo(() => sourceToItems(favorites), [favorites]);
  const playlistItems = useMemo(() => sourceToItems(playlists), [playlists]);
  const queueItems = useMemo(() => sourceToItems(queue), [queue]);
  const tabs = useMemo(
    () => [
      { key: 'favorites', label: 'Favorites' },
      { key: 'playlists', label: 'Playlists' },
      { key: 'queue', label: 'Queue' },
    ],
    [],
  );

  const activeItems = useMemo(() => {
    switch (activeTab) {
      case 'playlists':
        return playlistItems;
      case 'queue':
        return queueItems;
      case 'favorites':
      default:
        return favoriteItems;
    }
  }, [activeTab, favoriteItems, playlistItems, queueItems]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeItems;
    return activeItems.filter((item) =>
      `${item.title} ${item.subtitle}`.toLowerCase().includes(q),
    );
  }, [activeItems, query]);

  const handlePlay = (item) => {
    const value = item.title;
    if (activeTab === 'favorites') {
      onPlayFavorite(value);
      return;
    }
    onPlayPlaylist(value);
  };

  const handlePlayNext = (item) => {
    const value = item.title;
    if (activeTab === 'favorites') {
      onPlayFavoriteNext(value);
      return;
    }
    if (activeTab === 'playlists') {
      onPlayPlaylistNext(value);
    }
  };

  return (
    <section className="stack-module">
      <div className="stack-wood">
        <div className="stack-faceplate">
          <div className="stack-header">
            <div className="stack-title">Media Stack</div>
            <div className="stack-room">{selectedRoom ? `Room: ${selectedRoom}` : 'Select a room'}</div>
          </div>

          <div className="stack-controls">
            <div className="stack-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`stack-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              className="stack-search"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter library..."
              aria-label="Filter media list"
            />
          </div>

          <div className="stack-list">
            {loading ? (
              <div className="stack-empty">Loading media...</div>
            ) : filteredItems.length === 0 ? (
              <div className="stack-empty">No items found</div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={`${activeTab}-${item.title}`}
                  type="button"
                  className="stack-item"
                  onClick={() => handlePlay(item)}
                  title={item.title}
                >
                  <div className="stack-item-text">
                    <div className="stack-item-title">{item.title}</div>
                    {item.subtitle ? <div className="stack-item-subtitle">{item.subtitle}</div> : null}
                  </div>
                    <div className="stack-item-actions">
                      {(activeTab === 'favorites' || activeTab === 'playlists') && (
                        <button
                          type="button"
                          className="stack-inline-action"
                          disabled={!playNextSupported}
                          onClick={(event) => {
                            event.stopPropagation();
                            handlePlayNext(item);
                          }}
                        >
                          Next
                        </button>
                      )}
                      <div className="stack-item-action">Play</div>
                    </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
