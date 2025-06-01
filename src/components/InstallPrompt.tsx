import usePWAInstallPrompt from "@/hooks/usePWAInstallPrompt";
import { X } from "lucide-react";

const InstallPrompt = () => {
  const { isInstallable, triggerInstall, closeInstallPrompt } = usePWAInstallPrompt();

  if (!isInstallable) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-xs border border-gray-200 shadow-lg rounded-lg p-4"
      style={{ backgroundColor: '#fff' }}
    >
      <div className="flex justify-between items-start">
        <p className="text-sm text-gray-700">Install this app for a better experience!</p>
        <button
          onClick={closeInstallPrompt}
          className="text-gray-500 hover:text-gray-700 p-1"
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
