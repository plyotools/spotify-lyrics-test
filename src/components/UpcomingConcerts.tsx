import { useState, useEffect, useRef } from 'react';
import { SetlistService } from '../services/setlist';
import type { SetlistEvent } from '../services/setlist';
import type { Track } from '../types/spotify';
import './UpcomingConcerts.css';

interface UpcomingConcertsProps {
  track: Track | null;
}

export const UpcomingConcerts = ({ track }: UpcomingConcertsProps) => {
  const [concerts, setConcerts] = useState<SetlistEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasUpcoming, setHasUpcoming] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!track) {
      setConcerts([]);
      setCurrentIndex(0);
      return;
    }

    const fetchConcerts = async () => {
      // Use the first artist's name
      const artistName = track.artists[0]?.name;
      if (!artistName) return;

      try {
        const upcoming = await SetlistService.getUpcomingConcerts(artistName);
        setConcerts(upcoming);
        setCurrentIndex(0);
        
        // Check if any concerts are upcoming
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const hasAnyUpcoming = upcoming.some((concert) => {
          try {
            const [day, month, year] = concert.eventDate.split('-').map(Number);
            const eventDate = new Date(year, month - 1, day);
            return eventDate >= today;
          } catch {
            return false;
          }
        });
        setHasUpcoming(hasAnyUpcoming);
      } catch (error) {
        console.error('Error fetching concerts:', error);
        setConcerts([]);
        setHasUpcoming(false);
      }
    };

    fetchConcerts();
  }, [track]);

  // Rotate through concerts every 5 seconds
  useEffect(() => {
    if (concerts.length <= 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % concerts.length);
    }, 5000); // Change every 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [concerts.length]);

  if (!track || concerts.length === 0) {
    return null;
  }

  const currentConcert = concerts[currentIndex];
  if (!currentConcert) return null;

  const venue = currentConcert.venue;
  const date = SetlistService.formatEventDate(currentConcert.eventDate);
  const location = `${venue.city.name}${venue.city.state ? ', ' + venue.city.state : ''}, ${venue.city.country.name}`;

  return (
    <div className="upcoming-concerts">
      <div className="concerts-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        <span className="concerts-title">{hasUpcoming ? 'Upcoming Concerts' : 'Recent Concerts'}</span>
        {concerts.length > 1 && (
          <span className="concerts-count">{currentIndex + 1} / {concerts.length}</span>
        )}
      </div>
      <div className="concert-item">
        <div className="concert-date">{date}</div>
        <div className="concert-venue">{venue.name}</div>
        <div className="concert-location">{location}</div>
        {currentConcert.tour && (
          <div className="concert-tour">Tour: {currentConcert.tour.name}</div>
        )}
      </div>
      {concerts.length > 1 && (
        <div className="concerts-dots">
          {concerts.map((_, index) => (
            <div
              key={index}
              className={`concert-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

