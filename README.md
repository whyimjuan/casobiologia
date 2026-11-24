# AGAVE CASE SYSTEM — Archivo de evidencias 3D

Experiencia interactiva para examinar un expediente judicial simulado como si
fuera un archivo físico: ocho carpetas tridimensionales sobre una mesa, que se
acercan a la cámara, se abren por su solapa articulada y dejan asomar sus
documentos. Cada documento se puede extraer y leer (PDF, imagen o documento
maquetado) con zoom, desplazamiento, paginación, metadatos y observaciones.

> Todo el contenido es **material ficticio — simulación académica**.

## Uso

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ listo para publicar
```

Parámetro opcional `?calidad=high|balanced|low|simple` para forzar el perfil
gráfico (también se puede cambiar desde el selector «Gráficos»).

| Acción | Cómo |
|---|---|
| Abrir una carpeta | Clic / toque sobre la carpeta, o teclas `1`–`8` |
| Consultar un documento | Clic en la cabecera de la hoja que asoma, o en el índice del panel |
| Zoom | `+` / `−`, Ctrl + rueda, pellizco en tablet, botones «Página» y «Ancho» |
| Desplazarse | Arrastrar la hoja, rueda o dedo |
| Cambiar de página | `←` / `→` o botones ‹ › |
| Volver | `Esc` (documento → carpeta → conjunto) o los botones de regreso |

## Secuencias

**Apertura** (`FolderOpeningAnimation.ts`, GSAP):
A · la cámara se aproxima · B · la carpeta se despega de la mesa, crece y ocupa
el centro · C · gira para mostrar lomo y grosor · D · la solapa se abre por su
bisagra (dos tramos articulados: puente sobre el grosor + caída frontal) ·
E · los documentos emergen escalonados del bolsillo.

**Extracción** (`DocumentExtractionAnimation.ts`): la hoja sube desde el
interior, sale del contenedor, viaja en arco hacia la cámara girando hasta
quedar de frente y se amplía exactamente sobre el rectángulo que ocupará el
visor 2D (`lib/readingLayout.ts` comparte esa geometría entre ambos).

**Regreso**: el documento vuelve a su sitio, las hojas se reacomodan, la
solapa se cierra, la cámara retrocede y la carpeta vuelve a la mesa.

## Arquitectura

```
public/case/expediente.json   ← datos del expediente (se cargan en tiempo de ejecución)
public/case/docs/             ← PDF e imágenes de muestra
data-src/                     ← fuente editable: una carpeta por archivo JSON
scripts/build-case.mjs        ← ensambla expediente.json
scripts/generate-sample-pdfs.mjs ← genera los PDF/SVG ficticios de muestra

src/data/          tipos y carga del expediente (sin nada de 3D)
src/state/         máquina de estados (zustand): collection → opening → open → extracting → reading → returning → closing
src/three/
  PhysicalFolder3D.tsx        carpeta: paneles, lomo, fuelle, base, solapa con pivotes, etiqueta, herrajes dorados
  FolderCollection3D.tsx      las ocho carpetas sobre la mesa (4×2, o 2×4 en vertical)
  DocumentStack3D.tsx         hojas físicas dentro del bolsillo (sólo de la carpeta abierta)
  FolderOpeningAnimation.ts   secuencias de apertura y cierre
  DocumentExtractionAnimation.ts  extracción y regreso de una hoja
  SceneDirector.tsx           traduce fases en secuencias y aplica la cámara
  folderGeometry.ts / materials.ts / textures.ts   geometría compartida y texturas procedurales
src/ui/
  DocumentViewer.tsx          visor de lectura (PDF con pdf.js, imágenes, documentos maquetados)
  EvidenceMetadataPanel.tsx   índice de la carpeta, ficha y observaciones
  FolderNavigation.tsx        ruta, regresos, cambio de carpeta y calidad
  SimpleFolders2D.tsx         alternativa 2D para equipos sin WebGL o GPU limitada
```

Para añadir o cambiar documentos se editan los JSON de `data-src/` y se
ejecuta `node scripts/build-case.mjs`; la geometría no cambia. Cada documento
declara su fuente como `simulated` (páginas maquetadas), `pdf` (`url`) o
`image` (`urls`).

## Rendimiento

- Geometrías compartidas por las ocho carpetas; un único volumen de colisión por carpeta.
- Texturas procedurales en canvas (sin descargas); las hojas sólo se crean para la carpeta abierta y se liberan al cerrarla.
- Entorno de reflejos con Lightformers locales, renderizado una sola vez.
- Perfiles `high` (sombras suaves PCSS, reflejo en la mesa), `balanced`, `low`
  (sin mapas de sombra, sombras de contacto horneadas, DPR 1) y `simple` (2D).
  El perfil se elige según GPU, núcleos, memoria y tipo de puntero, y
  `PerformanceMonitor` reduce la resolución si caen los FPS.
- Three.js y pdf.js se cargan bajo demanda; el modo 2D no los descarga.
- Con `prefers-reduced-motion` las secuencias se aceleran.
