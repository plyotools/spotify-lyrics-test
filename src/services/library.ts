/**
 * Spotify Library service for fetching user's playlists and saved albums
 */
import { AuthService } from './auth';

export interface Playlist {
  id: string;
  name: string;
  owner: {
    id: string;
    display_name: string;
  };
  images: Array<{ url: string }>;
  tracks: {
    total: number;
  };
  type: 'playlist';
}

export interface Album {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  images: Array<{ url: string }>;
  type: 'album';
}

export interface LibraryItem {
  id: string;
  name: string;
  type: 'playlist' | 'album';
  image: string;
  subtitle: string;
  uri: string;
}

export class LibraryService {
  /**
   * Fetch all user's playlists
   */
  static async getUserPlaylists(): Promise<Playlist[]> {
    try {
      const token = await AuthService.getValidToken();
      const playlists: Playlist[] = [];
      let url = 'https://api.spotify.com/v1/me/playlists?limit=50';

      // Fetch all playlists (handle pagination)
      while (url) {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('Failed to fetch playlists:', response.status, errorText);
          if (response.status === 401) {
            throw new Error('Unauthorized (401): Please log out and log back in to grant playlist access.');
          } else if (response.status === 403) {
            throw new Error('Forbidden (403): Missing required permissions. Please log out and log back in.');
          }
          throw new Error(`Failed to fetch playlists: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (data.items && Array.isArray(data.items)) {
          playlists.push(...data.items);
        }
        url = data.next; // Next page URL if exists
      }

      return playlists;
    } catch (error) {
      console.error('Error fetching playlists:', error);
      // Re-throw the error so it can be handled by the caller
      throw error;
    }
  }

  /**
   * Fetch user's saved albums
   */
  static async getUserAlbums(): Promise<Album[]> {
    try {
      const token = await AuthService.getValidToken();
      const albums: Album[] = [];
      let url = 'https://api.spotify.com/v1/me/albums?limit=50';

      // Fetch all albums (handle pagination)
      while (url) {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('Failed to fetch albums:', response.status, errorText);
          if (response.status === 401) {
            throw new Error('Unauthorized (401): Please log out and log back in to grant album access.');
          } else if (response.status === 403) {
            throw new Error('Forbidden (403): Missing required permissions. Please log out and log back in.');
          }
          throw new Error(`Failed to fetch albums: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (data.items && Array.isArray(data.items)) {
          // Extract album objects from the saved album items
          const albumItems = data.items.map((item: any) => item.album);
          albums.push(...albumItems);
        }
        url = data.next; // Next page URL if exists
      }

      return albums;
    } catch (error) {
      console.error('Error fetching albums:', error);
      // Re-throw the error so it can be handled by the caller
      throw error;
    }
  }

  /**
   * Get all library items (playlists + albums) as a unified list
   */
  static async getAllLibraryItems(): Promise<LibraryItem[]> {
    const items: LibraryItem[] = [];
    let playlists: Playlist[] = [];
    let albums: Album[] = [];
    let playlistError: Error | null = null;
    let albumError: Error | null = null;

    // Fetch playlists and albums separately to handle errors independently
    try {
      playlists = await this.getUserPlaylists();
      console.log(`Fetched ${playlists.length} playlists`);
    } catch (error) {
      playlistError = error instanceof Error ? error : new Error(String(error));
      console.error('Error fetching playlists:', playlistError);
      // Continue with albums even if playlists fail
    }

    try {
      albums = await this.getUserAlbums();
      console.log(`Fetched ${albums.length} albums`);
    } catch (error) {
      albumError = error instanceof Error ? error : new Error(String(error));
      console.error('Error fetching albums:', albumError);
      // Continue with playlists even if albums fail
    }

    // Convert playlists to LibraryItem
    playlists.forEach((playlist) => {
      if (!playlist || !playlist.id || !playlist.name) {
        console.warn('Skipping invalid playlist:', playlist);
        return;
      }
      items.push({
        id: playlist.id,
        name: playlist.name,
        type: 'playlist',
        image: playlist.images?.[0]?.url || '',
        subtitle: `By ${playlist.owner?.display_name || 'Unknown'} • ${playlist.tracks?.total || 0} tracks`,
        uri: `spotify:playlist:${playlist.id}`,
      });
    });

    // Convert albums to LibraryItem
    albums.forEach((album) => {
      if (!album || !album.id || !album.name) {
        console.warn('Skipping invalid album:', album);
        return;
      }
      const artistNames = album.artists?.map((a: any) => a?.name).filter(Boolean).join(', ') || 'Unknown';
      items.push({
        id: album.id,
        name: album.name,
        type: 'album',
        image: album.images?.[0]?.url || '',
        subtitle: `By ${artistNames}`,
        uri: `spotify:album:${album.id}`,
      });
    });

    console.log(`Total library items: ${items.length}`);

    // If both failed, throw an error
    if (playlistError && albumError) {
      const combinedError = new Error(
        `Failed to fetch library: ${playlistError.message} | ${albumError.message}`
      );
      throw combinedError;
    }

    // If one failed but we have some items, log a warning but continue
    if (playlistError && items.length === 0) {
      throw playlistError;
    }
    if (albumError && items.length === 0) {
      throw albumError;
    }

    return items;
  }

  /**
   * Play a playlist or album
   */
  static async playItem(uri: string): Promise<void> {
    try {
      const token = await AuthService.getValidToken();
      const response = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context_uri: uri,
        }),
      });

      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to play item');
      }
    } catch (error) {
      console.error('Error playing item:', error);
      throw error;
    }
  }
}

