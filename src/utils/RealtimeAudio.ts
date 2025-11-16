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

  stop() {
    try {
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }
    } catch (error) {
      console.error("Error disconnecting source:", error);
    }
    
    try {
      if (this.workletNode) {
        this.workletNode.disconnect();
        this.workletNode.port.close();
        this.workletNode = null;
      }
    } catch (error) {
      console.error("Error disconnecting worklet:", error);
    }
    
    try {
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }
    } catch (error) {
      console.error("Error disconnecting processor:", error);
    }
    
    try {
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
    } catch (error) {
      console.error("Error stopping stream:", error);
    }
    
    try {
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }
    } catch (error) {
      console.error("Error closing audio context:", error);
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

export class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async addToQueue(audioData: Uint8Array) {
    if (this.isPlaying && this.queue.length > 5) {
      console.warn("⚠️ Audio queue is backing up - multiple audio sources may be active!");
    }
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      // ✅ Check and resume AudioContext if suspended
      if (this.audioContext.state === 'suspended') {
        console.warn('⚠️ AudioContext suspended, resuming...');
        await this.audioContext.resume();
        console.log('✅ AudioContext resumed successfully');
      }

      // Verify state after resuming
      if (this.audioContext.state !== 'running') {
        throw new Error(`AudioContext in invalid state: ${this.audioContext.state}`);
      }

      const wavData = createWavFromPCM(audioData);
      const arrayBuffer = new ArrayBuffer(wavData.buffer.byteLength);
      new Uint8Array(arrayBuffer).set(new Uint8Array(wavData.buffer));
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error("❌ Error playing audio:", error);
      
      // ✅ Attempt to recover AudioContext
      if (this.audioContext.state === 'suspended') {
        console.log('🔄 Attempting to recover suspended AudioContext...');
        try {
          await this.audioContext.resume();
          // Re-add chunk to queue to retry
          this.queue.unshift(audioData);
        } catch (resumeError) {
          console.error('❌ Failed to resume AudioContext:', resumeError);
        }
      }
      
      this.playNext();
    }
  }

  // Monitor AudioContext state continuously
  public monitorAudioContext(onSuspended: () => void) {
    setInterval(() => {
      if (this.audioContext.state === 'suspended') {
        console.warn('⚠️ AudioContext suspended detected by monitor');
        onSuspended();
        this.audioContext.resume();
      }
    }, 2000); // Check every 2 seconds
  }

  clear() {
    this.queue = [];
  }
}
