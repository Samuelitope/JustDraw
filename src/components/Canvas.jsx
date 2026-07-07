import { useRef, useEffect, useState } from 'react';

function Canvas({ color, thickness, tool, shape, font, scale, setScale, orientation, undoTrigger, redoTrigger, clearTrigger, saveTrigger, onExportImage }) {
  const canvasRef = useRef(null);
  const lastPointRef = useRef(null);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const [canvasWidth, setCanvasWidth] = useState(1400);
  const [canvasHeight, setCanvasHeight] = useState(900);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
  };

  const getContext = () => canvasRef.current?.getContext('2d');

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    historyRef.current = [];
    redoRef.current = [];
  };

  const pushSnapshot = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 40) {
      historyRef.current.shift();
    }
    redoRef.current = [];
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx || historyRef.current.length === 0) return;

    const snapshot = historyRef.current.pop();
    redoRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.putImageData(snapshot, 0, 0);
  };

  const redo = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx || redoRef.current.length === 0) return;

    const snapshot = redoRef.current.pop();
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.putImageData(snapshot, 0, 0);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = orientation === 'horizontal'
        ? Math.max(1400, Math.floor(viewportWidth * 0.92))
        : Math.max(1000, Math.floor(viewportWidth * 0.82));
      const height = orientation === 'horizontal'
        ? Math.max(900, Math.floor(viewportHeight * 0.8))
        : Math.max(1400, Math.floor(viewportHeight * 0.9));

      setCanvasWidth(width);
      setCanvasHeight(height);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [orientation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resetCanvas();
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    if (clearTrigger > 0) {
      resetCanvas();
    }
  }, [clearTrigger]);

  useEffect(() => {
    if (undoTrigger > 0) {
      undo();
    }
  }, [undoTrigger]);

  useEffect(() => {
    if (redoTrigger > 0) {
      redo();
    }
  }, [redoTrigger]);

  useEffect(() => {
    if (saveTrigger > 0 && canvasRef.current) {
      onExportImage?.(canvasRef.current.toDataURL('image/png'));
    }
  }, [saveTrigger, onExportImage]);

  const handlePointerDown = (event) => {
    if (tool !== 'brush' && tool !== 'eraser') return;

    const point = getCanvasPoint(event);
    if (!point) return;

    const ctx = getContext();
    if (!ctx) return;

    lastPointRef.current = point;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = thickness;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setIsDrawing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    pushSnapshot();
  };

  const handlePointerMove = (event) => {
    if (!isDrawing || !lastPointRef.current) return;

    const point = getCanvasPoint(event);
    if (!point) return;

    const ctx = getContext();
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const handlePointerUp = (event) => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPointRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const nextScale = Math.min(2.5, Math.max(0.6, scale + delta));
    setScale(nextScale);
  };

  return (
    <div className="workspace-wrapper">
      <div className="canvas-container">
        <div
          className="retro-canvas-frame"
          style={{ width: `${canvasWidth * scale}px`, height: `${canvasHeight * scale}px` }}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="paint-canvas"
            style={{ width: '100%', height: '100%' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>
      </div>
    </div>
  );
}

export default Canvas;
