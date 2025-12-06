//
//  SpotifyLyricsTVApp.swift
//  SpotifyLyricsTV
//
//  Apple TV app for displaying Spotify lyrics
//

import SwiftUI

@main
struct SpotifyLyricsTVApp: App {
    @StateObject private var authManager = AuthManager()
    @StateObject private var spotifyService = SpotifyService()
    @StateObject private var lyricsService = LyricsService()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(spotifyService)
                .environmentObject(lyricsService)
        }
    }
}




