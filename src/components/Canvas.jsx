import { useRef, useEffect, useState } from 'react';

function Canvas({ color, thickness, tool, shape, font, scale, orientation, undoTrigger, redoTrigger, clearTrigger, saveTrigger, onExportImage }) {
  const canvasRef = useRef(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Ajuste inicial de tamaño
    const w = orientation === 'horizontal' ? 800 : 600;
    const h = orientation === 'horizontal' ? 600 : 800;
    setCanvasWidth(w);
    setCanvasHeight(h);
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }, [orientation]);

  return (
    <div className="workspace-wrapper">
      <div className="canvas-container">
        <div className="retro-canvas-frame" style={{ width: `${canvasWidth * scale}px`, height: `${canvasHeight * scale}px` }}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="paint-canvas"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}

export default Canvas;