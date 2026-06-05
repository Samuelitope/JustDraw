import { useRef, useEffect, useState } from 'react';

function Canvas({ color, thickness, tool, shape, undoTrigger, redoTrigger }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Historial de estados (Undo / Redo)
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  
  // Coordenadas iniciales para Figuras y Recorte
  const [startCoords, setStartCoords] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState(null);

  // Guardar estado inicial al cargar el Canvas
  useEffect(() => {
    saveToHistory();
  }, []);

  // Escuchar acciones de Deshacer / Rehacer desde la Toolbar
  useEffect(() => { if (undoTrigger > 0) handleUndo(); }, [undoTrigger]);
  useEffect(() => { if (redoTrigger > 0) handleRedo(); }, [redoTrigger]);

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

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    
    setStartCoords(coords);
    setIsDrawing(true);

    // Tomamos una captura del canvas actual para la vista previa dinámica
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
      ctx.putImageData(snapshot, 0, 0); // Limpiar vista previa anterior
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
      ctx.setLineDash([5, 5]); // Línea punteada de selección
      ctx.strokeRect(startCoords.x, startCoords.y, coords.x - startCoords.x, coords.y - startCoords.y);
      ctx.setLineDash([]); // Resetear
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (tool === 'crop') {
      // ✂️ Lógica de Recorte
      const coords = getCoordinates(e);
      const width = coords.x - startCoords.x;
      const height = coords.y - startCoords.y;

      if (Math.abs(width) > 10 && Math.abs(height) > 10) {
        ctx.putImageData(snapshot, 0, 0); // Quitar cuadro punteado visual
        
        // Crear un canvas temporal con el tamaño exacto del recorte
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.abs(width);
        tempCanvas.height = Math.abs(height);
        const tempCtx = tempCanvas.getContext('2d');

        // Copiar el fragmento seleccionado al canvas temporal
        tempCtx.drawImage(canvas, startCoords.x, startCoords.y, width, height, 0, 0, width, height);
        
        // Reajustar el canvas principal al nuevo tamaño recortado
        canvas.width = Math.abs(width);
        canvas.height = Math.abs(height);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }
    
    saveToHistory();
  };

  return (
    <div className="canvas-container">
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
  );
}

export default Canvas;