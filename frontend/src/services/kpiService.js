import api from './api';

/**
 * KPIs — GET api/core/kpis/ (solo ADMINISTRADOR) → {kpis: [KPI1..KPI5]}
 * Campos exactos por KPI (apps/core/kpis.py):
 *  KPI1: promedio_minutos | meta_minutos | incidencias_mediciones
 *  KPI2: registros_plataforma | meta_porcentaje
 *  KPI3: total_asignaciones | sin_conflicto | porcentaje_sin_conflicto | meta_porcentaje
 *  KPI4: incidencias_con_evidencia_requerida | con_foto | porcentaje | meta_porcentaje
 *  KPI5: usuarios_activos_hoy | usuarios_totales | porcentaje | meta_porcentaje
 */
export const kpiService = {
  async resumen() {
    const { data } = await api.get('/core/kpis/');
    return data.kpis || [];
  },
};
