import { useRef, useCallback, useState, useEffect } from 'react';

interface AudioPlayerOptions {
  sampleRate?: number;
  latencyHint?: AudioContextLatencyCategory;
  bufferSize?: number;
}

interface AudioMetrics {
  chunksPlayed: number;
  totalLatency: number;
  gaps: number;
  errors: number;
  avgDecodeTime: number;
}

export const useAudioPlayer = (options?: AudioPlayerOptions) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const metricsRef = useRef<AudioMetrics>({
    chunksPlayed: 0,
    totalLatency: 0,
    gaps: 0,
    errors: 0,
    avgDecodeTime: 0,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [bufferHealth, setBufferHealth] = useState<'good' | 'warning' | 'critical'>('good');

  // Initialize AudioContext
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const sampleRate = options?.sampleRate || 48000;
      const latencyHint = options?.latencyHint || 'interactive';

      audioContextRef.current = new AudioContext({
        sampleRate,
        latencyHint,
      });

      console.log('[useAudioPlayer] AudioContext initialized', {
        sampleRate,
        latencyHint,
        state: audioContextRef.current.state,
      });

      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }
    return audioContextRef.current;
  }, [options]);

  // Convert PCM16 to Float32Array
  const pcm16ToFloat32 = useCallback((pcm16Data: Uint8Array): Float32Array => {
    const float32Array = new Float32Array(pcm16Data.length / 2);
    const dataView = new DataView(pcm16Data.buffer);
    
    for (let i = 0; i < float32Array.length; i++) {
      const int16 = dataView.getInt16(i * 2, true); // little-endian
      float32Array[i] = int16 / (int16 < 0 ? 32768 : 32767);
    }
    
    return float32Array;
  }, []);

  // Create WAV header
  const createWavFromPCM = useCallback((pcmData: Uint8Array): Uint8Array => {
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    const sampleRate = options?.sampleRate || 48000;
    const numChannels = 1;
    const bitsPerSample = 16;

    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(8, 'WAVE');

    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, pcmData.length, true);

    // Combine header and data
    const wavArray = new Uint8Array(wavHeader.byteLength + pcmData.length);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(pcmData, wavHeader.byteLength);

    return wavArray;
  }, [options]);

  // Play next chunk from queue
  const playNext = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setBufferHealth('good');
      return;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
    
    const audioData = audioQueueRef.current.shift()!;
    
    // Update buffer health
    const queueLength = audioQueueRef.current.length;
    if (queueLength > 5) {
      setBufferHealth('critical');
    } else if (queueLength > 2) {
      setBufferHealth('warning');
    } else {
      setBufferHealth('good');
    }

    try {
      const audioContext = initAudioContext();
      const decodeStart = performance.now();

      // Convert PCM to WAV
      const wavData = createWavFromPCM(audioData);
      
      // Decode audio - create a new ArrayBuffer to ensure correct type
      const buffer = new ArrayBuffer(wavData.byteLength);
      new Uint8Array(buffer).set(wavData);
      const audioBuffer = await audioContext.decodeAudioData(buffer);
      const decodeTime = performance.now() - decodeStart;

      // Update metrics
      metricsRef.current.avgDecodeTime = 
        (metricsRef.current.avgDecodeTime * metricsRef.current.chunksPlayed + decodeTime) / 
        (metricsRef.current.chunksPlayed + 1);

      // Create buffer source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      // Calculate timing with safety buffer
      const currentTime = audioContext.currentTime;
      const safetyBuffer = 0.05; // 50ms safety buffer
      
      let startTime: number;
      if (nextStartTimeRef.current <= currentTime) {
        // We're behind, catch up
        startTime = currentTime + safetyBuffer;
        metricsRef.current.gaps++;
        console.warn('[useAudioPlayer] Gap detected, catching up', {
          gap: currentTime - nextStartTimeRef.current,
          totalGaps: metricsRef.current.gaps,
        });
      } else {
        startTime = nextStartTimeRef.current;
      }

      // Schedule playback
      source.onended = () => {
        metricsRef.current.chunksPlayed++;
        playNext();
      };

      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      console.log('[useAudioPlayer] Chunk playing', {
        duration: audioBuffer.duration,
        startTime,
        currentTime,
        gap: startTime - currentTime,
        queueLength: audioQueueRef.current.length,
        decodeTime: `${decodeTime.toFixed(2)}ms`,
      });

    } catch (error) {
      console.error('[useAudioPlayer] Error playing chunk:', error);
      metricsRef.current.errors++;
      
      // Auto-recovery: reset timing on error
      nextStartTimeRef.current = 0;
      
      // Continue with next chunk
      playNext();
    }
  }, [initAudioContext, createWavFromPCM]);

  // Enqueue audio data
  const enqueueAudio = useCallback(async (audioData: Uint8Array | Float32Array) => {
    try {
      // Convert Float32Array to PCM16 if needed
      let pcmData: Uint8Array;
      if (audioData instanceof Float32Array) {
        const int16Array = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          const s = Math.max(-1, Math.min(1, audioData[i]));
          int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        pcmData = new Uint8Array(int16Array.buffer);
      } else {
        pcmData = audioData;
      }

      audioQueueRef.current.push(pcmData);

      if (!isPlayingRef.current) {
        await playNext();
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error enqueuing audio:', error);
      metricsRef.current.errors++;
    }
  }, [playNext]);

  // Clear queue
  const clearQueue = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsPlaying(false);
    nextStartTimeRef.current = 0;
    console.log('[useAudioPlayer] Queue cleared');
  }, []);

  // Get metrics
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      clearQueue();
    };
  }, [clearQueue]);

  return {
    enqueueAudio,
    clearQueue,
    isPlaying,
    bufferHealth,
    getMetrics,
    audioContext: audioContextRef.current,
  };
};
