import React from 'react';

function Toolbar({ 
  color, setColor, 
  thickness, setThickness, 
  tool, setTool, 
  shape, setShape,
  onUndo, onRedo 
}) {
  return (
    <div className="toolbar">
      {/* Historial */}
      <button onClick={onUndo} title="Deshacer">↩️</button>
      <button onClick={onRedo} title="Rehacer">↪️</button>

      {/* Selectores Básicos */}
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      <input type="range" min="1" max="20" value={thickness} onChange={(e) => setThickness(Number(e.target.value))} />

      {/* Herramientas Principales */}
      <button className={tool === 'brush' ? 'active' : ''} onClick={() => setTool('brush')}>🖌️ Pincel</button>
      <button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')}>🧽 Borrador</button>
      
      {/* Selector de Figuras */}
      <button className={tool === 'shape' ? 'active' : ''} onClick={() => setTool('shape')}>📐 Figuras</button>
      {tool === 'shape' && (
        <select value={shape} onChange={(e) => setShape(e.target.value)} className="shape-select">
          <option value="rectangle">Rectangle 🟦</option>
          <option value="circle">Círculo ⭕</option>
          <option value="line">Línea 📏</option>
        </select>
      )}

      {/* Herramienta de Recorte */}
      <button className={tool === 'crop' ? 'active' : ''} onClick={() => setTool('crop')}>✂️ Recortar</button>

      <button className="save-btn">☁️ Guardar</button>
    </div>
  );
}

export default Toolbar;