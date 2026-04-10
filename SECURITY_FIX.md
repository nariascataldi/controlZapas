# 🔒 Seguridad: Credenciales Expuestas - Acción Inmediata Requerida

## ⚠️ SITUACIÓN CRÍTICA

El archivo `backend/.env.production.example` fue commiteado al repositorio con **credenciales reales de Supabase**, incluyendo:
- DATABASE_URL (connection string con password)
- SUPABASE_ANON_KEY
- Posiblemente otras claves de API

## ✅ ACCIONES COMPLETADAS

1. ✅ Removido `.env.production.example` de Git tracking (`git rm --cached`)
2. ✅ Creado template seguro con placeholders (sin credenciales reales)
3. ✅ Verificado que `.env` está en `.gitignore`

## 🚨 ACCIONES REQUERIDAS (INMEDIATAS)

### 1. Rotar Credenciales de Supabase

Ir a: https://supabase.com/dashboard/project/uytlmgqqvdvcvwvchvcw/settings/database

**Pasos:**
1. Click en "Reset database password"
2. Generar nuevo password
3. Actualizar connection strings

### 2. Regenerar JWT_SECRET

```bash
# Generar nuevo secreto
openssl rand -base64 32
```

### 3. Configurar en Vercel (SEGURO)

Ir a: https://vercel.com/dashboard → control-zapas → Settings → Environment Variables

**Agregar como "Secret" (no visible después de guardar):**
- `DATABASE_URL` = (nuevo connection string después de rotar)
- `DIRECT_URL` = (nuevo direct URL después de rotar)
- `JWT_SECRET` = (nuevo secreto generado)
- `NODE_ENV` = `production`

### 4. Limpiar Historial de Git (OPCIONAL PERO RECOMENDADO)

Las credenciales viejas están en el historial de commits. Para eliminarlas completamente:

```bash
# Usar BFG Repo-Cleaner
brew install bfg
bfg --delete-files .env.production.example
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

**O alternativamente**, si las credenciales ya fueron rotadas, el historial antiguo no es peligroso.

## 📋 PREVENCIÓN FUTURA

### Archivos que NUNCA deben ir a Git:
- `.env` (todos los variantes)
- `.env.local`, `.env.production`, `.env.development`
- Cualquier archivo con passwords, API keys, tokens
- `supabase/config.toml` (contiene project ID)

### Lo que SÍ puede ir a Git:
- Templates con placeholders (`.env.example`)
- URLs públicas (como `SUPABASE_URL` si es solo el project ID)
- Keys de lectura pública (`SUPABASE_ANON_KEY` - con precaución)

## 🔍 VERIFICACIÓN

Para verificar que no hay credenciales en el repo:

```bash
# Buscar archivos .env trackeados
git ls-files | grep -E "\.env|secret|credential"

# Buscar en historial
git log --all --full-history -- "**/.env*"

# Buscar patrones de contraseñas
git grep -i "password\|secret\|key" -- "*.example" "*.template"
```

## 📚 RECURSOS

- [Supabase: Managing Database Passwords](https://supabase.com/docs/guides/database/connecting-to-postgres#database-passwords)
- [Vercel: Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Git: Remove Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

---

**Estado**: 🟡 PENDIENTE - Esperando rotación de credenciales en Supabase
