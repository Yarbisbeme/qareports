import { FoxProReport } from '@/types/report';

export const exportSanitizedJson = (rawReport: FoxProReport) => {
  // 1. Clonación profunda para no mutar el estado de la app
  const cleanReport = JSON.parse(JSON.stringify(rawReport)) as FoxProReport & { Bandas: any[] };

  // 2. Extraer y ordenar todos los objetos del reporte original
  const allObjects: any[] = [];
  cleanReport.Bandas.forEach((band) => {
    (band.Objetos || []).forEach((obj) => {
      allObjects.push({ ...obj, _originalBand: band.TipoBanda }); // Guardamos su origen por si acaso
    });
  });

  // 3. Calcular los límites matemáticos de cada banda (Start y End)
  const bandBoundaries = cleanReport.Bandas.map((band, idx) => {
    const startVPos = band.TipoBanda === 'PageHeader' 
      ? 0 
      : Math.min(...(band.Objetos || []).map(o => o.VPos || 0));
    
    return {
      idx,
      tipo: band.TipoBanda,
      nivel: band.Nivel,
      startVPos,
      endVPos: 999999 // Por defecto infinito, se ajustará en el siguiente paso
    };
  });

  // Ajustar el EndVPos de cada banda basándose en el inicio de la siguiente
  for (let i = 0; i < bandBoundaries.length; i++) {
    if (i < bandBoundaries.length - 1) {
      bandBoundaries[i].endVPos = bandBoundaries[i + 1].startVPos;
    }
  }

  // 4. Limpiamos las bandas para re-insertar los objetos correctamente
  cleanReport.Bandas.forEach(b => {
    b.Objetos = [];
    (b as any).BandHeight = 0; // Inyectamos la altura para el motor PDF
  });

  // 5. REASIGNACIÓN INTELIGENTE (El verdadero trabajo de QA)
  allObjects.forEach((obj) => {
    // Buscamos a qué banda pertenece físicamente según su VPos
    const correctBand = bandBoundaries.find(b => obj.VPos >= b.startVPos && obj.VPos < b.endVPos) 
                        || bandBoundaries[bandBoundaries.length - 1]; // Fallback a la última banda

    // Calculamos su posición Relativa (Local Y)
    const relativeVPos = obj.VPos - correctBand.startVPos;

    // Asignamos el objeto a su banda correcta y le inyectamos su posición relativa
    cleanReport.Bandas[correctBand.idx].Objetos.push({
      ...obj,
      RelativeVPos: relativeVPos,
      _originalBand: undefined // Limpiamos la basura temporal
    });
  });

  // 6. Calcular la altura final de las bandas y ordenar sus objetos
  cleanReport.Bandas.forEach((band, i) => {
    const bounds = bandBoundaries[i];
    
    // Altura de la banda
    if (i < cleanReport.Bandas.length - 1) {
      band.BandHeight = bounds.endVPos - bounds.startVPos;
    } else {
      // La última banda mide hasta donde llegue su objeto más bajo
      const maxBottom = Math.max(...band.Objetos.map((o: any) => o.RelativeVPos + (o.Height || 0)), 0);
      band.BandHeight = maxBottom;
    }

    // Ordenar objetos de arriba hacia abajo, izquierda a derecha (ideal para motores de renderizado)
    band.Objetos.sort((a: any, b: any) => {
      if (a.RelativeVPos === b.RelativeVPos) return a.HPos - b.HPos;
      return a.RelativeVPos - b.RelativeVPos;
    });
  });

  // 7. Disparar la descarga del archivo limpio
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanReport, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", `${cleanReport.ReportId}_QA_Clean.json`);
  document.body.appendChild(downloadAnchorNode); // Requerido en Firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};