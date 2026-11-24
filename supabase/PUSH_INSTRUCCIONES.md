# Activar las notificaciones push (una sola vez)

Orden recomendado. Todo es gratis dentro del plan de Supabase.

## 1. Crear las llaves VAPID (en tu compu)
En la carpeta del proyecto:
```
npx web-push generate-vapid-keys
```
Te da dos textos largos: **Public Key** y **Private Key**. Guárdalos.

## 2. Poner la llave pública en GitHub
GitHub → tu repo → Settings → Secrets and variables → Actions → New repository secret:
- Nombre: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Valor: la **Public Key**

## 3. Crear la función en Supabase
Supabase → Edge Functions → **Deploy a new function** → «Via Editor» → nombre **`send-push`**.
Pega todo el contenido de `supabase/functions/send-push/index.ts` y despliega.
**Apaga «Verify JWT»** en la configuración de esa función (la función hace su propia verificación).

## 4. Poner los secretos de la función
Edge Functions → Secrets → agrega:

| Nombre | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | la Public Key |
| `VAPID_PRIVATE_KEY` | la Private Key |
| `VAPID_SUBJECT` | `mailto:tu-correo@ejemplo.com` |
| `PUSH_SECRET` | una clave larga inventada por ti (la usarás en el paso 5) |
| `APP_URL` | `https://netoxdd.github.io/pieza-a-pieza` |
| `APP_TIMEZONE` | `America/Tijuana` |
| `JWT_SECRET` | Project Settings → API → **JWT Secret** (solo para avisos de tomas y encuentros) |
| `PUSH_SHOW_DETAILS` | opcional. Con `true` la notificación incluye nombres y medicinas. Por defecto es genérica |

## 5. Correr el SQL
Abre `supabase/push.sql`, **cambia las dos líneas marcadas «EDITA»** (tu URL de Supabase y la misma clave `PUSH_SECRET`)
y córrelo en el SQL Editor.

## 6. Probar
1. Sube el código y espera el despliegue. Abre la app publicada → **Ajustes → Avisos en este dispositivo → Activar avisos** → «Enviar aviso de prueba».
2. En iPhone/iPad: primero «Añadir a pantalla de inicio» y abre la app desde ese ícono.
3. Prueba de mensajes: entra con otra cuenta demo y escribe un mensaje; a la primera cuenta le debe llegar el aviso.
4. Prueba de tomas y encuentros **sin enviar nada**: en Supabase → Edge Functions → send-push → pestaña de pruebas (o con curl), manda
   `{"kind":"tick","dry_run":true}` con el encabezado `x-push-secret: tu-clave`. Responde qué enviaría ahora mismo y los errores que encuentre (`notes`).

## Cosas que conviene saber
- Las tomas avisan «Hora de una toma» al llegar la hora y «Toma sin registrar» al pasar el tiempo de gracia. Cada aviso se manda una sola vez.
- Los pediatras reciben avisos de mensajes y encuentros, no de tomas.
- Si el JWT Secret de tu proyecto usa llaves nuevas (asimétricas), los avisos de tomas/encuentros darán error en `notes`; los de mensajes siguen funcionando. Dímelo y lo adaptamos.
- Para quitar todo: `select cron.unschedule('push-tick');` y borra el trigger `push_messages`.
