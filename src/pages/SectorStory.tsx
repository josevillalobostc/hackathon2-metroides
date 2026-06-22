import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface StoryStage {
  id: string;
  order: number;
  title: string;
  content: string;
  visualType: string; // 'MAP' | 'DATA_CHART' | 'ALERT_RIPPLE'
  metrics: Record<string, number | string>;
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
    <div className="relative flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden">

      {/* ── Sticky Visual Panel ───────────────────────── */}
      <div className="w-full md:w-1/2 h-[40vh] md:h-full sticky top-0 md:relative bg-surface/30 border-b md:border-b-0 md:border-r border-surfaceBorder overflow-hidden flex items-center justify-center p-8">
        <div
          key={activeStage?.id}
          className="animate-in fade-in zoom-in duration-700 relative w-full h-full flex flex-col items-center justify-center"
        >
          {activeStage?.visualType === 'MAP' && (
            <div className="w-64 h-64 rounded-full border-2 border-primary/30 flex items-center justify-center relative">
              <div className="absolute w-full h-full border border-primary/20 rounded-full animate-spin" style={{ animationDuration: '10s' }} />
              <div className="w-32 h-32 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="absolute flex flex-col text-center">
                <span className="text-primary font-bold text-xl">SECTOR MAP</span>
              </div>
            </div>
          )}

          {activeStage?.visualType === 'DATA_CHART' && (
            <div className="flex items-end gap-4 h-48">
              <div className="w-12 bg-secondary/50 rounded-t-sm h-[40%] animate-bounce" />
              <div className="w-12 bg-primary/50 rounded-t-sm h-[70%] animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-12 bg-success/50 rounded-t-sm h-[90%] animate-bounce" style={{ animationDelay: '0.4s' }} />
              <div className="w-12 bg-accent/50 rounded-t-sm h-[50%] animate-bounce" style={{ animationDelay: '0.6s' }} />
            </div>
          )}

          {activeStage?.visualType === 'ALERT_RIPPLE' && (
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 bg-accent rounded-full z-10 shadow-[0_0_30px_rgba(255,0,85,0.8)]" />
              <div className="absolute w-32 h-32 border-4 border-accent/50 rounded-full animate-ping" />
              <div
                className="absolute w-64 h-64 border-2 border-accent/20 rounded-full animate-ping"
                style={{ animationDuration: '2s' }}
              />
            </div>
          )}

          {/* Metrics card — updates with active stage */}
          <div className="absolute bottom-8 left-8 right-8 glass-panel p-4">
            <h4 className="text-textMuted text-xs mb-2 uppercase tracking-widest">Métricas Activas</h4>
            <div className="grid grid-cols-2 gap-2">
              {activeStage?.metrics &&
                Object.entries(activeStage.metrics).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b border-surfaceBorder pb-1">
                    <span className="text-xs text-textMuted">{key}</span>
                    <span className="text-sm font-mono text-textMain">{String(val)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollytelling Text ───────────────────────── */}
      <div className="w-full md:w-1/2 overflow-y-auto scroll-smooth">
        <div className="p-8 pb-[60vh]">
          <Link
            to="/sectors"
            className="inline-flex items-center text-textMuted hover:text-primary transition-colors mb-12"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Sectores
          </Link>

          <h1 className="text-4xl font-bold text-textMain mb-16">Historia del Sector</h1>

          {/* Progress indicator */}
          <div className="flex gap-2 mb-16">
            {stages.map((s) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  s.id === activeStageId ? 'bg-primary' : 'bg-surfaceBorder'
                }`}
              />
            ))}
          </div>

          <div className="space-y-[40vh]">
            {stages.map((stage) => (
              <div
                key={stage.id}
                id={stage.id}
                tabIndex={0}
                className={`story-step glass-panel p-8 transition-all duration-700 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  activeStageId === stage.id
                    ? 'opacity-100 translate-x-0 border-primary shadow-[0_0_20px_rgba(0,229,255,0.15)] scale-100'
                    : 'opacity-40 -translate-x-4 border-surfaceBorder scale-95'
                }`}
              >
                <div className="text-primary font-mono text-sm mb-4 tracking-wider">FASE {stage.order}</div>
                <h2 className="text-3xl font-bold text-textMain mb-6">{stage.title}</h2>
                <p className="text-lg text-textMuted leading-relaxed">{stage.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
