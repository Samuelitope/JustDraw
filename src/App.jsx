import { useCallback, useEffect, useState } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import SavedGallery from './components/SavedGallery';
import { getSavedDrawings, uploadDrawing } from './services';
import './App.css';

function App() {
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(5);
  const [tool, setTool] = useState('brush'); 
  const [shape, setShape] = useState('rectangle');
  const [font, setFont] = useState('Arial');
  const [scale, setScale] = useState(1);
  const [orientation, setOrientation] = useState('horizontal');
  const [saveFormat, setSaveFormat] = useState('png');
  const [savedImages, setSavedImages] = useState([]);

  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [importTrigger, setImportTrigger] = useState(0);
  const [copyTrigger, setCopyTrigger] = useState(0);
  const [cutTrigger, setCutTrigger] = useState(0);
  const [pasteTrigger, setPasteTrigger] = useState(0);
  const [groupTrigger, setGroupTrigger] = useState(0);
  const [ungroupTrigger, setUngroupTrigger] = useState(0);

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const drawings = await getSavedDrawings();
        setSavedImages(drawings.map((drawing) => ({
          id: drawing.id,
          src: drawing.url,
          label: drawing.label || 'drawing'
        })));
      } catch (error) {
        console.error('Failed to load drawings from Firebase:', error);
      }
    };

    loadGallery();
  }, []);

  const handleImageExported = useCallback(async (dataUrl) => {
    try {
      const result = await uploadDrawing(dataUrl, `drawing-${Date.now()}`);
      setSavedImages((prev) => [{ id: result.id, src: result.url, label: result.label }, ...prev]);
    } catch (error) {
      console.error('Failed to save drawing to Firebase:', error);
      setSavedImages((prev) => [{ id: `local-${Date.now()}`, src: dataUrl, label: 'drawing' }, ...prev]);
    }
  }, []);

  const handleImport = useCallback(async (dataUrl) => {
    try {
      const result = await uploadDrawing(dataUrl, `import-${Date.now()}`);
      setSavedImages((prev) => [{ id: result.id, src: result.url, label: result.label }, ...prev]);
    } catch (error) {
      console.error('Failed to save imported drawing to Firebase:', error);
      setSavedImages((prev) => [{ id: `local-${Date.now()}`, src: dataUrl, label: 'import' }, ...prev]);
    }
  }, []);

  return (
    <div className="paint-app">
      <Toolbar 
        color={color} setColor={setColor} 
        thickness={thickness} setThickness={setThickness}
        tool={tool} setTool={setTool}
        shape={shape} setShape={setShape}
        font={font} setFont={setFont}
        scale={scale} setScale={setScale}
        saveFormat={saveFormat} setSaveFormat={setSaveFormat}
        onUndo={() => setUndoTrigger(prev => prev + 1)}
        onRedo={() => setRedoTrigger(prev => prev + 1)}
        onClear={() => setClearTrigger(prev => prev + 1)}
        onSave={() => setSaveTrigger(prev => prev + 1)}
        onImport={() => setImportTrigger(prev => prev + 1)}
        onCopy={() => setCopyTrigger(prev => prev + 1)}
        onCut={() => setCutTrigger(prev => prev + 1)}
        onPaste={() => setPasteTrigger(prev => prev + 1)}
        onGroup={() => setGroupTrigger(prev => prev + 1)}
        onUngroup={() => setUngroupTrigger(prev => prev + 1)}
      />
      <div className="main-workspace-layout">
        <Canvas 
          color={color} thickness={thickness}
          tool={tool} shape={shape} font={font} scale={scale} setScale={setScale}
          orientation={orientation}
          saveFormat={saveFormat}
          undoTrigger={undoTrigger} redoTrigger={redoTrigger} 
          clearTrigger={clearTrigger} saveTrigger={saveTrigger} importTrigger={importTrigger}
          onExportImage={handleImageExported}
          onImportImage={handleImport}
          copyTrigger={copyTrigger}
          cutTrigger={cutTrigger}
          pasteTrigger={pasteTrigger}
          groupTrigger={groupTrigger}
          ungroupTrigger={ungroupTrigger}
        />
        <SavedGallery savedImages={savedImages} />
      </div>
    </div>
  );
}

export default App;