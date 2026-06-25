# Levantar el flujo de pagos (MercadoPago) en local

Guía para retomar el entorno de pagos cuando vuelvas al proyecto. El flujo de
MercadoPago necesita que tu máquina sea **alcanzable desde internet** por dos
motivos:

1. **Webhook** — MercadoPago llama a `MP_NOTIFICATION_URL` para avisar que un
   pago se aprobó. **El estado del pago cambia SOLO por este webhook**, nunca por
   el redirect del navegador.
2. **back_urls + `auto_return`** — tras pagar, MercadoPago redirige el navegador
   a `MP_SUCCESS_URL`. MercadoPago **rechaza URLs `localhost`** cuando hay
   `auto_return`, así que tienen que ser HTTPS públicas.

Como la red bloquea el puerto 7844 (cloudflared no funciona), exponemos los
puertos con **ngrok** (va por el 443).

> ⚠️ **ngrok-free cambia las URLs en cada arranque.** Cada vez que levantes ngrok
> tenés que copiar las URLs nuevas al `.env` y **reiniciar el backend**. El paso 4
> y 5 son obligatorios siempre.

---

## Prerrequisitos (ya configurados — una sola vez)

- `ngrok` instalado en `~/.local/bin/ngrok` y authtoken cargado
  (`~/.config/ngrok/ngrok.yml`).
- El config de ngrok ya define dos túneles (backend `:5100` y frontend `:3000`):

  ```yaml
  # ~/.config/ngrok/ngrok.yml
  version: "3"
  agent:
      authtoken: <tu-authtoken>
  endpoints:
    - name: backend
      upstream:
        url: 5100
    - name: frontend
      upstream:
        url: 3000
  ```

Si alguna vez perdés el authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
(es el "Authtoken", **no** el API key que empieza con `cr_`).

---

## Pasos para levantar todo

### 1. Infra (postgres + redis)

```bash
docker compose up -d
```

### 2. Backend

```bash
cd server && pnpm dev      # escucha en http://localhost:5100
```

### 3. Frontend

```bash
cd client && pnpm dev      # escucha en http://localhost:3000
```

### 4. ngrok (los dos túneles con un solo agente)

> ngrok-free permite **un solo proceso** a la vez; por eso ambos túneles van en
> un mismo `ngrok start --all`, no en dos procesos separados.

```bash
ngrok start --all
```

Obtené las dos URLs públicas (en otra terminal):

```bash
curl -s http://localhost:4040/api/tunnels \
  | python3 -c "import sys,json;[print(t['name'],t['public_url']) for t in json.load(sys.stdin)['tunnels']]"
# backend  https://XXXX.ngrok-free.app
# frontend https://YYYY.ngrok-free.app
```

### 5. Actualizar `server/.env` con las URLs nuevas

`backend → webhook`, `frontend → back_urls`:

```dotenv
MP_NOTIFICATION_URL="https://XXXX.ngrok-free.app/payments/webhook"
MP_SUCCESS_URL="https://YYYY.ngrok-free.app/payment/success"
MP_FAILURE_URL="https://YYYY.ngrok-free.app/payment/failure"
MP_PENDING_URL="https://YYYY.ngrok-free.app/payment/pending"
```

### 6. Reiniciar el backend

Obligatorio: el `.env` se lee al arrancar, no se recarga en caliente.

```bash
# en la terminal del backend: Ctrl+C y de nuevo
cd server && pnpm dev
```

El **front no necesita reinicio** (Next recompila el middleware en caliente).

---

## Atajo: actualizar el `.env` automáticamente

En vez del paso 5 a mano, con ngrok ya corriendo:

```bash
cd server
B=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json;print([t['public_url'] for t in json.load(sys.stdin)['tunnels'] if t['name']=='backend'][0])")
F=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json;print([t['public_url'] for t in json.load(sys.stdin)['tunnels'] if t['name']=='frontend'][0])")
sed -i \
  -e "s#^MP_NOTIFICATION_URL=.*#MP_NOTIFICATION_URL=\"$B/payments/webhook\"#" \
  -e "s#^MP_SUCCESS_URL=.*#MP_SUCCESS_URL=\"$F/payment/success\"#" \
  -e "s#^MP_FAILURE_URL=.*#MP_FAILURE_URL=\"$F/payment/failure\"#" \
  -e "s#^MP_PENDING_URL=.*#MP_PENDING_URL=\"$F/payment/pending\"#" \
  .env
echo "back=$B  front=$F  → .env actualizado. Reiniciá el backend."
```

---

## Probar el flujo end-to-end

1. Iniciá un pago desde el front → te lleva a MercadoPago.
2. Pagá (con credenciales de **sandbox**).
3. MercadoPago redirige **solo** a `…/payment/success` (`auto_return: 'approved'`).
4. ngrok-free muestra su página intersticial una vez por sesión de browser →
   "Visit Site" → llegás a tu página de éxito.
5. En paralelo, MercadoPago llama al webhook →
   `handle-payment-webhook.use-case` cambia el estado a **pagado**.

### Verificar que el webhook llega

```bash
# Simula la llamada de MercadoPago (debe responder 200)
curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
  "https://XXXX.ngrok-free.app/payments/webhook" \
  -H "Content-Type: application/json" -d '{"type":"payment","data":{"id":"123"}}'
```

También podés inspeccionar cada request entrante en el dashboard local de ngrok:
**http://localhost:4040**

---

## Notas / gotchas

- **El estado cambia por el webhook, no por el redirect.** Si el redirect funciona
  pero el estado no cambia → revisá que `MP_NOTIFICATION_URL` apunte al túnel y que
  el backend se haya reiniciado.
- **Rutas de resultado públicas.** `/payment/success|failure|pending` están en
  `PUBLIC_PATHS` de `client/src/middleware.ts` para que MercadoPago pueda devolver
  al usuario sin pasar por login. `/payments` (plural, el dashboard) sigue protegido.
- **`MP_ACCESS_TOKEN`** ya está en el `.env`; no se toca al levantar.
- **El agente ngrok tiene que seguir corriendo** mientras probás. Si lo matás, se
  cae el webhook y las back_urls.
