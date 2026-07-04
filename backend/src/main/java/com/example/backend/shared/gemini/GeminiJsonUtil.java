package com.example.backend.shared.gemini;

/** Shared helper for Gemini callers that ask for pure JSON but may get markdown-fenced output back. */
public final class GeminiJsonUtil {

    private GeminiJsonUtil() {}

    public static String extractJson(String raw) {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        return (start != -1 && end > start) ? raw.substring(start, end + 1) : raw;
    }
}
