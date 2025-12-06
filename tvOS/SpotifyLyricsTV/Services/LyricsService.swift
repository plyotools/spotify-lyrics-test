//
//  LyricsService.swift
//  SpotifyLyricsTV
//
//  Lyrics fetching service (LRCLIB and Musixmatch)
//

import Foundation

class LyricsService: ObservableObject {
    @Published var currentLyrics: LyricsData?
    @Published var isLoading = false
    @Published var error: String?
    
    private var lyricsCache: [String: LyricsData] = [:]
    
    func fetchLyrics(artist: String, title: String, duration: Int?) async {
        isLoading = true
        error = nil
        
        let cacheKey = "\(artist)-\(title)".lowercased()
        
        // Check cache first
        if let cached = lyricsCache[cacheKey] {
            await MainActor.run {
                self.currentLyrics = cached
                self.isLoading = false
            }
            return
        }
        
        // Try LRCLIB first (free, no API key)
        if let lyrics = await getLyricsFromLRCLIB(artist: artist, title: title, duration: duration) {
            await MainActor.run {
                self.currentLyrics = lyrics
                self.lyricsCache[cacheKey] = lyrics
                self.isLoading = false
            }
            return
        }
        
        // Fallback to Musixmatch if API key is available
        // (You can add this later if needed)
        
        await MainActor.run {
            self.error = "Lyrics not found"
            self.isLoading = false
        }
    }
    
    private func getLyricsFromLRCLIB(artist: String, title: String, duration: Int?) async -> LyricsData? {
        var components = URLComponents(string: "https://lrclib.net/api/get")!
        var queryItems = [
            URLQueryItem(name: "track_name", value: title),
            URLQueryItem(name: "artist_name", value: artist)
        ]
        
        if let duration = duration {
            queryItems.append(URLQueryItem(name: "duration", value: "\(Int(duration / 1000))"))
        }
        
        components.queryItems = queryItems
        
        guard let url = components.url else { return nil }
        
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return nil
            }
            
            let json = try JSONDecoder().decode(LRCLIBResponse.self, from: data)
            
            if let syncedLyrics = json.syncedLyrics {
                return parseLRC(syncedLyrics)
            } else if let plainLyrics = json.plainLyrics {
                let lines = plainLyrics
                    .split(separator: "\n")
                    .map { LyricLine(time: 0, text: String($0).trimmingCharacters(in: .whitespaces), words: nil) }
                return LyricsData(lines: lines, synced: false, hasWordTimestamps: false)
            }
            
            return nil
        } catch {
            print("Error fetching lyrics from LRCLIB: \(error)")
            return nil
        }
    }
    
    private func parseLRC(_ lrcText: String) -> LyricsData {
        var lines: [LyricLine] = []
        let lrcLines = lrcText.components(separatedBy: "\n")
        var hasWordTimestamps = false
        
        for line in lrcLines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.isEmpty { continue }
            
            // Match LRC format: [mm:ss.xx] or [mm:ss:xx] or [mm:ss]
            let pattern = #"^\[(\d{1,2}):(\d{2})(?:[:.](\d{2,3}))?\]"#
            guard let regex = try? NSRegularExpression(pattern: pattern),
                  let match = regex.firstMatch(in: trimmed, range: NSRange(trimmed.startIndex..., in: trimmed)) else {
                // Skip non-timestamp lines
                continue
            }
            
            let minutes = Int((trimmed as NSString).substring(with: match.range(at: 1))) ?? 0
            let seconds = Int((trimmed as NSString).substring(with: match.range(at: 2))) ?? 0
            let fraction = match.range(at: 3).location != NSNotFound
                ? Int((trimmed as NSString).substring(with: match.range(at: 3))) ?? 0
                : 0
            
            var timeMs = (minutes * 60 + seconds) * 1000
            if fraction > 0 {
                timeMs += fraction < 100 ? fraction * 10 : fraction
            }
            
            let matchRange = Range(match.range, in: trimmed) ?? trimmed.startIndex..<trimmed.endIndex
            let textAfterTimestamp = String(trimmed[matchRange.upperBound...])
                .trimmingCharacters(in: .whitespaces)
            
            if textAfterTimestamp.isEmpty { continue }
            
            // Check for word-level timestamps
            let hasWordLevelTimestamps = textAfterTimestamp.range(of: #"\[\d{1,2}:\d{2}(?:[:.]\d{2,3})?\]"#, options: .regularExpression) != nil
            
            if hasWordLevelTimestamps {
                hasWordTimestamps = true
            }
            
            // Parse words (simplified - you can enhance this)
            let words = parseWordTimestamps(textAfterTimestamp, lineStartTime: timeMs)
            
            // Clean text (remove timestamps for display)
            let cleanText = textAfterTimestamp.replacingOccurrences(
                of: #"\[\d{1,2}:\d{2}(?:[:.]\d{2,3})?\]"#,
                with: "",
                options: .regularExpression
            ).trimmingCharacters(in: .whitespaces)
            
            lines.append(LyricLine(time: timeMs, text: cleanText, words: words.isEmpty ? nil : words))
        }
        
        lines.sort { $0.time < $1.time }
        
        return LyricsData(lines: lines, synced: true, hasWordTimestamps: hasWordTimestamps)
    }
    
    private func parseWordTimestamps(_ text: String, lineStartTime: Int) -> [LyricWord] {
        var words: [LyricWord] = []
        let pattern = #"\[(\d{1,2}):(\d{2})(?:[:.](\d{2,3}))?\]([^\[]+)"#
        
        guard let regex = try? NSRegularExpression(pattern: pattern) else {
            // Fallback: estimate word timestamps
            let wordTexts = text.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
            let wordDuration = 3000 / max(wordTexts.count, 1) // 3 seconds per line default
            
            for (index, wordText) in wordTexts.enumerated() {
                words.append(LyricWord(
                    time: lineStartTime + (index * wordDuration),
                    text: wordText,
                    endTime: lineStartTime + ((index + 1) * wordDuration)
                ))
            }
            return words
        }
        
        let matches = regex.matches(in: text, range: NSRange(text.startIndex..., in: text))
        
        for match in matches {
            let minutes = Int((text as NSString).substring(with: match.range(at: 1))) ?? 0
            let seconds = Int((text as NSString).substring(with: match.range(at: 2))) ?? 0
            let fraction = match.range(at: 3).location != NSNotFound
                ? Int((text as NSString).substring(with: match.range(at: 3))) ?? 0
                : 0
            
            var wordTime = (minutes * 60 + seconds) * 1000
            if fraction > 0 {
                wordTime += fraction < 100 ? fraction * 10 : fraction
            }
            
            let wordText = (text as NSString).substring(with: match.range(at: 4))
                .trimmingCharacters(in: .whitespaces)
            
            if !wordText.isEmpty {
                words.append(LyricWord(time: wordTime, text: wordText, endTime: nil))
            }
        }
        
        // Calculate end times
        for i in 0..<words.count {
            if i < words.count - 1 {
                words[i] = LyricWord(time: words[i].time, text: words[i].text, endTime: words[i + 1].time)
            }
        }
        
        return words
    }
    
    func clearCache() {
        lyricsCache.removeAll()
    }
}

struct LRCLIBResponse: Codable {
    let syncedLyrics: String?
    let plainLyrics: String?
}

