import { useRef, ChangeEvent } from 'react';
import { useReportStore } from '@/store/useReportStore';
import { FoxProReport } from '@/types/report';

export default function Topbar() {
  const report = useReportStore((state) => state.report);
  const setReport = useReportStore((state) => state.setReport);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = JSON.parse(e.target?.result as string);
        console.log("JSON cargado exitosamente:", jsonContent); // <-- MIRA LA CONSOLA
        setReport(jsonContent as FoxProReport);
        
        event.target.value = ''; 
      } catch (error) {
        console.error("Error al parsear:", error);
        alert("Error al leer el archivo JSON. Verifica el formato.");
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="h-14 border-b bg-white flex items-center px-6 justify-between shrink-0 shadow-sm z-20">
      <div className="flex items-center gap-4">
        <h1 className="font-bold text-gray-800 text-lg tracking-tight">QA Reports</h1>
        {report && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-md border border-blue-200">
            {report.ReportId} ({report.Tipo})
          </span>
        )}
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />
            
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors"
      >
        {report ? 'Cargar otro JSON' : 'Cargar JSON'}
      </button>
    </header>
  );
}