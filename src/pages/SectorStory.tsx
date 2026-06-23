import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface StoryStage {
  id: string;
  order: number;
  title: string;
  narrative: string;
  dominantEvent: string;
  metrics: Record<string, number>;
  assetKey: string;
  colorToken: string;
  progress: number;
}

export default function SectorStory() {
  const { id } = useParams<{ id: string }>();
  const [stages, setStages] = useState<StoryStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/sectors/${id}/story`);
        const stagesData: StoryStage[] = response.data.stages ?? response.data;
        setStages(stagesData);
        if (stagesData.length > 0) setActiveStageId(stagesData[0].id);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error cargando la historia del sector');
      } finally {
        setLoading(false);
      }
    };
    fetchStory();
  }, [id]);

  // Setup scrollytelling observer after stages are rendered
  useEffect(() => {
    if (stages.length === 0) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveStageId(entry.target.id);
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px' }
    );

    const stepElements = document.querySelectorAll('.story-step');
    stepElements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [stages]);

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  if (error)
    return (
      <div className="h-screen flex items-center justify-center text-accent gap-3">
        <AlertCircle className="w-10 h-10" />
        <span>{error}</span>
      </div>
    );

  const activeStage = stages.find((s) => s.id === activeStageId) ?? stages[0];

  return (
    <div 
      className="relative flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden"
      style={{ viewTransitionName: `sector-${id}` }}
    >

      <div className="w-full md:w-1/2 h-[40vh] md:h-full sticky top-0 md:relative bg-surface/30 border-b md:border-b-0 md:border-r border-surfaceBorder overflow-hidden flex items-center justify-center p-8">
        <div
          key={activeStage?.id}
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in duration-700 relative w-full h-full flex flex-col items-center justify-center gap-6"
        >
          {/* Dynamic visual based on dominantEvent */}
          {activeStage?.dominantEvent === 'HAMBRE' && (
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 bg-warning/20 rounded-full blur-xl motion-safe:animate-pulse" />
              <div className="absolute w-16 h-16 border-4 border-warning/60 rounded-full motion-safe:animate-ping" />
              <span className="absolute text-3xl">🍖</span>
            </div>
          )}
          {activeStage?.dominantEvent === 'MUTACION' && (
            <div className="relative flex items-center justify-center">
              <div className="w-32 h-32 border-2 border-secondary/50 rounded-full motion-safe:animate-spin" style={{ animationDuration: '6s' }} />
              <div className="absolute w-20 h-20 bg-secondary/20 rounded-full blur-xl motion-safe:animate-pulse" />
              <span className="absolute text-3xl">🧬</span>
            </div>
          )}
          {activeStage?.dominantEvent === 'FUGA' && (
            <div className="relative flex items-center justify-center">
              <div className="w-28 h-28 border-2 border-primary/40 rounded-full motion-safe:animate-ping" style={{ animationDuration: '1.5s' }} />
              <span className="absolute text-3xl">💨</span>
            </div>
          )}
          {activeStage?.dominantEvent === 'CONFLICTO' && (
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 bg-accent rounded-full z-10 shadow-[0_0_30px_rgba(255,0,85,0.8)] motion-safe:animate-pulse" />
              <div className="absolute w-32 h-32 border-4 border-accent/50 rounded-full motion-safe:animate-ping" />
              <span className="absolute text-2xl z-20">⚡</span>
            </div>
          )}
          {activeStage?.dominantEvent === 'REPRODUCCION_MASIVA' && (
            <div className="flex items-end gap-3 h-32">
              {[60, 80, 100, 70, 90].map((h, i) => (
                <div key={i} className="w-8 bg-success/50 rounded-t-sm motion-safe:animate-bounce" style={{ height: `${h}%`, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
          {activeStage?.dominantEvent === 'ABANDONO' && (
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 bg-textMuted/10 rounded-full blur-xl" />
              <span className="absolute text-4xl opacity-50">👻</span>
            </div>
          )}
          {activeStage?.dominantEvent === 'SENAL_CORRUPTA' && (
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 border border-primary/30 rounded-lg rotate-45 motion-safe:animate-spin" style={{ animationDuration: '4s' }} />
              <span className="absolute text-3xl">📡</span>
            </div>
          )}
          {!activeStage?.dominantEvent && (
            <div className="w-32 h-32 bg-primary/20 rounded-full blur-xl motion-safe:animate-pulse" />
          )}

          {/* Metrics card */}
          <div className="absolute bottom-8 left-8 right-8 glass-panel p-4">
            <h4 className="text-textMuted text-xs mb-2 uppercase tracking-widest">Métricas Activas</h4>
            <div className="grid grid-cols-3 gap-2">
              {activeStage?.metrics &&
                Object.entries(activeStage.metrics).map(([key, val]) => (
                  <div key={key} className="text-center">
                    <span className="block text-xs text-textMuted capitalize">{key}</span>
                    <span className="text-lg font-mono font-bold text-textMain">{String(val)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollytelling Text ───────────────────────── */}
      <div className="w-full md:w-1/2 overflow-y-auto scroll-smooth relative">
        {/* Sticky progress indicator */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 px-8 py-4 border-b border-surfaceBorder/50">
          <Link
            to="/sectors"
            viewTransition
            className="inline-flex items-center text-textMuted hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Sectores
          </Link>
          <div className="flex gap-2 relative">
            {stages.map((s) => (
              <div
                key={s.id}
                className={`fallback-progress h-1 flex-1 rounded-full motion-safe:transition-all motion-safe:duration-500 ${
                  s.id === activeStageId ? 'bg-primary' : 'bg-surfaceBorder'
                }`}
              />
            ))}
            <div className="scroll-progress-bar absolute top-0 left-0 h-full w-full bg-primary rounded-full pointer-events-none opacity-0" />
          </div>
        </div>

        <div className="p-8 pb-[60vh] pt-12">
          <h1 className="text-4xl font-bold text-textMain mb-16">Historia del Sector</h1>

          <div className="space-y-[40vh]">
            {stages.map((stage) => (
              <div
                key={stage.id}
                id={stage.id}
                tabIndex={0}
                className={`story-step glass-panel p-8 motion-safe:transition-all motion-safe:duration-700 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  activeStageId === stage.id
                    ? 'opacity-100 translate-x-0 border-primary shadow-[0_0_20px_rgba(0,229,255,0.15)] scale-100'
                    : 'opacity-40 -translate-x-4 border-surfaceBorder scale-95'
                }`}
              >
                <div className="text-primary font-mono text-sm mb-4 tracking-wider">FASE {stage.order + 1}</div>
                <h2 className="text-3xl font-bold text-textMain mb-3">{stage.title}</h2>
                <p className="text-sm font-mono text-textMuted mb-4 uppercase tracking-widest">Evento: {stage.dominantEvent.replace('_', ' ')}</p>
                <p className="text-lg text-textMuted leading-relaxed">{stage.narrative}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
