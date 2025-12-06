//
//  ContentView.swift
//  SpotifyLyricsTV
//
//  Main content view for the Apple TV app
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var spotifyService: SpotifyService
    @EnvironmentObject var lyricsService: LyricsService
    
    var body: some View {
        Group {
            if !authManager.isAuthenticated {
                LoginView()
            } else {
                LyricsView()
            }
        }
        .onAppear {
            // Check if already authenticated
            authManager.checkAuthentication()
        }
        .onOpenURL { url in
            // Handle callback URL from Spotify authentication
            if url.scheme == "spotifylyricstv" {
                authManager.handleCallback(url: url)
            }
        }
    }
}

