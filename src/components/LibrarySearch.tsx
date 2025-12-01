import { useState, useEffect, useRef } from 'react';
import { LibraryService } from '../services/library';
import type { LibraryItem } from '../services/library';
import { useSpotify } from '../context/SpotifyContext';
import './LibrarySearch.css';

interface LibrarySearchProps {
  onItemSelect?: (item: LibraryItem) => void;
}

export const LibrarySearch = ({ onItemSelect }: LibrarySearchProps) => {
  const { currentTrack } = useSpotify();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const albumArt = currentTrack?.album?.images?.[0]?.url || '';

  // Fetch all library items on mount
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const allItems = await LibraryService.getAllLibraryItems();
        console.log('Library items loaded:', allItems.length);
        setItems(allItems);
        if (allItems.length > 0) {
          setFilteredItems(allItems.slice(0, 10)); // Show first 10 when no search
        } else {
          setFilteredItems([]);
          setError('No playlists or albums found. Make sure you have saved playlists/albums.');
        }
      } catch (error) {
        console.error('Error fetching library items:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load library';
        setError(errorMessage);
        setItems([]);
        setFilteredItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, []);

  // Filter items based on search query
  useEffect(() => {
    if (!Array.isArray(items)) {
      setFilteredItems([]);
      return;
    }
    
    if (!searchQuery.trim()) {
      setFilteredItems(items.slice(0, 10)); // Show first 10 when no search
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items
      .filter((item) => {
        if (!item || !item.name) return false;
        const nameMatch = item.name.toLowerCase().includes(query);
        const subtitleMatch = item.subtitle?.toLowerCase().includes(query) || false;
        return nameMatch || subtitleMatch;
      })
      .slice(0, 10); // Limit to 10 results

    setFilteredItems(filtered);
    setSelectedIndex(-1);
  }, [searchQuery, items]);

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
  };

  // Handle input blur (close after selection)
  const handleBlur = () => {
    // Delay to allow click events to fire
    setTimeout(() => {
      if (!resultsRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 200);
  };

  // Handle item selection
  const handleItemClick = async (item: LibraryItem) => {
    try {
      await LibraryService.playItem(item.uri);
      setSearchQuery('');
      setIsOpen(false);
      if (onItemSelect) {
        onItemSelect(item);
      }
      if (searchRef.current) {
        searchRef.current.blur();
      }
    } catch (error) {
      console.error('Error playing item:', error);
      alert('Failed to play. Make sure you have an active device.');
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
          handleItemClick(filteredItems[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        if (searchRef.current) {
          searchRef.current.blur();
        }
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="library-search-container">
      <div className="library-search-input-wrapper">
        <svg
          className="library-search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={searchRef}
          type="text"
          className="library-search-input"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {searchQuery && (
          <button
            className="library-search-clear"
            onClick={() => {
              setSearchQuery('');
              setSelectedIndex(-1);
              searchRef.current?.focus();
            }}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="library-search-results" ref={resultsRef}>
          {isLoading ? (
            <div className="library-search-loading">
              <div className="library-search-loading-content">
                {albumArt && (
                  <img 
                    src={albumArt} 
                    alt="Album art" 
                    className="library-search-loading-artwork" 
                  />
                )}
                <div className="music-animation">
                  <div className="sound-wave sound-wave-1"></div>
                  <div className="sound-wave sound-wave-2"></div>
                  <div className="sound-wave sound-wave-3"></div>
                  <div className="sound-wave sound-wave-4"></div>
                  <div className="sound-wave sound-wave-5"></div>
                </div>
              </div>
              <p>Loading your library...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <div
                key={`${item.type}-${item.id}`}
                className={`library-search-result ${
                  index === selectedIndex ? 'selected' : ''
                }`}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="library-search-result-image"
                  />
                )}
                <div className="library-search-result-info">
                  <div className="library-search-result-name">{item.name || 'Untitled'}</div>
                  <div className="library-search-result-subtitle">{item.subtitle || ''}</div>
                </div>
                <div className="library-search-result-type">
                  {item.type === 'playlist' ? '📋' : '💿'}
                </div>
              </div>
            ))
          ) : error ? (
            <div className="library-search-empty">
              <p style={{ color: '#ff4444' }}>{error}</p>
              {error.includes('401') || error.includes('Unauthorized') || error.includes('403') ? (
                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  Please log out and back in to grant the necessary permissions.
                </p>
              ) : null}
            </div>
          ) : searchQuery ? (
            <div className="library-search-empty">
              No playlists or albums found matching "{searchQuery}"
            </div>
          ) : items.length === 0 && !isLoading ? (
            <div className="library-search-empty">
              <p>No playlists or albums found.</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                Log out and back in to grant access to your library.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

