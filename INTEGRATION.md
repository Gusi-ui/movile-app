# Integración con Aplicación Web - SAD LAS

Esta guía explica cómo integrar la aplicación móvil SAD LAS con la aplicación web que comparte la misma base de datos.

## 🔗 **Arquitectura de Integración**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App Móvil     │    │   API Backend   │    │   App Web       │
│   (React Native)│◄──►│   (Compartida)  │◄──►│   (Web)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Base de Datos │
                       │   (Compartida)  │
                       └─────────────────┘
```

## 📊 **Modelos de Base de Datos Compartidos**

### **Workers (Trabajadores)**
```sql
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'worker' CHECK (role IN ('worker', 'admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    profile_image TEXT,
    employee_id VARCHAR(50),
    department VARCHAR(100),
    supervisor_id UUID REFERENCES workers(id),
    hire_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Assignments (Asignaciones)**
```sql
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Relaciones
    worker_id UUID REFERENCES workers(id),
    assigned_by UUID REFERENCES workers(id),
    route_id UUID REFERENCES routes(id),
    
    -- Ubicación
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Fechas
    assigned_at TIMESTAMP DEFAULT NOW(),
    due_date TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadatos
    estimated_duration INTEGER, -- en minutos
    actual_duration INTEGER,
    notes TEXT,
    attachments JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Routes (Rutas)**
```sql
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    
    -- Relaciones
    worker_id UUID REFERENCES workers(id),
    created_by UUID REFERENCES workers(id),
    
    -- Configuración de ruta
    start_location JSONB,
    end_location JSONB,
    
    -- Fechas
    scheduled_date DATE NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadatos
    total_assignments INTEGER DEFAULT 0,
    completed_assignments INTEGER DEFAULT 0,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Balances (Pagos)**
```sql
CREATE TABLE balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id),
    
    -- Información del pago
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_salary DECIMAL(10, 2) DEFAULT 0,
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    overtime_rate DECIMAL(10, 2) DEFAULT 0,
    bonuses DECIMAL(10, 2) DEFAULT 0,
    deductions DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Estado
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
    approved_by UUID REFERENCES workers(id),
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    
    -- Detalles
    assignments_completed INTEGER DEFAULT 0,
    routes_completed INTEGER DEFAULT 0,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Notes (Notas)**
```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'general' CHECK (type IN ('general', 'assignment', 'route', 'issue')),
    
    -- Relaciones
    worker_id UUID REFERENCES workers(id),
    assignment_id UUID REFERENCES assignments(id),
    route_id UUID REFERENCES routes(id),
    
    -- Metadatos
    is_private BOOLEAN DEFAULT false,
    tags JSONB,
    attachments JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **User Settings (Configuraciones)**
```sql
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id) UNIQUE,
    
    -- Preferencias de notificaciones
    notifications JSONB DEFAULT '{
        "push_enabled": true,
        "email_enabled": true,
        "assignment_updates": true,
        "route_updates": true,
        "payment_updates": true
    }',
    
    -- Preferencias de la app
    app_preferences JSONB DEFAULT '{
        "theme": "light",
        "language": "es",
        "map_type": "standard",
        "auto_sync": true
    }',
    
    -- Configuración de ubicación
    location_settings JSONB DEFAULT '{
        "tracking_enabled": true,
        "high_accuracy": false,
        "background_updates": false
    }',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔌 **API Endpoints Compartidos**

### **Autenticación**
```
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
```

### **Workers**
```
GET    /api/v1/worker/profile
PUT    /api/v1/worker/profile
GET    /api/v1/worker/stats
```

### **Assignments**
```
GET    /api/v1/worker/assignments
GET    /api/v1/worker/assignments/:id
PUT    /api/v1/worker/assignments/:id/status
```

### **Routes**
```
GET    /api/v1/worker/routes
GET    /api/v1/worker/route/current
GET    /api/v1/worker/routes/:id
PUT    /api/v1/worker/routes/:id/status
```

### **Balances**
```
GET    /api/v1/worker/balances
GET    /api/v1/worker/balances/:id
```

### **Notes**
```
GET    /api/v1/worker/notes
POST   /api/v1/worker/notes
PUT    /api/v1/worker/notes/:id
DELETE /api/v1/worker/notes/:id
```

### **Settings**
```
GET    /api/v1/worker/settings
PUT    /api/v1/worker/settings
```

## 🔧 **Configuración de Integración**

### **1. Variables de Entorno**

#### **Desarrollo**
```bash
# .env.development
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_ENV=development
```

#### **Staging**
```bash
# .env.staging
EXPO_PUBLIC_API_URL=https://staging-api.sadlas.com/v1
EXPO_PUBLIC_ENV=staging
```

#### **Producción**
```bash
# .env.production
EXPO_PUBLIC_API_URL=https://api.sadlas.com/v1
EXPO_PUBLIC_ENV=production
```

### **2. Autenticación JWT**

La aplicación móvil usa JWT tokens para autenticación:

```typescript
// Headers requeridos
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

### **3. Formato de Respuestas**

Todas las respuestas de la API siguen este formato:

```typescript
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
```

## 🚀 **Pasos de Integración**

### **Paso 1: Configurar Base de Datos**
1. Ejecutar migraciones SQL proporcionadas
2. Configurar índices para optimización
3. Configurar triggers para `updated_at`

### **Paso 2: Configurar API Backend**
1. Implementar endpoints listados
2. Configurar autenticación JWT
3. Implementar middleware de autorización

### **Paso 3: Configurar App Móvil**
1. Actualizar `.env` con URL real de API
2. Probar conexión con `npm start`
3. Verificar autenticación

### **Paso 4: Testing de Integración**
```bash
# Probar endpoints
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "worker@sadlas.com", "password": "password"}'

# Probar con token
curl -X GET http://localhost:3000/api/v1/worker/assignments \
  -H "Authorization: Bearer <token>"
```

## 📱 **Funcionalidades Móviles Específicas**

### **Sincronización Offline**
- AsyncStorage para datos críticos
- Queue de acciones pendientes
- Sincronización automática al reconectar

### **Geolocalización**
- Tracking de ubicación en tiempo real
- Integración con mapas nativos
- Cálculo de rutas optimizadas

### **Notificaciones Push**
- Nuevas asignaciones
- Cambios de estado
- Recordatorios de tareas

## 🔒 **Seguridad**

### **Autenticación**
- JWT tokens con expiración
- Refresh tokens automáticos
- Logout seguro

### **Autorización**
- Roles de usuario (worker, admin, super_admin)
- Permisos granulares por endpoint
- Validación de ownership de datos

### **Datos Sensibles**
- Encriptación de datos locales
- HTTPS obligatorio
- Validación de certificados SSL

## 📊 **Monitoreo y Analytics**

### **Métricas Clave**
- Tiempo de respuesta de API
- Tasa de éxito de sincronización
- Uso de funcionalidades
- Errores y crashes

### **Logging**
- Logs estructurados en JSON
- Niveles: error, warn, info, debug
- Correlación de requests con trace IDs

## 🚨 **Troubleshooting**

### **Problemas Comunes**

#### **Error de Conexión**
```bash
# Verificar conectividad
curl -I https://api.sadlas.com/health

# Verificar DNS
nslookup api.sadlas.com
```

#### **Error de Autenticación**
```bash
# Verificar token
jwt-decode <token>

# Verificar expiración
date -d @<exp_timestamp>
```

#### **Error de Sincronización**
```bash
# Limpiar caché local
rm -rf node_modules/.cache
npm start -- --reset-cache
```

## 📞 **Soporte**

Para problemas de integración:
1. Verificar logs de API backend
2. Verificar logs de aplicación móvil
3. Contactar equipo de desarrollo

---

**Última actualización**: 2024-01-XX
**Versión de API**: v1
**Versión de App Móvil**: 1.0.0
