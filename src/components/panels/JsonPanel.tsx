import React, { useEffect, useState, useRef } from 'react';
import { useReportStore } from '@/store/useReportStore';

export default function JsonPanel() {
  const report = useReportStore((state) => state.report);
  const setReport = useReportStore((state) => state.setReport); 
  const selectedIndices = useReportStore((state) => state.selectedIndices);
  const toggleSelection = useReportStore((state) => state.toggleSelection);

  // === ESTADOS DEL EDITOR ===
  const [isEditing, setIsEditing] = useState(false);
  const [rawJson, setRawJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll (Solo funciona en modo visor interactivo)
  useEffect(() => {
    if (!isEditing && selectedIndices.length > 0) {
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
  }, [selectedIndices, isEditing]);

  if (!report) return <div className="p-4 text-center text-gray-400 italic">Carga un archivo.</div>;

  // === FUNCIONES DEL EDITOR ===
  const handleEditClick = () => {
    const formattedJson = JSON.stringify(report, null, 2);
    setRawJson(formattedJson); 
    setIsEditing(true);
    setError(null);

    // === NUEVA MAGIA: Búsqueda y Enfoque Automático en Raw JSON ===
    if (selectedIndices.length > 0) {
      // Usamos setTimeout para esperar a que React renderice el <textarea> antes de enfocarlo
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const sel = selectedIndices[selectedIndices.length - 1];
        let objToFind: any = null;
        let indentSpaces = 0; // Calculamos la sangría según dónde viva el objeto

        if (sel.type === 'band') {
          objToFind = report.Bandas[sel.bandIdx!].Objetos[sel.objIdx!];
          indentSpaces = 8; // Profundidad: Raíz -> Bandas -> Banda -> Objetos -> Obj (8 espacios)
        } else if (sel.type === 'meta') {
          objToFind = report.Metadata[sel.metaKey!];
          indentSpaces = 4; // Profundidad: Raíz -> Metadata -> Obj (4 espacios)
        } else if (sel.type === 'sysvar') {
          objToFind = report.VariablesSistema[sel.sysIdx!];
          indentSpaces = 4; // Profundidad: Raíz -> VariablesSistema -> Obj (4 espacios)
        }

        if (objToFind) {
          // 1. Aislamos el objeto y le damos la indentación exacta que tiene en el JSON principal
          const isolatedJson = JSON.stringify(objToFind, null, 2);
          const searchString = isolatedJson
            .split('\n')
            .map(line => ' '.repeat(indentSpaces) + line)
            .join('\n');
          
          // 2. Buscamos el índice donde empieza este bloque de código
          const startIndex = formattedJson.indexOf(searchString);
          
          if (startIndex !== -1) {
            const endIndex = startIndex + searchString.length;
            
            // 3. Seleccionamos (resaltamos) el texto
            textarea.focus();
            textarea.setSelectionRange(startIndex, endIndex);
            
            // 4. Calculamos matemáticamente en qué línea estamos para hacer scroll
            const linesBefore = formattedJson.substring(0, startIndex).split('\n').length;
            const totalLines = formattedJson.split('\n').length;
            
            // Calculamos la posición Y (pixel) y centramos la vista en el tercio superior de la pantalla
            const scrollY = (textarea.scrollHeight / totalLines) * linesBefore;
            textarea.scrollTop = Math.max(0, scrollY - (textarea.clientHeight / 3));
          }
        }
      }, 50);
    }
  };

  const handleSaveClick = () => {
    try {
      const parsedData = JSON.parse(rawJson);
      setReport(parsedData); 
      setIsEditing(false);
      setError(null);
    } catch (err: any) {
      setError(`Error de sintaxis: ${err.message}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = textareaRef.current;
      if (!target) return;

      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newText = rawJson.substring(0, start) + '  ' + rawJson.substring(end);
      setRawJson(newText);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const checkSelected = (sel: any) => selectedIndices.some(s => s.type === sel.type && s.bandIdx === sel.bandIdx && s.objIdx === sel.objIdx && s.metaKey === sel.metaKey && s.sysIdx === sel.sysIdx);
  
  const getClasses = (isSel: boolean) => `cursor-pointer transition-colors duration-150 px-2 py-[1px] rounded-sm border-l-2 flex items-center w-max min-w-full ${isSel ? 'bg-blue-100 border-blue-500 text-blue-900 shadow-sm font-medium' : 'border-transparent hover:bg-gray-200/60 text-gray-700'}`;

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
    <div className="flex flex-col h-full bg-[#f8f9fa] border-l">
      {/* BARRA DE HERRAMIENTAS */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-100 border-b shadow-sm z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {isEditing ? 'Editor Raw (JSON)' : 'Explorador JSON'}
          </span>
        </div>
        
        {isEditing ? (
          <div className="flex gap-2">
            <button 
              onClick={() => { setIsEditing(false); setError(null); }} 
              className="px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveClick} 
              className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-colors"
            >
              Aplicar Cambios
            </button>
          </div>
        ) : (
          <button 
            onClick={handleEditClick} 
            className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
          >
            Editar Código
          </button>
        )}
      </div>

      {/* MENSAJE DE ERROR */}
      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 text-xs font-mono border-b border-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* ÁREA DE CONTENIDO */}
      <div className="flex-1 overflow-auto relative">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="w-full h-full p-4 font-mono text-[13px] leading-relaxed bg-[#1e1e1e] text-[#d4d4d4] resize-none outline-none focus:ring-inset focus:ring-2 focus:ring-blue-500/50"
            style={{ 
              tabSize: 2,
              scrollbarWidth: 'thin',
              scrollbarColor: '#424242 transparent'
            }}
          />
        ) : (
          <div className="font-mono text-[12px] leading-relaxed p-4 whitespace-nowrap text-gray-800 selection:bg-blue-200 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
            <div>{"{"}</div>
            <div className="pl-4"><span className="text-purple-600">"ReportId"</span>: <span className="text-green-600">"{report.ReportId}"</span>,</div>
            <div className="pl-4"><span className="text-purple-600">"Tipo"</span>: <span className="text-green-600">"{report.Tipo}"</span>,</div>
            <div className="pl-4"><span className="text-purple-600">"Metadata"</span>: {"{"}</div>
            
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
            
            {report.VariablesSistema?.map((v, i) => (
              <div key={`sys-${i}`} id={`json-obj-sys-${i}`} onClick={(e) => toggleSelection({ type: 'sysvar', sysIdx: i }, e.ctrlKey)} className={getClasses(checkSelected({ type: 'sysvar', sysIdx: i }))}>
                <span className="pl-8">{formatInline(v)}{i < report.VariablesSistema.length - 1 ? ',' : ''}</span>
              </div>
            ))}

            <div className="pl-4">{"],"}</div>
            <div className="pl-4"><span className="text-purple-600">"Bandas"</span>: [</div>
            
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
        )}
      </div>
    </div>
  );
}