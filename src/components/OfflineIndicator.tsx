import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const OfflineIndicator = () => {
  const { isOnline, wasOffline } = useOnlineStatus();

  const showBanner = !isOnline || wasOffline;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-1.5 text-xs font-medium ${
            isOnline
              ? 'bg-success text-success-foreground'
              : 'bg-destructive text-destructive-foreground'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              Back online — all data saved locally
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              You're offline — data is saved locally
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
