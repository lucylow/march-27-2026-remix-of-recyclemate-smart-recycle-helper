import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Scan, Loader2 } from "lucide-react";
import { runInference } from "@/services/tflite";
import type { DetectedItem } from "@/context/UserContext";

interface ScannerViewProps {
  onDetection: (items: DetectedItem[]) => void;
}

const brandSpring = { type: "spring" as const, stiffness: 500, damping: 30, mass: 1 };

const ScannerView = ({ onDetection }: ScannerViewProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [detections, setDetections] = useState<DetectedItem[]>([]);
  const [showPulse, setShowPulse] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch {
      // Camera not available — use mock mode
      setCameraActive(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setDetections([]);

    const results = await runInference();
    setDetections(results);
    setShowPulse(true);
    setTimeout(() => setShowPulse(false), 400);
    setIsScanning(false);

    // Auto-navigate to results after brief display
    setTimeout(() => onDetection(results), 1200);
  };

  return (
    <div className="relative flex-1 flex flex-col bg-foreground overflow-hidden rounded-3xl">
      {/* Viewfinder */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Scanning overlay */}
            <div className="absolute inset-4 border border-background/20 rounded-2xl" />

            {/* Bounding boxes */}
            <AnimatePresence>
              {detections.map((det, i) => (
                <motion.div
                  key={`${det.label}-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    scale: showPulse ? 1.05 : 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={brandSpring}
                  className="absolute border-2 border-primary rounded-lg"
                  style={{
                    left: `${det.bbox[0] * 100}%`,
                    top: `${det.bbox[1] * 100}%`,
                    width: `${det.bbox[2] * 100}%`,
                    height: `${det.bbox[3] * 100}%`,
                  }}
                >
                  <span className="absolute -top-6 left-0 font-mono text-[10px] tracking-wider text-primary bg-foreground/80 px-2 py-0.5 rounded-md uppercase">
                    {det.displayName} — {(det.confidence * 100).toFixed(1)}%
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Scanning line animation */}
            {isScanning && (
              <motion.div
                className="absolute left-4 right-4 h-0.5 bg-primary/60"
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-background/60">
            <Camera className="w-16 h-16" />
            <p className="text-label text-background/40">Camera Inactive</p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative flex items-center justify-center py-6 px-6">
        {!cameraActive ? (
          <button
            onClick={startCamera}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-medium active-press"
          >
            Enable Camera
          </button>
        ) : (
          <div className="flex items-center gap-6">
            <button
              onClick={stopCamera}
              className="w-12 h-12 rounded-xl bg-background/10 flex items-center justify-center active-press"
            >
              <Camera className="w-5 h-5 text-background/60" />
            </button>

            {/* Shutter button */}
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="w-20 h-20 rounded-full bg-primary flex items-center justify-center active-press shadow-elevated disabled:opacity-50"
            >
              {isScanning ? (
                <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
              ) : (
                <Scan className="w-8 h-8 text-primary-foreground" />
              )}
            </button>

            <div className="w-12 h-12" /> {/* Spacer for symmetry */}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerView;
