import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallBanner() {
  const { isInstallable, promptInstall } = useInstallPrompt();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center gap-4 border border-slate-700 animate-bounce">
      <div>
        <h4 className="font-bold text-sm">Install Ticket Stream</h4>
        <p className="text-xs text-slate-400">Add to your home screen for quick access.</p>
      </div>
      <button
        onClick={promptInstall}
        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md"
      >
        Install
      </button>
    </div>
  );
}