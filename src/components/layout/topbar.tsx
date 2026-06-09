import { useRef, ChangeEvent, useState, useEffect } from 'react';
import { useReportStore } from '@/store/useReportStore';
import { FoxProReport } from '@/types/report';
import ExportButton from './ExportButton';
import JsonErrorModal from '../modals/jsonErrorModal';

export default function Topbar() {
  const report = useReportStore((state) => state.report);
  const setReport = useReportStore((state) => state.setReport);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // === ESTADOS MOVIDOS DESDE EL CANVAS ===
  const addObject = useReportStore((state) => state.addObject);
  const addBand = useReportStore((state) => state.addBand);
  const [isBandMenuOpen, setIsBandMenuOpen] = useState(false);
  const bandMenuRef = useRef<HTMLDivElement>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [pendingGroupType, setPendingGroupType] = useState('');
  const [groupVariable, setGroupVariable] = useState('');

  const [jsonError, setJsonError] = useState<{ visible: boolean; message: string; missingKeys: string[] }>({ 
    visible: false, message: '', missingKeys: [] 
  });

  // --- LÓGICA DE MENÚ Y MODAL ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bandMenuRef.current && !bandMenuRef.current.contains(event.target as Node)) {
        setIsBandMenuOpen(false);
      }
    };
    if (isBandMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBandMenuOpen]);

  const handleAddBand = (tipoBanda: string) => {
    if (tipoBanda.includes('Group')) {
      setPendingGroupType(tipoBanda);
      setGroupVariable('');
      setIsGroupModalOpen(true);
      setIsBandMenuOpen(false); 
    } else {
      addBand(tipoBanda, "");
      setIsBandMenuOpen(false);
    }
  };

  const confirmGroupBand = () => {
    addBand(pendingGroupType, groupVariable);
    setIsGroupModalOpen(false);
  };

  // --- LÓGICA DE CARGA DE ARCHIVO ---
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = JSON.parse(e.target?.result as string);
        const requiredKeys = ['ReportId', 'Tipo', 'Metadata', 'Bandas'];
        const missingKeys = requiredKeys.filter(key => !(key in jsonContent));

        if (missingKeys.length > 0) {
          setJsonError({ visible: true, message: 'El archivo JSON no cumple con la estructura de FoxPro requerida.', missingKeys });
          event.target.value = ''; 
          return;
        }

        if (!Array.isArray(jsonContent.Bandas)) {
          setJsonError({ visible: true, message: 'La propiedad "Bandas" debe ser un arreglo de objetos.', missingKeys: ['Bandas (Incorrect Format)'] });
          event.target.value = ''; 
          return;
        }

        setReport(jsonContent as FoxProReport);
        setJsonError({ visible: false, message: '', missingKeys: [] }); 
        event.target.value = ''; 
      } catch (error) {
        setJsonError({ visible: true, message: 'El archivo no es un JSON válido o está corrupto.', missingKeys: ['Formato JSON Inválido'] });
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <header className="h-14 border-b bg-white flex items-center px-4 justify-between shrink-0 shadow-sm z-50 relative">
        
        {/* 1. LADO IZQUIERDO: Título y Archivo */}
        <div className="flex-1 flex items-center gap-4">
          <h1 className="font-bold text-gray-800 text-base tracking-tight select-none">QA Reports</h1>
          {report && (
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md border border-gray-200">
              {report.ReportId} <span className="font-normal opacity-70">({report.Tipo})</span>
            </span>
          )}
        </div>
        
        {/* 2. CENTRO: Herramientas (Solo visibles si hay reporte) */}
        {report && (
          <div className="flex-none flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200/80 gap-0.5 select-none">
            <button onClick={() => addObject('Label')} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-600 hover:text-gray-900 text-xs font-medium transition-all" title="Añadir Etiqueta">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
              Label
            </button>
            <button onClick={() => addObject('Field')} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-600 hover:text-gray-900 text-xs font-medium transition-all" title="Añadir Campo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
              Field
            </button>
            <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
            <button onClick={() => addObject('Shape')} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-600 hover:text-gray-900 text-xs font-medium transition-all" title="Añadir Shape">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
              Shape
            </button>
            <button onClick={() => addObject('Line')} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-600 hover:text-gray-900 text-xs font-medium transition-all" title="Añadir Línea">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><line x1="5" y1="19" x2="19" y2="5"></line></svg>
              Line
            </button>
            <button onClick={() => addObject('Picture')} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-600 hover:text-gray-900 text-xs font-medium transition-all" title="Añadir Imagen">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              Picture
            </button>
            <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
            <div className="relative" ref={bandMenuRef}>
              <button onClick={() => setIsBandMenuOpen(!isBandMenuOpen)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isBandMenuOpen ? 'bg-purple-100 text-purple-700 shadow-inner' : 'hover:bg-white hover:shadow-sm text-gray-600'}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                Bandas <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`opacity-60 transition-transform ${isBandMenuOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              {isBandMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 flex flex-col z-50">
                  <span className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Añadir Sección</span>
                  <button onClick={() => handleAddBand('Title')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Título (Title)</button>
                  <button onClick={() => handleAddBand('PageHeader')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Encabezado de Página</button>
                  <button onClick={() => handleAddBand('GroupHeader')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Encabezado de Grupo</button>
                  <button onClick={() => handleAddBand('Detail')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Detalle (Detail)</button>
                  <button onClick={() => handleAddBand('GroupFooter')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Pie de Grupo</button>
                  <button onClick={() => handleAddBand('PageFooter')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Pie de Página</button>
                  <button onClick={() => handleAddBand('Summary')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">Resumen (Summary)</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. LADO DERECHO: Botones de Exportar/Cargar */}
        <div className="flex-1 flex justify-end gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md border border-gray-200 hover:bg-gray-200 transition-colors">
            {report ? 'Cargar Otro' : 'Cargar JSON'}
          </button>
          {report && <ExportButton />}
        </div>
      </header>

      {/* === MODALES === */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-96 border border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-2">Añadir {pendingGroupType === 'GroupHeader' ? 'Encabezado' : 'Pie'} de Grupo</h3>
            <p className="text-xs text-gray-500 mb-4">Introduce el nombre de la variable de agrupación (ej. <code className="bg-gray-100 px-1 py-0.5 rounded text-pink-600">Wc_Codigo</code>):</p>
            <input type="text" autoFocus className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-5 outline-none focus:border-purple-500 focus:ring-2" placeholder="Variable..." value={groupVariable} onChange={(e) => setGroupVariable(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') confirmGroupBand(); if (e.key === 'Escape') setIsGroupModalOpen(false); }} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsGroupModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={confirmGroupBand} className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm">Aceptar</button>
            </div>
          </div>
        </div>
      )}

      <JsonErrorModal 
        isOpen={jsonError.visible}
        onClose={() => setJsonError({ visible: false, message: '', missingKeys: [] })}
        message={jsonError.message}
        missingKeys={jsonError.missingKeys}
      />
    </>
  );
}