import React from 'react';

function SavedGallery({ savedImages }) {
  return (
    <div className="retro-window gallery-window">
      <div className="window-title-bar">
        <span className="window-title-text">Imágenes Guardadas en el Historial</span>
      </div>
      
      <div className="gallery-container">
        {savedImages.length === 0 ? (
          <div className="empty-gallery-text">No hay imágenes guardadas en esta sesión.</div>
        ) : (
          savedImages.map((imgSrc, index) => (
            <div key={index} className="gallery-item-card">
              <div className="image-frame-inset">
                <img src={imgSrc} alt={`Guardado ${index + 1}`} className="gallery-thumb" />
              </div>
              <div className="gallery-item-label">dibujo_{index + 1}.bmp</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SavedGallery;