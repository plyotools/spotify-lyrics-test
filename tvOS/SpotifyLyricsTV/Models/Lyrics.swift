//
//  Lyrics.swift
//  SpotifyLyricsTV
//
//  Lyrics model matching the web app structure
//

import Foundation

struct LyricWord: Codable {
    let time: Int // Time in milliseconds
    let text: String
    let endTime: Int? // Optional end time
}

struct LyricLine: Codable {
    let time: Int // Time in milliseconds
    let text: String
    let words: [LyricWord]? // Optional word-level timestamps
}

struct LyricsData: Codable {
    let lines: [LyricLine]
    let synced: Bool
    let hasWordTimestamps: Bool?
}




