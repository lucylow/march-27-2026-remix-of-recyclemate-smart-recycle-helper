import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Scan, Loader2, ImagePlus, Flashlight, FlashlightOff, X, Eye, Zap, ScanLine, ChevronUp } from "lucide-react";
import { runInference, captureFrame, fileToBase64 } from "@/services/tflite";
import type { DetectedItem } from "@/context/UserContext";
import { toast } from "sonner";

interface ScannerViewProps {
  onDetection: (items: DetectedItem[]) => void;
}

const brandSpring = { type: "spring" as const, stiffness: 500, damping: 30, mass: 1 };

const BIN_LABEL_COLORS: Record<string, string> = {
  plastic_bottle: "bg-blue-500/80",
  aluminum_can: "bg-slate-400/80",
  cardboard: "bg-amber-600/80",
  glass_bottle: "bg-emerald-500/80",
  newspaper: "bg-gray-500/80",
  food_waste: "bg-green-600/80",
  battery: "bg-red-500/80",
  electronic_waste: "bg-purple-500/80",
  styrofoam: "bg-orange-500/80",
};

const ScannerView = ({ onDetection }: ScannerViewProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [detections, setDetections] = useState<DetectedItem[]>([]);
  const [showPulse, setShowPulse] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [aiMode, setAiMode] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setShowHint(true);
        setTimeout(() => setShowHint(false), 4000);
      }
    } catch {
      toast.error("Camera access denied. You can still upload images.");
      setCameraActive(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setTorchOn(false);
    setPreviewImage(null);
    setDetections([]);
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
    setShowHint(false);
    setTimeout(() => setFocusPoint(null), 1000);
  };

  const handleGalleryUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    setDetections([]);

    try {
      const base64 = await fileToBase64(file);
      setPreviewImage(base64);
      setCameraActive(true);

      const results = await runInference(aiMode ? base64 : undefined);
      setDetections(results);

      if (results.length === 0) {
        toast.info("No waste items detected. Try a clearer image.");
      } else {
        toast.success(`Found ${results.length} item${results.length > 1 ? "s" : ""}!`);
        setTimeout(() => onDetection(results), 1500);
      }
    } catch (err: any) {
      console.error("Gallery inference error:", err);
      toast.error(err.message || "Failed to analyze image. Please try again.");
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
    setShowHint(false);

    try {
      let imageData: string | undefined;

      if (aiMode && videoRef.current && streamRef.current) {
        const frame = captureFrame(videoRef.current);
        if (frame) {
          imageData = frame;
          setPreviewImage(frame);
        }
      }

      const results = await runInference(imageData);

      setDetections(results);
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 400);

      if (results.length === 0) {
        toast.info("No items detected. Try pointing at a recyclable item.");
      } else {
        toast.success(`Detected ${results.length} item${results.length > 1 ? "s" : ""}!`);
        setTimeout(() => onDetection(results), 1500);
      }
    } catch (err: any) {
      console.error("Scan inference error:", err);
      toast.error(err.message || "Scan failed. Please try again.");
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
        capture="environment"
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
            {/* Video feed or uploaded preview */}
            {previewImage && !streamRef.current ? (
              <img src={previewImage} alt="Scanned" className="absolute inset-0 w-full h-full object-contain bg-black" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Vignette overlay for depth */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)"
            }} />

            {/* Corner brackets with glow */}
            <div className="absolute inset-6 pointer-events-none">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-primary rounded-tl-xl" style={{ boxShadow: "inset 4px 4px 8px rgba(var(--primary-rgb, 59 130 246) / 0.2)" }} />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-primary rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-primary rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-primary rounded-br-xl" />
            </div>

            {/* Focus indicator with ripple */}
            <AnimatePresence>
              {focusPoint && (
                <>
                  <motion.div
                    key="focus-ring"
                    initial={{ scale: 1.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute w-16 h-16 border-2 border-primary rounded-xl pointer-events-none"
                    style={{ left: focusPoint.x - 32, top: focusPoint.y - 32 }}
                  />
                  <motion.div
                    key="focus-dot"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute w-16 h-16 border border-primary/40 rounded-xl pointer-events-none"
                    style={{ left: focusPoint.x - 32, top: focusPoint.y - 32 }}
                  />
                </>
              )}
            </AnimatePresence>

            {/* Detection bounding boxes with confidence rings */}
            <AnimatePresence>
              {detections.map((det, i) => {
                const labelColor = BIN_LABEL_COLORS[det.label] || "bg-primary/80";
                const isRecyclable = det.recyclable !== false;
                const borderColor = isRecyclable ? "border-emerald-400" : "border-red-400";
                const glowColor = isRecyclable
                  ? "0 0 12px rgba(52,211,153,0.4), inset 0 0 8px rgba(52,211,153,0.1)"
                  : "0 0 12px rgba(248,113,113,0.4), inset 0 0 8px rgba(248,113,113,0.1)";
                return (
                  <motion.div
                    key={`${det.label}-${i}`}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: showPulse ? 1.03 : 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={brandSpring}
                    className={`absolute border-2 ${borderColor} rounded-xl pointer-events-none`}
                    style={{
                      left: `${det.bbox[0] * 100}%`,
                      top: `${det.bbox[1] * 100}%`,
                      width: `${det.bbox[2] * 100}%`,
                      height: `${det.bbox[3] * 100}%`,
                      boxShadow: glowColor,
                    }}
                  >
                    {/* Glowing corners */}
                    <div className={`absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 ${borderColor} rounded-tl-md`} />
                    <div className={`absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 ${borderColor} rounded-tr-md`} />
                    <div className={`absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 ${borderColor} rounded-bl-md`} />
                    <div className={`absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 ${borderColor} rounded-br-md`} />

                    {/* Label chip with recyclable indicator */}
                    <motion.div
                      initial={{ y: -4, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className={`absolute -top-8 left-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${labelColor} backdrop-blur-md shadow-lg`}
                    >
                      <span className="text-[10px]">{isRecyclable ? "♻️" : "🚫"}</span>
                      <span className="font-semibold text-[11px] text-white whitespace-nowrap leading-none">
                        {det.displayName}
                      </span>
                      <span className="text-[9px] text-white/70 font-mono leading-none">
                        {(det.confidence * 100).toFixed(0)}%
                      </span>
                    </motion.div>

                    {/* Confidence ring in bottom-right corner */}
                    <div className="absolute -bottom-2 -right-2 w-7 h-7">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="14"
                          fill="none"
                          stroke={isRecyclable ? "#34d399" : "#f87171"}
                          strokeWidth="3"
                          strokeDasharray={`${det.confidence * 88} 88`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Live item counter badge */}
            <AnimatePresence>
              {detections.length > 0 && !isScanning && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-2"
                >
                  <span className="text-xs font-bold text-white">{detections.length}</span>
                  <span className="text-[10px] text-white/60 font-mono">ITEMS FOUND</span>
                  {detections.some(d => d.recyclable !== false) && (
                    <span className="text-[10px]">♻️</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scanning animation — horizontal line + shimmer */}
            {isScanning && (
              <>
                <motion.div
                  className="absolute left-6 right-6 h-[2px] rounded-full pointer-events-none"
                  style={{
                    background: "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)",
                  }}
                  animate={{ top: ["8%", "92%", "8%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ opacity: [0, 0.08, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ background: "linear-gradient(180deg, transparent 40%, hsl(var(--primary)) 50%, transparent 60%)" }}
                />
              </>
            )}

            {/* Top toolbar */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <button
                onClick={toggleTorch}
                className="w-11 h-11 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center active-press border border-white/10"
              >
                {torchOn ? (
                  <Flashlight className="w-4 h-4 text-warning" />
                ) : (
                  <FlashlightOff className="w-4 h-4 text-white/60" />
                )}
              </button>

              {/* AI Mode Toggle — pill style */}
              <motion.button
                onClick={() => setAiMode(!aiMode)}
                layout
                className={`px-3.5 py-2 rounded-2xl backdrop-blur-md flex items-center gap-2 transition-all border ${
                  aiMode
                    ? "bg-primary/90 text-white border-primary/50 shadow-lg shadow-primary/20"
                    : "bg-black/40 text-white/60 border-white/10"
                }`}
              >
                {aiMode ? <Eye className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                <span className="font-semibold text-[11px] tracking-wide">
                  {aiMode ? "AI VISION" : "OFFLINE"}
                </span>
              </motion.button>

              <button
                onClick={handleGalleryUpload}
                className="w-11 h-11 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center active-press border border-white/10"
              >
                <ImagePlus className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Hint overlay for new users */}
            <AnimatePresence>
              {showHint && !isScanning && detections.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-x-0 bottom-16 flex justify-center pointer-events-none"
                >
                  <div className="flex flex-col items-center gap-2 px-5 py-3 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10">
                    <ChevronUp className="w-4 h-4 text-white/50 animate-bounce" />
                    <p className="text-[12px] text-white/70 text-center font-medium">
                      Point at a recyclable item & tap <span className="text-primary">Scan</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom status bar */}
            <div className="absolute bottom-2 left-4 right-4 flex items-center justify-center">
              <motion.div
                layout
                className={`px-4 py-1.5 rounded-xl backdrop-blur-md border transition-colors ${
                  isScanning
                    ? "bg-primary/20 border-primary/30"
                    : "bg-black/40 border-white/10"
                }`}
              >
                <span className={`font-mono text-[10px] tracking-widest ${
                  isScanning ? "text-primary" : "text-white/50"
                }`}>
                  {isScanning
                    ? aiMode ? "◉ AI ANALYZING..." : "◉ SCANNING..."
                    : detections.length > 0 ? `✓ ${detections.length} DETECTED`
                    : scanCount > 0 ? `${scanCount} SCANS` : "◉ READY"}
                </span>
              </motion.div>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 text-white/40"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-28 h-28 rounded-[28px] bg-white/5 border border-white/10 flex items-center justify-center"
            >
              <Camera className="w-12 h-12" />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white/50 mb-1">Ready to Scan</p>
              <p className="text-xs text-white/30">Enable camera or upload an image to start</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative flex items-center justify-center py-5 px-6 bg-gradient-to-t from-black/40 to-transparent">
        {!cameraActive ? (
          <div className="flex items-center gap-4">
            <motion.button
              onClick={startCamera}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-semibold active-press shadow-lg shadow-primary/20"
            >
              Enable Camera
            </motion.button>
            <motion.button
              onClick={handleGalleryUpload}
              whileTap={{ scale: 0.95 }}
              className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center active-press"
            >
              <ImagePlus className="w-5 h-5 text-white/50" />
            </motion.button>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <motion.button
              onClick={stopCamera}
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center active-press"
            >
              <X className="w-5 h-5 text-white/50" />
            </motion.button>

            {/* Shutter button — double ring */}
            <motion.button
              onClick={handleScan}
              disabled={isScanning}
              whileTap={{ scale: 0.88 }}
              className="relative w-[76px] h-[76px] rounded-full flex items-center justify-center disabled:opacity-50"
            >
              {/* Outer ring */}
              <div className={`absolute inset-0 rounded-full border-[3px] transition-colors ${
                isScanning ? "border-primary/50" : "border-white/30"
              }`} />
              {/* Inner button */}
              <motion.div
                animate={isScanning ? { scale: [1, 0.92, 1] } : {}}
                transition={isScanning ? { duration: 1, repeat: Infinity } : {}}
                className="w-[62px] h-[62px] rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
              >
                {isScanning ? (
                  <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
                ) : (
                  <ScanLine className="w-7 h-7 text-primary-foreground" />
                )}
              </motion.div>
            </motion.button>

            <motion.button
              onClick={handleGalleryUpload}
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center active-press"
            >
              <ImagePlus className="w-5 h-5 text-white/50" />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerView;
