import { useStudioStore } from './lib/store';
import VisualizerScene from './components/visualizer/VisualizerScene';
import EditorScene from './components/editor/EditorScene';
import DashboardOverlay from './components/layout/DashboardOverlay';

function App() {
  const { mode } = useStudioStore();
  
  return (
    <div className="w-screen h-screen bg-cyber-bg overflow-hidden">
      {/* 3D Scene - switches based on mode */}
      <div className="absolute inset-0">
        {mode === 'visualizer' ? <VisualizerScene /> : <EditorScene />}
      </div>
      
      {/* UI Overlay */}
      <DashboardOverlay />
    </div>
  );
}

export default App;
