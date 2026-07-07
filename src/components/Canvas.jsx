import { useRef, useEffect, useState } from 'react';

function Canvas({ color, thickness, tool, shape, font, scale, setScale, orientation, saveFormat, undoTrigger, redoTrigger, clearTrigger, saveTrigger, importTrigger, onExportImage, onImportImage }) {
  const canvasRef = useRef(null);
  const lastPointRef = useRef(null);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const lastSaveTriggerRef = useRef(null);
  const [canvasWidth, setCanvasWidth] = useState(1400);
  const [canvasHeight, setCanvasHeight] = useState(900);
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapeStart, setShapeStart] = useState(null);

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

  const triggerDownload = (href, fileName) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    link.click();
  };

  const createPdfBlobUrl = (canvas) => {
    const width = canvas.width;
    const height = canvas.height;
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const base64 = imageDataUrl.split(',')[1] ?? '';
    const imageBytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

    const pageWidth = Math.max(612, Math.round(width * 0.75));
    const pageHeight = Math.max(792, Math.round(height * 0.75));

    const chunks = [];
    let offset = 0;

    const pushText = (text) => {
      const bytes = new TextEncoder().encode(text);
      chunks.push(bytes);
      offset += bytes.length;
    };

    const pushBytes = (bytes) => {
      chunks.push(bytes);
      offset += bytes.length;
    };

    const objectOffsets = [];
    const writeObject = (objectNumber, content) => {
      objectOffsets.push(offset);
      pushText(`${objectNumber} 0 obj\n`);
      pushText(content);
      pushText('\nendobj\n');
    };

    writeObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
    writeObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    writeObject(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /ProcSet [/PDF /Text /ImageB] /XObject << /Im1 5 0 R >> >> >>`);

    const contentsStream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im1 Do\nQ\n`;
    writeObject(4, `<< /Length ${contentsStream.length} >>\nstream\n${contentsStream}endstream`);

    const imageHeader = `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponents 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`;
    objectOffsets.push(offset);
    pushText('5 0 obj\n');
    pushText(imageHeader);
    pushBytes(imageBytes);
    pushText('\nendstream\nendobj\n');

    const xrefOffset = offset;
    pushText(`xref\n0 ${objectOffsets.length + 1}\n`);
    pushText('0000000000 65535 f \n');
    objectOffsets.forEach((value) => {
      pushText(`${String(value).padStart(10, '0')} 00000 n \n`);
    });

    pushText(`trailer\n<< /Size ${objectOffsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    const blob = new Blob(chunks, { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  };

  useEffect(() => {
    if (saveTrigger > 0 && lastSaveTriggerRef.current !== saveTrigger && canvasRef.current) {
      lastSaveTriggerRef.current = saveTrigger;
      const canvas = canvasRef.current;

      if (saveFormat === 'pdf') {
        const blobUrl = createPdfBlobUrl(canvas);
        triggerDownload(blobUrl, `drawing-${Date.now()}.pdf`);
        return;
      }

      const mimeType = saveFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const extension = saveFormat === 'jpeg' ? 'jpeg' : 'png';
      const dataUrl = canvas.toDataURL(mimeType, saveFormat === 'jpeg' ? 0.92 : undefined);
      onExportImage?.(dataUrl);
      triggerDownload(dataUrl, `drawing-${Date.now()}.${extension}`);
    }
  }, [saveFormat, saveTrigger, onExportImage]);

  useEffect(() => {
    if (importTrigger > 0 && canvasRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const ctx = getContext();
            if (!ctx) return;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
            pushSnapshot();
            onImportImage?.(reader.result);
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
  }, [importTrigger, onImportImage]);

  const drawShape = (ctx, start, end) => {
    if (!start || !end) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.fillStyle = color;
    ctx.globalCompositeOperation = 'source-over';

    const width = end.x - start.x;
    const height = end.y - start.y;
    const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;

    ctx.beginPath();
    switch (shape) {
      case 'rectangle':
        ctx.rect(start.x, start.y, width, height);
        break;
      case 'circle':
        ctx.ellipse(start.x + width / 2, start.y + height / 2, Math.abs(width) / 2, Math.abs(height) / 2, 0, 0, Math.PI * 2);
        break;
      case 'line':
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        break;
      case 'triangle':
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, start.y + height);
        ctx.lineTo(start.x + width, end.y);
        ctx.closePath();
        break;
      default:
        ctx.rect(start.x, start.y, width, height);
    }
    ctx.stroke();
  };

  const fillRegion = (x, y) => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    const targetColor = getPixelColor(data, x, y, width);
    const fillColor = hexToRgb(color);

    if (targetColor && isSameColor(targetColor, fillColor)) return;

    const stack = [[Math.floor(x), Math.floor(y)]];
    const visited = new Set();

    while (stack.length) {
      const [px, py] = stack.pop();
      if (px < 0 || px >= width || py < 0 || py >= height) continue;
      const key = `${px},${py}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const index = (py * width + px) * 4;
      const currentColor = [data[index], data[index + 1], data[index + 2], data[index + 3]];
      if (!isSameColor(currentColor, targetColor)) continue;

      data[index] = fillColor[0];
      data[index + 1] = fillColor[1];
      data[index + 2] = fillColor[2];
      data[index + 3] = 255;

      stack.push([px + 1, py]);
      stack.push([px - 1, py]);
      stack.push([px, py + 1]);
      stack.push([px, py - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
    pushSnapshot();
  };

  const getPixelColor = (data, x, y, width) => {
    const index = (Math.floor(y) * width + Math.floor(x)) * 4;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]];
  };

  const isSameColor = (a, b) => {
    if (!a || !b) return false;
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  };

  const hexToRgb = (hex) => {
    const value = hex.replace('#', '');
    const normalized = value.length === 3
      ? value.split('').map((char) => char + char).join('')
      : value;
    const intValue = parseInt(normalized, 16);
    return [(intValue >> 16) & 255, (intValue >> 8) & 255, intValue & 255];
  };

  const handlePointerDown = (event) => {
    const point = getCanvasPoint(event);
    if (!point) return;

    const ctx = getContext();
    if (!ctx) return;

    if (tool === 'fill') {
      fillRegion(point.x, point.y);
      return;
    }

    if (tool === 'brush' || tool === 'eraser') {
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
      return;
    }

    if (tool === 'shape') {
      setShapeStart(point);
      setIsDrawing(true);
      pushSnapshot();
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event) => {
    if (!isDrawing) return;

    const point = getCanvasPoint(event);
    if (!point) return;

    const ctx = getContext();
    if (!ctx) return;

    if (tool === 'brush' || tool === 'eraser') {
      if (!lastPointRef.current) return;
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      lastPointRef.current = point;
      return;
    }

    if (tool === 'shape' && shapeStart) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const previous = historyRef.current[historyRef.current.length - 1];
      if (previous) {
        ctx.putImageData(previous, 0, 0);
      }
      drawShape(ctx, shapeStart, point);
    }
  };

  const handlePointerUp = (event) => {
    if (isDrawing) {
      if (tool === 'shape' && shapeStart) {
        const point = getCanvasPoint(event);
        if (point) {
          const ctx = getContext();
          if (ctx) {
            drawShape(ctx, shapeStart, point);
            pushSnapshot();
          }
        }
      }
      setIsDrawing(false);
      lastPointRef.current = null;
      setShapeStart(null);
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
          style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
          onWheel={handleWheel}
        >
          <div
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              overflow: 'hidden',
            }}
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
    </div>
  );
}

export default Canvas;
