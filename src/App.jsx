import { useState } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import SavedGallery from './components/SavedGallery';
import './App.css';

function App() {
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(5);
  const [tool, setTool] = useState('brush'); 
  const [shape, setShape] = useState('rectangle');
  const [font, setFont] = useState('Arial');
  const [scale, setScale] = useState(1);
  const [orientation, setOrientation] = useState('horizontal'); // 'horizontal' o 'vertical'
  
  // Historial de imágenes guardadas visualmente
  const [savedImages, setSavedImages] = useState([]);

  // Disparadores de acciones
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [saveTrigger, setSaveTrigger] = useState(0);

  const handleImageExported = (dataUrl) => {
    setSavedImages(prevImages => [dataUrl, ...prevImages]);
  };

  return (
    <div className="paint-app">
      {/* Añadimos un contenedor virtual para el cursor animado inteligente */}
      <div className="retro-custom-cursor"></div>

      <Toolbar 
        color={color} setColor={setColor} 
        thickness={thickness} setThickness={setThickness}
        tool={tool} setTool={setTool}
        shape={shape} setShape={setShape}
        font={font} setFont={setFont}
        scale={scale} setScale={setScale}
        orientation={orientation} setOrientation={setOrientation}
        onUndo={() => setUndoTrigger(prev => prev + 1)}
        onRedo={() => setRedoTrigger(prev => prev + 1)}
        onClear={() => setClearTrigger(prev => prev + 1)}
        onSave={() => setSaveTrigger(prev => prev + 1)}
      />
      
      <div className="main-workspace-layout">
        <Canvas 
          color={color} thickness={thickness}
          tool={tool} shape={shape} font={font} scale={scale}
          orientation={orientation}
          undoTrigger={undoTrigger} redoTrigger={redoTrigger} 
          clearTrigger={clearTrigger} saveTrigger={saveTrigger}
          onExportImage={handleImageExported}
        />
        
        <SavedGallery savedImages={savedImages} />
      </div>
    </div>
  );
}

export default App;