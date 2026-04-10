# 🚀 Quick Fix: 500 Error on Login

## Problem
Login endpoint returns 500 error with message: "A server error has occurred"

## Root Cause
**Missing environment variables in Vercel** - specifically `DATABASE_URL` and `JWT_SECRET`

## 🔧 Fix (Choose One)

### Option 1: Vercel Dashboard (Easiest) ⭐

1. **Go to**: https://vercel.com/dashboard
2. **Select**: Your project `control-zapas`
3. **Click**: Settings → Environment Variables
4. **Add these variables**:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | `postgresql://postgres.uytlmgqqvdvcvwvchvcw:sbp_989951ec23323d5e45cfe943254559bf6f30cf0d@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true` |
   | `DIRECT_URL` | `postgresql://postgres.uytlmgqqvdvcvwvchvcw:sbp_989951ec23323d5e45cfe943254559bf6f30cf0d@db.uytlmgqqvdvcvwvchvcw.supabase.co:5432/postgres` |
   | `JWT_SECRET` | `your_secret_here` (use a strong random string) |
   | `NODE_ENV` | `production` |

5. **Redeploy**: Push to main branch or run `vercel --prod`

### Option 2: Automated Script

```bash
# Run the setup script
./.scripts/setup-vercel-env.sh
```

### Option 3: Vercel CLI (If Installed)

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Add environment variables
vercel env add DATABASE_URL production
# (paste the DATABASE_URL value)

vercel env add JWT_SECRET production
# (paste your JWT_SECRET value)

vercel env add DIRECT_URL production
# (paste the DIRECT_URL value)

vercel env add NODE_ENV production
# (type: production)

# Redeploy
vercel --prod
```

## ✅ Verify Fix

After deploying, test these endpoints:

```bash
# Test 1: Health check
curl https://control-zapas.vercel.app/api/health

# Expected response (after fix):
# {"status":"OK","message":"controlZapas API is running","database":"Connected (PostgreSQL)"}

# Test 2: Login
curl -X POST https://control-zapas.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nombre":"admin","password":"admin123"}'

# Expected response (after fix):
# {"token":"...","usuario":{"id":1,"nombre":"admin","rol":"ADMIN"}}
```

## 📝 What I Fixed in the Code

1. **`backend/database.js`**: Added validation to prevent crashes when `DATABASE_URL` is missing
2. **`backend/server.js`**: Added startup validation that shows helpful error messages
3. **`backend/routes/auth.js`**: Added check for Prisma initialization before queries
4. **Health endpoint**: Now returns detailed diagnostic information

## 🔍 Still Not Working?

Check these:

1. **Vercel Deployment Logs**: 
   - Dashboard → Your Project → Deployments → Click latest → View Build Logs
   
2. **Supabase Status**:
   - Go to: https://supabase.com/dashboard
   - Check if your database is running

3. **Environment Variables Scope**:
   - Make sure variables are set for "Production" environment in Vercel

4. **Run Local Test**:
   ```bash
   cp backend/.env.production.example backend/.env
   npm start
   # Test locally to verify code works
   ```

## 📚 References

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)
- [Detailed Diagnosis](./.scripts/diagnosis.md)
