/**
 * Medical Transcription System
 * Real-time audio recording and transcription using Deepgram API
 *
 * Usage:
 * const transcription = new MedicalTranscription();
 *
 * // Start recording and transcribing
 * await transcription.start(onTranscriptUpdate);
 *
 * // Stop recording
 * await transcription.stop();
 *
 * // Get full transcript
 * const fullTranscript = transcription.getTranscript();
 */

class MedicalTranscription {
  constructor() {
    this.mediaRecorder = null;
    this.audioContext = null;
    this.socket = null;
    this.isRecording = false;
    this.transcript = [];
    this.currentSpeaker = null;
    this.speakerMap = {
      0: 'Doctor',
      1: 'Patient'
    };
    this.onTranscriptUpdate = null;
    this.startTime = null;
  }

  /**
   * Start recording and live transcription
   * @param {Function} onTranscriptUpdate - Callback function called when new text arrives
   *                                         Receives: { speaker: "Doctor", text: "...", timestamp: "00:05", isFinal: true/false }
   */
  async start(onTranscriptUpdate) {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    this.onTranscriptUpdate = onTranscriptUpdate;
    this.transcript = [];
    this.startTime = Date.now();

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });

      // Connect to Deepgram WebSocket for live streaming
      await this.connectToDeepgram(stream);

      this.isRecording = true;
      console.log('✅ Recording started');

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      throw new Error(`Failed to start recording: ${error.message}`);
    }
  }

  /**
   * Connect to Deepgram WebSocket API for live transcription
   */
  async connectToDeepgram(stream) {
    // Build WebSocket URL with parameters
    const params = new URLSearchParams({
      model: DEEPGRAM_CONFIG.model,
      language: DEEPGRAM_CONFIG.language,
      punctuate: DEEPGRAM_CONFIG.features.punctuate,
      diarize: DEEPGRAM_CONFIG.features.diarize,
      utterances: DEEPGRAM_CONFIG.features.utterances,
      smart_format: DEEPGRAM_CONFIG.features.smart_format,
      interim_results: DEEPGRAM_CONFIG.features.interim_results,
      endpointing: DEEPGRAM_CONFIG.features.endpointing,
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1
    });

    const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    // Create WebSocket connection
    this.socket = new WebSocket(wsUrl, ['token', DEEPGRAM_CONFIG.apiKey]);

    // Handle connection open
    this.socket.onopen = () => {
      console.log('✅ Connected to Deepgram');
      this.startStreamingAudio(stream);
    };

    // Handle incoming transcription results
    this.socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      this.handleTranscriptionResult(data);
    };

    // Handle errors
    this.socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    // Handle connection close
    this.socket.onclose = () => {
      console.log('WebSocket closed');
    };
  }

  /**
   * Start streaming audio to Deepgram
   */
  startStreamingAudio(stream) {
    // Create audio context for processing
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000
    });

    const source = this.audioContext.createMediaStreamSource(stream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(this.audioContext.destination);

    // Process and send audio chunks
    processor.onaudioprocess = (e) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (linear16 encoding)
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send to Deepgram
        this.socket.send(int16Data.buffer);
      }
    };

    this.processor = processor;
    this.mediaStream = stream;
  }

  /**
   * Handle transcription results from Deepgram
   */
  handleTranscriptionResult(data) {
    if (!data.channel || !data.channel.alternatives || data.channel.alternatives.length === 0) {
      return;
    }

    const alternative = data.channel.alternatives[0];
    const transcript = alternative.transcript;

    if (!transcript || transcript.trim() === '') {
      return;
    }

    const isFinal = data.is_final;
    const words = alternative.words || [];

    // Get speaker information if available
    let speaker = 'Unknown';
    if (words.length > 0 && words[0].speaker !== undefined) {
      const speakerId = words[0].speaker;
      speaker = this.speakerMap[speakerId] || `Speaker ${speakerId}`;
    }

    // Calculate timestamp
    const timestamp = this.formatTimestamp(Date.now() - this.startTime);

    // Create transcript segment
    const segment = {
      speaker: speaker,
      text: transcript,
      timestamp: timestamp,
      isFinal: isFinal,
      confidence: alternative.confidence || 0
    };

    // If final, add to transcript array
    if (isFinal) {
      this.transcript.push(segment);
      console.log(`[${timestamp}] ${speaker}: ${transcript}`);
    }

    // Call update callback
    if (this.onTranscriptUpdate) {
      this.onTranscriptUpdate(segment);
    }
  }

  /**
   * Stop recording and transcription
   */
  async stop() {
    if (!this.isRecording) {
      console.warn('Not currently recording');
      return;
    }

    this.isRecording = false;

    // Stop audio stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }

    // Disconnect audio processor
    if (this.processor) {
      this.processor.disconnect();
    }

    // Close audio context
    if (this.audioContext) {
      await this.audioContext.close();
    }

    // Close WebSocket
    if (this.socket) {
      this.socket.send(JSON.stringify({ type: 'CloseStream' }));
      this.socket.close();
    }

    console.log('✅ Recording stopped');
    console.log(`Total transcript segments: ${this.transcript.length}`);
  }

  /**
   * Get full transcript
   * @returns {Array} Array of transcript segments
   */
  getTranscript() {
    return this.transcript;
  }

  /**
   * Get formatted transcript as string
   * @returns {String} Formatted transcript
   */
  getFormattedTranscript() {
    return this.transcript.map(segment =>
      `[${segment.timestamp}] ${segment.speaker}: ${segment.text}`
    ).join('\n\n');
  }

  /**
   * Format milliseconds to MM:SS
   */
  formatTimestamp(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Clear transcript
   */
  clearTranscript() {
    this.transcript = [];
  }

  /**
   * Update speaker labels (optional - for custom naming)
   * @param {Object} speakerMap - Map of speaker IDs to names, e.g., { 0: "Dr. Smith", 1: "John Doe" }
   */
  setSpeakerLabels(speakerMap) {
    this.speakerMap = speakerMap;
  }

  /**
   * Check if currently recording
   */
  isActive() {
    return this.isRecording;
  }

  /**
   * Get recording duration in milliseconds
   */
  getDuration() {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime;
  }

  /**
   * Get recording duration formatted as MM:SS
   */
  getFormattedDuration() {
    return this.formatTimestamp(this.getDuration());
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MedicalTranscription;
}
