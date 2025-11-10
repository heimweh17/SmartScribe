// Deepgram API Configuration
// ⚠️ IMPORTANT: Add this file to .gitignore to keep your API key secure!

const DEEPGRAM_CONFIG = {
  // Replace with your actual Deepgram API key
  apiKey: '<your-api-key>',

  // API endpoint
  apiUrl: 'https://api.deepgram.com/v1/listen',

  // Model configuration
  model: 'nova-2-medical', // Medical-specific model for better accuracy
  language: 'en-US',

  // Transcription features
  features: {
    punctuate: true,        // Add punctuation
    diarize: true,          // Enable speaker detection (identifies different speakers)
    utterances: true,       // Group words by speaker turns
    smart_format: true,     // Format numbers, dates, etc.
    profanity_filter: false, // Don't filter medical terms
    redact: false,          // Set to 'pii' if you want to redact personal info (HIPAA)
    interim_results: true,  // Get partial results while speaking
    endpointing: 300        // Milliseconds of silence before finalizing utterance
  },

  // Audio settings
  audio: {
    sampleRate: 16000,      // Optimal for speech recognition
    encoding: 'linear16',   // PCM encoding
    channels: 1             // Mono audio
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEEPGRAM_CONFIG;
}
