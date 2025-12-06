//
//  Track.swift
//  SpotifyLyricsTV
//
//  Track model matching the web app structure
//

import Foundation

struct Track: Codable, Identifiable {
    let id: String
    let name: String
    let artists: [Artist]
    let album: Album
    let duration_ms: Int
    
    struct Artist: Codable {
        let name: String
    }
    
    struct Album: Codable {
        let name: String
        let images: [Image]
        
        struct Image: Codable {
            let url: String
        }
    }
    
    var artistNames: String {
        artists.map { $0.name }.joined(separator: ", ")
    }
    
    var albumArtURL: String? {
        album.images.first?.url
    }
}

struct PlaybackState: Codable {
    let is_playing: Bool
    let item: Track?
    let progress_ms: Int
    let timestamp: Int64
    let context: Context?
    
    struct Context: Codable {
        let previous_tracks: [Track]?
        let next_tracks: [Track]?
    }
}




