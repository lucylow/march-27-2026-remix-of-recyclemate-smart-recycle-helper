import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { onConnectivityChange, isOnline } from "@/services/resilience";

/**
 * Shows a toast when the user goes offline/online.
 * Render once near the app root.
 */
const ConnectivityToast = () => {
  const wasOffline = useRef(!isOnline());

  useEffect(() => {
    const unsub = onConnectivityChange((online) => {
      if (!online) {
        toast.warning("You're offline — using cached results", { duration: 5000, id: "connectivity" });
        wasOffline.current = true;
      } else if (wasOffline.current) {
        toast.success("Back online!", { duration: 3000, id: "connectivity" });
        wasOffline.current = false;
      }
    });
    return unsub;
  }, []);

  return null;
};

export default ConnectivityToast;
