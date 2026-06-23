import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Search, Loader2, RadioReceiver, CheckCircle2 } from 'lucide-react';

interface Signal {
  id: string;
  signalType: string;
  severity: string;
  status: string;
  rawContent: string;
  createdAt: string;
  updatedAt: string;
  tropel: {
    id: string;
    name: string;
    species: string;
  };
}

const severityColor = (s: string) => {
  if (s === 'CRITICO') return 'bg-accent/10 border-accent/30 text-accent';
  if (s === 'GRAVE') return 'bg-warning/10 border-warning/30 text-warning';
  return 'bg-surface border-surfaceBorder text-textMuted';
};

const statusColor = (s: string) => {
  if (s === 'ATENDIDA') return 'bg-success/10 border-success/30 text-success';
  if (s === 'PROCESANDO') return 'bg-primary/10 border-primary/30 text-primary';
  return 'bg-surface border-surfaceBorder text-textMuted';
};

export default function Signals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Signal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [inFlight, setInFlight] = useState(false); // single-flight guard

  // Checkpoint 4: signal detail + update
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // URL filters (persisted in URL — Checkpoint 3 requirement)
  const severity = searchParams.get('severity') || '';
  const statusFilter = searchParams.get('status') || '';
  const q = searchParams.get('q') || '';

  const updateParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
      else newParams.delete(key);
    });
    setSearchParams(newParams);
  };

  const loadFeed = useCallback(
    async (cursor: string | null, isReset: boolean = false) => {
      // Single-flight: don't fire if already in flight
      if (inFlight) return;
      if (!isReset && !hasMore) return;

      // Cancel any previous stale request
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      setInFlight(true);
      setLoading(true);
      if (isReset) setError(null);

      try {
        const response = await api.get('/signals/feed', {
          params: { cursor, severity, status: statusFilter, q, limit: 15 },
          signal: abortControllerRef.current.signal,
        });

        const { items: newItems, nextCursor: newCursor, hasMore: newHasMore } = response.data;

        setItems((prev) => {
          if (isReset) return newItems;
          // Deduplication by ID (Checkpoint 3 requirement)
          const existingIds = new Set(prev.map((i) => i.id));
          const unique = (newItems as Signal[]).filter((item) => !existingIds.has(item.id));
          return [...prev, ...unique];
        });
        setNextCursor(newCursor);
        setHasMore(newHasMore);
        setError(null);
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          setError(err.response?.data?.message || 'Error cargando el feed');
        }
      } finally {
        setLoading(false);
        setInFlight(false);
      }
    },
    [severity, statusFilter, q, hasMore, inFlight]
  );

  // Reset feed on filter change
  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    setHasMore(true);

    // Small trick: we need loadFeed to run once with cursor=null, isReset=true.
    // We can't put loadFeed in deps or it creates an infinite loop.
    // Use the ref for the abort controller directly.
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setInFlight(true);

    api
      .get('/signals/feed', {
        params: { cursor: null, severity, status: statusFilter, q, limit: 15 },
        signal: controller.signal,
      })
      .then((response) => {
        const { items: newItems, nextCursor: newCursor, hasMore: newHasMore } = response.data;
        setItems(newItems);
        setNextCursor(newCursor);
        setHasMore(newHasMore);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError') {
          setError(err.response?.data?.message || 'Error cargando el feed');
        }
      })
      .finally(() => {
        setLoading(false);
        setInFlight(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity, statusFilter, q]);

  // IntersectionObserver for infinite scroll (Checkpoint 3)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !error && !inFlight) {
          loadFeed(nextCursor, false);
        }
      },
      { threshold: 0.5 }
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, error, nextCursor, inFlight, loadFeed]);

  // Checkpoint 4: update signal status
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedSignal) return;
    setIsUpdating(true);
    setUpdateMsg(null);
    const originalSignal = { ...selectedSignal };

    try {
      const response = await api.patch(`/signals/${selectedSignal.id}/status`, { status: newStatus });
      // Sync back into the feed list
      setItems((prev) => prev.map((item) => (item.id === selectedSignal.id ? response.data : item)));
      setSelectedSignal(response.data);
      setUpdateMsg({ text: 'Estado actualizado correctamente.', ok: true });
    } catch (err: any) {
      setSelectedSignal(originalSignal); // revert in panel
      setUpdateMsg({
        text: err.response?.data?.message || 'Error al actualizar señal. Puedes reintentar.',
        ok: false,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6 relative">
      {/* ── Feed List ─────────────────────────────────── */}
      <div
        className={`flex flex-col h-full transition-all duration-300 ${
          selectedSignal ? 'hidden md:flex md:w-1/2 lg:w-2/3' : 'w-full'
        }`}
      >
        {/* Filters (URL-persisted) */}
        <div className="glass-panel p-4 mb-4 flex flex-wrap gap-4 shrink-0">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
            <input
              type="text"
              placeholder="Buscar señal..."
              className="w-full bg-surface/50 border border-surfaceBorder rounded-lg pl-9 pr-4 py-2 text-textMain text-sm input-glow"
              value={q}
              onChange={(e) => updateParams({ q: e.target.value })}
            />
          </div>
          <select
            className="bg-surface/50 border border-surfaceBorder rounded-lg px-4 py-2 text-textMain text-sm input-glow"
            value={severity}
            onChange={(e) => updateParams({ severity: e.target.value })}
          >
            <option value="">Cualquier Severidad</option>
            <option value="LEVE">Leve</option>
            <option value="MODERADO">Moderado</option>
            <option value="GRAVE">Grave</option>
            <option value="CRITICO">Crítico</option>
          </select>
          <select
            className="bg-surface/50 border border-surfaceBorder rounded-lg px-4 py-2 text-textMain text-sm input-glow"
            value={statusFilter}
            onChange={(e) => updateParams({ status: e.target.value })}
          >
            <option value="">Cualquier Estado</option>
            <option value="RECIBIDA">Recibida</option>
            <option value="PROCESANDO">Procesando</option>
            <option value="ATENDIDA">Atendida</option>
          </select>
        </div>

        {/* Scrollable feed — scroll position is preserved because the list is never unmounted */}
        <div className="glass-panel flex-1 overflow-y-auto overflow-x-hidden relative p-4 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => { setSelectedSignal(item); setUpdateMsg(null); }}
              className={`p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
                selectedSignal?.id === item.id
                  ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(0,229,255,0.1)]'
                  : 'border-surfaceBorder bg-surface/40 hover:border-textMuted/50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <RadioReceiver
                    className={`w-4 h-4 ${item.severity === 'CRITICO' ? 'text-accent' : 'text-primary'}`}
                  />
                  <h3 className="font-semibold text-textMain">{item.signalType.replace('_', ' ')}</h3>
                </div>
                <span className="text-xs text-textMuted">{new Date(item.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-textMuted line-clamp-2 mb-2">{item.rawContent}</p>
              <p className="text-xs text-textMuted mb-3">Tropel: <span className="text-primary">{item.tropel.name}</span> ({item.tropel.species})</p>
              <div className="flex gap-2">
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium border ${severityColor(item.severity)}`}>
                  {item.severity}
                </span>
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium border ${statusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}

          {/* Sentinel for IntersectionObserver */}
          <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
            {loading && <Loader2 className="w-6 h-6 text-primary animate-spin" />}
            {!hasMore && items.length > 0 && <p className="text-textMuted text-sm">— Fin del feed —</p>}
            {error && !loading && (
              <div className="text-center">
                <p className="text-accent text-sm mb-2">{error}</p>
                <button
                  onClick={() => loadFeed(nextCursor, false)}
                  className="btn-secondary text-xs"
                >
                  Reintentar
                </button>
              </div>
            )}
            {!loading && !error && items.length === 0 && (
              <p className="text-textMuted text-sm">No se encontraron señales</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail Pane (Checkpoint 4) ────────────────── */}
      {selectedSignal && (
        <div className="w-full md:w-1/2 lg:w-1/3 h-full glass-panel flex flex-col relative">
          <div className="p-4 border-b border-surfaceBorder flex justify-between items-center">
            <h2 className="font-bold text-lg text-textMain truncate">Detalle de Señal</h2>
            <button
              onClick={() => setSelectedSignal(null)}
              className="p-2 text-textMuted hover:text-textMain transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-textMain mb-1">{selectedSignal.signalType.replace('_', ' ')}</h3>
              <p className="text-sm text-textMuted font-mono">ID: {selectedSignal.id}</p>
            </div>

            <div className="space-y-3 mb-8">
              <div className="bg-surface/50 p-4 rounded-lg border border-surfaceBorder">
                <p className="text-sm text-textMuted mb-1">Contenido de la Señal</p>
                <p className="text-sm text-textMain">{selectedSignal.rawContent}</p>
              </div>
              <div className="bg-surface/50 p-4 rounded-lg border border-surfaceBorder">
                <p className="text-sm text-textMuted mb-1">Tropel Origen</p>
                <p className="font-semibold text-textMain">{selectedSignal.tropel.name}</p>
                <p className="text-xs text-textMuted">{selectedSignal.tropel.species} · {selectedSignal.tropel.id}</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-surface/50 p-4 rounded-lg border border-surfaceBorder flex-1">
                  <p className="text-sm text-textMuted mb-1">Severidad</p>
                  <p className="font-semibold">{selectedSignal.severity}</p>
                </div>
                <div className="bg-surface/50 p-4 rounded-lg border border-surfaceBorder flex-1">
                  <p className="text-sm text-textMuted mb-1">Estado Actual</p>
                  <p className="font-semibold">{selectedSignal.status}</p>
                </div>
              </div>
            </div>

            {/* Inline feedback — no alert() */}
            {updateMsg && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  updateMsg.ok
                    ? 'bg-success/10 border border-success/30 text-success'
                    : 'bg-accent/10 border border-accent/30 text-accent'
                }`}
              >
                {updateMsg.text}
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-semibold text-textMain mb-2">Acciones Operativas</h4>
              <button
                className="w-full btn-secondary flex items-center justify-center gap-2"
                onClick={() => handleUpdateStatus('PROCESANDO')}
                disabled={
                  isUpdating ||
                  selectedSignal.status === 'PROCESANDO' ||
                  selectedSignal.status === 'ATENDIDA'
                }
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Loader2 className="w-4 h-4" />
                )}
                Marcar como Procesando
              </button>
              <button
                className="w-full btn-primary flex items-center justify-center gap-2"
                onClick={() => handleUpdateStatus('ATENDIDA')}
                disabled={isUpdating || selectedSignal.status === 'ATENDIDA'}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Marcar como Atendida
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
