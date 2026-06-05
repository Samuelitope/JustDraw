import { useState } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import './App.css';

function App() {
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(5);
  const [tool, setTool] = useState('brush'); 
  const [shape, setShape] = useState('rectangle');
  const [font, setFont] = useState('Arial');
  const [scale, setScale] = useState(1); // Escala del zoom (1 = 100%)
  
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [clearTrigger, setClearTrigger] = useState(0);

  return (
    <div className="paint-app">
      <Toolbar 
        color={color} setColor={setColor} 
        thickness={thickness} setThickness={setThickness}
        tool={tool} setTool={setTool}
        shape={shape} setShape={setShape}
        font={font} setFont={setFont}
        scale={scale} setScale={setScale}
        onUndo={() => setUndoTrigger(prev => prev + 1)}
        onRedo={() => setRedoTrigger(prev => prev + 1)}
        onClear={() => setClearTrigger(prev => prev + 1)}
      />
      
      <Canvas 
        color={color} thickness={thickness}
        tool={tool} shape={shape} font={font} scale={scale}
        undoTrigger={undoTrigger} redoTrigger={redoTrigger} clearTrigger={clearTrigger}
      />
    </div>
  );
}

export default App;