import { ReportBand } from '@/types/report';
import { fruToPx } from '@/lib/fruConverter';
import ReportObject from './ReportObject';

interface BandRendererProps {
  band: ReportBand;
}

export default function BandRenderer({ band }: BandRendererProps) {
  if (!band.Objetos || band.Objetos.length === 0) return null;

  // 1. EL SECRETO: El PageHeader SIEMPRE debe empezar en 0.
  // Esto evita que "suba" y se coma el espacio donde dibujaremos la Metadata.
  const minVPos = band.TipoBanda === 'PageHeader' 
    ? 0 
    : Math.min(...band.Objetos.map(o => o.VPos || 0));

  // 2. Filtramos objetos "rebeldes" que el DBF asignó mal
  const validObjects = band.Objetos.filter(o => (o.VPos - minVPos) < 20000);

  // 3. Calculamos la altura basada SOLO en los objetos válidos
  const maxHeight = validObjects.reduce((max, obj) => {
    const relativeBottom = (obj.VPos - minVPos) + (obj.Height || 0);
    return relativeBottom > max ? relativeBottom : max;
  }, 0);

  const bandHeight = Math.max(fruToPx(maxHeight) + 10, 30);

  const bgColors: Record<string, string> = {
    PageHeader: '#f8fafc',
    GroupHeader: '#eff6ff',
    Detail: '#ffffff',
    GroupFooter: '#fefce8',
    PageFooter: '#fef2f2'
  };

  return (
    <div 
      className="relative w-full border-b border-dashed border-gray-300 overflow-visible"
      style={{ 
        height: `${bandHeight}px`, 
        backgroundColor: bgColors[band.TipoBanda] || '#fff' 
      }}
    >
      <span className="absolute top-1 right-2 text-[9px] text-gray-400 font-mono select-none z-0">
        {band.TipoBanda} {band.AgrupaPor ? `(${band.AgrupaPor})` : ''} N{band.Nivel}
      </span>

      {validObjects.map((obj, idx) => (
        <ReportObject 
          key={idx} 
          obj={obj} 
          offsetVPos={minVPos} 
        />
      ))}
    </div>
  );
}