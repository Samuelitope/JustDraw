import { useRef, useEffect, useState } from 'react';

function Canvas({ color, thickness, tool, shape, font, scale, undoTrigger, redoTrigger, clearTrigger }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [startCoords, setStartCoords] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState(null);

  // Arrays para renderizar los números de las reglas (marcas cada 50px)
  const ruleTicksX = Array.from({ length: 17 }, (_, i) => i * 50);
  const ruleTicksY = Array.from({ length: 13 }, (_, i) => i * 50);

  useEffect(() => { saveToHistory(); }, []);
  useEffect(() => { if (undoTrigger > 0) handleUndo(); }, [undoTrigger]);
  useEffect(() => { if (redoTrigger > 0) handleRedo(); }, [redoTrigger]);
  useEffect(() => { if (clearTrigger > 0) handleClear(); }, [clearTrigger]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    setHistory([...newHistory, imgData]);
    setHistoryStep(newHistory.length);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(history[historyStep - 1], 0, 0);
      setHistoryStep(historyStep - 1);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(history[historyStep + 1], 0, 0);
      setHistoryStep(historyStep + 1);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // 🔍 AJUSTE CRUCIAL: Dividimos la distancia por la escala (scale) para mantener el cursor en su sitio exacto bajo zoom
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    
    setStartCoords(coords);

    if (tool === 'fill') {
      // 🪣 Bote de pintura rápido en todo el lienzo (se puede expandir a flood-fill por pixeles)
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveToHistory();
      return;
    }

    if (tool === 'text') {
      // 🔤 Herramienta de Escritura
      const textInput = prompt("Introduce el texto que deseas colocar:");
      if (textInput) {
        ctx.fillStyle = color;
        ctx.font = `${thickness * 3}px ${font}`;
        ctx.fillText(textInput, coords.x, coords.y);
        saveToHistory();
      }
      return;
    }

    setIsDrawing(true);
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (tool === 'brush' || tool === 'eraser') {
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tool === 'shape') {
      ctx.putImageData(snapshot, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      if (shape === 'rectangle') {
        ctx.strokeRect(startCoords.x, startCoords.y, coords.x - startCoords.x, coords.y - startCoords.y);
      } else if (shape === 'circle') {
        const radius = Math.sqrt(Math.pow(coords.x - startCoords.x, 2) + Math.pow(coords.y - startCoords.y, 2));
        ctx.arc(startCoords.x, startCoords.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (shape === 'line') {
        ctx.moveTo(startCoords.x, startCoords.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
    } else if (tool === 'crop') {
      ctx.putImageData(snapshot, 0, 0);
      ctx.strokeStyle = '#007acc';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(startCoords.x, startCoords.y, coords.x - startCoords.x, coords.y - startCoords.y);
      ctx.setLineDash([]);
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (tool === 'crop') {
      const coords = getCoordinates(e);
      const width = coords.x - startCoords.x;
      const height = coords.y - startCoords.y;

      if (Math.abs(width) > 10 && Math.abs(height) > 10) {
        ctx.putImageData(snapshot, 0, 0);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.abs(width);
        tempCanvas.height = Math.abs(height);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, startCoords.x, startCoords.y, width, height, 0, 0, width, height);
        canvas.width = Math.abs(width);
        canvas.height = Math.abs(height);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }
    saveToHistory();
  };

  return (
    <div className="workspace-wrapper">
      {/* 📏 Regla Horizontal */}
      <div className="ruler horizontal-ruler">
        {ruleTicksX.map(tick => <span key={tick} style={{ left: `${tick}px` }}>{tick}</span>)}
      </div>

      {/* 📏 Regla Vertical */}
      <div className="ruler vertical-ruler">
        {ruleTicksY.map(tick => <span key={tick} style={{ top: `${tick}px` }}>{tick}</span>)}
      </div>

      <div className="canvas-container">
        {/* Aplicamos la transformación de escala CSS dinámicamente según el zoom elegido */}
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 0.1s ease' }}>
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="paint-canvas"
          />
        </div>
      </div>
    </div>
  );
}

export default Canvas;