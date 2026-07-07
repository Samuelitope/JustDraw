import { useRef, useEffect, useState } from 'react';

function Canvas({ color, thickness, tool, shape, font, scale, setScale, orientation, saveFormat, undoTrigger, redoTrigger, clearTrigger, saveTrigger, importTrigger, onExportImage, onImportImage, copyTrigger, cutTrigger, pasteTrigger, groupTrigger, ungroupTrigger }) {
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const lastSaveTriggerRef = useRef(null);
  const panStartRef = useRef(null);
  const pinchStartRef = useRef(null);
  const liveElementRef = useRef(null);
  const selectionStartRef = useRef(null);
  const transformStateRef = useRef(null);
  const clipboardRef = useRef([]);
  const [canvasWidth, setCanvasWidth] = useState(1400);
  const [canvasHeight, setCanvasHeight] = useState(900);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [shapeStart, setShapeStart] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [worldWidth, setWorldWidth] = useState(3600);
  const [worldHeight, setWorldHeight] = useState(2400);
  const [elements, setElements] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const elementsRef = useRef([]);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const createId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const cloneElement = (element) => JSON.parse(JSON.stringify(element));
  const cloneElements = (items) => items.map(cloneElement);

  const getContext = () => canvasRef.current?.getContext('2d');

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
  };

  const zoomAtPoint = (clientX, clientY, nextScale) => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const rect = canvas.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const worldX = (clientX - rect.left) / scale;
    const worldY = (clientY - rect.top) / scale;
    const nextPanX = clientX - viewportRect.left - worldX * nextScale;
    const nextPanY = clientY - viewportRect.top - worldY * nextScale;

    setPanOffset({ x: nextPanX, y: nextPanY });
    setScale(nextScale);
  };

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
    liveElementRef.current = null;
    setElements([]);
    setSelectedIds([]);
    setSelectionBox(null);
  };

  const pushSnapshot = () => {
    const snapshot = cloneElements(elementsRef.current);
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
    redoRef.current = [];
  };

  const undo = () => {
    if (historyRef.current.length === 0) return;
    const snapshot = historyRef.current.pop();
    redoRef.current.push(cloneElements(elementsRef.current));
    setElements(snapshot);
    elementsRef.current = snapshot;
    setSelectedIds([]);
  };

  const redo = () => {
    if (redoRef.current.length === 0) return;
    const snapshot = redoRef.current.pop();
    historyRef.current.push(cloneElements(elementsRef.current));
    setElements(snapshot);
    elementsRef.current = snapshot;
    setSelectedIds([]);
  };

  const getElementBounds = (element) => {
    if (!element) return null;
    if (element.type === 'path') {
      const points = element.points || [];
      if (!points.length) return { x: 0, y: 0, width: 0, height: 0 };
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      };
    }

    if (element.type === 'shape') {
      return {
        x: Math.min(element.x1, element.x2),
        y: Math.min(element.y1, element.y2),
        width: Math.abs(element.x2 - element.x1),
        height: Math.abs(element.y2 - element.y1),
      };
    }

    if (element.type === 'text') {
      const width = Math.max(40, element.text.length * (element.fontSize || 24) * 0.6);
      return {
        x: element.x,
        y: element.y,
        width,
        height: (element.fontSize || 24) * 1.2,
      };
    }

    if (element.type === 'group') {
      const childBounds = (element.children || []).map(getElementBounds).filter(Boolean);
      if (!childBounds.length) return { x: element.x, y: element.y, width: 0, height: 0 };
      const xs = childBounds.map((child) => child.x + element.x);
      const ys = childBounds.map((child) => child.y + element.y);
      const widths = childBounds.map((child) => child.x + child.width + element.x);
      const heights = childBounds.map((child) => child.y + child.height + element.y);
      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...widths) - Math.min(...xs),
        height: Math.max(...heights) - Math.min(...ys),
      };
    }

    return { x: 0, y: 0, width: 0, height: 0 };
  };

  const isPointInElement = (point, element) => {
    const bounds = getElementBounds(element);
    if (!bounds) return false;
    return point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
  };

  const drawShapePath = (ctx, element) => {
    const startX = Math.min(element.x1, element.x2);
    const startY = Math.min(element.y1, element.y2);
    const width = Math.abs(element.x2 - element.x1);
    const height = Math.abs(element.y2 - element.y1);
    const radius = Math.min(width, height) / 2;

    ctx.beginPath();
    switch (element.shapeType) {
      case 'rectangle':
        ctx.rect(startX, startY, width, height);
        break;
      case 'circle':
        ctx.ellipse(startX + width / 2, startY + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
        break;
      case 'line':
        ctx.moveTo(element.x1, element.y1);
        ctx.lineTo(element.x2, element.y2);
        break;
      case 'triangle':
        ctx.moveTo(element.x1, element.y1);
        ctx.lineTo(element.x2, startY + height);
        ctx.lineTo(startX + width, element.y2);
        ctx.closePath();
        break;
      default:
        ctx.rect(startX, startY, width, height);
    }
    ctx.stroke();
  };

  const renderElement = (ctx, element) => {
    if (!element) return;

    if (element.type === 'group') {
      ctx.save();
      ctx.translate(element.x, element.y);
      ctx.scale(element.scaleX || 1, element.scaleY || 1);
      ctx.rotate((element.rotation || 0) * (Math.PI / 180));
      (element.children || []).forEach((child) => renderElement(ctx, child));
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (element.type === 'path') {
      const points = element.points || [];
      if (points.length > 0) {
        ctx.strokeStyle = element.color;
        ctx.lineWidth = element.thickness;
        ctx.globalCompositeOperation = element.tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.beginPath();
        points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      }
    } else if (element.type === 'shape') {
      ctx.strokeStyle = element.color;
      ctx.lineWidth = element.thickness;
      ctx.globalCompositeOperation = 'source-over';
      drawShapePath(ctx, element);
    } else if (element.type === 'text') {
      ctx.fillStyle = element.color;
      ctx.font = `${element.fontSize || 24}px ${element.font || 'Arial'}`;
      ctx.textBaseline = 'top';
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillText(element.text, element.x, element.y);
    }

    ctx.restore();
  };

  const drawSelectionOverlay = (ctx) => {
    const selectedElements = elementsRef.current.filter((element) => selectedIds.includes(element.id));
    selectedElements.forEach((element) => {
      const bounds = getElementBounds(element);
      if (!bounds) return;
      ctx.save();
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(bounds.x - 4, bounds.y - 4, 8, 8);
      ctx.fillRect(bounds.x + bounds.width - 4, bounds.y - 4, 8, 8);
      ctx.fillRect(bounds.x + bounds.width - 4, bounds.y + bounds.height - 4, 8, 8);
      ctx.fillRect(bounds.x - 4, bounds.y + bounds.height - 4, 8, 8);
      ctx.restore();
    });

    if (selectionBox) {
      ctx.save();
      ctx.strokeStyle = '#1d4ed8';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
      ctx.restore();
    }
  };

  const renderScene = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    elementsRef.current.forEach((element) => renderElement(ctx, element));
    if (liveElementRef.current) {
      renderElement(ctx, liveElementRef.current);
    }
    drawSelectionOverlay(ctx);
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
      setWorldWidth(Math.max(3600, width * 2.4));
      setWorldHeight(Math.max(2400, height * 2.2));
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [orientation]);

  useEffect(() => {
    renderScene();
  }, [canvasWidth, canvasHeight, elements, selectedIds, selectionBox, panOffset, scale]);

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
    if (copyTrigger > 0) {
      const selectedElements = elementsRef.current.filter((element) => selectedIds.includes(element.id));
      clipboardRef.current = cloneElements(selectedElements);
    }
  }, [copyTrigger, selectedIds]);

  useEffect(() => {
    if (cutTrigger > 0) {
      const selectedElements = elementsRef.current.filter((element) => selectedIds.includes(element.id));
      clipboardRef.current = cloneElements(selectedElements);
      const remaining = elementsRef.current.filter((element) => !selectedIds.includes(element.id));
      setElements(remaining);
      elementsRef.current = remaining;
      setSelectedIds([]);
    }
  }, [cutTrigger, selectedIds]);

  useEffect(() => {
    if (pasteTrigger > 0 && clipboardRef.current.length) {
      const offset = 24;
      const nextElements = clipboardRef.current.map((element) => ({
        ...cloneElement(element),
        id: createId(),
        x: (element.x || 0) + offset,
        y: (element.y || 0) + offset,
        x1: (element.x1 || 0) + offset,
        y1: (element.y1 || 0) + offset,
        x2: (element.x2 || 0) + offset,
        y2: (element.y2 || 0) + offset,
        points: (element.points || []).map((point) => ({ ...point, x: point.x + offset, y: point.y + offset })),
      }));
      pushSnapshot();
      setElements((prev) => [...prev, ...nextElements]);
      elementsRef.current = [...elementsRef.current, ...nextElements];
      setSelectedIds(nextElements.map((element) => element.id));
    }
  }, [pasteTrigger]);

  useEffect(() => {
    if (groupTrigger > 0 && selectedIds.length > 1) {
      const selectedElements = elementsRef.current.filter((element) => selectedIds.includes(element.id));
      const bounds = selectedElements.reduce((acc, element) => {
        const box = getElementBounds(element);
        return {
          x: Math.min(acc.x, box.x),
          y: Math.min(acc.y, box.y),
          width: Math.max(acc.width, box.x + box.width),
          height: Math.max(acc.height, box.y + box.height),
        };
      }, { x: Infinity, y: Infinity, width: -Infinity, height: -Infinity });
      const group = {
        id: createId(),
        type: 'group',
        x: bounds.x,
        y: bounds.y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        children: selectedElements.map((element) => {
          const child = cloneElement(element);
          if (child.type === 'path') {
            child.points = (child.points || []).map((point) => ({ ...point, x: point.x - bounds.x, y: point.y - bounds.y }));
          } else if (child.type === 'shape') {
            child.x1 = child.x1 - bounds.x;
            child.y1 = child.y1 - bounds.y;
            child.x2 = child.x2 - bounds.x;
            child.y2 = child.y2 - bounds.y;
          } else if (child.type === 'text') {
            child.x = child.x - bounds.x;
            child.y = child.y - bounds.y;
          }
          return child;
        }),
      };
      const remaining = elementsRef.current.filter((element) => !selectedIds.includes(element.id));
      pushSnapshot();
      const nextElements = [...remaining, group];
      setElements(nextElements);
      elementsRef.current = nextElements;
      setSelectedIds([group.id]);
    }
  }, [groupTrigger, selectedIds]);

  useEffect(() => {
    if (ungroupTrigger > 0) {
      const selectedGroup = elementsRef.current.find((element) => selectedIds.includes(element.id) && element.type === 'group');
      if (!selectedGroup) return;
      const children = (selectedGroup.children || []).map((child) => {
        const restored = cloneElement(child);
        if (restored.type === 'path') {
          restored.points = (restored.points || []).map((point) => ({ ...point, x: point.x + selectedGroup.x, y: point.y + selectedGroup.y }));
        } else if (restored.type === 'shape') {
          restored.x1 = restored.x1 + selectedGroup.x;
          restored.y1 = restored.y1 + selectedGroup.y;
          restored.x2 = restored.x2 + selectedGroup.x;
          restored.y2 = restored.y2 + selectedGroup.y;
        } else if (restored.type === 'text') {
          restored.x = restored.x + selectedGroup.x;
          restored.y = restored.y + selectedGroup.y;
        }
        return restored;
      });
      const remaining = elementsRef.current.filter((element) => element.id !== selectedGroup.id);
      const nextElements = [...remaining, ...children];
      pushSnapshot();
      setElements(nextElements);
      elementsRef.current = nextElements;
      setSelectedIds(children.map((child) => child.id));
    }
  }, [ungroupTrigger, selectedIds]);

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
            pushSnapshot();
            ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
            onImportImage?.(reader.result);
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
  }, [importTrigger, onImportImage]);

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

  const addTextAtPoint = (x, y) => {
    const text = window.prompt('Escribe el texto a insertar:');
    if (text === null || text.trim() === '') return;

    pushSnapshot();
    const nextElement = {
      id: createId(),
      type: 'text',
      x,
      y,
      text,
      color,
      font,
      fontSize: Math.max(16, thickness * 4),
    };
    const nextElements = [...elementsRef.current, nextElement];
    setElements(nextElements);
    elementsRef.current = nextElements;
  };

  const startBrushStroke = (point) => {
    setIsDrawing(true);
    const nextElement = {
      id: createId(),
      type: 'path',
      tool,
      color: tool === 'eraser' ? '#ffffff' : color,
      thickness,
      points: [point],
    };
    liveElementRef.current = nextElement;
  };

  const handlePointerDown = (event) => {
    const point = getCanvasPoint(event);
    if (!point) return;

    if (tool === 'pan') {
      panStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        panX: panOffset.x,
        panY: panOffset.y,
      };
      setIsPanning(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === 'select') {
      const selectedElements = elementsRef.current.filter((element) => selectedIds.includes(element.id));
      const activeSelection = selectedElements[0];
      const bounds = activeSelection ? getElementBounds(activeSelection) : null;
      const isHandleHit = (bounds && point.x >= bounds.x + bounds.width - 8 && point.x <= bounds.x + bounds.width + 8 && point.y >= bounds.y + bounds.height - 8 && point.y <= bounds.y + bounds.height + 8);
      if (bounds && isHandleHit) {
        transformStateRef.current = { mode: 'resize', startPoint: point, bounds };
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      const hitIndex = [...elementsRef.current].reverse().findIndex((element) => isPointInElement(point, element));
      const hitElement = hitIndex >= 0 ? elementsRef.current[elementsRef.current.length - 1 - hitIndex] : null;
      if (hitElement) {
        const ids = event.shiftKey ? [...selectedIds, hitElement.id] : [hitElement.id];
        setSelectedIds(ids.filter((id, index, arr) => arr.indexOf(id) === index));
        transformStateRef.current = { mode: 'move', startPoint: point, initialIds: ids, initialElements: cloneElements(elementsRef.current.filter((element) => ids.includes(element.id))) };
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      selectionStartRef.current = point;
      setSelectionBox({ x: point.x, y: point.y, width: 0, height: 0 });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === 'fill') {
      fillRegion(point.x, point.y);
      return;
    }

    if (tool === 'text') {
      addTextAtPoint(point.x, point.y);
      return;
    }

    if (tool === 'brush' || tool === 'eraser') {
      startBrushStroke(point);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === 'shape') {
      setShapeStart(point);
      setIsDrawing(true);
      liveElementRef.current = {
        id: createId(),
        type: 'shape',
        shapeType: shape,
        x1: point.x,
        y1: point.y,
        x2: point.x,
        y2: point.y,
        color,
        thickness,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event) => {
    if (isPanning && panStartRef.current) {
      const deltaX = event.clientX - panStartRef.current.x;
      const deltaY = event.clientY - panStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.panX + deltaX,
        y: panStartRef.current.panY + deltaY,
      });
      return;
    }

    const point = getCanvasPoint(event);
    if (!point) return;

    if (tool === 'select') {
      if (transformStateRef.current?.mode === 'move') {
        const deltaX = point.x - transformStateRef.current.startPoint.x;
        const deltaY = point.y - transformStateRef.current.startPoint.y;
        const selectedElements = elementsRef.current.filter((element) => transformStateRef.current.initialIds.includes(element.id));
        const nextElements = elementsRef.current.map((element) => {
          if (!transformStateRef.current.initialIds.includes(element.id)) return element;
          const original = transformStateRef.current.initialElements.find((item) => item.id === element.id);
          if (!original) return element;
          const transformed = cloneElement(original);
          if (transformed.type === 'path') {
            transformed.points = transformed.points.map((item) => ({ ...item, x: item.x + deltaX, y: item.y + deltaY }));
          } else if (transformed.type === 'shape') {
            transformed.x1 = transformed.x1 + deltaX;
            transformed.y1 = transformed.y1 + deltaY;
            transformed.x2 = transformed.x2 + deltaX;
            transformed.y2 = transformed.y2 + deltaY;
          } else if (transformed.type === 'text') {
            transformed.x = transformed.x + deltaX;
            transformed.y = transformed.y + deltaY;
          }
          return transformed;
        });
        setElements(nextElements);
        elementsRef.current = nextElements;
        return;
      }

      if (transformStateRef.current?.mode === 'resize') {
        const bounds = transformStateRef.current.bounds;
        const scaleX = clamp((point.x - bounds.x) / Math.max(bounds.width, 1), 0.4, 4);
        const scaleY = clamp((point.y - bounds.y) / Math.max(bounds.height, 1), 0.4, 4);
        const selectedElements = elementsRef.current.filter((element) => selectedIds.includes(element.id));
        const nextElements = elementsRef.current.map((element) => {
          if (!selectedIds.includes(element.id)) return element;
          const original = transformStateRef.current.initialElements.find((item) => item.id === element.id);
          if (!original) return element;
          const transformed = cloneElement(original);
          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;
          if (transformed.type === 'path') {
            transformed.points = transformed.points.map((item) => ({
              x: centerX + (item.x - centerX) * scaleX,
              y: centerY + (item.y - centerY) * scaleY,
            }));
          } else if (transformed.type === 'shape') {
            transformed.x1 = centerX + (transformed.x1 - centerX) * scaleX;
            transformed.y1 = centerY + (transformed.y1 - centerY) * scaleY;
            transformed.x2 = centerX + (transformed.x2 - centerX) * scaleX;
            transformed.y2 = centerY + (transformed.y2 - centerY) * scaleY;
          } else if (transformed.type === 'text') {
            transformed.x = centerX + (transformed.x - centerX) * scaleX;
            transformed.y = centerY + (transformed.y - centerY) * scaleY;
            transformed.fontSize = Math.max(12, Math.round((transformed.fontSize || 24) * Math.max(scaleX, scaleY)));
          }
          return transformed;
        });
        setElements(nextElements);
        elementsRef.current = nextElements;
        return;
      }

      if (selectionStartRef.current) {
        const width = point.x - selectionStartRef.current.x;
        const height = point.y - selectionStartRef.current.y;
        setSelectionBox({
          x: Math.min(selectionStartRef.current.x, point.x),
          y: Math.min(selectionStartRef.current.y, point.y),
          width: Math.abs(width),
          height: Math.abs(height),
        });
      }
      return;
    }

    if (tool === 'brush' || tool === 'eraser') {
      if (!isDrawing || !liveElementRef.current) return;
      const draft = cloneElement(liveElementRef.current);
      draft.points = [...draft.points, point];
      liveElementRef.current = draft;
      renderScene();
      return;
    }

    if (tool === 'shape' && isDrawing && shapeStart) {
      if (!liveElementRef.current) return;
      const draft = cloneElement(liveElementRef.current);
      draft.x2 = point.x;
      draft.y2 = point.y;
      liveElementRef.current = draft;
      renderScene();
    }
  };

  const handlePointerUp = (event) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }

    if (tool === 'select') {
      if (selectionStartRef.current) {
        const box = selectionBox || { x: 0, y: 0, width: 0, height: 0 };
        const selected = elementsRef.current.filter((element) => {
          const bounds = getElementBounds(element);
          return bounds && bounds.x >= box.x && bounds.y >= box.y && bounds.x + bounds.width <= box.x + box.width && bounds.y + bounds.height <= box.y + box.height;
        });
        setSelectedIds(selected.map((element) => element.id));
        selectionStartRef.current = null;
        setSelectionBox(null);
      }
      transformStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }

    if (tool === 'brush' || tool === 'eraser') {
      if (liveElementRef.current) {
        pushSnapshot();
        const nextElements = [...elementsRef.current, liveElementRef.current];
        setElements(nextElements);
        elementsRef.current = nextElements;
      }
      liveElementRef.current = null;
      setIsDrawing(false);
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }

    if (tool === 'shape' && isDrawing) {
      if (liveElementRef.current) {
        pushSnapshot();
        const nextElements = [...elementsRef.current, liveElementRef.current];
        setElements(nextElements);
        elementsRef.current = nextElements;
      }
      liveElementRef.current = null;
      setIsDrawing(false);
      setShapeStart(null);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const nextScale = clamp(scale + delta, 0.4, 4);
    zoomAtPoint(event.clientX, event.clientY, nextScale);
  };

  const handleTouchStart = (event) => {
    if (event.touches.length === 2) {
      const [first, second] = Array.from(event.touches);
      const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
      const midpointX = (first.clientX + second.clientX) / 2;
      const midpointY = (first.clientY + second.clientY) / 2;
      pinchStartRef.current = {
        distance,
        midpointX,
        midpointY,
        scale,
        panX: panOffset.x,
        panY: panOffset.y,
      };
    }
  };

  const handleTouchMove = (event) => {
    if (event.touches.length === 2 && pinchStartRef.current) {
      event.preventDefault();
      const [first, second] = Array.from(event.touches);
      const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
      const midpointX = (first.clientX + second.clientX) / 2;
      const midpointY = (first.clientY + second.clientY) / 2;
      const ratio = distance / pinchStartRef.current.distance;
      const nextScale = clamp(pinchStartRef.current.scale * ratio, 0.4, 4);
      const viewportRect = viewportRef.current?.getBoundingClientRect();
      if (!viewportRect) return;

      const worldX = (midpointX - viewportRect.left - pinchStartRef.current.panX) / pinchStartRef.current.scale;
      const worldY = (midpointY - viewportRect.top - pinchStartRef.current.panY) / pinchStartRef.current.scale;
      const nextPanX = midpointX - viewportRect.left - worldX * nextScale;
      const nextPanY = midpointY - viewportRect.top - worldY * nextScale;

      setPanOffset({ x: nextPanX, y: nextPanY });
      setScale(nextScale);
    }
  };

  const handleTouchEnd = (event) => {
    if (event.touches.length < 2) {
      pinchStartRef.current = null;
    }
  };

  return (
    <div className="workspace-wrapper">
      <div className="canvas-container">
        <div
          ref={viewportRef}
          className="retro-canvas-frame"
          style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px`, overflow: 'hidden' }}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <canvas
            ref={canvasRef}
            width={worldWidth}
            height={worldHeight}
            className="paint-canvas"
            style={{
              width: `${worldWidth}px`,
              height: `${worldHeight}px`,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              touchAction: 'none',
              cursor: tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair',
            }}
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
