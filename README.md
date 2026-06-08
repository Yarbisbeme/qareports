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

## 🧩 Entendiendo el Sistema de Medidas (FRU vs PX)

Una de las mayores complejidades de editar reportes legacy en la web es la diferencia de unidades. FoxPro no usa píxeles; usa FRUs (FoxPro Report Units).

- 1 Pulgada = 10,000 FRUs

- Un documento de tamaño carta (Letter) mide lógicamente `85,000 x 110,000 FRUs`.

**¿Cómo lo manejamos en la UI?**
Para visualizar esto en la web sin que el navegador colapse, nuestra utilidad `fruConverter.ts` divide los FRUs entre 104.166.

- Ejemplo: Si en FoxPro un objeto tiene `Width: 10416` (aprox. 1 pulgada), en nuestro lienzo de React se renderizará con exactamente `100px`.

- Al exportar el JSON o mover un objeto, el sistema hace la conversión inversa automáticamente para garantizar que el archivo devuelto sea 100% compatible con tu motor original.

## 🔌 El Paradigma ETL (Sanitización al Importar)
Los archivos JSON generados desde `.FRX` heredados suelen tener "objetos huérfanos" (por ejemplo, un campo que pertenece lógicamente a un `GroupHeader` pero cuyas coordenadas `VPos` caen dentro del `Detail`). Si intentáramos renderizar eso directamente, el lienzo se rompería.

Para solucionarlo, usamos un enfoque ETL (**Extract, Transform, Load**) en nuestro `useReportStore.ts`:

- **Extract:** Extraemos todos los objetos de todas las bandas hacia una única piscina temporal.

- **Transform:** Calculamos matemáticamente dónde empieza y termina visualmente cada banda. Luego, reasignamos cada objeto a la banda correcta basándonos estrictamente en su coordenada `VPos`.

- **Load:** Cargamos esta estructura "limpia" (Sanitizada) en el lienzo de React.


## Ejemplo de Json valido

```
{
  "ReportId": "rrhrw001",
  "Tipo": "Grupo",
  "Metadata": {
    "Company": { "Label": "", "Expr": "xTitulo1", "VPos": 1042, "HPos": 18542, "Width": 43854, "Height": 2188, "FontSize": 12 },
    "Title": { "Label": "", "Expr": "\"LISTADO DE TRANSACCIONES DE NOMINA\"", "VPos": 3125, "HPos": 23229, "Width": 35104, "Height": 2083, "FontSize": 12 },
    "Subtitle": { "Label": "", "Expr": "alltr(wb_descri)+'   '+\"Pago No. \"+allt(str(Wg_secuen))+' del '+allt(str(wg_ano_ref))", "VPos": 4792, "HPos": 19375, "Width": 42917, "Height": 1771, "FontSize": 9 }
  },
  "VariablesSistema": [
    { "Label": "\"Fecha :\"", "Expr": "Date()", "VPos": 938, "HPos": 69792, "Width": 7917, "Height": 1771, "FontSize": 9 },
    { "Label": "\"Página:\"", "Expr": "_pageno", "VPos": 4688, "HPos": 69792, "Width": 7917, "Height": 1771, "FontSize": 9 },
    { "Label": "\"Hora:\"", "Expr": "time()", "VPos": 2813, "HPos": 69792, "Width": 7917, "Height": 1771, "FontSize": 9 }
  ],
  "Bandas": [
    {
      "TipoBanda": "PageHeader",
      "Nivel": 0,
      "Objetos": [
        {"TipoObj": "Picture", "Expr": "", "VPos": 1354, "HPos": 1354, "Width": 11354, "Height": 6354, "FontSize": 0},
        {"TipoObj": "Shape", "Expr": "", "VPos": 417, "HPos": 729, "Width": 78021, "Height": 8229, "FontSize": 0},
        {"TipoObj": "Shape", "Expr": "", "VPos": 8750, "HPos": 417, "Width": 78750, "Height": 2083, "FontSize": 0},
        {"TipoObj": "Label", "Expr": "\"Código\"", "VPos": 9063, "HPos": 5625, "Width": 4688, "Height": 1667, "FontSize": 10},
        {"TipoObj": "Label", "Expr": "\"Empleado\"", "VPos": 9063, "HPos": 15625, "Width": 6667, "Height": 1667, "FontSize": 10},
        {"TipoObj": "Label", "Expr": "\"Monto\"", "VPos": 9063, "HPos": 61563, "Width": 4063, "Height": 1667, "FontSize": 10},
        {"TipoObj": "Line", "Expr": "", "VPos": 40938, "HPos": 104, "Width": 78958, "Height": 104, "FontSize": 0},
        {"TipoObj": "Line", "Expr": "", "VPos": 16979, "HPos": 0, "Width": 79375, "Height": 104, "FontSize": 0},
        {"TipoObj": "Label", "Expr": "\"Acumulado\"", "VPos": 8958, "HPos": 70625, "Width": 7500, "Height": 1667, "FontSize": 10},
        {"TipoObj": "Label", "Expr": "\"Cantidad\"", "VPos": 9063, "HPos": 48750, "Width": 5938, "Height": 1667, "FontSize": 10},
        {"TipoObj": "Field", "Expr": "Nomina_Estatus", "VPos": 6667, "HPos": 31042, "Width": 19479, "Height": 1771, "FontSize": 9}
      ]
    },
    {
      "TipoBanda": "GroupHeader",
      "Nivel": 2,
      "AgrupaPor": "Wc_Codigo",
      "Objetos": [
        {"TipoObj": "Field", "Expr": "Wc_Descri", "VPos": 15104, "HPos": 7917, "Width": 38958, "Height": 1771, "FontSize": 9},
        {"TipoObj": "Field", "Expr": "Wc_codigo", "VPos": 15104, "HPos": 1354, "Width": 6354, "Height": 1771, "FontSize": 9}
      ]
    },
    {
      "TipoBanda": "GroupHeader",
      "Nivel": 3,
      "AgrupaPor": "of_codigo",
      "Objetos": [
        {"TipoObj": "Field", "Expr": "of_descri", "VPos": 19271, "HPos": 6875, "Width": 36354, "Height": 1771, "FontSize": 9},
        {"TipoObj": "Field", "Expr": "of_codigo", "VPos": 19271, "HPos": 1563, "Width": 5000, "Height": 1771, "FontSize": 9}
      ]
    },
    {
      "TipoBanda": "GroupHeader",
      "Nivel": 4,
      "AgrupaPor": "ub_codigo",
      "Objetos": [
        {"TipoObj": "Field", "Expr": "ub_descri", "VPos": 23333, "HPos": 6875, "Width": 36354, "Height": 1771, "FontSize": 9},
        {"TipoObj": "Field", "Expr": "ub_codigo", "VPos": 23333, "HPos": 1563, "Width": 5000, "Height": 1771, "FontSize": 9}
      ]
    },
    {
      "TipoBanda": "Detail",
      "Nivel": 0,
      "Objetos": [
        {"TipoObj": "Field", "Expr": "maenomi", "VPos": 27188, "HPos": 3750, "Width": 6458, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "Nombre", "VPos": 27188, "HPos": 10417, "Width": 37188, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "Wp_Monto", "VPos": 27188, "HPos": 57604, "Width": 9896, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "iif(tipo_empl='F',' ',Tipo_empl)", "VPos": 27188, "HPos": 1667, "Width": 1875, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "monto_acum", "VPos": 27188, "HPos": 68958, "Width": 10208, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "Wv_cantida", "VPos": 27188, "HPos": 49688, "Width": 5104, "Height": 1667, "FontSize": 8}
      ]
    },
    {
      "TipoBanda": "GroupFooter",
      "Nivel": 4,
      "AgrupaPor": "ub_codigo",
      "Objetos": [
        {"TipoObj": "Field", "Expr": "Wp_Monto", "VPos": 31146, "HPos": 55729, "Width": 11667, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "'Total ' +ub_descri", "VPos": 31146, "HPos": 10521, "Width": 33229, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Line", "Expr": "", "VPos": 31042, "HPos": 25000, "Width": 53125, "Height": 104, "FontSize": 0},
        {"TipoObj": "Field", "Expr": "monto_acum", "VPos": 31250, "HPos": 68958, "Width": 10208, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "Wv_cantida", "VPos": 31146, "HPos": 49688, "Width": 5104, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "maenomi", "VPos": 31250, "HPos": 43958, "Width": 5729, "Height": 1667, "FontSize": 8}
      ]
    },
    {
      "TipoBanda": "GroupFooter",
      "Nivel": 3,
      "AgrupaPor": "of_codigo",
      "Objetos": [
        {"TipoObj": "Field", "Expr": "Wp_Monto", "VPos": 35104, "HPos": 55625, "Width": 11771, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "'Total ' +of_descri", "VPos": 35104, "HPos": 10625, "Width": 33229, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "monto_acum", "VPos": 35104, "HPos": 68958, "Width": 10208, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "Wv_cantida", "VPos": 35104, "HPos": 49688, "Width": 5104, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "maenomi", "VPos": 35104, "HPos": 43958, "Width": 5729, "Height": 1667, "FontSize": 8}
      ]
    },
    {
      "TipoBanda": "GroupFooter",
      "Nivel": 2,
      "AgrupaPor": "Wc_Codigo",
      "Objetos": [
        {"TipoObj": "Line", "Expr": "", "VPos": 38854, "HPos": 0, "Width": 78958, "Height": 104, "FontSize": 0},
        {"TipoObj": "Field", "Expr": "Wp_Monto", "VPos": 39167, "HPos": 53958, "Width": 13542, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "'Total ' +Wc_Descri", "VPos": 39167, "HPos": 10625, "Width": 33125, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "monto_acum", "VPos": 39167, "HPos": 67708, "Width": 11458, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "Wv_cantida", "VPos": 39167, "HPos": 49688, "Width": 5208, "Height": 1667, "FontSize": 8},
        {"TipoObj": "Field", "Expr": "maenomi", "VPos": 39167, "HPos": 43854, "Width": 5729, "Height": 1667, "FontSize": 8}
      ]
    },
    {
      "TipoBanda": "PageFooter",
      "Nivel": 0,
      "Objetos": [
        {"TipoObj": "Label", "Expr": "\"(rrhrw001)\"", "VPos": 45208, "HPos": 73750, "Width": 5208, "Height": 833, "FontSize": 6}
      ]
    }
  ]
}
```

## 📝 Notas de Desarrollo

El diseño prioriza no alterar la estructura original de los objetos de FoxPro (se preservan todos los atributos como `HPos`, `VPos`, `Width`, `Height` en FRU). Todas las transformaciones visuales son temporales (CSS) hasta que se decide aplicar un cambio al estado central.
