/** Marca visible y obligatoria sobre toda página simulada. */
export function Watermark() {
  return (
    <div className="watermark" aria-hidden>
      <div className="watermark-band">MATERIAL FICTICIO — SIMULACIÓN ACADÉMICA</div>
      <div className="watermark-diagonal">
        <span>MATERIAL FICTICIO</span>
        <span>SIMULACIÓN ACADÉMICA</span>
      </div>
      <div className="watermark-band is-bottom">MATERIAL FICTICIO — SIMULACIÓN ACADÉMICA</div>
    </div>
  );
}
