import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Map, Loader2, AlertCircle } from 'lucide-react';

interface Sector {
  id: string;
  sectorCode: string;
  name: string;
  climate: string;
  capacity: number;
  currentLoad: number;
  stabilityLevel: number;
}

export default function Sectors() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const response = await api.get('/sectors');
        setSectors(response.data.items);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar los sectores');
      } finally {
        setLoading(false);
      }
    };
    fetchSectors();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-accent">
        <AlertCircle className="w-8 h-8" />
        <span>{error}</span>
      </div>
    );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-textMain mb-2">Sectores Operativos</h1>
      <p className="text-textMuted mb-8">Selecciona un sector para ver su historia</p>

      {sectors.length === 0 ? (
        <p className="text-textMuted">No hay sectores disponibles.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sectors.map((sector) => (
            <Link
              key={sector.id}
              to={`/sectors/${sector.id}/story`}
              viewTransition
              className="glass-panel p-6 hover:border-primary hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all group"
              style={{ viewTransitionName: `sector-${sector.id}` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Map className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-textMain">{sector.name}</h2>
                  <p className="text-xs text-textMuted font-mono">{sector.sectorCode} · {sector.climate.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex justify-between text-sm text-textMuted mb-2">
                <span>Carga</span>
                <span className="font-mono">{sector.currentLoad}/{sector.capacity}</span>
              </div>
              <div className="w-full bg-surfaceBorder rounded-full h-1.5 mb-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(sector.currentLoad / sector.capacity) * 100}%`,
                    backgroundColor: sector.stabilityLevel >= 70 ? 'var(--color-success, #22c55e)' : sector.stabilityLevel >= 40 ? 'var(--color-warning, #f59e0b)' : 'var(--color-accent, #ef4444)'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-textMuted">Estabilidad</span>
                <span className="font-mono font-bold" style={{ color: sector.stabilityLevel >= 70 ? '#22c55e' : sector.stabilityLevel >= 40 ? '#f59e0b' : '#ef4444' }}>{sector.stabilityLevel}%</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
