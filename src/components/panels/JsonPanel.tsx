import React, { useEffect } from 'react';
import { useReportStore } from '@/store/useReportStore';

export default function JsonPanel() {
  const report = useReportStore((state) => state.report);
  const selectedIndices = useReportStore((state) => state.selectedIndices);
  const toggleSelection = useReportStore((state) => state.toggleSelection);

  // Auto-scroll inteligente para los objetos de las bandas
  useEffect(() => {
    if (selectedIndices.length > 0) {
      const lastSelected = selectedIndices[selectedIndices.length - 1];
      const el = document.getElementById(`json-obj-${lastSelected.bandIdx}-${lastSelected.objIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedIndices]);

  if (!report) {
    return <div className="p-4 text-gray-400 text-sm italic text-center">Carga un archivo para ver su código.</div>;
  }

  // Pequeña función para garantizar que el JSON estático se indente perfectamente
  const formatStaticJson = (obj: any) => {
    return JSON.stringify(obj, null, 2).split('\n').join('\n  ');
  };

  return (
    <div className="font-mono text-[11px] leading-relaxed text-gray-700 bg-gray-50 h-full overflow-auto p-4 whitespace-pre selection:bg-blue-200">
      {`{\n`}
      {`  "ReportId": "${report.ReportId}",\n`}
      {`  "Tipo": "${report.Tipo}",\n`}
      
      {/* METADATA Y VARIABLES (Fieles a la estructura original, estáticos) */}
      {`  "Metadata": ${formatStaticJson(report.Metadata)},\n`}
      {`  "VariablesSistema": ${formatStaticJson(report.VariablesSistema)},\n`}
      
      {`  "Bandas": [\n`}
      {report.Bandas.map((band, bIdx) => (
        <div key={`band-${bIdx}`}>
          {`    {\n`}
          {`      "TipoBanda": "${band.TipoBanda}",\n`}
          {`      "Nivel": ${band.Nivel},\n`}
          {band.AgrupaPor && `      "AgrupaPor": "${band.AgrupaPor}",\n`}
          {`      "Objetos": [\n`}
          
          {/* OBJETOS DE LAS BANDAS (Interactivos y Seleccionables bidireccionalmente) */}
          {band.Objetos.map((obj, oIdx) => {
            const isSel = selectedIndices.some(s => s.bandIdx === bIdx && s.objIdx === oIdx);
            const isLastObj = oIdx === band.Objetos.length - 1;
            
            // Indentamos el objeto dinámico para que encuadre en el arreglo
            const objStr = JSON.stringify(obj, null, 2).split('\n').map((l, i) => i === 0 ? l : `        ${l}`).join('\n');
            
            return (
              <div
                key={`obj-${bIdx}-${oIdx}`}
                id={`json-obj-${bIdx}-${oIdx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(bIdx, oIdx, e.ctrlKey || e.shiftKey);
                }}
                className={`cursor-pointer transition-colors px-2 py-1 -mx-2 rounded-md border-l-2 ${
                  isSel 
                    ? 'bg-blue-100/80 border-blue-500 text-blue-900 shadow-sm' 
                    : 'border-transparent hover:bg-gray-200/50 hover:border-gray-300 text-gray-600'
                }`}
              >
                {`        ${objStr}${isLastObj ? '' : ','}`}
              </div>
            );
          })}
          
          {`      ]\n`}
          {`    }${bIdx < report.Bandas.length - 1 ? ',' : ''}\n`}
        </div>
      ))}
      {`  ]\n`}
      {`}`}
    </div>
  );
}