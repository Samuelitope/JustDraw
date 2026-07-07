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
          savedImages.map((imgItem, index) => {
            const imageSource = typeof imgItem === 'string' ? imgItem : imgItem.src;
            const label = typeof imgItem === 'string' ? `dibujo_${index + 1}.bmp` : imgItem.label || `dibujo_${index + 1}.bmp`;

            return (
              <div key={typeof imgItem === 'string' ? `local-${index}` : imgItem.id || index} className="gallery-item-card">
                <div className="image-frame-inset">
                  <img src={imageSource} alt={`Guardado ${index + 1}`} className="gallery-thumb" />
                </div>
                <div className="gallery-item-label">{label}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SavedGallery;