import type { Track } from '../types/spotify';

interface TrackInfoProps {
  track: Track | null;
}

export const TrackInfo = ({ track }: TrackInfoProps) => {
  if (!track) {
    return (
      <div className="track-info">
        <p>No track playing</p>
      </div>
    );
  }

  const albumArt = track.album.images[0]?.url || '';
  const artistName = track.artists.map((artist) => artist.name).join(', ');

  return (
    <div className="track-info-simple">
      {albumArt && (
        <img src={albumArt} alt={`${track.name} album art`} className="track-artwork" />
      )}
      <div className="track-details">
        <h2 className="track-title">{track.name}</h2>
        <p className="track-artist">{artistName}</p>
      </div>
    </div>
  );
};

