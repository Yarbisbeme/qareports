import { FoxProReport, QaWarning, SelectionItem } from '@/types/report';

export function runQaLinter(report: FoxProReport | null): QaWarning[] {
  if (!report) return [];
  const warnings: QaWarning[] = [];

  const maxFruX = Math.max(
    ...(report.Bandas || []).flatMap(b => (b.Objetos || []).map(o => o.HPos + (o.Width || 0)))
  );

  const isLandscape = maxFruX > 85000;
  const limiteDerecho = isLandscape ? 105000 : 80000;

  // Regla 0: Verificar si un Reporte no tiene Detail
  const tieneDetail = report.Bandas?.some(b => b.TipoBanda === 'Detail');
  if (!tieneDetail) {
    warnings.push({
      id: 'no-detail',
      severidad: 'error',
      mensaje: 'El reporte no contiene ninguna banda Detail (ObjCode=4).',
    });
  }

  // Regla 1: Validar si falta Metadata crítica
  if (!report.Metadata?.Title?.Expr) {
    warnings.push({
      id: 'meta-title',
      severidad: 'warning',
      mensaje: 'El reporte no tiene un título definido en la Metadata.',
    });
  }

  report.Bandas?.forEach((banda, bandIdx) => {
    const objetos = banda.Objetos || [];

    objetos.forEach((obj, objIdx) => {
      const label = obj.Expr ? obj.Expr.replace(/['"]/g, '') : `Objeto [${objIdx}]`;

      // Regla 2: Tamaño cero (Elementos invisibles)
      if ((obj.Width === 0 || obj.Height === 0) && obj.TipoObj !== 'Line') {
        warnings.push({
          id: `zero-size-${bandIdx}-${objIdx}`,
          banda: banda.TipoBanda,
          severidad: 'error',
          mensaje: `El objeto "${label}" tiene ancho o alto igual a 0 (invisible).`,
          objeto: obj.Expr,
          // === AQUÍ ENVIAMOS EL OBJETO A SELECCIONAR ===
          relatedItems: [{ type: 'band', bandIdx, objIdx }] 
        });
      }

      // Regla 3: Desborde horizontal
      if ((obj.HPos + (obj.Width || 0)) > limiteDerecho) {
        warnings.push({
          id: `overflow-${bandIdx}-${objIdx}`,
          banda: banda.TipoBanda,
          severidad: 'warning',
          mensaje: `"${label}" se sale del margen derecho (Hoja ${isLandscape ? 'Horizontal' : 'Vertical'}).`,
          objeto: obj.Expr,
          // === AQUÍ ENVIAMOS EL OBJETO A SELECCIONAR ===
          relatedItems: [{ type: 'band', bandIdx, objIdx }]
        });
      }
      
      for (let i = objIdx + 1; i < objetos.length; i++) {
        const otro = objetos[i];
        
        if (obj.TipoObj === 'Shape' || otro.TipoObj === 'Shape') continue;

        const colisionH = obj.HPos < (otro.HPos + (otro.Width || 0)) && (obj.HPos + (obj.Width || 0)) > otro.HPos;
        const colisionV = obj.VPos < (otro.VPos + (otro.Height || 0)) && (obj.VPos + (obj.Height || 0)) > otro.VPos;

        if (colisionH && colisionV) {
          warnings.push({
            id: `collision-${bandIdx}-${objIdx}-${i}`,
            banda: banda.TipoBanda,
            severidad: 'error',
            mensaje: `Colisión detectada: "${label}" se encima con "${otro.Expr.replace(/['"]/g, '')}".`,
            objeto: obj.Expr,
            relatedItems: [
              { type: 'band', bandIdx, objIdx },     // El primer objeto
              { type: 'band', bandIdx, objIdx: i }   // El objeto con el que chocó
            ]
          });
        }
      }
    });
  });

  return warnings;
}