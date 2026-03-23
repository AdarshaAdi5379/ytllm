import { Sidebar } from './components/layout/Sidebar';
import { MainPanel } from './components/layout/MainPanel';
import { URLInputModal } from './components/modals/URLInputModal';
import { useVideoStore } from './store/useVideoStore';

export default function App() {
  const isAddVideoModalOpen = useVideoStore((s) => s.isAddVideoModalOpen);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <MainPanel />
      {isAddVideoModalOpen && <URLInputModal />}
    </div>
  );
}
