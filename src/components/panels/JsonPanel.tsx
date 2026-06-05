import React, { useEffect } from 'react';
import { useReportStore } from '@/store/useReportStore';

export default function JsonPanel() {
  const report = useReportStore((state) => state.report);
  const selectedIndices = useReportStore((state) => state.selectedIndices);
  const toggleSelection = useReportStore((state) => state.toggleSelection);

  // Auto-scroll
  useEffect(() => {
    if (selectedIndices.length > 0) {
      const lastSelected = selectedIndices[selectedIndices.length - 1];
      let elId = '';
      
      if (lastSelected.type === 'band') elId = `json-obj-${lastSelected.bandIdx}-${lastSelected.objIdx}`;
      else if (lastSelected.type === 'meta') elId = `json-obj-meta-${lastSelected.metaKey}`;
      else if (lastSelected.type === 'sysvar') elId = `json-obj-sys-${lastSelected.sysIdx}`;

      const el = document.getElementById(elId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedIndices]);

  if (!report) return <div className="p-4 text-center text-gray-400 italic">Carga un archivo.</div>;

  const checkSelected = (sel: any) => selectedIndices.some(s => s.type === sel.type && s.bandIdx === sel.bandIdx && s.objIdx === sel.objIdx && s.metaKey === sel.metaKey && s.sysIdx === sel.sysIdx);
  const getClasses = (isSel: boolean) => `cursor-pointer transition-colors px-2 py-0.5 -mx-2 rounded-sm border-l-2 ${isSel ? 'bg-blue-100/80 border-blue-500 text-blue-900 shadow-sm' : 'border-transparent hover:bg-gray-200/50 text-gray-600'}`;

  // MAGIA AQUÍ: Convierte un objeto en un string de UNA SOLA LÍNEA con espaciado perfecto
  const formatInline = (obj: any) => {
    if (!obj) return '{}';
    // Mapeamos cada llave y valor, y los unimos en una sola línea
    const entries = Object.entries(obj).map(([k, v]) => `"${k}": ${JSON.stringify(v)}`);
    return `{ ${entries.join(', ')} }`;
  };

  return (
    <div className="font-mono text-[11px] leading-relaxed bg-gray-50 h-full overflow-auto p-4 whitespace-pre selection:bg-blue-200">
      {`{\n  "ReportId": "${report.ReportId}",\n  "Tipo": "${report.Tipo}",\n  "Metadata": {\n`}
      
      {/* METADATA CLICKEABLE */}
      {['Company', 'Title', 'Subtitle'].map((key, i) => {
        const metaKey = key as 'Company'|'Title'|'Subtitle';
        const isSel = checkSelected({ type: 'meta', metaKey });
        return report.Metadata[metaKey] ? (
          <div key={key} id={`json-obj-meta-${metaKey}`} onClick={(e) => toggleSelection({ type: 'meta', metaKey }, e.ctrlKey)} className={getClasses(isSel)}>
            {`    "${key}": ${formatInline(report.Metadata[metaKey])}${i < 2 ? ',' : ''}`}
          </div>
        ) : null;
      })}
      
      {`  },\n  "VariablesSistema": [\n`}
      
      {/* VARIABLES CLICKEABLES */}
      {report.VariablesSistema.map((v, i) => (
        <div key={`sys-${i}`} id={`json-obj-sys-${i}`} onClick={(e) => toggleSelection({ type: 'sysvar', sysIdx: i }, e.ctrlKey)} className={getClasses(checkSelected({ type: 'sysvar', sysIdx: i }))}>
          {`    ${formatInline(v)}${i < report.VariablesSistema.length - 1 ? ',' : ''}`}
        </div>
      ))}

      {`  ],\n  "Bandas": [\n`}
      
      {/* BANDAS Y OBJETOS CLICKEABLES */}
      {report.Bandas.map((band, bIdx) => (
        <div key={`b-${bIdx}`}>
          {`    {\n      "TipoBanda": "${band.TipoBanda}",\n      "Nivel": ${band.Nivel},\n`}
          {band.AgrupaPor ? `      "AgrupaPor": "${band.AgrupaPor}",\n` : ''}
          {`      "Objetos": [\n`}
          {band.Objetos.map((obj, oIdx) => (
            <div key={`o-${oIdx}`} id={`json-obj-${bIdx}-${oIdx}`} onClick={(e) => toggleSelection({ type: 'band', bandIdx: bIdx, objIdx: oIdx }, e.ctrlKey)} className={getClasses(checkSelected({ type: 'band', bandIdx: bIdx, objIdx: oIdx }))}>
              {`        ${formatInline(obj)}${oIdx < band.Objetos.length - 1 ? ',' : ''}`}
            </div>
          ))}
          {`      ]\n    }${bIdx < report.Bandas.length - 1 ? ',' : ''}\n`}
        </div>
      ))}
      {`  ]\n}`}
    </div>
  );
}