import React, { useRef, useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

export default function App() {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [drawings, setDrawings] = useState([]);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const temp = document.createElement("canvas");
      temp.width = canvas.width;
      temp.height = canvas.height;
      temp.getContext("2d").drawImage(canvas, 0, 0);

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Fill background
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = darkMode ? "#1e1e1e" : "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(temp, 0, 0);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    loadDrawings();

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [darkMode]);

  const getPosition = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    const { x, y } = getPosition(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set mode at the START of the stroke
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;

    const { x, y } = getPosition(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round"; 
    ctx.stroke();
  };

  const stopDrawing = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = darkMode ? "#1e1e1e" : "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveToDatabase = async () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL();
    await addDoc(collection(db, "drawings"), { image: dataURL, createdAt: new Date() });
    alert("Guardado en la nube 🚀");
    loadDrawings();
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "drawing.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  const loadDrawings = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "drawings"));
      const list = querySnapshot.docs.map(doc => doc.data());
      setDrawings(list);
    } catch (error) {
      console.error("Error cargando dibujos:", error);
    }
  };

  return (
    <div style={{ background: darkMode ? "#1e1e1e" : "#f0f0f0", minHeight: "100vh" }}>
      <div style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "60px",
        background: darkMode ? "#2b2b2b" : "#ffffff", display: "flex",
        alignItems: "center", padding: "0 15px", gap: "15px", borderBottom: "1px solid #ccc", zIndex: 1000
      }}>
        <strong style={{ color: darkMode ? "white" : "black" }}>Paint App</strong>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={isEraser} />
        <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} />
        
        <button onClick={() => setIsEraser(false)} style={{ background: !isEraser ? "#ddd" : "transparent" }}>✏️ Brush</button>
        <button onClick={() => setIsEraser(true)} style={{ background: isEraser ? "#ddd" : "transparent" }}>🧽 Eraser</button>
        <button onClick={clearCanvas}>🗑️ Clear</button>
        <button onClick={saveToDatabase}>☁️ Save</button>
        <button onClick={saveImage}>💾 Download</button>
        <button onClick={() => setDarkMode(!darkMode)}>{darkMode ? "☀️ Light" : "🌙 Dark"}</button>
      </div>

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
          display: "block",
          marginTop: "60px",
          width: "100vw",
          height: "calc(100vh - 60px)",
          touchAction: "none",
          cursor: isEraser ? "cell" : "crosshair"
        }}
      />

      <div style={{
        position: "fixed", right: 0, top: "60px", width: "200px", height: "calc(100vh - 60px)",
        background: darkMode ? "#2b2b2b" : "#f9f9f9", borderLeft: "1px solid #ccc",
        padding: 10, overflowY: "auto", zIndex: 100
      }}>
        <h3 style={{ color: darkMode ? "white" : "black" }}>Historial</h3>
        {drawings.map((d, i) => (
          <img key={i} src={d.image} width="100%" style={{ marginBottom: 10, borderRadius: "5px", border: "1px solid #ddd" }} />
        ))}
      </div>
    </div>
  );
}