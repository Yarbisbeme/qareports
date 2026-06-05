# 🦊 FoxPro Report Editor & QA Linter

Una aplicación web moderna diseñada para visualizar, auditar y editar reportes de FoxPro (exportados a JSON) con una experiencia de usuario (UX) fluida, similar a herramientas de diseño profesionales como Figma o Illustrator.

## ✨ Características Principales

### 🎨 Lienzo de Diseño Interactivo (Canvas)
- **Renderizado Fiel:** Convierte las unidades nativas de FoxPro (FRUs) a píxeles para una representación exacta de Bandas (PageHeader, Detail, Footer) y Objetos (Fields, Labels, Shapes, Pictures).
- **Modo Zen de Redimensionamiento:** Interfaz limpia sin nodos molestos. El cursor detecta inteligentemente la proximidad a los bordes y cambia a modo `resize` de forma automática.
- **Drag & Drop Inteligente:** Mueve objetos libremente por el lienzo con soporte para múltiples elementos.
- **Selección por Caja (Marquee):** Dibuja un rectángulo en áreas vacías para seleccionar múltiples objetos a la vez. Soporta la tecla `Shift` para sumar elementos a la selección.
- **Guías Magnéticas (Snapping):** Al arrastrar objetos, estos se alinean automáticamente con los bordes de otros elementos en pantalla, mostrando líneas de guía rojas para una precisión milimétrica.
- **Ajuste de Altura de Bandas:** Redimensiona el `BandHeight` arrastrando el límite inferior de cualquier banda.

### 🛡️ Motor de QA y Linter en Tiempo Real
Un panel de auditoría integrado que escanea el reporte al instante en busca de errores estructurales:
- **Detección de Colisiones:** Advierte si los textos se superponen (ignorando inteligentemente elementos decorativos como Shapes y Lines).
- **Control de Desborde:** Detecta si los objetos se escapan del margen derecho de la página (soporta cálculo para páginas Verticales y Horizontales).
- **Objetos Fantasma:** Alerta sobre elementos con tamaño cero (invisibles).
- **Integración Bidireccional:** ¡Haz clic en cualquier error del panel de QA y la aplicación seleccionará y enfocará automáticamente los objetos culpables en el lienzo para que los corrijas!

### 🧠 Arquitectura de Datos Robusta
- **Motor ETL de Sanitización:** Al importar un JSON, el sistema calcula matemáticamente la posición de los objetos y los reasigna a su banda lógica correspondiente basándose en su `VPos`, limpiando reportes corruptos automáticamente.
- **Historial Completo (Undo/Redo):** Todo movimiento, redimensionamiento o eliminación se guarda en el historial. Soporte total para `Ctrl+Z` y `Ctrl+Y`.
- **Exportación Limpia:** Descarga el reporte corregido en un archivo JSON perfectamente formateado y listo para el backend.

---

## ⌨️ Atajos de Teclado (Shortcuts)

| Acción | Atajo (Windows / Mac) |
| :--- | :--- |
| **Mover (Nudge)** | `Flechas direccionales` (Mueve 100 FRUs) |
| **Movimiento Rápido** | `Shift` + `Flechas direccionales` (Mueve 1000 FRUs) |
| **Deshacer** | `Ctrl + Z` / `Cmd + Z` |
| **Rehacer** | `Ctrl + Y` / `Cmd + Shift + Z` |
| **Eliminar Objeto** | `Supr` / `Backspace` |
| **Selección Múltiple** | `Arrastrar en fondo` o `Shift` + `Clic en objeto` |

---

## 🛠️ Stack Tecnológico

- **Framework:** React / Next.js
- **Estilos:** Tailwind CSS (para una interfaz limpia, responsiva y personalizable).
- **Manejo de Estado:** [Zustand](https://github.com/pmndrs/zustand) (Garantiza transiciones rápidas, manejo del historial Undo/Redo y persistencia sin renders innecesarios).
- **Geometría Computacional:** Detección de colisiones (AABB - Axis-Aligned Bounding Box) para el Linter y la selección por caja.

---

## 📂 Estructura Principal del Código

- **`src/components/ReportCanvas.tsx`:** El corazón visual de la aplicación. Maneja el renderizado de bandas, la selección múltiple y los atajos de teclado.

- **`src/components/ReportObject.tsx`:** Componente altamente interactivo que maneja cursores dinámicos y la lógica individual de arrastre y redimensionamiento.

- **`src/store/useReportStore.ts`:** El cerebro de la app. Gestiona el estado de Zustand, el historial, y la lógica matemática de las selecciones y desplazamientos magnéticos.

- **`src/lib/qaRules.ts`:** Donde habitan las reglas de negocio del linter para auditar la calidad del reporte.

- **`src/lib/fruConverter.ts`:** Utilidad matemática para escalar y convertir FRUs a píxeles en pantalla.

## 📝 Notas de Desarrollo

El diseño prioriza no alterar la estructura original de los objetos de FoxPro (se preservan todos los atributos como `HPos`, `VPos`, `Width`, `Height` en FRU). Todas las transformaciones visuales son temporales (CSS) hasta que se decide aplicar un cambio al estado central.