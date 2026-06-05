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
  
  // Estilos mejorados para la selección: ancho máximo, flexbox y bordes limpios
  const getClasses = (isSel: boolean) => `cursor-pointer transition-colors duration-150 px-2 py-[1px] rounded-sm border-l-2 flex items-center w-max min-w-full ${isSel ? 'bg-blue-100 border-blue-500 text-blue-900 shadow-sm font-medium' : 'border-transparent hover:bg-gray-200/60 text-gray-700'}`;

  // MAGIA AQUÍ: Convierte un objeto en JSX con Resaltado de Sintaxis
  const formatInline = (obj: any) => {
    if (!obj) return <span className="text-gray-500">{`{}`}</span>;
    
    const entries = Object.entries(obj).map(([k, v], idx, arr) => {
      const isLast = idx === arr.length - 1;
      const isString = typeof v === 'string';
      const isNumber = typeof v === 'number';
      
      return (
        <span key={k}>
          <span className="text-purple-600">"{k}"</span>
          <span className="text-gray-500">: </span>
          <span className={isString ? "text-green-600" : isNumber ? "text-orange-500" : "text-blue-500"}>
            {isString ? `"${v}"` : String(v)}
          </span>
          {!isLast && <span className="text-gray-500">, </span>}
        </span>
      );
    });

    return <><span className="text-gray-600">{`{ `}</span>{entries}<span className="text-gray-600">{` }`}</span></>;
  };

  return (
    // Contenedor principal con scrollbars estilizados y sin "wrap" de palabras
    <div className="font-mono text-[12px] leading-relaxed bg-[#f8f9fa] h-full overflow-auto p-4 whitespace-nowrap text-gray-800 selection:bg-blue-200 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
      
      {/* Cabecera del JSON */}
      <div>{"{"}</div>
      <div className="pl-4"><span className="text-purple-600">"ReportId"</span>: <span className="text-green-600">"{report.ReportId}"</span>,</div>
      <div className="pl-4"><span className="text-purple-600">"Tipo"</span>: <span className="text-green-600">"{report.Tipo}"</span>,</div>
      <div className="pl-4"><span className="text-purple-600">"Metadata"</span>: {"{"}</div>
      
      {/* METADATA CLICKEABLE */}
      {['Company', 'Title', 'Subtitle'].map((key, i) => {
        const metaKey = key as 'Company'|'Title'|'Subtitle';
        const isSel = checkSelected({ type: 'meta', metaKey });
        return report.Metadata && report.Metadata[metaKey] ? (
          <div key={key} id={`json-obj-meta-${metaKey}`} onClick={(e) => toggleSelection({ type: 'meta', metaKey }, e.ctrlKey)} className={getClasses(isSel)}>
            <span className="pl-8"><span className="text-purple-600">"{key}"</span>: {formatInline(report.Metadata[metaKey])}{i < 2 ? ',' : ''}</span>
          </div>
        ) : null;
      })}
      
      <div className="pl-4">{"},"}</div>
      <div className="pl-4"><span className="text-purple-600">"VariablesSistema"</span>: [</div>
      
      {/* VARIABLES CLICKEABLES */}
      {report.VariablesSistema?.map((v, i) => (
        <div key={`sys-${i}`} id={`json-obj-sys-${i}`} onClick={(e) => toggleSelection({ type: 'sysvar', sysIdx: i }, e.ctrlKey)} className={getClasses(checkSelected({ type: 'sysvar', sysIdx: i }))}>
          <span className="pl-8">{formatInline(v)}{i < report.VariablesSistema.length - 1 ? ',' : ''}</span>
        </div>
      ))}

      <div className="pl-4">{"],"}</div>
      <div className="pl-4"><span className="text-purple-600">"Bandas"</span>: [</div>
      
      {/* BANDAS Y OBJETOS CLICKEABLES */}
      {report.Bandas?.map((band, bIdx) => (
        <div key={`b-${bIdx}`} className="pl-8">
          <div>{"{"}</div>
          <div className="pl-4"><span className="text-purple-600">"TipoBanda"</span>: <span className="text-green-600">"{band.TipoBanda}"</span>,</div>
          <div className="pl-4"><span className="text-purple-600">"Nivel"</span>: <span className="text-orange-500">{band.Nivel}</span>,</div>
          {band.AgrupaPor && <div className="pl-4"><span className="text-purple-600">"AgrupaPor"</span>: <span className="text-green-600">"{band.AgrupaPor}"</span>,</div>}
          <div className="pl-4"><span className="text-purple-600">"Objetos"</span>: [</div>
          
          {band.Objetos?.map((obj, oIdx) => (
            <div key={`o-${oIdx}`} id={`json-obj-${bIdx}-${oIdx}`} onClick={(e) => toggleSelection({ type: 'band', bandIdx: bIdx, objIdx: oIdx }, e.ctrlKey)} className={getClasses(checkSelected({ type: 'band', bandIdx: bIdx, objIdx: oIdx }))}>
              <span className="pl-8">{formatInline(obj)}{oIdx < band.Objetos.length - 1 ? ',' : ''}</span>
            </div>
          ))}
          
          <div className="pl-4">{"]"}</div>
          <div>{"}"}{bIdx < report.Bandas.length - 1 ? ',' : ''}</div>
        </div>
      ))}
      <div className="pl-4">{"]"}</div>
      <div>{"}"}</div>
    </div>
  );
}