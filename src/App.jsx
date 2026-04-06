import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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

  const saveImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "drawing.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div style={{ background: darkMode ? "#1e1e1e" : "#f0f0f0" }}>
      {/* Toolbar */}
      <div
        style={{
          position: "fixed",
          top: 10,
          left: 10,
          background: darkMode ? "#333" : "white",
          padding: 10,
          borderRadius: 10,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input type="color" onChange={(e) => setColor(e.target.value)} />

        <input
          type="range"
          min="1"
          max="50"
          value={brushSize}
          onChange={(e) => setBrushSize(e.target.value)}
        />

        <button onClick={() => setIsEraser(!isEraser)}>
          {isEraser ? "Brush" : "Eraser"}
        </button>

        <button onClick={clearCanvas}>Clear</button>

        <button onClick={saveImage}>Save</button>

        <button onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "Light" : "Dark"}
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
        style={{ display: "block" }}
      />
    </div>
  );
}
