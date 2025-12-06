//
//  AuthManager.swift
//  SpotifyLyricsTV
//
//  Spotify authentication manager for tvOS
//

import Foundation
import SwiftUI
import AuthenticationServices
import CryptoKit

class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var error: String?
    @Published var authURL: String? // Store the auth URL to display on screen
    
    private let clientId: String
    private let redirectURI = "spotifylyricstv://callback"
    private let tokenStorageKey = "spotify_access_token"
    private let refreshTokenStorageKey = "spotify_refresh_token"
    private let tokenExpiryKey = "spotify_token_expiry"
    
    init() {
        // Get client ID from Info.plist or environment
        // For personal use, you can hardcode it or use a config file
        if let path = Bundle.main.path(forResource: "Config", ofType: "plist"),
           let config = NSDictionary(contentsOfFile: path),
           let clientId = config["SpotifyClientID"] as? String {
            self.clientId = clientId
        } else {
            // Fallback: try to get from environment or use placeholder
            self.clientId = ProcessInfo.processInfo.environment["SPOTIFY_CLIENT_ID"] ?? ""
            if self.clientId.isEmpty {
                print("⚠️ WARNING: Spotify Client ID not found. Please add it to Config.plist or set SPOTIFY_CLIENT_ID environment variable")
            }
        }
    }
    
    func checkAuthentication() {
        if let token = getAccessToken(), !isTokenExpired() {
            isAuthenticated = true
        }
    }
    
    func initiateLogin() {
        isLoading = true
        error = nil
        authURL = nil // Clear previous URL
        
        let scopes = [
            "user-read-currently-playing",
            "user-read-playback-state",
            "user-modify-playback-state",
            "streaming",
            "user-library-read",
            "playlist-read-private",
            "playlist-read-collaborative"
        ]
        
        let codeVerifier = generateCodeVerifier()
        let codeChallenge = generateCodeChallenge(from: codeVerifier)
        
        // Store code verifier
        UserDefaults.standard.set(codeVerifier, forKey: "code_verifier")
        
        let state = generateRandomString(length: 16)
        UserDefaults.standard.set(state, forKey: "auth_state")
        
        var components = URLComponents(string: "https://accounts.spotify.com/authorize")!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientId),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "scope", value: scopes.joined(separator: " ")),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "code_challenge", value: codeChallenge),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "show_dialog", value: "true")
        ]
        
        guard let authURL = components.url else {
            error = "Failed to create authorization URL"
            isLoading = false
            return
        }
        
        // Store the URL to display on screen
        self.authURL = authURL.absoluteString
        
        // On tvOS, we need to open the URL in Safari or use a web view
        // For personal use, you can use a simple web view or open in Safari
        openURL(authURL)
    }
    
    func handleCallback(url: URL) {
        isLoading = true
        error = nil
        
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let queryItems = components.queryItems else {
            error = "Invalid callback URL"
            isLoading = false
            return
        }
        
        // Check for error first
        if let errorParam = queryItems.first(where: { $0.name == "error" })?.value {
            error = "Authentication error: \(errorParam)"
            isLoading = false
            return
        }
        
        guard let code = queryItems.first(where: { $0.name == "code" })?.value else {
            error = "No authorization code in callback"
            isLoading = false
            return
        }
        
        // Verify state (optional but recommended)
        if let state = queryItems.first(where: { $0.name == "state" })?.value {
            let storedState = UserDefaults.standard.string(forKey: "auth_state")
            if state != storedState {
                error = "State mismatch - possible security issue"
                isLoading = false
                return
            }
        }
        
        guard let codeVerifier = UserDefaults.standard.string(forKey: "code_verifier") else {
            error = "Code verifier not found"
            isLoading = false
            return
        }
        
        exchangeCodeForToken(code: code, codeVerifier: codeVerifier)
    }
    
    private func exchangeCodeForToken(code: String, codeVerifier: String) {
        var request = URLRequest(url: URL(string: "https://accounts.spotify.com/api/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        let body = [
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirectURI,
            "client_id": clientId,
            "code_verifier": codeVerifier
        ]
        
        request.httpBody = body.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")" }
            .joined(separator: "&")
            .data(using: .utf8)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false
                
                if let error = error {
                    self?.error = "Network error: \(error.localizedDescription)"
                    return
                }
                
                guard let data = data,
                      let json = try? JSONDecoder().decode(TokenResponse.self, from: data) else {
                    self?.error = "Failed to parse token response"
                    return
                }
                
                self?.storeTokens(json)
                self?.isAuthenticated = true
                self?.error = nil
            }
        }.resume()
    }
    
    private func storeTokens(_ tokenData: TokenResponse) {
        let expiryTime = Date().addingTimeInterval(TimeInterval(tokenData.expires_in))
        UserDefaults.standard.set(tokenData.access_token, forKey: tokenStorageKey)
        if let refreshToken = tokenData.refresh_token {
            UserDefaults.standard.set(refreshToken, forKey: refreshTokenStorageKey)
        }
        UserDefaults.standard.set(expiryTime, forKey: tokenExpiryKey)
    }
    
    func getAccessToken() -> String? {
        return UserDefaults.standard.string(forKey: tokenStorageKey)
    }
    
    private func getRefreshToken() -> String? {
        return UserDefaults.standard.string(forKey: refreshTokenStorageKey)
    }
    
    private func isTokenExpired() -> Bool {
        guard let expiryDate = UserDefaults.standard.object(forKey: tokenExpiryKey) as? Date else {
            return true
        }
        return Date() >= expiryDate
    }
    
    func getValidToken() async throws -> String {
        if isTokenExpired() {
            return try await refreshToken()
        }
        guard let token = getAccessToken() else {
            throw AuthError.noToken
        }
        return token
    }
    
    private func refreshToken() async throws -> String {
        guard let refreshToken = getRefreshToken() else {
            throw AuthError.noRefreshToken
        }
        
        var request = URLRequest(url: URL(string: "https://accounts.spotify.com/api/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        let body = [
            "grant_type": "refresh_token",
            "refresh_token": refreshToken,
            "client_id": clientId
        ]
        
        request.httpBody = body.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")" }
            .joined(separator: "&")
            .data(using: .utf8)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(TokenResponse.self, from: data)
        
        storeTokens(response)
        return response.access_token
    }
    
    func logout() {
        UserDefaults.standard.removeObject(forKey: tokenStorageKey)
        UserDefaults.standard.removeObject(forKey: refreshTokenStorageKey)
        UserDefaults.standard.removeObject(forKey: tokenExpiryKey)
        isAuthenticated = false
        authURL = nil
    }
    
    // MARK: - Helper Methods
    
    private func generateCodeVerifier() -> String {
        return generateRandomString(length: 128)
    }
    
    private func generateCodeChallenge(from verifier: String) -> String {
        guard let data = verifier.data(using: .utf8) else { return "" }
        let hash = SHA256(data: data)
        return hash.base64URLEncodedString()
    }
    
    private func generateRandomString(length: Int) -> String {
        let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        return String((0..<length).map { _ in characters.randomElement()! })
    }
    
    private func SHA256(data: Data) -> Data {
        let digest = CryptoKit.SHA256.hash(data: data)
        return Data(digest)
    }
    
    private func openURL(_ url: URL) {
        // On tvOS, open in Safari or use ASWebAuthenticationSession
        // For personal use, you might need to handle this differently
        #if os(tvOS)
        // tvOS doesn't have ASWebAuthenticationSession, so we'll need a workaround
        // You can use a web view or open in Safari on a companion device
        print("Open this URL in Safari on your iPhone/iPad: \(url.absoluteString)")
        // In a real implementation, you might want to:
        // 1. Display the URL on screen for the user to copy
        // 2. Use a companion app to handle auth
        // 3. Use a web server as a proxy
        #else
        // For iOS/macOS, use ASWebAuthenticationSession
        #endif
    }
}

struct TokenResponse: Codable {
    let access_token: String
    let refresh_token: String?
    let expires_in: Int
}

enum AuthError: Error {
    case noToken
    case noRefreshToken
}

// MARK: - Crypto Extension

extension Data {
    func base64URLEncodedString() -> String {
        return self.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

