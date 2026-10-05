import api, { apiErrorMessage } from './api';

async function request(promiseFactory) {
  try {
    const { data } = await promiseFactory();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), error };
  }
}

export const privacyService = {
  getAviso() {
    return request(() => api.get('/privacy/aviso/'));
  },
  getConsentimientoActual() {
    return request(() => api.get('/privacy/consentimiento/actual/'));
  },
  aceptarConsentimiento() {
    return request(() => api.post('/privacy/consentimiento/aceptar/', {}));
  },
  retirarConsentimiento() {
    return request(() => api.post('/privacy/consentimiento/retirar/', {}));
  },
  getMisSolicitudes() {
    return request(() => api.get('/privacy/derechos/mis-solicitudes/'));
  },
  crearSolicitud(tipo, detalle) {
    return request(() => api.post('/privacy/derechos/solicitudes/', { tipo, detalle }));
  },
  exportarDatos() {
    return request(() => api.get('/privacy/derechos/exportar/'));
  },
  getSolicitudes(estado) {
    const params = estado ? { estado } : undefined;
    return request(() => api.get('/privacy/admin/solicitudes/', { params }));
  },
  actualizarSolicitud(id, payload) {
    return request(() => api.patch(`/privacy/admin/solicitudes/${id}/`, payload));
  },
  getAuditoria(accion) {
    const params = accion ? { accion } : undefined;
    return request(() => api.get('/privacy/admin/auditoria/', { params }));
  },
};

export default privacyService;
