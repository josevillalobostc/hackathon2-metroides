import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Map, Loader2, AlertCircle } from 'lucide-react';

interface Sector {
  id: string;
  name: string;
  status: string;
}

export default function Sectors() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const response = await api.get('/sectors');
        setSectors(response.data);
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
              className="glass-panel p-6 hover:border-primary hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Map className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-textMain">{sector.name}</h2>
              </div>
              <p className="text-textMuted text-sm">Ver historia narrativa →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
