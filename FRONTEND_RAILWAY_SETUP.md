# Configuración del Frontend para Railway Backend

## 📋 Pasos para Conectar el Frontend al Backend de Railway

### 1. Configuración de Variables de Entorno

**Para Producción (Netlify):**
- Copia el contenido de `.env.production` 
- Ve a tu dashboard de Netlify
- En Site Settings > Environment Variables
- Agrega cada variable del archivo `.env.production`

**Para Desarrollo Local:**
- Copia `.env.development` a tu proyecto frontend
- Renómbralo a `.env.local` o `.env`

### 2. Obtener la URL del Backend Railway

**IMPORTANTE:** Necesitas obtener la URL real de tu deployment en Railway:

1. Ve a tu dashboard de Railway
2. Selecciona tu proyecto backend
3. En la pestaña "Deployments", busca la URL pública
4. La URL será algo como: `https://tu-proyecto-nombre.up.railway.app`

**Ejemplo de URLs (reemplaza con tu URL real):**
```
Backend API: https://TU-DOMINIO-RAILWAY.up.railway.app/api
WebSocket: wss://TU-DOMINIO-RAILWAY.up.railway.app
Health Check: https://TU-DOMINIO-RAILWAY.up.railway.app/api/health
```

### 3. Endpoints Disponibles

#### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/verify` - Verificar token
- `GET /api/auth/profile` - Obtener perfil

#### Gestión de Usuarios
- `GET /api/user/profile` - Obtener perfil de usuario
- `PUT /api/user/profile` - Actualizar perfil
- `PUT /api/user/change-password` - Cambiar contraseña
- `GET /api/user/preferences` - Obtener preferencias
- `PUT /api/user/preferences` - Actualizar preferencias

#### Dashboard y Reportes
- `GET /api/dashboard/*` - Endpoints del dashboard
- `GET /api/conductores` - Gestión de conductores
- `GET /api/vehiculos` - Gestión de vehículos
- `GET /api/rutas` - Gestión de rutas
- `GET /api/viajes` - Gestión de viajes

#### Chatbot
- `POST /api/chatbot/consulta` - Consultas al chatbot

#### WebSocket
- Conexión: `wss://transync-backend-production.up.railway.app`
- Requiere autenticación JWT en el handshake

### 4. Configuración de Autenticación

El backend requiere JWT tokens para la mayoría de endpoints. Asegúrate de:

1. Incluir el token en el header: `Authorization: Bearer <token>`
2. Para WebSocket, enviar el token en el handshake
3. El token se obtiene del endpoint `/api/auth/login`

### 5. Ejemplo de Configuración en React

```javascript
// api.js
const API_BASE_URL = process.env.REACT_APP_API_URL;
const WS_URL = process.env.REACT_APP_WS_URL;

// Configuración de Axios
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### 6. Configuración de WebSocket

```javascript
// websocket.js
import io from 'socket.io-client';

const connectWebSocket = (token) => {
  const socket = io(process.env.REACT_APP_WS_URL, {
    auth: {
      token: token
    },
    transports: ['websocket', 'polling']
  });
  
  return socket;
};
```

### 7. Variables de Entorno Críticas

```env
# Obligatorias
REACT_APP_API_URL=https://transync-backend-production.up.railway.app/api
REACT_APP_WS_URL=wss://transync-backend-production.up.railway.app

# Opcionales pero recomendadas
REACT_APP_HEALTH_CHECK_URL=https://transync-backend-production.up.railway.app/api/health
REACT_APP_DEBUG_MODE=false (producción) / true (desarrollo)
```

### 8. Verificación de Conexión

Para verificar que la conexión funciona:

1. **Health Check:**
   ```bash
   curl https://transync-backend-production.up.railway.app/api/health
   ```

2. **En el Frontend:**
   ```javascript
   fetch(process.env.REACT_APP_HEALTH_CHECK_URL)
     .then(res => res.json())
     .then(data => console.log('Backend Status:', data));
   ```

### 9. Solución de Problemas Comunes

#### Error de CORS
- Verifica que tu dominio esté en la lista de orígenes permitidos del backend
- El backend ya incluye `https://transync1.netlify.app`

#### Error de Conexión WebSocket
- Asegúrate de usar `wss://` para HTTPS
- Verifica que el token JWT sea válido

#### Error 404 en API
- Verifica que la URL incluya `/api` al final
- Ejemplo correcto: `https://transync-backend-production.up.railway.app/api/auth/login`

### 10. Despliegue en Netlify

1. Sube tu código a GitHub
2. Conecta el repositorio a Netlify
3. Configura las variables de entorno en Netlify
4. Despliega

### 11. Credenciales de Prueba

```
Email: admintransync@gmail.com
Password: admin123

Email: juan.perez@example.com
Password: gestor123
```

## 🚀 ¡Listo para Producción!

El backend está completamente configurado y listo para recibir conexiones del frontend.