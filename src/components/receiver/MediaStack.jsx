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
            <div className="stack-title" aria-hidden="true" />
            <div className="stack-room">{selectedRoom ? `Room: ${selectedRoom}` : 'Select a room'}</div>
          </div>

          <div className="stack-browser">
            <div className="stack-tabs stack-tabs-vertical">
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
            <div className="stack-list">
              {loading ? (
                <div className="stack-empty">Working on getting your sonos catalog</div>
              ) : activeItems.length === 0 ? (
                <div className="stack-empty">No items found</div>
              ) : (
                activeItems.map((item) => (
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
      </div>
    </section>
  );
}
