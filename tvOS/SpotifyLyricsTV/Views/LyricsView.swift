//
//  LyricsView.swift
//  SpotifyLyricsTV
//
//  Main lyrics display view optimized for TV
//

import SwiftUI
import Combine

struct LyricsView: View {
    @EnvironmentObject var spotifyService: SpotifyService
    @EnvironmentObject var lyricsService: LyricsService
    @EnvironmentObject var authManager: AuthManager
    
    @State private var currentLineIndex: Int = -1
    @State private var currentWordIndex: Int = -1
    
    var body: some View {
        ZStack {
            // Background
            Color.black.ignoresSafeArea()
            
            if let track = spotifyService.currentTrack {
                // Album art background (blurred)
                if let albumArtURL = track.albumArtURL,
                   let url = URL(string: albumArtURL) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.gray.opacity(0.3)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .blur(radius: 100)
                    .opacity(0.3)
                    .ignoresSafeArea()
                }
                
                VStack(spacing: 60) {
                    // Track info
                    TrackInfoView(track: track, isPlaying: spotifyService.isPlaying)
                        .padding(.top, 80)
                    
                    // Lyrics display
                    if let lyrics = lyricsService.currentLyrics {
                        LyricsDisplayView(
                            lyrics: lyrics,
                            currentPosition: spotifyService.currentPosition,
                            currentLineIndex: $currentLineIndex,
                            currentWordIndex: $currentWordIndex,
                            albumArtURL: track.albumArtURL
                        )
                    } else if lyricsService.isLoading {
                        ProgressView()
                            .scaleEffect(1.5)
                    } else {
                        Text("No lyrics available")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    // Controls
                    ControlsView(
                        isPlaying: spotifyService.isPlaying,
                        onTogglePlayback: {
                            Task {
                                try? await spotifyService.togglePlayback()
                            }
                        },
                        onSkipNext: {
                            Task {
                                try? await spotifyService.skipToNext()
                            }
                        },
                        onSkipPrevious: {
                            Task {
                                try? await spotifyService.skipToPrevious()
                            }
                        },
                        onLogout: {
                            authManager.logout()
                            spotifyService.stopPolling()
                        }
                    )
                    .padding(.bottom, 80)
                }
            } else {
                VStack(spacing: 40) {
                    Image(systemName: "music.note")
                        .font(.system(size: 100))
                        .foregroundColor(.secondary)
                    
                    Text("No track playing")
                        .font(.system(size: 48))
                        .foregroundColor(.secondary)
                    
                    Text("Start playing music on Spotify to see lyrics")
                        .font(.system(size: 32))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 100)
                }
            }
        }
        .onAppear {
            spotifyService.setAuthManager(authManager)
        }
        .onChange(of: spotifyService.currentTrack) { newTrack in
            if let track = newTrack {
                Task {
                    await lyricsService.fetchLyrics(
                        artist: track.artistNames,
                        title: track.name,
                        duration: track.duration_ms
                    )
                }
            }
        }
        .onChange(of: spotifyService.currentPosition) { _ in
            // Update immediately when position changes
            updateCurrentLine()
        }
        .onChange(of: spotifyService.isPlaying) { _ in
            updateCurrentLine()
        }
        // Continuous updates every frame (matches web app's requestAnimationFrame)
        .onReceive(Timer.publish(every: 0.016, on: .main, in: .common).autoconnect()) { _ in
            // Update every ~16ms (60fps) for perfect sync - matches web app
            updateCurrentLine()
        }
    }
    
    private func updateCurrentLine() {
        guard let lyrics = lyricsService.currentLyrics,
              lyrics.synced else { return }
        
        let position = spotifyService.currentPosition
        
        // Match web app logic exactly: find the last line where time <= currentPosition
        var foundIndex = -1
        
        // Simple linear search - find the last line where time <= currentPosition
        // This matches useLyrics.ts exactly
        for i in stride(from: lyrics.lines.count - 1, through: 0, by: -1) {
            if lyrics.lines[i].time <= position {
                foundIndex = i
                break
            }
        }
        
        // If we're before the first line, show nothing (matches web app)
        if foundIndex == -1 {
            if let firstLineTime = lyrics.lines.first?.time, position < firstLineTime {
                currentLineIndex = -1
                currentWordIndex = -1
                return
            }
            // If we're after the last line, show the last line (matches web app)
            foundIndex = lyrics.lines.count - 1
        }
        
        currentLineIndex = foundIndex
        
        // Find current word if word timestamps are available
        // Match web app logic exactly from useLyrics.ts
        if foundIndex >= 0 && foundIndex < lyrics.lines.count {
            let currentLine = lyrics.lines[foundIndex]
            let nextLine = foundIndex < lyrics.lines.count - 1 ? lyrics.lines[foundIndex + 1] : nil
            
            // Calculate line end time (matches web app)
            let lineEndTime: Int?
            if let words = currentLine.words, !words.isEmpty {
                let lastWord = words[words.count - 1]
                lineEndTime = lastWord.endTime ?? (nextLine?.time ?? (lastWord.time + 3000))
            } else {
                lineEndTime = nextLine?.time ?? (currentLine.time + 3000)
            }
            
            if let words = currentLine.words, !words.isEmpty {
                var wordIndex = -1
                
                // First, check if we're before the first word (matches web app)
                if words[0].time > position {
                    wordIndex = -1
                } else {
                    // Find the currently active word (matches web app logic exactly)
                    for i in 0..<words.count {
                        let word = words[i]
                        
                        // Skip words that haven't started yet
                        if position < word.time {
                            continue
                        }
                        
                        // Check if we're before the next word starts (or if this is the last word)
                        let nextWordStartTime: Int
                        if i < words.count - 1 {
                            nextWordStartTime = words[i + 1].time
                        } else {
                            nextWordStartTime = lineEndTime ?? (currentLine.time + 3000)
                        }
                        
                        // If we're at or past this word's start time and before the next word starts
                        if position < nextWordStartTime {
                            wordIndex = i
                            break
                        }
                    }
                    
                    // If we've passed all words, show the last word (matches web app)
                    if wordIndex == -1 && position >= words[0].time {
                        wordIndex = words.count - 1
                    }
                }
                
                currentWordIndex = wordIndex
            } else {
                currentWordIndex = -1
            }
        } else {
            currentWordIndex = -1
        }
    }
}

struct TrackInfoView: View {
    let track: Track
    let isPlaying: Bool
    
    var body: some View {
        HStack(spacing: 40) {
            // Album art
            if let albumArtURL = track.albumArtURL,
               let url = URL(string: albumArtURL) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                }
                .frame(width: 200, height: 200)
                .cornerRadius(16)
                .shadow(radius: 20)
            }
            
            VStack(alignment: .leading, spacing: 20) {
                Text(track.name)
                    .font(.system(size: 48, weight: .bold))
                    .foregroundColor(.white)
                
                Text(track.artistNames)
                    .font(.system(size: 36))
                    .foregroundColor(.secondary)
                
                Text(track.album.name)
                    .font(.system(size: 28))
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding(.horizontal, 100)
    }
}

struct LyricsDisplayView: View {
    let lyrics: LyricsData
    let currentPosition: Int
    @Binding var currentLineIndex: Int
    @Binding var currentWordIndex: Int
    let albumArtURL: String?
    
    var body: some View {
        ZStack {
            // Masked background words effect (behind lyrics)
            if let albumArtURL = albumArtURL,
               currentLineIndex >= 0,
               currentLineIndex < lyrics.lines.count,
               let currentLine = lyrics.lines[currentLineIndex].words,
               !currentLine.isEmpty {
                MaskedBackgroundWordsView(
                    words: currentLine,
                    currentWordIndex: currentWordIndex,
                    currentPosition: currentPosition,
                    albumArtURL: albumArtURL
                )
            }
            
            // Main lyrics display
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 30) {
                        ForEach(0..<lyrics.lines.count, id: \.self) { index in
                            LyricLineView(
                                line: lyrics.lines[index],
                                isActive: index == currentLineIndex,
                                currentWordIndex: index == currentLineIndex ? currentWordIndex : -1
                            )
                            .id(index)
                        }
                    }
                    .padding(.horizontal, 100)
                }
                .onChange(of: currentLineIndex) { newIndex in
                    if newIndex >= 0 {
                        withAnimation(.easeInOut(duration: 0.5)) {
                            proxy.scrollTo(newIndex, anchor: .center)
                        }
                    }
                }
            }
        }
    }
}

struct LyricLineView: View {
    let line: LyricLine
    let isActive: Bool
    let currentWordIndex: Int
    
    var body: some View {
        if let words = line.words, !words.isEmpty {
            // Word-by-word display
            HStack(spacing: 12) {
                ForEach(0..<words.count, id: \.self) { index in
                    let word = words[index]
                    Text(word.text)
                        .font(.system(size: isActive ? 56 : 44, weight: isActive ? .bold : .regular))
                        .foregroundColor(
                            isActive && index == currentWordIndex
                                ? .white
                                : isActive
                                    ? .white.opacity(0.7)
                                    : .white.opacity(0.4)
                        )
                        .shadow(
                            color: isActive && index == currentWordIndex
                                ? .white.opacity(0.8)
                                : .clear,
                            radius: 10
                        )
                }
            }
            .multilineTextAlignment(.center)
        } else {
            // Full line display
            Text(line.text)
                .font(.system(size: isActive ? 56 : 44, weight: isActive ? .bold : .regular))
                .foregroundColor(isActive ? .white : .white.opacity(0.4))
                .shadow(color: isActive ? .white.opacity(0.8) : .clear, radius: 10)
                .multilineTextAlignment(.center)
        }
    }
}

struct ControlsView: View {
    let isPlaying: Bool
    let onTogglePlayback: () -> Void
    let onSkipNext: () -> Void
    let onSkipPrevious: () -> Void
    let onLogout: () -> Void
    
    var body: some View {
        HStack(spacing: 40) {
            Button(action: onSkipPrevious) {
                Image(systemName: "backward.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.white)
            }
            .buttonStyle(.plain)
            
            Button(action: onTogglePlayback) {
                Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.white)
            }
            .buttonStyle(.plain)
            
            Button(action: onSkipNext) {
                Image(systemName: "forward.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.white)
            }
            .buttonStyle(.plain)
            
            Spacer()
            
            Button(action: onLogout) {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 32))
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 100)
    }
}

