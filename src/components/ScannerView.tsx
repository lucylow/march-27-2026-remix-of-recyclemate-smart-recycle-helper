import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Scan, Loader2, ImagePlus, Flashlight, FlashlightOff, X } from "lucide-react";
import { runInference } from "@/services/tflite";
import type { DetectedItem } from "@/context/UserContext";
import { toast } from "sonner";

interface ScannerViewProps {
  onDetection: (items: DetectedItem[]) => void;
}

const brandSpring = { type: "spring" as const, stiffness: 500, damping: 30, mass: 1 };

const ScannerView = ({ onDetection }: ScannerViewProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [detections, setDetections] = useState<DetectedItem[]>([]);
  const [showPulse, setShowPulse] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setCameraActive(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      try {
        await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(!torchOn);
      } catch {
        toast.error("Torch not available on this device");
      }
    }
  }, [torchOn]);

  const handleViewfinderTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cameraActive) return;
    const rect = viewfinderRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusPoint({ x, y });
    setTimeout(() => setFocusPoint(null), 1000);
  };

  const handleGalleryUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    toast.info("Analyzing image...");
    try {
      const results = await runInference();
      setDetections(results);
      toast.success(`Found ${results.length} item${results.length > 1 ? "s" : ""}`);
      setTimeout(() => onDetection(results), 800);
    } catch (err) {
      console.error("Gallery inference error:", err);
      toast.error("Failed to analyze image. Please try again.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setDetections([]);
    setScanCount(prev => prev + 1);

    try {
      const results = await runInference();
      setDetections(results);
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 400);
      toast.success(`Detected: ${results.map(r => r.displayName).join(", ")}`);
      setTimeout(() => onDetection(results), 1200);
    } catch (err) {
      console.error("Scan inference error:", err);
      toast.error("Scan failed. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col bg-foreground overflow-hidden rounded-3xl">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Viewfinder */}
      <div
        ref={viewfinderRef}
        className="relative flex-1 flex items-center justify-center overflow-hidden"
        onClick={handleViewfinderTap}
      >
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Corner brackets */}
            <div className="absolute inset-6 pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/80 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/80 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/80 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/80 rounded-br-lg" />
            </div>

            {/* Focus indicator */}
            <AnimatePresence>
              {focusPoint && (
                <motion.div
                  key="focus"
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute w-16 h-16 border-2 border-primary/80 rounded-xl pointer-events-none"
                  style={{ left: focusPoint.x - 32, top: focusPoint.y - 32 }}
                />
              )}
            </AnimatePresence>

            {/* Bounding boxes */}
            <AnimatePresence>
              {detections.map((det, i) => (
                <motion.div
                  key={`${det.label}-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: showPulse ? 1.05 : 1 }}
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

            {/* Scanning line */}
            {isScanning && (
              <motion.div
                className="absolute left-6 right-6 h-0.5 bg-primary/60 rounded-full"
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            {/* Top toolbar */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <button
                onClick={toggleTorch}
                className="w-10 h-10 rounded-xl bg-foreground/40 backdrop-blur-sm flex items-center justify-center active-press"
              >
                {torchOn ? (
                  <Flashlight className="w-4 h-4 text-warning" />
                ) : (
                  <FlashlightOff className="w-4 h-4 text-background/70" />
                )}
              </button>
              <div className="px-3 py-1.5 rounded-lg bg-foreground/40 backdrop-blur-sm">
                <span className="font-mono text-[10px] text-background/70 tracking-wider">
                  {scanCount > 0 ? `${scanCount} SCANS` : "READY"}
                </span>
              </div>
              <button
                onClick={handleGalleryUpload}
                className="w-10 h-10 rounded-xl bg-foreground/40 backdrop-blur-sm flex items-center justify-center active-press"
              >
                <ImagePlus className="w-4 h-4 text-background/70" />
              </button>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 text-background/60"
          >
            <div className="w-24 h-24 rounded-3xl bg-background/5 flex items-center justify-center">
              <Camera className="w-12 h-12" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-background/50 mb-1">Camera Inactive</p>
              <p className="text-xs text-background/30">Enable camera or upload an image</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative flex items-center justify-center py-6 px-6">
        {!cameraActive ? (
          <div className="flex items-center gap-4">
            <button
              onClick={startCamera}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-medium active-press"
            >
              Enable Camera
            </button>
            <button
              onClick={handleGalleryUpload}
              className="w-14 h-14 rounded-2xl bg-background/10 flex items-center justify-center active-press"
            >
              <ImagePlus className="w-5 h-5 text-background/60" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <button
              onClick={stopCamera}
              className="w-12 h-12 rounded-xl bg-background/10 flex items-center justify-center active-press"
            >
              <X className="w-5 h-5 text-background/60" />
            </button>

            {/* Shutter button */}
            <motion.button
              onClick={handleScan}
              disabled={isScanning}
              whileTap={{ scale: 0.9 }}
              className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-elevated disabled:opacity-50 relative"
            >
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-[3px] border-background/20" />
              {isScanning ? (
                <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
              ) : (
                <Scan className="w-8 h-8 text-primary-foreground" />
              )}
            </motion.button>

            <button
              onClick={handleGalleryUpload}
              className="w-12 h-12 rounded-xl bg-background/10 flex items-center justify-center active-press"
            >
              <ImagePlus className="w-5 h-5 text-background/60" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerView;
