/**
 * Setlist.fm API service for fetching concert information
 * Documentation: https://api.setlist.fm/docs/1.0/index.html
 */

export interface SetlistVenue {
  id: string;
  name: string;
  city: {
    id: string;
    name: string;
    state?: string;
    stateCode?: string;
    coords?: {
      lat: number;
      long: number;
    };
    country: {
      code: string;
      name: string;
    };
  };
}

export interface SetlistEvent {
  id: string;
  eventDate: string;
  artist: {
    mbid: string;
    name: string;
  };
  venue: SetlistVenue;
  tour?: {
    name: string;
  };
  sets?: {
    set: Array<{
      song: Array<{
        name: string;
      }>;
    }>;
  };
}

export interface SetlistSearchResult {
  setlist: SetlistEvent[];
  total: number;
  page: number;
  itemsPerPage: number;
}

export class SetlistService {
  private static readonly BASE_URL = 'https://api.setlist.fm/rest/1.0';
  private static readonly API_KEY = import.meta.env.VITE_SETLISTFM_API_KEY;

  /**
   * Search for an artist by name to get their MusicBrainz ID (MBID)
   */
  static async searchArtist(artistName: string): Promise<string | null> {
    if (!this.API_KEY) {
      console.warn('Setlist.fm API key not found. Set VITE_SETLISTFM_API_KEY in .env');
      return null;
    }

    try {
      const url = `${this.BASE_URL}/search/artists?artistName=${encodeURIComponent(artistName)}&p=1`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'x-api-key': this.API_KEY,
        },
      });

      if (!response.ok) {
        console.warn('Setlist.fm API request failed:', response.status);
        return null;
      }

      const data = await response.json();
      if (data.artist && data.artist.length > 0) {
        // Return the first matching artist's MBID
        return data.artist[0].mbid;
      }
    } catch (error) {
      console.error('Error searching for artist:', error);
    }

    return null;
  }

  /**
   * Get upcoming setlists for an artist by MBID
   */
  static async getUpcomingSetlists(mbid: string): Promise<SetlistEvent[]> {
    if (!this.API_KEY) {
      return [];
    }

    try {
      // Note: The API doesn't have a direct "upcoming" filter, so we'll search recent setlists
      // and filter by date on the client side, or use the artist setlists endpoint
      const url = `${this.BASE_URL}/artist/${mbid}/setlists?p=1`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'x-api-key': this.API_KEY,
        },
      });

      if (!response.ok) {
        console.warn('Failed to fetch setlists:', response.status);
        return [];
      }

      const data = await response.json();
      const allSetlists = data.setlist || [];
      
      if (allSetlists.length === 0) {
        return [];
      }
      
      // Filter for upcoming concerts (eventDate is in format DD-MM-YYYY)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Try to get upcoming concerts first
      const upcoming = allSetlists
        .filter((setlist: SetlistEvent) => {
          if (!setlist.eventDate) return false;
          try {
            const [day, month, year] = setlist.eventDate.split('-').map(Number);
            const eventDate = new Date(year, month - 1, day);
            return eventDate >= today;
          } catch {
            return false;
          }
        })
        .sort((a: SetlistEvent, b: SetlistEvent) => {
          // Sort by date ascending (earliest first)
          try {
            const [dayA, monthA, yearA] = a.eventDate.split('-').map(Number);
            const [dayB, monthB, yearB] = b.eventDate.split('-').map(Number);
            const dateA = new Date(yearA, monthA - 1, dayA);
            const dateB = new Date(yearB, monthB - 1, dayB);
            return dateA.getTime() - dateB.getTime();
          } catch {
            return 0;
          }
        });

      // If we have upcoming concerts, return them (limit to 10)
      if (upcoming.length > 0) {
        return upcoming.slice(0, 10);
      }

      // If no upcoming concerts, return the most recent past concerts
      // (Note: setlist.fm primarily stores past concerts)
      const recent = allSetlists
        .filter((setlist: SetlistEvent) => setlist.eventDate)
        .sort((a: SetlistEvent, b: SetlistEvent) => {
          // Sort by date descending (most recent first)
          try {
            const [dayA, monthA, yearA] = a.eventDate.split('-').map(Number);
            const [dayB, monthB, yearB] = b.eventDate.split('-').map(Number);
            const dateA = new Date(yearA, monthA - 1, dayA);
            const dateB = new Date(yearB, monthB - 1, dayB);
            return dateB.getTime() - dateA.getTime();
          } catch {
            return 0;
          }
        })
        .slice(0, 5); // Show 5 most recent concerts

      return recent;
    } catch (error) {
      console.error('Error fetching upcoming setlists:', error);
      return [];
    }
  }

  /**
   * Search for upcoming concerts by artist name
   */
  static async getUpcomingConcerts(artistName: string): Promise<SetlistEvent[]> {
    const mbid = await this.searchArtist(artistName);
    if (!mbid) {
      return [];
    }

    return this.getUpcomingSetlists(mbid);
  }

  /**
   * Format event date for display
   */
  static formatEventDate(eventDate: string): string {
    try {
      const [day, month, year] = eventDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return eventDate;
    }
  }
}

