/**
 * Agrega una foto a un FormData en celular y en web.
 *
 * React Native acepta un objeto {uri, type, name}. El navegador no: ahí
 * hay que enviar un Blob, de lo contrario el servidor recibe el texto
 * "[object Object]" y la subida falla.
 */
import { Platform } from 'react-native';

const EXTENSIONES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function appendImage(form, campo, photo, prefijo = 'foto') {
  if (Platform.OS !== 'web') {
    form.append(campo, {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.name || `${prefijo}_${Date.now()}.jpg`,
    });
    return;
  }
  const respuesta = await fetch(photo.uri);
  const blob = await respuesta.blob();
  const mime = blob.type || photo.mimeType || 'image/jpeg';
  const ext = EXTENSIONES[mime] || 'jpg';
  form.append(campo, blob, photo.fileName || photo.name || `${prefijo}_${Date.now()}.${ext}`);
}
