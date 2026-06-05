import React from 'react';

function Toolbar({ 
  color, setColor, 
  thickness, setThickness, 
  tool, setTool, 
  shape, setShape,
  font, setFont,
  scale, setScale,
  onUndo, onRedo, onClear
}) {
  return (
    <div className="toolbar">
      {/* Historial */}
      <button onClick={onUndo} title="Deshacer (Ctrl + Z)">↩️</button>
      <button onClick={onRedo} title="Rehacer (Ctrl + Y)">↪️</button>
      <button onClick={onClear} title="Borrar todo el lienzo" className="clear-btn">🗑️ Limpiar</button>

      {/* Selectores Básicos */}
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Cambiar color del pincel" />
      <input type="range" min="1" max="20" value={thickness} onChange={(e) => setThickness(Number(e.target.value))} title="Grosor de la herramienta" />

      {/* Control de Zoom / Aumentar Hoja */}
      <div className="zoom-control" title="Aumentar / Reducir tamaño de la hoja">
        <span>🔍</span>
        <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
          <option value="0.5">50%</option>
          <option value="1">100%</option>
          <option value="1.5">150%</option>
          <option value="2">200%</option>
        </select>
      </div>

      {/* Herramientas Principales */}
      <button className={tool === 'brush' ? 'active' : ''} onClick={() => setTool('brush')} title="Herramienta Pincel">静态🖌️ Pincel</button>
      <button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')} title="Herramienta Borrador">🧽 Borrador</button>
      <button className={tool === 'fill' ? 'active' : ''} onClick={() => setTool('fill')} title="Bote de Pintura (Rellenar capa)">🪣 Relleno</button>
      
      {/* Selector de Figuras */}
      <button className={tool === 'shape' ? 'active' : ''} onClick={() => setTool('shape')} title="Dibujar Formas Geométricas">📐 Figuras</button>
      {tool === 'shape' && (
        <select value={shape} onChange={(e) => setShape(e.target.value)} className="select-dropdown">
          <option value="rectangle">Rectángulo 🟦</option>
          <option value="circle">Círculo ⭕</option>
          <option value="line">Línea 📏</option>
        </select>
      )}

      {/* Herramienta de Texto */}
      <button className={tool === 'text' ? 'active' : ''} onClick={() => setTool('text')} title="Escribir texto en el lienzo">🔤 Texto</button>
      {tool === 'text' && (
        <select value={font} onChange={(e) => setFont(e.target.value)} className="select-dropdown" title="Cambiar tipo de letra">
          <option value="Arial">Arial</option>
          <option value="Courier New">Courier (Retro)</option>
          <option value="Georgia">Georgia (Elegante)</option>
          <option value="Impact">Impact (Fuerte)</option>
        </select>
      )}

      {/* Herramienta de Recorte */}
      <button className={tool === 'crop' ? 'active' : ''} onClick={() => setTool('crop')} title="Cortar selección del lienzo">✂️ Recortar</button>

      <button className="save-btn" title="Subir dibujo a la nube">☁️ Guardar</button>
    </div>
  );
}

export default Toolbar;