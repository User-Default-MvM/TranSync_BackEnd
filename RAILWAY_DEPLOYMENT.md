# 🚀 Despliegue en Railway - TranSync Backend

## 📋 Guía Completa de Despliegue

### 1. Preparación del Repositorio

#### Archivos de Configuración Incluidos:
- ✅ `railway.json` - Configuración de Railway optimizada
- ✅ `Dockerfile` - Imagen Docker optimizada para producción
- ✅ `.dockerignore` - Exclusión de archivos innecesarios
- ✅ `package.json` - Scripts de despliegue actualizados

### 2. Configuración en Railway

#### Paso 1: Conectar Repositorio
1. Ve a [Railway.app](https://railway.app)
2. Inicia sesión con tu cuenta de GitHub
3. Haz clic en "New Project"
4. Selecciona "Deploy from GitHub repo"
5. Conecta tu repositorio `Trasync-backend`

#### Paso 2: Configurar Variables de Entorno
En el dashboard de Railway, ve a la pestaña "Variables" y configura:

```bash
# Configuración del Servidor
NODE_ENV=production
PORT=$PORT

# Base de Datos MySQL (Railway MySQL Plugin)
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_DATABASE=${{MySQL.MYSQL_DATABASE}}
DB_PORT=${{MySQL.MYSQL_PORT}}

# Configuración JWT
JWT_SECRET=tu_clave_secreta_super_fuerte_aqui_min_32_caracteres

# Configuración de Email (Opcional)
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password_gmail

# APIs de Mapas (Opcional)
GOOGLE_MAPS_API_KEY=tu_google_maps_api_key
MAPBOX_API_KEY=tu_mapbox_api_key
MAP_PROVIDER=openstreetmap

# URL del Frontend (Actualizar con tu dominio)
FRONTEND_URL=https://tu-frontend-domain.railway.app
```

#### Paso 3: Agregar MySQL Database
1. En tu proyecto de Railway, haz clic en "Add Service"
2. Selecciona "Database" → "MySQL"
3. Railway creará automáticamente las variables de entorno de la base de datos

#### Paso 4: Configurar Dominio Personalizado (Opcional)
1. Ve a la pestaña "Settings" de tu servicio
2. En "Domains", agrega tu dominio personalizado
3. Configura los registros DNS según las instrucciones

### 3. Configuración de Base de Datos

#### Importar Schema SQL:
1. Conecta a tu base de datos MySQL de Railway usando un cliente como MySQL Workbench
2. Ejecuta el archivo `Version_final.sql` para crear las tablas
3. O usa Railway CLI:
```bash
railway connect mysql
# Luego ejecuta el SQL desde el archivo
```

### 4. Despliegue Automático

#### Configuración de GitHub:
- ✅ Railway detectará automáticamente los cambios en tu rama `main`
- ✅ Cada push activará un nuevo despliegue
- ✅ Los logs de despliegue estarán disponibles en el dashboard

#### Verificación del Despliegue:
1. Espera a que el despliegue termine (status: "Active")
2. Visita tu URL de Railway: `https://tu-proyecto.railway.app`
3. Verifica el health check: `https://tu-proyecto.railway.app/api/health`

### 5. Monitoreo y Logs

#### Ver Logs en Tiempo Real:
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Ver logs
railway logs
```

#### Health Check Endpoint:
- URL: `/api/health`
- Método: GET
- Respuesta esperada: Status 200 con información del sistema

### 6. Configuraciones de Producción

#### Características Habilitadas:
- ✅ Compresión GZIP automática
- ✅ Headers de seguridad
- ✅ Rate limiting
- ✅ CORS configurado para producción
- ✅ WebSocket con autenticación JWT
- ✅ Pool de conexiones MySQL optimizado
- ✅ Manejo graceful de señales de cierre

#### Optimizaciones de Docker:
- ✅ Imagen Alpine Linux (menor tamaño)
- ✅ Usuario no-root para seguridad
- ✅ Multi-stage build optimizado
- ✅ Health checks configurados
- ✅ Manejo de señales con dumb-init

### 7. Variables de Entorno Críticas

#### Obligatorias:
```bash
NODE_ENV=production
JWT_SECRET=clave_secreta_minimo_32_caracteres
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_DATABASE=${{MySQL.MYSQL_DATABASE}}
DB_PORT=${{MySQL.MYSQL_PORT}}
```

#### Opcionales pero Recomendadas:
```bash
EMAIL_USER=email_para_notificaciones
EMAIL_PASS=password_de_aplicacion
GOOGLE_MAPS_API_KEY=para_funcionalidad_de_mapas
FRONTEND_URL=url_de_tu_frontend
```

### 8. Solución de Problemas

#### Problemas Comunes:

**Error de Conexión a Base de Datos:**
- Verifica que el plugin MySQL esté activo
- Confirma que las variables de entorno estén correctas
- Revisa los logs: `railway logs`

**Error 503 Service Unavailable:**
- Verifica que el health check responda en `/api/health`
- Confirma que el puerto esté configurado correctamente
- Revisa que NODE_ENV=production

**WebSocket no funciona:**
- Verifica que el JWT_SECRET esté configurado
- Confirma que CORS esté configurado para tu frontend
- Revisa los logs de conexión WebSocket

#### Comandos Útiles:
```bash
# Ver status del proyecto
railway status

# Ver variables de entorno
railway variables

# Conectar a la base de datos
railway connect mysql

# Ver logs en tiempo real
railway logs --follow

# Redeploy manual
railway up
```

### 9. Seguridad en Producción

#### Configuraciones Aplicadas:
- ✅ Headers de seguridad (HSTS, XSS Protection, etc.)
- ✅ CORS restrictivo
- ✅ Rate limiting
- ✅ Validación de JWT
- ✅ Usuario no-root en Docker
- ✅ Variables de entorno seguras

#### Recomendaciones Adicionales:
- Usar HTTPS siempre (Railway lo proporciona automáticamente)
- Rotar JWT_SECRET periódicamente
- Monitorear logs regularmente
- Configurar alertas de uptime

### 10. Escalabilidad

#### Railway Pro Features:
- Auto-scaling basado en CPU/memoria
- Múltiples regiones
- Backups automáticos de base de datos
- Métricas avanzadas

#### Optimizaciones Incluidas:
- Pool de conexiones MySQL optimizado
- Caching inteligente
- Compresión de respuestas
- WebSocket eficiente

---

## 🔗 Enlaces Útiles

- [Railway Documentation](https://docs.railway.app/)
- [Railway CLI](https://docs.railway.app/develop/cli)
- [MySQL Plugin](https://docs.railway.app/databases/mysql)
- [Custom Domains](https://docs.railway.app/deploy/custom-domains)

## 📞 Soporte

Si encuentras problemas durante el despliegue:
1. Revisa los logs: `railway logs`
2. Verifica las variables de entorno
3. Confirma que la base de datos esté activa
4. Revisa el health check endpoint

---

**¡Tu aplicación TranSync Backend está lista para producción en Railway! 🚀**