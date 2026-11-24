import { useState } from 'react';

/** Imagen documental (fotografía, escaneo). Informa de su proporción al visor. */
export function ImagePageView({ url, alt, onAspect }: { url: string; alt: string; onAspect: (hOverW: number) => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="image-page">
      <img
        src={url}
        alt={alt}
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth) onAspect(img.naturalHeight / img.naturalWidth);
          setLoaded(true);
        }}
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}
