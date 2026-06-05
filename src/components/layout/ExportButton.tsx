import { useReportStore } from '@/store/useReportStore';
import { Download } from 'lucide-react';

export default function ExportButton() {
  const report = useReportStore((state) => state.report);

  const handleExport = () => {
    if (!report) return;
    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const fileName = `reporte_${report.ReportId || 'editado'}.json`;
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!report) return null;

  return (
    <button 
      onClick={handleExport}
      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded border hover:bg-blue-700 transition-colors"
    >
      <Download className="w-4 h-4" />
      Exportar JSON
    </button>
  );
}