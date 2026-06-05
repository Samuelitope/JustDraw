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
    <div className="toolbar retro-window">
      {/* Barra de Título Estilo Win95 opcional en CSS */}
      <div className="toolbar-section">
        <span className="section-title">Archivo</span>
        <button onClick={onClear} title="Borrar todo el lienzo" className="retro-btn clear-btn">Limpiar [Alt+L]</button>
        <button onClick={onSave} className="retro-btn save-btn" title="Guardar dibujo en el historial visual">Guardar [Ctrl+S]</button>      
      </div>
    <div className="retro-field">
      <label>Hoja:</label>
      <select value={orientation} onChange={(e) => setOrientation(e.target.value)} className="retro-select">
        <option value="horizontal">Horizontal (800x600)</option>
        <option value="vertical">Vertical (600x800)</option>
      </select>
    </div>

      <div className="toolbar-section">
        <span className="section-title">Edición</span>
        <button onClick={onUndo} className="retro-btn" title="Deshacer">Deshacer</button>
        <button onClick={onRedo} className="retro-btn" title="Rehacer">Rehacer</button>
      </div>

      <div className="toolbar-section">
        <span className="section-title">Herramientas</span>
        <button className={`retro-btn ${tool === 'brush' ? 'active' : ''}`} onClick={() => setTool('brush')} title="Pincel">Pincel</button>
        <button className={`retro-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Borrador">Borrador</button>
        <button className={`retro-btn ${tool === 'fill' ? 'active' : ''}`} onClick={() => setTool('fill')} title="Bote de Pintura">Relleno</button>
        <button className={`retro-btn ${tool === 'crop' ? 'active' : ''}`} onClick={() => setTool('crop')} title="Cortar selección">Recortar</button>
      </div>
      
      <div className="toolbar-section">
        <span className="section-title">Formas</span>
        <button className={`retro-btn ${tool === 'shape' ? 'active' : ''}`} onClick={() => setTool('shape')} title="Dibujar Formas">Figuras</button>
        {tool === 'shape' && (
          <select value={shape} onChange={(e) => setShape(e.target.value)} className="retro-select">
            <option value="rectangle">Rectángulo</option>
            <option value="circle">Círculo</option>
            <option value="line">Línea</option>
          </select>
        )}
      </div>

      <div className="toolbar-section">
        <span className="section-title">Texto</span>
        <button className={`retro-btn ${tool === 'text' ? 'active' : ''}`} onClick={() => setTool('text')} title="Escribir texto">Texto</button>
        {tool === 'text' && (
          <select value={font} onChange={(e) => setFont(e.target.value)} className="retro-select">
            <option value="Arial">Arial</option>
            <option value="Courier New">Courier (Terminal)</option>
            <option value="Georgia">Georgia</option>
            <option value="Impact">Impact</option>
          </select>
        )}
      </div>

      <div className="toolbar-section">
        <span className="section-title">Configuración</span>
        <div className="retro-field">
          <label>Color:</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="retro-color-picker" />
        </div>
        <div className="retro-field">
          <label>Grosor:</label>
          <input type="range" min="1" max="20" value={thickness} onChange={(e) => setThickness(Number(e.target.value))} className="retro-range" />
        </div>
        <div className="retro-field">
          <label>Zoom:</label>
          <select value={scale} onChange={(e) => setScale(Number(e.target.value))} className="retro-select">
            <option value="0.5">50%</option>
            <option value="1">100%</option>
            <option value="1.5">150%</option>
            <option value="2">200%</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default Toolbar;