import { useState, useEffect } from "react";
import { useElectron } from "@/hooks/use-electron";
import { Button } from "@/components/ui/button";
import { X, Download, RefreshCw } from "lucide-react";

interface UpdateInfo {
  version: string;
}

interface DownloadProgress {
  percent: number;
}

export function UpdateNotificationBanner() {
  const { isElectron, electronAPI } = useElectron();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isElectron || !electronAPI) return;

    // Listen for update events
    electronAPI.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateAvailable(true);
      setNewVersion(info.version);
      setIsDismissed(false);
    });

    electronAPI.onDownloadProgress((progress: DownloadProgress) => {
      setDownloadProgress(progress.percent);
    });

    electronAPI.onUpdateDownloaded((info: UpdateInfo) => {
      setUpdateDownloaded(true);
      setDownloadProgress(null);
      setNewVersion(info.version);
      setIsDismissed(false);
    });
  }, [isElectron, electronAPI]);

  const handleRestart = () => {
    if (electronAPI) {
      electronAPI.installUpdate();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Don't show if not in Electron, no update, or dismissed
  if (!isElectron || (!updateAvailable && !updateDownloaded) || isDismissed) {
    return null;
  }

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {updateDownloaded ? (
          <RefreshCw className="h-4 w-4 flex-shrink-0" />
        ) : (
          <Download className="h-4 w-4 flex-shrink-0" />
        )}
        
        <span className="text-sm font-medium truncate">
          {updateDownloaded ? (
            <>
              Version {newVersion} is ready to install!
            </>
          ) : downloadProgress !== null ? (
            <>
              Downloading update {newVersion}... {downloadProgress.toFixed(0)}%
            </>
          ) : (
            <>
              A new version {newVersion} is available
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {updateDownloaded && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRestart}
            className="h-7 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Restart Now
          </Button>
        )}
        
        <Button
          size="icon"
          variant="ghost"
          onClick={handleDismiss}
          className="h-7 w-7 hover:bg-primary-foreground/10"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  );
}
