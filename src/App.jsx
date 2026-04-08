import React, { useRef, useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

export default function App() {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState("brush"); // "brush", "eraser", "rect", "circle", "crop"
  const [drawings, setDrawings] = useState([]);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState(null);
  const [cropArea, setCropArea] = useState(null); // Guarda el área de recorte temporal

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
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(temp, 0, 0);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    loadDrawings();
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const getPosition = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    const pos = getPosition(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    setStartPos(pos);
    setDrawing(true);
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
    setCropArea(null); // Limpiar recorte previo si existe

    if (tool === "brush" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e) => {
    if (!drawing) return;
    const pos = getPosition(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Para figuras y recorte, necesitamos restaurar el snapshot constantemente
    if (tool === "rect" || tool === "circle" || tool === "crop") {
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
    } else if (tool === "crop") {
      // Dibujar el rectángulo de selección de recorte (línea discontinua)
      ctx.strokeStyle = "#007bff"; // Azul para la selección
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]); // Línea discontinua
      const width = pos.x - startPos.x;
      const height = pos.y - startPos.y;
      ctx.strokeRect(startPos.x, startPos.y, width, height);
      ctx.setLineDash([]); // Restaurar línea sólida

      // Guardar el área seleccionada temporalmente
      setCropArea({
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(width),
        height: Math.abs(height)
      });
    }
  };

  const stopDrawing = () => {
    setDrawing(false);
    // Si la herramienta es recorte y se seleccionó un área, podrías
    // mostrar un botón de "Confirmar Recorte" aquí. Para simplificar,
    // el recorte se aplicará cuando el usuario presione un botón extra en la barra.
  };

  // Función para aplicar el recorte seleccionado
  const applyCrop = () => {
    if (!cropArea || cropArea.width === 0 || cropArea.height === 0) {
      alert("Por favor, selecciona un área para recortar primero.");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // 1. Capturar los píxeles del área seleccionada del snapshot original
    // (usamos el snapshot para no incluir las líneas discontinuas de selección)
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvas.getContext("2d").putImageData(snapshot, 0, 0);

    const croppedImageData = tempCanvas.getContext("2d").getImageData(
      cropArea.x, cropArea.y, cropArea.width, cropArea.height
    );

    // 2. Limpiar el canvas principal y rellenarlo de blanco
    clearCanvas();

    // 3. Dibujar la imagen recortada de vuelta en el canvas principal
    // (la dibujamos en la esquina superior izquierda 0,0)
    ctx.putImageData(croppedImageData, 0, 0);

    // 4. Limpiar el estado de recorte
    setCropArea(null);
    setTool("brush"); // Volver al pincel después de recortar
    alert("Imagen recortada. Nota: El tamaño del lienzo no cambió, solo se movió el contenido.");
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setCropArea(null); // Limpiar recorte si se limpia el lienzo
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
    <div style={{ background: "#f0f0f0", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "60px",
          background: "white", display: "flex", alignItems: "center",
          padding: "0 15px", gap: "10px", borderBottom: "1px solid #ccc", zIndex: 1000
        }}>
        <strong>Paint Fill Pro</strong>

        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={tool === "eraser" || tool === "crop"} />
        <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} disabled={tool === "crop"} />

        <button onClick={() => setTool("brush")} style={btnStyle(tool === "brush")}>✏️</button>
        <button onClick={() => setTool("eraser")} style={btnStyle(tool === "eraser")}>🧽</button>
        <button onClick={() => setTool("rect")} style={btnStyle(tool === "rect")}>⬛</button>
        <button onClick={() => setTool("circle")} style={btnStyle(tool === "circle")}>⭕</button>
        
        {/* Nueva herramienta de recorte */}
        <button onClick={() => setTool("crop")} style={btnStyle(tool === "crop")}>✂️ Recortar</button>
        
        {/* Botón para aplicar el recorte */}
        {tool === "crop" && cropArea && (
          <button onClick={applyCrop} style={{...btnStyle(false), background: "#28a745", color: "white"}}>✔️ Confirmar</button>
        )}

        <button onClick={clearCanvas} style={btnStyle(false)}>🗑️</button>
        <button onClick={saveToDatabase} style={btnStyle(false)}>☁️</button>
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
          display: "block", marginTop: "60px", 
          width: "100vw", height: "calc(100vh - 60px)", 
          touchAction: "none", 
          cursor: tool === "crop" ? "nwse-resize" : "crosshair" 
        }}
      />

      <div style={{ position: "fixed", right: 0, top: "60px", width: "160px", height: "calc(100vh - 60px)", background: "#fff", borderLeft: "1px solid #ccc", padding: 10, overflowY: "auto" }}>
        <h4 style={{ margin: "0 0 10px 0" }}>Galería</h4>
        {drawings.map((d, i) => (
          <img key={i} src={d.image} width="100%" style={{ marginBottom: 10, borderRadius: "4px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }} alt="saved" />
        ))}
      </div>
    </div>
  );
}

const btnStyle = (active) => ({
  padding: "8px 12px",
  border: "1px solid #ccc",
  borderRadius: "4px",
  background: active ? "#007bff" : "white",
  color: active ? "white" : "black",
  cursor: "pointer",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  gap: "5px"
});