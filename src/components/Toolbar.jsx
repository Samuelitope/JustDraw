import React from 'react';

function Toolbar({ color, setColor, thickness, setThickness, tool, setTool }) {
  return (
    <div className="toolbar">
      {/* Selector de Color */}
      <input 
        type="color" 
        value={color} 
        onChange={(e) => setColor(e.target.value)} 
      />

      {/* Selector de Grosor */}
      <input 
        type="range" 
        min="1" 
        max="20" 
        value={thickness} 
        onChange={(e) => setThickness(Number(e.target.value))} 
      />

      {/* Botones de Herramientas */}
      <button 
        className={tool === 'brush' ? 'active' : ''} 
        onClick={() => setTool('brush')}
      >
        🖌️ Pincel
      </button>
      <button 
        className={tool === 'eraser' ? 'active' : ''} 
        onClick={() => setTool('eraser')}
      >
        🧽 Borrador
      </button>

      {/* El botón de guardar en la nube (Próximamente hablará con Python) */}
      <button className="save-btn">☁️ Guardar</button>
    </div>
  );
}

export default Toolbar;