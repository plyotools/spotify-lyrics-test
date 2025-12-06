//
//  SpotifyService.swift
//  SpotifyLyricsTV
//
//  Spotify API service for tvOS
//

import Foundation
import Combine

class SpotifyService: ObservableObject {
    @Published var currentTrack: Track?
    @Published var playbackState: PlaybackState?
    @Published var currentPosition: Int = 0
    @Published var isPlaying: Bool = false
    
    private var authManager: AuthManager?
    private var updateTimer: Timer?
    private var positionUpdateTimer: Timer?
    private var lastStateUpdate: Date?
    private var lastProgressMs: Int = 0
    private var delayCompensation: Int = 10000 // 10 seconds compensation for network/API delay
    private var cancellables = Set<AnyCancellable>()
    
    func setAuthManager(_ authManager: AuthManager) {
        self.authManager = authManager
        startPolling()
    }
    
    func startPolling() {
        // Update API state every 2 seconds (less frequent API calls)
        updateTimer?.invalidate()
        updateTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            Task {
                await self?.updatePlaybackState()
            }
        }
        
        // Update position continuously - match web app's requestAnimationFrame (60fps = ~16ms)
        positionUpdateTimer?.invalidate()
        
        // Update every ~16ms (60fps) to match web app's requestAnimationFrame
        // This ensures lyrics sync perfectly with no delay
        let timer = Timer(timeInterval: 0.016, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.updatePosition()
            }
        }
        // Use common run loop mode to ensure updates continue during UI interactions
        RunLoop.current.add(timer, forMode: .common)
        positionUpdateTimer = timer
        
        // Initial update
        Task {
            await updatePlaybackState()
        }
    }
    
    func stopPolling() {
        updateTimer?.invalidate()
        updateTimer = nil
        positionUpdateTimer?.invalidate()
        positionUpdateTimer = nil
    }
    
    @MainActor
    private func updatePosition() {
        guard let state = playbackState, state.is_playing else {
            return
        }
        
        // Match web app's position calculation exactly
        // Web app uses: basePosition + (Date.now() - baseTimestamp)
        // Account for network delay and API response time
        
        if let lastUpdate = lastStateUpdate, lastUpdate.timeIntervalSince1970 > 0 {
            // Use the same calculation as web app: elapsed time since last update
            let now = Date()
            let elapsed = now.timeIntervalSince(lastUpdate) * 1000 // Convert to milliseconds
            
            // Add delay compensation to account for network/API latency
            // The base position already includes initial compensation, so we add elapsed time
            // The compensation is applied to the base, not continuously added
            currentPosition = lastProgressMs + Int(elapsed)
        } else {
            // Fallback: calculate from state timestamp
            let now = Int64(Date().timeIntervalSince1970 * 1000)
            let elapsed = now - state.timestamp
            
            // Add delay compensation to account for network/API latency
            currentPosition = state.progress_ms + Int(elapsed) + delayCompensation
        }
        
        // Ensure position doesn't go negative
        if currentPosition < 0 {
            currentPosition = 0
        }
    }
    
    @MainActor
    private func updatePlaybackState() async {
        guard let authManager = authManager else { return }
        
        // Measure actual API delay
        let requestStartTime = Date()
        
        do {
            let token = try await authManager.getValidToken()
            let state = try await fetchPlaybackState(token: token)
            
            // Calculate actual network/API delay
            let requestDuration = Date().timeIntervalSince(requestStartTime) * 1000 // ms
            // Use measured delay + larger buffer for Spotify API latency
            let measuredDelay = Int(requestDuration) + 8000
            // Update delay compensation based on actual measured delay
            delayCompensation = max(measuredDelay, 10000) // Minimum 10 seconds to account for API delay
            print("📊 Delay compensation set to: \(delayCompensation)ms (\(delayCompensation/1000)s)")
            
            self.playbackState = state
            self.currentTrack = state?.item
            self.isPlaying = state?.is_playing ?? false
            
            if let state = state {
                // Store the state for continuous position updates
                // Use the current time as the base, not the API response time
                // This accounts for network delay
                self.lastStateUpdate = Date()
                self.lastProgressMs = state.progress_ms
                
                if state.is_playing {
                    // Set initial position with delay compensation
                    // The base position includes compensation, continuous updates add elapsed time
                    self.lastProgressMs = state.progress_ms + self.delayCompensation
                    self.currentPosition = self.lastProgressMs
                    print("🎵 Position set: \(state.progress_ms)ms + \(self.delayCompensation)ms compensation = \(self.currentPosition)ms")
                } else {
                    self.currentPosition = state.progress_ms
                    self.lastProgressMs = state.progress_ms
                }
            } else {
                self.currentPosition = 0
                self.lastStateUpdate = nil
                self.lastProgressMs = 0
            }
        } catch {
            print("Error updating playback state: \(error)")
        }
    }
    
    private func fetchPlaybackState(token: String) async throws -> PlaybackState? {
        var request = URLRequest(url: URL(string: "https://api.spotify.com/v1/me/player")!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw SpotifyError.invalidResponse
        }
        
        if httpResponse.statusCode == 204 {
            return nil // No active playback
        }
        
        guard httpResponse.statusCode == 200 else {
            throw SpotifyError.httpError(httpResponse.statusCode)
        }
        
        return try JSONDecoder().decode(PlaybackState.self, from: data)
    }
    
    func togglePlayback() async throws {
        guard let authManager = authManager,
              let state = playbackState else {
            throw SpotifyError.noPlaybackState
        }
        
        let token = try await authManager.getValidToken()
        let endpoint = state.is_playing
            ? "https://api.spotify.com/v1/me/player/pause"
            : "https://api.spotify.com/v1/me/player/play"
        
        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 204 || httpResponse.statusCode == 200 else {
            throw SpotifyError.httpError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }
    }
    
    func skipToNext() async throws {
        guard let authManager = authManager else {
            throw SpotifyError.notAuthenticated
        }
        
        let token = try await authManager.getValidToken()
        var request = URLRequest(url: URL(string: "https://api.spotify.com/v1/me/player/next")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 204 || httpResponse.statusCode == 200 else {
            throw SpotifyError.httpError(httpResponse.statusCode)
        }
    }
    
    func skipToPrevious() async throws {
        guard let authManager = authManager else {
            throw SpotifyError.notAuthenticated
        }
        
        let token = try await authManager.getValidToken()
        var request = URLRequest(url: URL(string: "https://api.spotify.com/v1/me/player/previous")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 204 || httpResponse.statusCode == 200 else {
            throw SpotifyError.httpError(httpResponse.statusCode)
        }
    }
    
    func seekToPosition(_ positionMs: Int) async throws {
        guard let authManager = authManager else {
            throw SpotifyError.notAuthenticated
        }
        
        let token = try await authManager.getValidToken()
        var components = URLComponents(string: "https://api.spotify.com/v1/me/player/seek")!
        components.queryItems = [URLQueryItem(name: "position_ms", value: "\(positionMs)")]
        
        var request = URLRequest(url: components.url!)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 204 || httpResponse.statusCode == 200 else {
            throw SpotifyError.httpError(httpResponse.statusCode)
        }
    }
}

enum SpotifyError: Error {
    case invalidResponse
    case httpError(Int)
    case noPlaybackState
    case notAuthenticated
}

