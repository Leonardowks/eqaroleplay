// Audio worklet processor for replacing ScriptProcessorNode
// More efficient and doesn't block main thread

// Type declarations for AudioWorkletProcessor API
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: typeof AudioWorkletProcessor
): void;

class AudioRecorderProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
    const input = inputs[0];
    
    // Send audio data to main thread if we have input
    if (input && input[0] && input[0].length > 0) {
      // Clone the data to prevent it from being modified
      const audioData = new Float32Array(input[0]);
      this.port.postMessage(audioData);
    }
    
    return true; // Keep processor alive
  }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor);
