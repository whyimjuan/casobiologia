/**
 * Marca visible y obligatoria sobre toda página. Las bandas se superponen a
 * cualquier documento (incluidos PDF e imágenes aportados sin marca); la
 * marca diagonal se omite cuando el archivo ya la lleva incorporada.
 */
export function Watermark({ diagonal = true }: { diagonal?: boolean }) {
  return (
    <div className="watermark" aria-hidden>
      <div className="watermark-band">MATERIAL FICTICIO — SIMULACIÓN ACADÉMICA</div>
      {diagonal && (
        <div className="watermark-diagonal">
          <span>MATERIAL FICTICIO</span>
          <span>SIMULACIÓN ACADÉMICA</span>
        </div>
      )}
      <div className="watermark-band is-bottom">MATERIAL FICTICIO — SIMULACIÓN ACADÉMICA</div>
    </div>
  );
}
