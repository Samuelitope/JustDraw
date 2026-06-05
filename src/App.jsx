import { useState } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import './App.css';

function App() {
  // Estados globales que comparten la barra y el lienzo
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(5);
  const [tool, setTool] = useState('brush'); // 'brush' o 'eraser'

  return (
    <div className="paint-app">
      {/* La barra de herramientas modifica los estados */}
      <Toolbar 
        color={color} 
        setColor={setColor} 
        thickness={thickness} 
        setThickness={setThickness}
        tool={tool}
        setTool={setTool}
      />
      
      {/* El lienzo lee los estados para saber cómo pintar */}
      <Canvas 
        color={color} 
        thickness={thickness}
        tool={tool}
      />
    </div>
  );
}

export default App;