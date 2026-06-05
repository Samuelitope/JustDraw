import React, { useRef, useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

export default function App() {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState("brush"); // "brush", "eraser", "rect", "circle", "triangle", "line", "crop"
  const [drawings, setDrawings] = useState([]);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState(null);
  const [cropArea, setCropArea] = useState(null);
  const [history, setHistory] = useState([]);

  // Controlar si la galería lateral está abierta en móvil
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const temp = document.createElement("canvas");
      temp.width = canvas.width;
      temp.height = canvas.height;
      temp.getContext("2d").drawImage(canvas, 0, 0);

      // En móviles restamos 100px (60px de la barra superior + 40px de la barra de pincel si aplica)
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 60;
      
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(temp, 0, 0);

      const initialSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialSnapshot]);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    loadDrawings();

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const getPosition = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Soporte nativo para eventos Touch (móviles) y Mouse (escritorio)
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    // Previene el scroll o refresco por arrastre en móviles
    if (e.cancelable) e.preventDefault();
    
    const pos = getPosition(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    setStartPos(pos);
    setDrawing(true);
    
    const currentSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setSnapshot(currentSnapshot);
    setCropArea(null);

    if (tool === "brush" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e) => {
    if (!drawing) return;
    if (e.cancelable) e.preventDefault(); // Evita scroll molesto al dibujar

    const pos = getPosition(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (tool !== "brush" && tool !== "eraser") {
      ctx.putImageData(snapshot, 0, 0);
    }

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "eraser" ? "white" : color;
    ctx.fillStyle = color;

    if (tool === "brush" || tool === "eraser") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "rect") {
      const width = pos.x - startPos.x;
      const height = pos.y - startPos.y;
      ctx.fillRect(startPos.x, startPos.y, width, height);
      ctx.strokeRect(startPos.x, startPos.y, width, height);
    } else if (tool === "circle") {
      ctx.beginPath();
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (tool === "triangle") {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.lineTo(startPos.x - (pos.x - startPos.x), pos.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "crop") {
      ctx.strokeStyle = "#007bff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      const width = pos.x - startPos.x;
      const height = pos.y - startPos.y;
      ctx.strokeRect(startPos.x, startPos.y, width, height);
      ctx.setLineDash([]);

      setCropArea({
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(width),
        height: Math.abs(height)
      });
    }
  };

  const stopDrawing = (e) => {
    if (!drawing) return;
    setDrawing(false);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const newSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, newSnapshot]);
  };

  const undo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const newHistory = [...history];
    newHistory.pop();
    const previousSnapshot = newHistory[newHistory.length - 1];
    ctx.putImageData(previousSnapshot, 0, 0);
    setHistory(newHistory);
  };

  const applyCrop = () => {
    if (!cropArea || cropArea.width === 0 || cropArea.height === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvas.getContext("2d").putImageData(snapshot, 0, 0);

    const croppedImageData = tempCanvas.getContext("2d").getImageData(
      cropArea.x, cropArea.y, cropArea.width, cropArea.height
    );

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(croppedImageData, 0, 0);

    const croppedSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, croppedSnapshot]);
    setCropArea(null);
    setTool("brush");
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setCropArea(null);
    const blankSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, blankSnapshot]);
  };

  const saveToDatabase = async () => {
    const canvas = canvasRef.current;
    await addDoc(collection(db, "drawings"), { image: canvas.toDataURL(), createdAt: new Date() });
    alert("Guardado exitoso 🎨");
    loadDrawings();
  };

  const loadDrawings = async () => {
    const querySnapshot = await getDocs(collection(db, "drawings"));
    setDrawings(querySnapshot.docs.map(doc => doc.data()));
  };

  return (
    <div style={{ background: "#f0f0f0", minHeight: "100vh", fontFamily: "sans-serif", overflow: "hidden" }}>
      
      {/* Toolbar Flexible y Responsiva */}
      <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "60px",
          background: "white", display: "flex", alignItems: "center",
          padding: "0 10px", gap: "8px", borderBottom: "1px solid #ccc", zIndex: 1000,
          overflowX: "auto", whiteSpace: "nowrap" // Permite scroll horizontal si los botones no caben
        }}>
        
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={tool === "eraser" || tool === "crop"} style={{ minWidth: "35px", height: "35px", padding: 0, border: "none", borderRadius: "4px" }} />
        <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} disabled={tool === "crop"} style={{ width: "70px" }} />

        <button onClick={() => setTool("brush")} style={btnStyle(tool === "brush")}>✏️</button>
        <button onClick={() => setTool("eraser")} style={btnStyle(tool === "eraser")}>🧽</button>
        
        <select 
          value={["rect", "circle", "triangle", "line"].includes(tool) ? tool : "shapes"} 
          onChange={(e) => setTool(e.target.value)}
          style={{ padding: "8px 4px", borderRadius: "4px", border: "1px solid #ccc", background: "white", fontSize: "14px" }}
        >
          <option value="shapes" disabled>📐 Figuras</option>
          <option value="rect">⬛ Rect</option>
          <option value="circle">⭕ Círc</option>
          <option value="triangle">🔺 Tria</option>
          <option value="line">➖ Línea</option>
        </select>
        
        <button onClick={() => setTool("crop")} style={btnStyle(tool === "crop")}>✂️</button>
        
        {tool === "crop" && cropArea && (
          <button onClick={applyCrop} style={{...btnStyle(false), background: "#28a745", color: "white"}}>✔️</button>
        )}

        <button onClick={undo} disabled={history.length <= 1} style={{...btnStyle(false), opacity: history.length <= 1 ? 0.5 : 1}}>↩️</button>
        <button onClick={clearCanvas} style={btnStyle(false)}>🗑️</button>
        <button onClick={saveToDatabase} style={btnStyle(false)}>☁️</button>
        
        {/* Botón para abrir la galería en móvil */}
        <button onClick={() => setShowGallery(!showGallery)} style={btnStyle(showGallery)}>🖼️ ({drawings.length})</button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{ 
          display: "block", marginTop: "60px", 
          width: "100vw", height: "calc(100vh - 60px)", 
          touchAction: "none" // Bloquea gestos del navegador (zoom/scroll) obligatoriamente
        }}
      />

      {/* Galería Lateral Colapsable (Responsiva) */}
      <div style={{ 
        position: "fixed", 
        right: 0, 
        top: "60px", 
        width: "160px", 
        height: "calc(100vh - 60px)", 
        background: "#fff", 
        borderLeft: "1px solid #ccc", 
        padding: 10, 
        overflowY: "auto", 
        zIndex: 1001,
        transition: "transform 0.3s ease",
        // En móviles se esconde hacia la derecha si showGallery es false
        transform: showGallery ? "translateX(0)" : "translateX(100%)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h4 style={{ margin: 0 }}>Galería</h4>
          <button onClick={() => setShowGallery(false)} style={{ border: "none", background: "transparent", fontSize: "16px", cursor: "pointer" }}>❌</button>
        </div>
        {drawings.map((d, i) => (
          <img key={i} src={d.image} width="100%" style={{ marginBottom: 10, borderRadius: "4px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }} alt="saved" />
        ))}
      </div>
    </div>
  );
}

const btnStyle = (active) => ({
  padding: "8px 10px",
  border: "1px solid #ccc",
  borderRadius: "4px",
  background: active ? "#007bff" : "white",
  color: active ? "white" : "black",
  fontSize: "16px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer"
});