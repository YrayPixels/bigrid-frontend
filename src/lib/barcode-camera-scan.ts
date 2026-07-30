type BarcodeDetectorFormat =
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "code_128"
  | "code_39"
  | "code_93"
  | "codabar"
  | "itf"
  | "qr_code"
  | "data_matrix"
  | "pdf417"
  | "aztec";

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorCtor = new (options?: {
  formats?: BarcodeDetectorFormat[];
}) => BarcodeDetectorInstance;

const PRODUCT_FORMATS: BarcodeDetectorFormat[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "itf",
  "qr_code",
  "data_matrix",
];

export type BarcodeScanControls = {
  stop: () => void;
  stream: MediaStream;
};

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const Detector = (
    window as Window & { BarcodeDetector?: BarcodeDetectorCtor }
  ).BarcodeDetector;
  return Detector ?? null;
}

async function openCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera is not available in this browser");
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
  } catch {
    // Laptops / some browsers reject facingMode — fall back to any camera.
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });
  }
}

async function playPreview(
  video: HTMLVideoElement,
  stream: MediaStream,
  cancelled: () => boolean,
): Promise<void> {
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.muted = true;
  video.autoplay = true;
  video.srcObject = stream;

  const tryPlay = () => video.play().catch(() => undefined);
  void tryPlay();

  if (video.readyState >= 2 && video.videoWidth > 0) {
    await tryPlay();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.clearInterval(cancelPoll);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("playing", onReady);
      video.removeEventListener("canplay", onReady);
      if (error) reject(error);
      else resolve();
    };

    const onReady = () => {
      if (video.videoWidth > 0) {
        void tryPlay();
        finish();
      }
    };

    const timeout = window.setTimeout(() => {
      // If frames are flowing even without metadata event, continue.
      if (video.readyState >= 2 || (video.srcObject && !cancelled())) {
        void tryPlay();
        finish();
        return;
      }
      finish(new Error("Camera preview timed out"));
    }, 10000);

    const cancelPoll = window.setInterval(() => {
      if (cancelled()) {
        finish(new Error("Cancelled"));
      }
    }, 100);

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("playing", onReady);
    video.addEventListener("canplay", onReady);
    void tryPlay();
  });
}

function drawScanCrop(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): void {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw <= 0 || vh <= 0) return;

  const cropW = Math.floor(vw * 0.84);
  const cropH = Math.floor(Math.min(vh * 0.42, cropW * 0.45));
  const sx = Math.floor((vw - cropW) / 2);
  const sy = Math.floor((vh - cropH) / 2);

  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
}

async function startNativeDetector(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
  cancelled: () => boolean,
): Promise<{ stop: () => void } | null> {
  const Detector = getBarcodeDetector();
  if (!Detector) return null;

  let formats = PRODUCT_FORMATS;
  try {
    const supported =
      typeof (
        Detector as BarcodeDetectorCtor & {
          getSupportedFormats?: () => Promise<BarcodeDetectorFormat[]>;
        }
      ).getSupportedFormats === "function"
        ? await (
            Detector as BarcodeDetectorCtor & {
              getSupportedFormats: () => Promise<BarcodeDetectorFormat[]>;
            }
          ).getSupportedFormats()
        : PRODUCT_FORMATS;
    formats = PRODUCT_FORMATS.filter((format) => supported.includes(format));
    if (formats.length === 0) formats = supported.slice(0, 12);
  } catch {
    // Use defaults.
  }

  let detector: BarcodeDetectorInstance;
  try {
    detector = new Detector({ formats });
  } catch {
    return null;
  }

  const canvas = document.createElement("canvas");
  let stopped = false;
  let timer: number | null = null;
  let inflight = false;

  const tick = async () => {
    if (stopped || cancelled()) return;
    if (!inflight && video.readyState >= 2 && video.videoWidth > 0) {
      inflight = true;
      try {
        drawScanCrop(video, canvas);
        if (canvas.width > 0) {
          const codes = await detector.detect(canvas);
          const value = codes[0]?.rawValue?.trim();
          if (value && !stopped && !cancelled()) onCode(value);
        }
      } catch {
        // Frame decode failures are expected; keep scanning.
      } finally {
        inflight = false;
      }
    }
    if (!stopped && !cancelled()) {
      timer = window.setTimeout(() => {
        void tick();
      }, 120);
    }
  };

  void tick();

  return {
    stop: () => {
      stopped = true;
      if (timer !== null) window.clearTimeout(timer);
    },
  };
}

async function startZxingScanner(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
  cancelled: () => boolean,
): Promise<{ stop: () => void }> {
  const { BrowserMultiFormatReader, BarcodeFormat } = await import("@zxing/browser");
  if (cancelled()) return { stop: () => undefined };

  const hints = new Map();
  const reader = new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 80,
    delayBetweenScanSuccess: 1000,
  });
  reader.possibleFormats = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODABAR,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
  ];

  const canvas = document.createElement("canvas");
  let stopped = false;
  let timer: number | null = null;

  const tick = () => {
    if (stopped || cancelled()) return;
    if (video.readyState >= 2 && video.videoWidth > 0) {
      try {
        drawScanCrop(video, canvas);
        if (canvas.width > 0) {
          const result = reader.decodeFromCanvas(canvas);
          const text = result.getText()?.trim();
          if (text && !stopped && !cancelled()) onCode(text);
        }
      } catch {
        // NotFound / checksum errors are normal between frames.
      }
    }
    if (!stopped && !cancelled()) {
      timer = window.setTimeout(tick, 120);
    }
  };

  tick();

  return {
    stop: () => {
      stopped = true;
      if (timer !== null) window.clearTimeout(timer);
    },
  };
}

export async function waitForVideoElement(
  getVideo: () => HTMLVideoElement | null,
  cancelled: () => boolean,
  attempts = 30,
): Promise<HTMLVideoElement> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const video = getVideo();
    if (video?.isConnected) return video;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    if (cancelled()) throw new Error("Cancelled");
  }
  throw new Error("Camera preview is not ready");
}

/**
 * Opens the camera on `video`, continuously scans for product barcodes /
 * QR codes, and invokes `onCode` for each decode. Prefers the native
 * BarcodeDetector API when available (Chrome/Edge), otherwise ZXing.
 *
 * `onStream` is called as soon as the MediaStream is acquired so callers can
 * keep a ref for cleanup even if this function is still awaiting play/decode setup.
 */
export async function startBarcodeCameraScan(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
  options?: {
    cancelled?: () => boolean;
    onStream?: (stream: MediaStream) => void;
  },
): Promise<BarcodeScanControls> {
  const cancelled = options?.cancelled ?? (() => false);

  const stream = await openCameraStream();
  options?.onStream?.(stream);

  if (cancelled()) {
    stream.getTracks().forEach((track) => track.stop());
    return { stop: () => undefined, stream };
  }

  try {
    await playPreview(video, stream, cancelled);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    if (video.srcObject === stream) video.srcObject = null;
    throw error;
  }

  if (cancelled()) {
    stream.getTracks().forEach((track) => track.stop());
    if (video.srcObject === stream) video.srcObject = null;
    return { stop: () => undefined, stream };
  }

  const native = await startNativeDetector(video, onCode, cancelled);
  const decodeControls =
    native ?? (await startZxingScanner(video, onCode, cancelled));

  let stopped = false;
  return {
    stream,
    stop: () => {
      if (stopped) return;
      stopped = true;
      decodeControls.stop();
      stream.getTracks().forEach((track) => track.stop());
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    },
  };
}
