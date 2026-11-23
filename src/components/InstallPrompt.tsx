import usePWAInstallPrompt from "@/hooks/usePWAInstallPrompt";
import { X } from "lucide-react";

const InstallPrompt = () => {
  const { isInstallable, triggerInstall, closeInstallPrompt } = usePWAInstallPrompt();

  if (!isInstallable) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-xs border border-sc-line shadow-lg rounded-lg p-4"
      style={{ backgroundColor: '#fff' }}
    >
      <div className="flex justify-between items-start">
        <p className="text-sm text-sc-ink2">Install this app for a better experience!</p>
        <button
          onClick={closeInstallPrompt}
          className="text-sc-ink3 hover:text-gray-700 p-1"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <button
        onClick={triggerInstall}
        className="mt-2 px-4 py-2 text-white text-sm rounded"
        style={{ backgroundColor: '#17a34a' }}
      >
        Install App
      </button>
    </div>
  );
};

export default InstallPrompt;
