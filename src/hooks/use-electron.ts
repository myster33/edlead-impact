import { useEffect, useState } from 'react';

interface ElectronAPI {
  platform: string;
  getVersion: () => Promise<string>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  checkForUpdates: () => void;
  installUpdate: () => void;
  onUpdateAvailable: (callback: (info: { version: string }) => void) => void;
  onDownloadProgress: (callback: (progress: { percent: number }) => void) => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => void;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export const useElectron = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (electronAPI?.isElectron) {
      setIsElectron(true);
      electronAPI.getVersion().then(setAppVersion);
    }
  }, []);

  return {
    isElectron,
    appVersion,
    electronAPI: window.electronAPI,
  };
};

export const isRunningInElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
};
