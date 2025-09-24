# 🚀 TranSync Backend - Despliegue en Railway

## ⚡ Despliegue Rápido

### 1. Conectar a Railway
1. Ve a [Railway.app](https://railway.app)
2. Conecta tu repositorio de GitHub
3. Selecciona este proyecto

### 2. Agregar Base de Datos
1. En Railway, haz clic en "Add Service"
2. Selecciona "Database" → "MySQL"
3. Railway creará automáticamente las variables de entorno

### 3. Configurar Variables de Entorno
En Railway Dashboard → Variables, agrega:

```bash
NODE_ENV=production
JWT_SECRET=tu_clave_secreta_super_fuerte_minimo_32_caracteres
FRONTEND_URL=https://tu-frontend-domain.railway.app
```

### 4. Inicializar Base de Datos
Una vez desplegado, ejecuta en Railway CLI:
```bash
railway run npm run db:init
```

O conecta directamente a MySQL y ejecuta `Version_final.sql`

## 🔐 Credenciales de Prueba

### SUPERADMIN
- **Email:** admintransync@gmail.com
- **Password:** admin123

### GESTOR
- **Email:** juan.perez@example.com
- **Password:** gestor123

### CONDUCTOR
- **Email:** ana.gomez@example.com
- **Password:** conductor123

## 🔍 Verificación

1. **Health Check:** `https://tu-app.railway.app/api/health`
2. **API Base:** `https://tu-app.railway.app/api`
3. **Login:** `POST https://tu-app.railway.app/api/auth/login`

## 📊 Base de Datos

La base de datos incluye:
- ✅ 14 Tablas completas
- ✅ Datos de prueba
- ✅ 1 Empresa (Expreso La Sabana S.A.S)
- ✅ 9 Usuarios de prueba
- ✅ 5 Conductores
- ✅ 5 Vehículos
- ✅ 6 Rutas
- ✅ Sistema de chatbot configurado

## 🛠️ Comandos Útiles

```bash
# Ver logs
railway logs

# Conectar a base de datos
railway connect mysql

# Inicializar BD
railway run npm run db:init

# Ver variables
railway variables
```

## 🚨 Solución de Problemas

### Error 503
- Verifica `/api/health`
- Revisa variables de entorno
- Confirma que MySQL esté activo

### Base de Datos
- Ejecuta `npm run db:init`
- Verifica conexión MySQL
- Revisa logs: `railway logs`

---

**¡Tu aplicación está lista para producción! 🎉**

Para más detalles, consulta:
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)