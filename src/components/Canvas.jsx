import { useRef, useEffect, useState } from 'react';

function Canvas({ 
  color, 
  thickness, 
  tool, 
  shape, 
  font, 
  scale, 
  orientation,
  undoTrigger, 
  redoTrigger, 
  clearTrigger, 
  saveTrigger, 
  onExportImage 
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [startCoords, setStartCoords] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState(null);

  // Dimensiones dinámicas de la hoja controladas por el usuario
  const [canvasWidth, setCanvasWidth] = useState(orientation === 'horizontal' ? 800 : 600);
  const [canvasHeight, setCanvasHeight] = useState(orientation === 'horizontal' ? 600 : 800);
  const [isResizing, setIsResizing] = useState(false);

  // Escuchar el cambio de módulo de orientación externa (Toolbar)
  useEffect(() => {
    if (orientation === 'horizontal') {
      setCanvasWidth(800);
      setCanvasHeight(600);
    } else {
      setCanvasWidth(600);
      setCanvasHeight(800);
    }
    setTimeout(() => handleClear(), 50);
  }, [orientation]);

  // Generar reglas adaptativas según el tamaño actual de la hoja
  const ruleTicksX = Array.from({ length: Math.ceil(canvasWidth / 50) + 1 }, (_, i) => i * 50);
  const ruleTicksY = Array.from({ length: Math.ceil(canvasHeight / 50) + 1 }, (_, i) => i * 50);

  useEffect(() => {
    handleClear();
    
    // 📋 EVENTO: Pegar imágenes mediante CTRL+V
    const handlePaste = (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const ctx = canvasRef.current.getContext('2d');
              // Dibuja la imagen pegada en la esquina superior izquierda del lienzo
              ctx.drawImage(img, 0, 0, img.width > canvasWidth ? canvasWidth : img.width, img.height > canvasHeight ? canvasHeight : img.height);
              saveToHistory();
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(blob);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [canvasWidth, canvasHeight]);

  useEffect(() => { if (undoTrigger > 0) handleUndo(); }, [undoTrigger]);
  useEffect(() => { if (redoTrigger > 0) handleRedo(); }, [redoTrigger]);
  useEffect(() => { if (clearTrigger > 0) handleClear(); }, [clearTrigger]);
  
  useEffect(() => {
    if (saveTrigger > 0 && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onExportImage(dataUrl);
    }
  }, [saveTrigger]);

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
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  // Algoritmo de relleno (Flood Fill)
  const floodFill = (startX, startY, fillColor) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    startX = Math.floor(startX);
    startY = Math.floor(startY);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const getPixelColor = (x, y) => {
      const index = (y * canvas.width + x) * 4;
      return { r: data[index], g: data[index + 1], b: data[index + 2], a: data[index + 3] };
    };

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16), a: 255
      } : { r: 0, g: 0, b: 0, a: 255 };
    };

    const targetColor = getPixelColor(startX, startY);
    const fillRGB = hexToRgb(fillColor);

    if (targetColor.r === fillRGB.r && targetColor.g === fillRGB.g && targetColor.b === fillRGB.b) return;

    const queue = [[startX, startY]];

    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      const index = (cy * canvas.width + cx) * 4;

      if (
        data[index] === targetColor.r && data[index + 1] === targetColor.g &&
        data[index + 2] === targetColor.b && data[index + 3] === targetColor.a
      ) {
        data[index] = fillRGB.r;
        data[index + 1] = fillRGB.g;
        data[index + 2] = fillRGB.b;
        data[index + 3] = fillRGB.a;

        if (cx > 0) queue.push([cx - 1, cy]);
        if (cx < canvas.width - 1) queue.push([cx + 1, cy]);
        if (cy > 0) queue.push([cx, cy - 1]);
        if (cy < canvas.height - 1) queue.push([cx, cy + 1]);
      }
    }
    ctx.putImageData(imageData, 0, 0);
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

    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  };

  const startDrawing = (e) => {
    if (isResizing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    
    setStartCoords(coords);

    if (tool === 'fill') {
      floodFill(coords.x, coords.y, color);
      saveToHistory();
      return;
    }

    if (tool === 'text') {
      const textInput = prompt("Introduce tu texto:");
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
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  // 📐 GESTIÓN DEL RESIZE MANUAL DESDE LA ESQUINA
  const initResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.addEventListener('mousemove', startResize);
    document.addEventListener('mouseup', stopResize);
  };

  const startResize = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Calculamos la nueva distancia basada en el movimiento del cursor dividido el zoom
    const newWidth = Math.max(200, Math.floor((e.clientX - rect.left) / scale));
    const newHeight = Math.max(200, Math.floor((e.clientY - rect.top) / scale));
    
    // Almacenamos temporalmente una captura para no borrar el contenido actual durante el rediseño dimensional
    const tempContext = canvas.getContext('2d');
    const backupData = tempContext.getImageData(0, 0, canvas.width, canvas.height);

    setCanvasWidth(newWidth);
    setCanvasHeight(newHeight);

    // Re-estampamos los trazos viejos tras el cambio estructural en caliente
    setTimeout(() => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.putImageData(backupData, 0, 0);
      }
    }, 1);
  };

  const stopResize = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', startResize);
    document.removeEventListener('mouseup', stopResize);
    saveToHistory();
  };

  // 📋 CONTEXT MENU (Clic derecho "Pegar" nativo simulado)
  const handleContextMenu = async (e) => {
    e.preventDefault();
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                const ctx = canvasRef.current.getContext('2d');
                ctx.drawImage(img, 0, 0);
                saveToHistory();
              };
              img.src = event.target.result;
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    } catch (err) {
      alert("Para usar clic derecho -> Pegar, otorga permisos de Portapapeles al navegador o usa CTRL+V.");
    }
  };

  return (
    <div className="workspace-wrapper">
      <div className="ruler horizontal-ruler">
        {ruleTicksX.map(tick => <span key={tick} style={{ left: `${tick * scale}px` }}>{tick}</span>)}
      </div>

      <div className="ruler vertical-ruler">
        {ruleTicksY.map(tick => <span key={tick} style={{ top: `${tick * scale}px` }}>{tick}</span>)}
      </div>

      <div className="canvas-container" ref={containerRef}>
        <div 
          className="retro-canvas-frame"
          style={{ 
            width: `${canvasWidth * scale}px`, 
            height: `${canvasHeight * scale}px`,
            position: 'relative'
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onContextMenu={handleContextMenu}
            className="paint-canvas"
            style={{ width: '100%', height: '100%' }}
          />
          
          {/* 🔲 Nodo Interactiva de Esquina para estirar la hoja (Resize Handler) */}
          <div 
            className="canvas-resize-handle"
            onMouseDown={initResize}
            title="Arrastra para cambiar el tamaño de la hoja"
          />
        </div>
      </div>
    </div>
  );
}

export default Canvas;