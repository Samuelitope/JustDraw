import { useEffect, useState } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import SavedGallery from './components/SavedGallery';
import './App.css';
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

function App() {
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(5);
  const [tool, setTool] = useState('brush'); 
  const [shape, setShape] = useState('rectangle');
  const [font, setFont] = useState('Arial');
  const [scale, setScale] = useState(1);
  const [orientation, setOrientation] = useState('horizontal');
  const [savedImages, setSavedImages] = useState([]);
  
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [saveTrigger, setSaveTrigger] = useState(0);

  useEffect(() => {
    const fetchDrawings = async () => {
      try {
        const q = query(collection(db, "drawings"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const urls = querySnapshot.docs
          .map(doc => doc.data().url)
          .filter(Boolean);
        setSavedImages(urls);
      } catch (error) {
        console.error('Failed to fetch drawings:', error);
      }
    };

    fetchDrawings();
  }, []);

  const handleImageExported = (dataUrl) => {
    setSavedImages(prev => [dataUrl, ...prev]);
  };

  return (
    <div className="paint-app">
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
          tool={tool} shape={shape} font={font} scale={scale} setScale={setScale}
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