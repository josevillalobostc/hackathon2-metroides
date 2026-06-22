import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Search, Filter, AlertCircle, Loader2 } from 'lucide-react';

interface Tropel {
  id: string;
  name: string;
  species: string;
  vitalState: string;
  sectorId: string;
  chaosIndex: number;
  updatedAt: string;
}

interface PageData {
  content: Tropel[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}

export default function Tropels() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Derive state from URL
  const page = parseInt(searchParams.get('page') || '0', 10);
  const size = parseInt(searchParams.get('size') || '10', 10);
  const q = searchParams.get('q') || '';
  const species = searchParams.get('species') || '';
  const vitalState = searchParams.get('vitalState') || '';
  const sort = searchParams.get('sort') || 'name,asc';

  useEffect(() => {
    const fetchData = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const response = await api.get('/tropels', {
          params: { page, size, q, species, vitalState, sort },
          signal: abortControllerRef.current.signal,
        });
        setData(response.data);
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          setError(err.response?.data?.message || 'Error al cargar los Tropeles');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [page, size, q, species, vitalState, sort]);

  const updateParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    // Reset to page 0 whenever filters change (but not when flipping pages)
    if (!('page' in updates)) {
      newParams.set('page', '0');
    }
    setSearchParams(newParams);
  };

  const vitalStateColor = (state: string) => {
    if (state === 'SANO') return 'bg-success/10 text-success border-success/20';
    if (state === 'HERIDO') return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-accent/10 text-accent border-accent/20';
  };

  return (
    <div className="flex flex-col h-full space-y-6 relative">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-textMain">Atlas de Tropeles</h1>
          <p className="text-textMuted">Monitoreo y registro de criaturas</p>
        </div>
      </header>

      {/* Filters */}
      <div className="glass-panel p-4 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            className="w-full bg-surface/50 border border-surfaceBorder rounded-lg pl-9 pr-4 py-2 text-textMain input-glow text-sm"
            value={q}
            onChange={(e) => updateParams({ q: e.target.value })}
          />
        </div>

        <select
          className="bg-surface/50 border border-surfaceBorder rounded-lg px-4 py-2 text-textMain text-sm input-glow"
          value={vitalState}
          onChange={(e) => updateParams({ vitalState: e.target.value })}
        >
          <option value="">Cualquier estado</option>
          <option value="SANO">Sano</option>
          <option value="HERIDO">Herido</option>
          <option value="CRITICO">Crítico</option>
        </select>

        <select
          className="bg-surface/50 border border-surfaceBorder rounded-lg px-4 py-2 text-textMain text-sm input-glow"
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value })}
        >
          <option value="name,asc">Nombre (A-Z)</option>
          <option value="updatedAt,desc">Última actualización</option>
          <option value="chaosIndex,desc">Mayor Índice Caos</option>
        </select>

        <select
          className="bg-surface/50 border border-surfaceBorder rounded-lg px-4 py-2 text-textMain text-sm input-glow"
          value={size}
          onChange={(e) => updateParams({ size: e.target.value })}
        >
          <option value="10">10 por pág</option>
          <option value="20">20 por pág</option>
          <option value="50">50 por pág</option>
        </select>
      </div>

      {/* Table area — fixed height so layout never shifts */}
      <div className="glass-panel overflow-hidden flex-1 relative min-h-[400px]">
        {/* Loading overlay preserves table skeleton below */}
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <AlertCircle className="w-10 h-10 text-accent mb-3" />
            <p className="text-textMuted">{error}</p>
          </div>
        )}

        {!error && data?.content.length === 0 && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <Filter className="w-10 h-10 text-textMuted mb-3 opacity-50" />
            <p className="text-textMuted">No se encontraron tropeles que coincidan con los filtros.</p>
          </div>
        )}

        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface border-b border-surfaceBorder sticky top-0 z-0">
              <tr>
                <th className="px-6 py-4 font-medium text-textMuted">Nombre</th>
                <th className="px-6 py-4 font-medium text-textMuted">Especie</th>
                <th className="px-6 py-4 font-medium text-textMuted">Estado Vital</th>
                <th className="px-6 py-4 font-medium text-textMuted">Índice Caos</th>
                <th className="px-6 py-4 font-medium text-textMuted">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfaceBorder">
              {data?.content.map((tropel) => (
                <tr key={tropel.id} className="hover:bg-surface/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-textMain">{tropel.name}</td>
                  <td className="px-6 py-4 text-textMuted">{tropel.species}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${vitalStateColor(tropel.vitalState)}`}>
                      {tropel.vitalState}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-surfaceBorder rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary transition-all"
                          style={{ width: `${tropel.chaosIndex}%` }}
                        />
                      </div>
                      <span className="text-xs text-textMuted">{tropel.chaosIndex}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-textMuted text-xs">
                    {new Date(tropel.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-textMuted">
          Mostrando {data?.content.length ?? 0} de {data?.totalElements ?? 0}
        </p>
        <div className="flex gap-2">
          <button
            className="btn-secondary px-3 py-1 text-sm"
            disabled={page === 0 || loading}
            onClick={() => updateParams({ page: String(page - 1) })}
          >
            Anterior
          </button>
          <span className="px-4 py-1 text-sm text-textMain flex items-center bg-surface border border-surfaceBorder rounded-lg">
            Pág {page + 1} de {data?.totalPages ?? 1}
          </span>
          <button
            className="btn-secondary px-3 py-1 text-sm"
            disabled={page >= (data?.totalPages ?? 1) - 1 || loading}
            onClick={() => updateParams({ page: String(page + 1) })}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
