import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { api } from '../api';
import { Search, Loader2, RadioReceiver, CheckCircle2, Clock } from 'lucide-react';

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
  if (s === 'MODERADO') return 'bg-secondary/10 border-secondary/30 text-secondary';
  return 'bg-surface border-surfaceBorder text-textMuted';
};

const statusColor = (s: string) => {
  if (s === 'ATENDIDA') return 'bg-success/10 border-success/30 text-success';
  if (s === 'PROCESANDO') return 'bg-primary/10 border-primary/30 text-primary';
  return 'bg-surface border-surfaceBorder text-textMuted';
};

export default function Signals() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Feed state
  const [items, setItems] = useState<Signal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Guard against concurrent requests
  const inFlightRef = useRef(false);
  const isUpdatingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Detail pane state
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // URL filters
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

  // ── Core fetch helper ─────────────────────────────────────────
  const fetchPage = useCallback(
    async (cursor: string | null, signal: AbortSignal): Promise<void> => {
      const params: Record<string, string | number> = { limit: 15 };
      if (cursor) params.cursor = cursor;
      if (severity) params.severity = severity;
      if (statusFilter) params.status = statusFilter;
      if (q) params.q = q;

      const response = await api.get('/signals/feed', { params, signal });
      const { items: newItems, nextCursor: newCursor, hasMore: newHasMore } = response.data;

      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const unique = (newItems as Signal[]).filter((item) => !existingIds.has(item.id));
        return cursor ? [...prev, ...unique] : newItems; // cursor=null means reset
      });
      setNextCursor(newCursor);
      setHasMore(newHasMore);
      setFeedError(null);
    },
    [severity, statusFilter, q]
  );

  // ── Reset feed on filter change ────────────────────────────────
  useEffect(() => {
    // Reset all feed state immediately
    setItems([]);
    setNextCursor(null);
    setHasMore(true);
    setFeedError(null);
    // Close detail pane so stale signal doesn't remain open after filter change
    setSelectedSignal(null);
    setUpdateMsg(null);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    inFlightRef.current = true;
    setLoading(true);

    fetchPage(null, controller.signal)
      .catch((err) => {
        if (!axios.isCancel(err)) {
          const e = err as { response?: { data?: { message?: string } } };
          setFeedError(e.response?.data?.message || 'Error cargando el feed');
        }
      })
      .finally(() => {
        setLoading(false);
        inFlightRef.current = false;
      });

    return () => {
      controller.abort();
      inFlightRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity, statusFilter, q]);

  // ── Load next page (infinite scroll) ──────────────────────────
  const loadNextPage = useCallback(async () => {
    if (inFlightRef.current || !hasMore || !nextCursor) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    inFlightRef.current = true;
    setLoading(true);

    try {
      await fetchPage(nextCursor, controller.signal);
    } catch (err) {
      if (!axios.isCancel(err)) {
        const e = err as { response?: { data?: { message?: string } } };
        setFeedError(e.response?.data?.message || 'Error cargando más señales');
      }
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [fetchPage, hasMore, nextCursor]);

  // ── IntersectionObserver for infinite scroll ────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadNextPage();
      },
      { threshold: 0.1 }
    );
    const target = observerTarget.current;
    if (target) observer.observe(target);
    return () => observer.disconnect();
  }, [loadNextPage]);

  // ── Update signal status (Checkpoint 4) ─────────────────────
  const handleUpdateStatus = async (newStatus: string) => {
    // Use ref to prevent stale closure from blocking retries
    if (isUpdatingRef.current || !selectedSignal) return;
    isUpdatingRef.current = true;
    setIsUpdating(true);
    setUpdateMsg(null);
    const snapshot = { ...selectedSignal };
    const signalId = selectedSignal.id;

    try {
      const response = await api.patch(`/signals/${signalId}/status`, { status: newStatus });
      const updated: Signal = response.data;
      // Sync the feed list card AND keep detail pane up to date
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedSignal(updated);
      setUpdateMsg({ text: `✓ Señal marcada como ${updated.status}.`, ok: true });
    } catch (err: any) {
      setSelectedSignal(snapshot);
      const e = err as { response?: { status?: number, data?: { message?: string, error?: string } }, message?: string };
      const apiMsg = e.response?.data?.message || e.response?.data?.error;
      const status = e.response?.status;
      setUpdateMsg({
        text: `Error ${status || ''}: ${apiMsg || e.message || 'Error al actualizar.'}`,
        ok: false,
      });
    } finally {
      isUpdatingRef.current = false;
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
        {/* Filters */}
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

        {/* Feed */}
        <div className="glass-panel flex-1 overflow-y-auto overflow-x-hidden relative p-4 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              aria-label={`Señal ${item.signalType} - ${item.status}`}
              onClick={() => { setSelectedSignal(item); setUpdateMsg(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedSignal(item); setUpdateMsg(null); } }}
              className={`p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary/50 ${
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
                  <h3 className="font-semibold text-textMain">{item.signalType.replace(/_/g, ' ')}</h3>
                </div>
                <span className="text-xs text-textMuted">{new Date(item.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-textMuted line-clamp-2 mb-2">{item.rawContent}</p>
              <p className="text-xs text-textMuted mb-3">
                Tropel: <span className="text-primary">{item.tropel.name}</span> ({item.tropel.species})
              </p>
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

          {/* Sentinel */}
          <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
            {loading && <Loader2 className="w-6 h-6 text-primary animate-spin" />}
            {!hasMore && items.length > 0 && !loading && (
              <p className="text-textMuted text-sm">— Fin del feed —</p>
            )}
            {feedError && !loading && (
              <div className="text-center">
                <p className="text-accent text-sm mb-2">{feedError}</p>
                <button onClick={loadNextPage} className="btn-secondary text-xs">
                  Reintentar
                </button>
              </div>
            )}
            {!loading && !feedError && items.length === 0 && (
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
              aria-label="Cerrar panel"
              className="p-2 text-textMuted hover:text-textMain transition-colors rounded-lg hover:bg-surfaceBorder/50"
            >
              ✕
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-textMain mb-1">
                {selectedSignal.signalType.replace(/_/g, ' ')}
              </h3>
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
                  <span className={`text-xs px-2 py-1 rounded-full font-medium border ${severityColor(selectedSignal.severity)}`}>
                    {selectedSignal.severity}
                  </span>
                </div>
                <div className="bg-surface/50 p-4 rounded-lg border border-surfaceBorder flex-1">
                  <p className="text-sm text-textMuted mb-1">Estado Actual</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium border ${statusColor(selectedSignal.status)}`}>
                    {selectedSignal.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Feedback */}
            {updateMsg && (
              <div
                role="status"
                aria-live="polite"
                className={`mb-4 p-3 rounded-lg text-sm ${
                  updateMsg.ok
                    ? 'bg-success/10 border border-success/30 text-success'
                    : 'bg-accent/10 border border-accent/30 text-accent'
                }`}
              >
                {updateMsg.text}
              </div>
            )}

            {/* Actions */}
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
                aria-label="Marcar señal como Procesando"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                Marcar como Procesando
              </button>

              <button
                className="w-full btn-primary flex items-center justify-center gap-2"
                onClick={() => handleUpdateStatus('ATENDIDA')}
                disabled={isUpdating || selectedSignal.status === 'ATENDIDA'}
                aria-label="Marcar señal como Atendida"
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
