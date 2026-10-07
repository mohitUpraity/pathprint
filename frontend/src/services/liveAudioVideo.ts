/**
 * Live Multimodal Audio & Video Streaming Engine for Gemini Live API
 * Handles 16kHz Mono PCM Mic Recording using AudioWorklet (Zero Deprecation),
 * 1 FPS Video Frame Capture, and 24kHz PCM Playback.
 */

// Converts Float32Array to 16-bit PCM ArrayBuffer
function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

// Converts ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Converts Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Inline AudioWorklet Processor Script Code
const WORKLET_PROCESSOR_CODE = `
class PCMRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channelData = input[0];

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];
      if (this.bufferIndex >= this.bufferSize) {
        this.port.postMessage(this.buffer.slice(0, this.bufferSize));
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-recorder-processor', PCMRecorderProcessor);
`;

export class LiveAudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private legacyProcessor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onChunkCallback: ((base64Pcm: string) => void) | null = null;
  private onVolumeCallback: ((vol: number) => void) | null = null;
  public isRecording = false;

  async start(
    stream: MediaStream,
    onChunk: (base64Pcm: string) => void,
    onVolume?: (vol: number) => void
  ) {
    this.mediaStream = stream;
    this.onChunkCallback = onChunk;
    this.onVolumeCallback = onVolume || null;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume().catch(() => {});
    }

    this.source = this.audioContext.createMediaStreamSource(stream);

    // Prefer modern AudioWorkletNode to eliminate deprecation
    try {
      if (this.audioContext.audioWorklet) {
        const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        await this.audioContext.audioWorklet.addModule(workletUrl);
        URL.revokeObjectURL(workletUrl);

        this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-recorder-processor');
        this.workletNode.port.onmessage = (event) => {
          if (!this.isRecording) return;
          const float32Data: Float32Array = event.data;

          // Compute Volume RMS
          if (this.onVolumeCallback) {
            let sum = 0;
            for (let i = 0; i < float32Data.length; i++) {
              sum += float32Data[i] * float32Data[i];
            }
            const rms = Math.sqrt(sum / float32Data.length);
            this.onVolumeCallback(Math.min(100, Math.round(rms * 250)));
          }

          const pcm16 = floatTo16BitPCM(float32Data);
          const b64 = arrayBufferToBase64(pcm16);
          if (this.onChunkCallback) {
            this.onChunkCallback(b64);
          }
        };

        this.source.connect(this.workletNode);
        this.workletNode.connect(this.audioContext.destination);
        this.isRecording = true;
        return;
      }
    } catch (e) {
      console.warn('AudioWorklet initialization fallback to ScriptProcessor:', e);
    }

    // Fallback if AudioWorklet fails in certain web environments
    this.legacyProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.legacyProcessor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);

      if (this.onVolumeCallback) {
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.onVolumeCallback(Math.min(100, Math.round(rms * 250)));
      }

      const pcm16 = floatTo16BitPCM(inputData);
      const b64 = arrayBufferToBase64(pcm16);
      if (this.onChunkCallback) {
        this.onChunkCallback(b64);
      }
    };

    this.source.connect(this.legacyProcessor);
    this.legacyProcessor.connect(this.audioContext.destination);
    this.isRecording = true;
  }

  stop() {
    this.isRecording = false;
    if (this.workletNode && this.source) {
      try {
        this.workletNode.disconnect();
        this.source.disconnect();
      } catch (_) {}
    }
    if (this.legacyProcessor && this.source) {
      try {
        this.legacyProcessor.disconnect();
        this.source.disconnect();
      } catch (_) {}
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}

export class LiveAudioPlayer {
  private audioContext: AudioContext | null = null;
  private scheduledTime = 0;

  constructor() {
    this.initContext();
  }

  private initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  public playChunk(base64Pcm: string, sampleRate = 24000) {
    this.initContext();
    if (!this.audioContext) return;

    const arrayBuf = base64ToArrayBuffer(base64Pcm);
    const int16View = new Int16Array(arrayBuf);
    const float32Array = new Float32Array(int16View.length);

    for (let i = 0; i < int16View.length; i++) {
      float32Array[i] = int16View[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    if (this.scheduledTime < now) {
      this.scheduledTime = now + 0.05;
    }

    source.start(this.scheduledTime);
    this.scheduledTime += audioBuffer.duration;
  }

  public stop() {
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.scheduledTime = 0;
  }
}

export class LiveVideoSampler {
  private timer: any = null;

  start(
    videoElement: HTMLVideoElement,
    fps = 1,
    onFrame: (jpegBase64: string) => void
  ) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const intervalMs = Math.round(1000 / fps);

    this.timer = setInterval(() => {
      if (!videoElement || videoElement.readyState < 2 || !ctx) return;
      
      const width = videoElement.videoWidth || 640;
      const height = videoElement.videoHeight || 480;
      const targetWidth = 480;
      const targetHeight = Math.round((height / width) * targetWidth);

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
      const base64Jpeg = dataUrl.split(',')[1];
      if (base64Jpeg) {
        onFrame(base64Jpeg);
      }
    }, intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
