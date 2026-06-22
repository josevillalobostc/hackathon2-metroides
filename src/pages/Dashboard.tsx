import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Activity, AlertTriangle, Radio, BarChart3 } from 'lucide-react';

interface DashboardSummary {
  totalTropels: number;
  criticalTropels: number;
  openSignals: number;
  sectorStabilityAvg: number;
  signalsBySeverity: {
    LEVE: number;
    MODERADO: number;
    GRAVE: number;
    CRITICO: number;
  };
  generatedAt: string;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dashboard/summary');
        setSummary(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar el resumen del dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-textMuted animate-pulse">Sincronizando telemetría...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <div className="glass-panel p-8 max-w-md text-center border-accent/30 bg-accent/5">
          <AlertTriangle className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-xl font-bold text-textMain mb-2">Error de Conexión</h2>
          <p className="text-textMuted mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <p className="text-textMuted">No hay datos disponibles en este sector.</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Tropeles Totales',
      value: summary.totalTropels,
      icon: Activity,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20'
    },
    {
      title: 'Estado Crítico',
      value: summary.criticalTropels,
      icon: AlertTriangle,
      color: 'text-accent',
      bg: 'bg-accent/10',
      border: 'border-accent/20'
    },
    {
      title: 'Señales Abiertas',
      value: summary.openSignals,
      icon: Radio,
      color: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-warning/20'
    },
    {
      title: 'Estabilidad Media',
      value: `${summary.sectorStabilityAvg}%`,
      icon: BarChart3,
      color: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success/20'
    }
  ];

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-textMain mb-2">Resumen Operativo</h1>
        <p className="text-textMuted">
          Última actualización: {new Date(summary.generatedAt).toLocaleTimeString()}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className={`glass-panel p-6 border ${stat.border} flex items-center justify-between hover:scale-[1.02] transition-transform duration-300`}>
              <div>
                <p className="text-textMuted text-sm font-medium mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-textMain">{stat.value}</p>
              </div>
              <div className={`p-4 rounded-xl ${stat.bg}`}>
                <Icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-6 text-textMain">Distribución de Señales</h3>
          <div className="space-y-4">
            {Object.entries(summary.signalsBySeverity).map(([severity, count]) => {
              const maxCount = Math.max(...Object.values(summary.signalsBySeverity));
              const width = maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%';
              
              let colorClass = 'bg-primary';
              if (severity === 'MODERADO') colorClass = 'bg-warning';
              if (severity === 'GRAVE') colorClass = 'bg-secondary';
              if (severity === 'CRITICO') colorClass = 'bg-accent';

              return (
                <div key={severity}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-textMuted">{severity}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="w-full bg-surfaceBorder rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full ${colorClass} transition-all duration-1000 ease-out`}
                      style={{ width }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Placeholder for future widgets */}
        <div className="glass-panel p-6 flex flex-col items-center justify-center text-center border-dashed border-2 border-surfaceBorder bg-surface/30">
          <Activity className="w-10 h-10 text-textMuted mb-3 opacity-50" />
          <p className="text-textMuted">Módulo de análisis predictivo<br/>(Próximamente)</p>
        </div>
      </div>
    </div>
  );
}
