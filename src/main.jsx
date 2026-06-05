import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Asegúrate de que App.jsx esté en la carpeta src
import './index.css' // O el archivo donde tengas tus estilos globales

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
