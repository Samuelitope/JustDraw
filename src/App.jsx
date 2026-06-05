import { useState } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import './App.css';

function App() {
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(5);
  const [tool, setTool] = useState('brush'); // 'brush', 'eraser', 'shape', 'crop'
  const [shape, setShape] = useState('rectangle'); // 'rectangle', 'circle', 'line'
  
  // Triggers para comunicar acciones de la Toolbar al Canvas
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);

  return (
    <div className="paint-app">
      <Toolbar 
        color={color} setColor={setColor} 
        thickness={thickness} setThickness={setThickness}
        tool={tool} setTool={setTool}
        shape={shape} setShape={setShape}
        onUndo={() => setUndoTrigger(prev => prev + 1)}
        onRedo={() => setRedoTrigger(prev => prev + 1)}
      />
      
      <Canvas 
        color={color} 
        thickness={thickness}
        tool={tool}
        shape={shape}
        undoTrigger={undoTrigger}
        redoTrigger={redoTrigger}
      />
    </div>
  );
}

export default App;