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
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      ctx.fillStyle = darkMode ? "#1e1e1e" : "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    const { x, y } = getPosition(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;

    const { x, y } = getPosition(e);
    const ctx = canvasRef.current.getContext("2d");

    ctx.lineTo(x, y);
    ctx.strokeStyle = isEraser ? (darkMode ? "#1e1e1e" : "white") : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = darkMode ? "#1e1e1e" : "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // 💾 Guardar en Firebase
  const saveToDatabase = async () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL();

    await addDoc(collection(db, "drawings"), {
      image: dataURL,
      createdAt: new Date(),
    });

    alert("Guardado en la nube 🚀");
    loadDrawings();
  };

  // 📜 Cargar historial
  const loadDrawings = async () => {
    const querySnapshot = await getDocs(collection(db, "drawings"));
    const list = [];

    querySnapshot.forEach((doc) => {
      list.push(doc.data());
    });

    setDrawings(list);
  };

  return (
    <div style={{ background: darkMode ? "#1e1e1e" : "#f0f0f0" }}>
      
      {/* Toolbar */}
      <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "60px",
            background: darkMode ? "#2b2b2b" : "#ffffff",
            display: "flex",
            alignItems: "center",
            padding: "0 15px",
            gap: "15px",
            borderBottom: "1px solid #ccc",
            zIndex: 1000
          }}
        >
          <strong>Paint App</strong>

          {/* Color */}
          <input
            type="color"
            onChange={(e) => setColor(e.target.value)}
          />

          {/* Tamaño */}
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(e.target.value)}
          />

          {/* Herramientas */}
          <button onClick={() => setIsEraser(false)}>
            ✏️ Brush
          </button>

          <button onClick={() => setIsEraser(true)}>
            🧽 Eraser
          </button>

          <button onClick={clearCanvas}>
            🗑️ Clear
          </button>

          <button onClick={saveToDatabase}>
            ☁️ Save
          </button>

          <button onClick={saveImage}>
            💾 Download
          </button>

          <button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
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
          display: "block",
          marginTop: "60px", // 👈 espacio para la barra
          width: "100vw",
          height: "calc(100vh - 60px)"
         }}
      />

      {/* 📜 Historial */}
      <div style={{
        position: "fixed",
        right: 10,
        top: 10,
        background: "white",
        padding: 10,
        maxHeight: "90vh",
        overflow: "auto",
        width: "100vw",
        height: "100vh",
      background: darkMode ? "#1e1e1e" : "#f0f0f0"
      }}>
        <h3>Historial</h3>
        {drawings.map((d, i) => (
          <img
            key={i}
            src={d.image}
            width="100"
            style={{ display: "block", marginBottom: 10 }}
          />
        ))}
      </div>
    </div>
  );
}