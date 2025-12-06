//
//  LoginView.swift
//  SpotifyLyricsTV
//
//  Login view for Spotify authentication
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        VStack(spacing: 40) {
            Image(systemName: "music.note.tv")
                .font(.system(size: 120))
                .foregroundColor(.green)
            
            Text("Spotify Lyrics")
                .font(.system(size: 64, weight: .bold))
            
            Text("Connect your Spotify account to display synchronized lyrics")
                .font(.system(size: 32))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 100)
            
            if authManager.isLoading {
                ProgressView()
                    .scaleEffect(1.5)
            } else {
                Button(action: {
                    authManager.initiateLogin()
                }) {
                    Text("Connect with Spotify")
                        .font(.system(size: 36, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 60)
                        .padding(.vertical, 20)
                        .background(Color.green)
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)
            }
            
            if let error = authManager.error {
                Text(error)
                    .font(.system(size: 28))
                    .foregroundColor(.red)
                    .padding(.horizontal, 100)
                    .multilineTextAlignment(.center)
            }
            
            // Display auth URL if available
            if let authURL = authManager.authURL {
                VStack(spacing: 20) {
                    Text("Open this URL on your iPhone/iPad:")
                        .font(.system(size: 32, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.top, 40)
                    
                    ScrollView(.horizontal) {
                        Text(authURL)
                            .font(.system(size: 24, design: .monospaced))
                            .foregroundColor(.green)
                            .padding()
                            .background(Color.gray.opacity(0.2))
                            .cornerRadius(8)
                    }
                    .frame(maxWidth: 1200)
                    .padding(.horizontal, 100)
                    
                    Text("1. Copy the URL above\n2. Open it in Safari on your phone\n3. Log in and approve\n4. The app will automatically connect")
                        .font(.system(size: 28))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 100)
                }
            } else {
                Text("Note: After clicking Connect, you'll see a URL to open on your iPhone/iPad")
                    .font(.system(size: 24))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 100)
                    .padding(.top, 40)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }
}

