export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private useWorklet: boolean = false;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      // Request microphone permission first
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create AudioContext AFTER user interaction (Safari requirement)
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });

      // Resume context if suspended (Safari autoplay policy)
      if (this.audioContext.state === 'suspended') {
        console.log('AudioContext suspended, resuming...');
        await this.audioContext.resume();
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // Try AudioWorklet first (modern browsers, better performance)
      try {
        await this.audioContext.audioWorklet.addModule('/src/utils/audio-processor.worklet.ts');
        this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-recorder-processor');
        
        this.workletNode.port.onmessage = (event) => {
          this.onAudioData(new Float32Array(event.data));
        };

        this.source.connect(this.workletNode);
        this.workletNode.connect(this.audioContext.destination);
        this.useWorklet = true;
        console.log('✅ Using AudioWorklet (modern, non-blocking)');
      } catch (workletError) {
        // Fallback to ScriptProcessorNode for older browsers
        console.warn('⚠️ AudioWorklet not supported, using ScriptProcessorNode fallback');
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
        
        this.processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          this.onAudioData(new Float32Array(inputData));
        };
        
        this.source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
        this.useWorklet = false;
      }
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping audio recorder...');
    
    try {
      // 1. Desconectar source
      if (this.source) {
        try {
          this.source.disconnect();
          console.log('✅ MediaStreamSource disconnected');
        } catch (error) {
          console.warn('⚠️ Error disconnecting source:', error);
        }
        this.source = null;
      }
      
      // 2. Desconectar e fechar worklet
      if (this.workletNode) {
        try {
          this.workletNode.port.close();
          this.workletNode.disconnect();
          console.log('✅ AudioWorklet disconnected');
        } catch (error) {
          console.warn('⚠️ Error disconnecting worklet:', error);
        }
        this.workletNode = null;
      }
      
      // 3. Desconectar processor (fallback)
      if (this.processor) {
        try {
          this.processor.disconnect();
          console.log('✅ ScriptProcessor disconnected');
        } catch (error) {
          console.warn('⚠️ Error disconnecting processor:', error);
        }
        this.processor = null;
      }
      
      // 4. Parar todas as tracks do MediaStream
      if (this.stream) {
        this.stream.getTracks().forEach((track) => {
          track.stop();
          console.log(`✅ ${track.kind} track stopped`);
        });
        this.stream = null;
      }
      
      // 5. Fechar AudioContext com await
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        console.log('✅ AudioContext closed');
        this.audioContext = null;
      }
      
      console.log('✅ Audio recorder stopped and cleaned up completely');
    } catch (error) {
      console.error('❌ Error stopping recorder:', error);
      throw error;
    }
  }
}

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
};

/**
 * Converte PCM16 (Uint8Array) para Float32Array normalizado (-1.0 a 1.0)
 * Usado para reprodução direta sem conversão para WAV
 */
export const pcm16ToFloat32 = (pcm16Data: Uint8Array): Float32Array => {
  const samples = pcm16Data.length / 2; // 2 bytes por sample (16-bit)
  const float32Array = new Float32Array(samples);
  
  for (let i = 0; i < samples; i++) {
    // Ler 16-bit little-endian signed integer
    const int16 = (pcm16Data[i * 2 + 1] << 8) | pcm16Data[i * 2];
    // Converter signed 16-bit para signed (two's complement)
    const signedInt16 = int16 > 0x7FFF ? int16 - 0x10000 : int16;
    // Normalizar para -1.0 a 1.0
    float32Array[i] = signedInt16 / 0x8000;
  }
  
  return float32Array;
};

export const createWavFromPCM = (pcmData: Uint8Array): Uint8Array => {
  const int16Data = new Int16Array(pcmData.length / 2);
  for (let i = 0; i < pcmData.length; i += 2) {
    int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + int16Data.byteLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, int16Data.byteLength, true);

  const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
  wavArray.set(new Uint8Array(wavHeader), 0);
  wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);

  return wavArray;
};

export interface AudioQueueOptions {
  sampleRate?: number;
  bufferSize?: number;
  latencyHint?: AudioContextLatencyCategory;
  enableMetrics?: boolean;
}

export interface AudioQueueMetrics {
  chunksPlayed: number;
  totalLatency: number;
  gaps: number;
  errors: number;
  avgDecodeTime: number;
}

export class AudioQueue {
  private audioContext: AudioContext;
  private nextStartTime: number = 0;
  private readonly SAMPLE_RATE: number;
  private isPlaying: boolean = false;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private options: AudioQueueOptions;
  private metrics: AudioQueueMetrics = {
    chunksPlayed: 0,
    totalLatency: 0,
    gaps: 0,
    errors: 0,
    avgDecodeTime: 0,
  };

  constructor(audioContext: AudioContext, options?: AudioQueueOptions) {
    this.audioContext = audioContext;
    this.options = {
      sampleRate: options?.sampleRate || 24000,
      bufferSize: options?.bufferSize || 4096,
      latencyHint: options?.latencyHint || 'interactive',
      enableMetrics: options?.enableMetrics ?? false, // Default disabled for backward compatibility
    };
    this.SAMPLE_RATE = this.options.sampleRate!;
    
    if (this.options.enableMetrics) {
      console.log('[AudioQueue] Initialized with options:', this.options);
    } else {
      console.log('🎵 AudioQueue initialized with streaming scheduling');
    }
  }

  /**
   * Adiciona chunk de áudio para reprodução imediata em streaming
   * Aceita Uint8Array (PCM16) ou Float32Array
   */
  async addToQueue(audioData: Uint8Array | Float32Array): Promise<void> {
    const startTime = performance.now();
    
    if (!this.audioContext || this.audioContext.state === 'closed') {
      console.error('❌ AudioContext is closed');
      this.metrics.errors++;
      return;
    }

    // Retomar contexto se suspenso (Safari/iOS)
    if (this.audioContext.state === 'suspended') {
      console.warn('⚠️ AudioContext suspended, resuming...');
      await this.audioContext.resume();
    }

    try {
      // Converter PCM16 (Uint8Array) para Float32Array se necessário
      let float32Data: Float32Array;
      if (audioData instanceof Uint8Array) {
        float32Data = pcm16ToFloat32(audioData);
      } else {
        float32Data = audioData;
      }

      // Criar buffer de áudio diretamente dos dados
      const audioBuffer = this.audioContext.createBuffer(
        1, // mono
        float32Data.length,
        this.SAMPLE_RATE
      );
      
      // Copiar dados para o buffer
      audioBuffer.getChannelData(0).set(float32Data);

      // Criar source node
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      // Rastrear source ativo
      this.activeSources.add(source);

      // Calcular quando iniciar este chunk (streaming scheduling)
      const currentTime = this.audioContext.currentTime;
      const safetyBuffer = this.options.enableMetrics ? 0.05 : 0; // 50ms safety buffer if metrics enabled
      const startTime = Math.max(currentTime + safetyBuffer, this.nextStartTime);

      // Check for gaps
      if (this.nextStartTime > 0 && startTime > currentTime && this.options.enableMetrics) {
        const gap = startTime - currentTime;
        if (gap > 0.1) { // Gap > 100ms
          this.metrics.gaps++;
          console.warn('[AudioQueue] Large gap detected:', gap.toFixed(3), 's');
        }
      }

      // Reproduzir chunk
      source.start(startTime);
      
      // Atualizar próximo tempo de início (sem gaps)
      this.nextStartTime = startTime + audioBuffer.duration;

      const processingTime = performance.now() - startTime;
      
      // Update metrics
      if (this.options.enableMetrics) {
        this.metrics.avgDecodeTime = 
          (this.metrics.avgDecodeTime * this.metrics.chunksPlayed + processingTime) / 
          (this.metrics.chunksPlayed + 1);
        
        console.log('[AudioQueue] Chunk playing', {
          duration: `${audioBuffer.duration.toFixed(3)}s`,
          startTime: `${startTime.toFixed(3)}s`,
          currentTime: `${currentTime.toFixed(3)}s`,
          gap: `${(startTime - currentTime).toFixed(3)}s`,
          nextStart: `${this.nextStartTime.toFixed(3)}s`,
          processingTime: `${processingTime.toFixed(2)}ms`,
        });
      }

      // Log apenas do primeiro chunk se metrics disabled
      if (!this.isPlaying && !this.options.enableMetrics) {
        console.log('🎵 Audio streaming started');
      }
      this.isPlaying = true;

      // Limpar source após reprodução
      source.onended = () => {
        source.disconnect();
        this.activeSources.delete(source);
        this.metrics.chunksPlayed++;
      };

    } catch (error) {
      console.error('❌ Error playing audio chunk:', error);
      this.metrics.errors++;
      
      // Auto-recovery: reset timing if too many errors
      if (this.metrics.errors > 5) {
        console.warn('[AudioQueue] Too many errors, resetting timing');
        this.nextStartTime = 0;
      }
    }
  }

  /**
   * Para toda reprodução e limpa recursos
   */
  async destroy(): Promise<void> {
    if (this.options.enableMetrics) {
      console.log('[AudioQueue] Destroying... Final metrics:', this.metrics);
    } else {
      console.log('🛑 Stopping audio queue...');
    }
    
    // Parar todos os sources ativos
    this.activeSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source pode já ter terminado
      }
    });
    this.activeSources.clear();
    
    // Resetar estado
    this.nextStartTime = 0;
    this.isPlaying = false;
    this.metrics = {
      chunksPlayed: 0,
      totalLatency: 0,
      gaps: 0,
      errors: 0,
      avgDecodeTime: 0,
    };
    
    // Fechar AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      console.log('✅ AudioContext closed');
    }
    
    console.log('✅ Audio queue destroyed');
  }

  /**
   * Retorna estado do AudioContext
   */
  getState(): AudioContextState {
    return this.audioContext?.state || 'closed';
  }

  /**
   * Retorna métricas de performance
   */
  getMetrics(): AudioQueueMetrics {
    return { ...this.metrics };
  }

  /**
   * Retorna número de chunks na fila de reprodução
   */
  getQueueLength(): number {
    return this.activeSources.size;
  }

  /**
   * Legacy: manter compatibilidade com código existente
   */
  clear(): void {
    console.warn('⚠️ clear() is deprecated, use destroy() instead');
    this.activeSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Ignorar
      }
    });
    this.activeSources.clear();
    this.nextStartTime = 0;
    this.isPlaying = false;
  }

  /**
   * Legacy: manter compatibilidade com monitoramento
   */
  monitorAudioContext(onSuspended: () => void): void {
    setInterval(() => {
      if (this.audioContext.state === 'suspended') {
        console.warn('⚠️ AudioContext suspended detected by monitor');
        onSuspended();
        this.audioContext.resume();
      }
    }, 2000);
  }
}
