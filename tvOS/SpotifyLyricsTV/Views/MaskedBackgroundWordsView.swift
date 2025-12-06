//
//  MaskedBackgroundWordsView.swift
//  SpotifyLyricsTV
//
//  Animated background words that match the timing of singing
//

import SwiftUI

struct MaskedBackgroundWordsView: View {
    let words: [LyricWord]
    let currentWordIndex: Int
    let currentPosition: Int
    let albumArtURL: String
    
    // Store random positions and tilts for each word (stable across updates)
    @State private var wordPositions: [Int: CGPoint] = [:]
    @State private var wordTilts: [Int: Double] = [:]
    
    var body: some View {
        ZStack {
            // Animated words with album art masking - only show words that should be visible
            ForEach(0..<words.count, id: \.self) { wordIndex in
                let word = words[wordIndex]
                let isActive = wordIndex == currentWordIndex
                
                // Initialize random positions and tilts
                let position = getPosition(for: wordIndex)
                let tilt = getTilt(for: wordIndex)
                
                // Calculate scale and opacity based on timing
                let (scale, opacity) = calculateWordAnimation(
                    wordIndex: wordIndex,
                    word: word,
                    isActive: isActive
                )
                
                // Only render if visible (opacity > 0 or scale > 0)
                if opacity > 0 || scale > 0 {
                    // Mask the text with album art (like web app's mask-image)
                    ZStack {
                        // Album art as mask source
                        if let url = URL(string: albumArtURL) {
                            AsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Color.clear
                            }
                            .frame(width: 400, height: 400)
                            .offset(x: getBackgroundOffset(for: wordIndex).x,
                                   y: getBackgroundOffset(for: wordIndex).y)
                        }
                    }
                    .mask {
                        Text(word.text)
                            .font(.system(size: 200, weight: .bold))
                            .scaleEffect(scale)
                            .rotationEffect(.degrees(tilt))
                    }
                    .opacity(opacity)
                    .position(position)
                    .blendMode(.overlay)
                    .animation(.linear(duration: 0.1), value: scale)
                    .animation(.linear(duration: 0.1), value: opacity)
                }
            }
        }
        .allowsHitTesting(false) // Don't block touches
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .ignoresSafeArea()
    }
    
    // Store random background positions for each word (to show different parts of album art)
    @State private var backgroundOffsets: [Int: CGPoint] = [:]
    
    private func getBackgroundOffset(for index: Int) -> CGPoint {
        if let existing = backgroundOffsets[index] {
            return existing
        }
        
        // Random position within 30-70% range (midtone area, like web app)
        let x = CGFloat.random(in: 0.3...0.7) * 400
        let y = CGFloat.random(in: 0.3...0.7) * 400
        
        let offset = CGPoint(x: x, y: y)
        backgroundOffsets[index] = offset
        return offset
    }
    
    private func getPosition(for index: Int) -> CGPoint {
        if let existing = wordPositions[index] {
            return existing
        }
        
        // Generate random position (30-70% of screen, avoiding center)
        let x = CGFloat.random(in: 0.3...0.7) * UIScreen.main.bounds.width
        let y = CGFloat.random(in: 0.3...0.7) * UIScreen.main.bounds.height
        
        let position = CGPoint(x: x, y: y)
        wordPositions[index] = position
        return position
    }
    
    private func getTilt(for index: Int) -> Double {
        if let existing = wordTilts[index] {
            return existing
        }
        
        // Random tilt between -20 and +20 degrees
        let tilt = Double.random(in: -20...20)
        wordTilts[index] = tilt
        return tilt
    }
    
    private func calculateWordAnimation(
        wordIndex: Int,
        word: LyricWord,
        isActive: Bool
    ) -> (scale: CGFloat, opacity: Double) {
        
        if isActive {
            // Current word being sung: animate based on progress through the word
            // This matches the web app's timing exactly
            let wordStartTime = word.time
            let wordEndTime = word.endTime ?? {
                // Estimate end time from next word or default duration
                if wordIndex < words.count - 1 {
                    return words[wordIndex + 1].time
                } else {
                    return word.time + 1000 // Default 1 second
                }
            }()
            
            let wordDuration = max(100, wordEndTime - wordStartTime) // Minimum 100ms
            let elapsed = currentPosition - wordStartTime
            let progress = min(1.0, max(0.0, Double(elapsed) / Double(wordDuration)))
            
            // Match web app: progress slowed 5x for smoother animation
            let slowedProgress = progress * 0.2
            let easedProgress = min(1.0, slowedProgress) // Linear easing
            
            // Scale: starts at 1.8, shrinks to 0 as word is sung (matches web app)
            let scale = max(0, 1.8 * (1.0 - easedProgress))
            
            // Opacity: starts at 0.3, fades to 0 (matches web app)
            let opacity = max(0, 0.3 * (1.0 - easedProgress))
            
            return (CGFloat(scale), Double(opacity))
            
        } else if wordIndex < currentWordIndex {
            // Previous words: already gone (scale 0, opacity 0)
            return (0, 0)
            
        } else {
            // Coming words: ease in smoothly before becoming active
            let distance = wordIndex - currentWordIndex
            
            if distance == 1 {
                // Next word: ease in during last 60% of current word's duration
                let currentWord = words[currentWordIndex]
                let currentWordStart = currentWord.time
                let currentWordEnd = currentWord.endTime ?? {
                    if currentWordIndex < words.count - 1 {
                        return words[currentWordIndex + 1].time
                    } else {
                        return currentWord.time + 1000
                    }
                }()
                
                let currentWordDuration = max(100, currentWordEnd - currentWordStart)
                let timeUntilNext = word.time - currentPosition
                let easeInDuration = Double(currentWordDuration) * 0.6
                
                // Calculate ease-in progress
                let easeInProgress = timeUntilNext < Int(easeInDuration)
                    ? max(0.0, min(1.0, 1.0 - (Double(timeUntilNext) / easeInDuration)))
                    : 0.0
                
                // Ease in from 0.8 to 1.1 scale (matches web app)
                let startScale = 0.8
                let endScale = 1.1
                let scale = startScale + ((endScale - startScale) * easeInProgress)
                
                // Ease in opacity from 0.02 to 0.08 (matches web app)
                let startOpacity = 0.02
                let endOpacity = 0.08
                let opacity = startOpacity + ((endOpacity - startOpacity) * easeInProgress)
                
                return (CGFloat(scale), opacity)
                
            } else {
                // Other coming words: fixed zoomed position (matches web app)
                return (1.1, 0.08)
            }
        }
    }
}

