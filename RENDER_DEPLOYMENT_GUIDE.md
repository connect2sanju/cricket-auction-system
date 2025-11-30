# 🚀 Complete Render Deployment Guide

Step-by-step guide to deploy your SHV Cricket Auction System on Render (FREE tier available).

---

## 📋 Prerequisites

Before you begin, make sure you have:

- ✅ A GitHub account
- ✅ Your code pushed to a GitHub repository
- ✅ `gunicorn` in `backend/requirements.txt` (already added)
- ✅ `Procfile` in root directory (already created)

---

## 🎯 Overview

We'll deploy:
1. **Backend** (Flask API) - as a Web Service
2. **Frontend** (React App) - as a Static Site

**Estimated Time:** 10-15 minutes

---

## Part 1: Prepare Your Code

### Step 1.1: Verify Required Files

Make sure these files exist in your repository:

```
SHV_Tournament/
├── Procfile                    ✅ Should exist
├── runtime.txt                 ✅ Should exist
├── backend/
│   ├── app.py
│   └── requirements.txt        ✅ Should include gunicorn
├── frontend/
│   ├── package.json
│   └── public/
├── players.yaml
└── captains.yaml
```

### Step 1.2: Push to GitHub

If your code is not on GitHub yet:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Render deployment"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/your-username/your-repo.git

# Push to GitHub
git push -u origin main
```

**Note:** Make sure `players.yaml` and `captains.yaml` are committed (they're needed at runtime).

---

## Part 2: Deploy Backend

### Step 2.1: Sign Up / Log In to Render

1. Go to **[render.com](https://render.com)**
2. Click **"Get Started for Free"** or **"Log In"**
3. Choose **"Sign up with GitHub"** (recommended for easy repo access)

### Step 2.2: Create Backend Web Service

1. Once logged in, click the **"New +"** button (top right)
2. Select **"Web Service"** from the dropdown

### Step 2.3: Connect Repository

1. Render will show your GitHub repositories
2. **Select your repository** (the one with SHV_Tournament code)
3. Click **"Connect"**

### Step 2.4: Configure Backend Service

Fill in the configuration form:

#### Basic Settings:
- **Name:** `shv-auction-backend` (or any name you prefer)
- **Environment:** Select **"Python 3"**
- **Region:** Choose the region closest to your users (e.g., `Oregon (US West)`)
- **Branch:** `main` (or `master` if that's your default branch)

#### Build & Deploy Settings:

**Root Directory:** Leave this **empty** (or set to `/`)

**Build Command:**
```bash
cd backend && pip install -r requirements.txt
```

**Start Command:**
```bash
cd backend && gunicorn app:app --bind 0.0.0.0:${PORT:-5000} --workers 3 --timeout 120
```

**Alternative Start Command (if above doesn't work):**
```bash
cd backend && python -c "import os; port = os.environ.get('PORT', '5000'); os.system(f'gunicorn app:app --bind 0.0.0.0:{port} --workers 3 --timeout 120')"
```

**Note:** `${PORT:-5000}` uses PORT if set, otherwise defaults to 5000. Render should set PORT automatically, but this provides a fallback.

#### Advanced Settings (Click to expand):

- **Instance Type:** Leave as **Free** (or upgrade for better performance)
- **Health Check Path:** Leave empty (or use `/api/status`)
- **Auto-Deploy:** Set to **"Yes"** (auto-deploys on git push)

### Step 2.5: Add Environment Variables

Click **"Advanced"** and add these environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `PORT` | (Leave empty) | Render sets this automatically |
| `FLASK_DEBUG` | `False` | Important for production |
| `ALLOWED_ORIGINS` | `*` | We'll update this after frontend is deployed |
| `PYTHON_VERSION` | `3.11.0` | Optional, matches runtime.txt |

#### ⚠️ **IMPORTANT: User Credentials (Required)**

You **must** set user credentials for authentication. Choose one method:

**Option A: Admin User Only (Simplest)**
- `AUCTION_ADMIN_USER` = `admin` (or your preferred username)
- `AUCTION_ADMIN_PASSWORD` = `your_secure_password_here`

**Option B: Multiple Users (Recommended)**
- `AUCTION_USERS` = `[{"username":"admin","password":"your_password","role":"admin"},{"username":"user1","password":"password1","role":"user"}]` (JSON array)

**Note:** For production, always use environment variables. Never commit `users.json` to Git.

**To add environment variables:**
1. Scroll down to **"Environment Variables"** section
2. Click **"Add Environment Variable"**
3. Enter Key and Value
4. Click **"Add"**
5. **Repeat for each variable** (including user credentials)

### Step 2.6: Create Backend Service

1. Scroll down and click **"Create Web Service"**
2. Render will start building and deploying your backend
3. **Wait 2-3 minutes** for the build to complete

### Step 2.7: Verify Backend Deployment

1. Watch the build logs in the Render dashboard
2. Look for: **"Your service is live"** message
3. **Copy your backend URL** (e.g., `https://shv-auction-backend.onrender.com`)
4. Test the API: Open `https://your-backend-url.onrender.com/api/status` in browser
   - You should see JSON response with auction status

**✅ Backend is now live!**

**Important:** Note down your backend URL - you'll need it in the next step.

---

## Part 3: Deploy Frontend

### Step 3.1: Create Static Site

1. In Render dashboard, click **"New +"** again
2. Select **"Static Site"** from the dropdown

### Step 3.2: Connect Repository (Same One)

1. **Select the same repository** (your SHV_Tournament repo)
2. Click **"Connect"**

### Step 3.3: Configure Frontend Service

Fill in the configuration:

#### Basic Settings:
- **Name:** `shv-auction-frontend` (or any name)
- **Branch:** `main` (same as backend)
- **Root Directory:** `frontend` ⚠️ **IMPORTANT: Enter "frontend" here**

#### Build Settings:

**Build Command:**
```bash
npm install && npm run build
```

**Publish Directory:**
```
build
```

#### Advanced Settings:
- **Pull Request Previews:** `Yes` (optional, for testing PRs)
- **Auto-Deploy:** `Yes`

### Step 3.4: Add Frontend Environment Variables

This is **CRITICAL** - add this environment variable:

| Key | Value |
|-----|-------|
| `REACT_APP_API_URL` | `https://your-backend-url.onrender.com/api` |

**Important:** 
- Replace `your-backend-url` with your actual backend URL from Step 2.7
- Include `/api` at the end
- Example: `https://shv-auction-backend.onrender.com/api`

**To add:**
1. Scroll to **"Environment Variables"** section
2. Click **"Add Environment Variable"**
3. Key: `REACT_APP_API_URL`
4. Value: Your backend URL + `/api`
5. Click **"Add"**

### Step 3.5: Create Frontend Service

1. Scroll down and click **"Create Static Site"**
2. Render will start building your React app
3. **Wait 3-5 minutes** for build to complete

### Step 3.6: Get Frontend URL

1. Once deployment is complete, Render will show your frontend URL
2. **Copy the frontend URL** (e.g., `https://shv-auction-frontend.onrender.com`)
3. **Save this URL** - you'll need it next

**✅ Frontend is now live!**

---

## Part 4: Connect Frontend to Backend

### Step 4.1: Update Backend CORS Settings

We need to allow your frontend to communicate with the backend.

1. Go back to your **backend service** in Render dashboard
2. Click on **"Environment"** tab (in the left sidebar)
3. Find the `ALLOWED_ORIGINS` variable
4. **Update its value** to your frontend URL:
   ```
   https://shv-auction-frontend.onrender.com
   ```
   (Use your actual frontend URL)
5. Click **"Save Changes"**
6. Render will automatically redeploy with new settings (takes ~1 minute)

**Alternative:** You can add multiple origins separated by commas:
```
https://shv-auction-frontend.onrender.com,https://your-custom-domain.com
```

---

## Part 5: Test Your Deployment

### Step 5.1: Access Your App

1. Open your **frontend URL** in a browser
2. You should see your auction application

### Step 5.2: Verify Functionality

Test these features:

**Authentication:**
- ✅ **Login screen** appears
- ✅ **Login works** with your credentials
- ✅ **Profile menu** (three dots) visible in top-right corner

**Auction Configuration:**
- ✅ **Create new auction** works
- ✅ **Configure auction** settings (season name, base price, team size, initial points)
- ✅ **Upload players/captains** YAML files
- ✅ **Select existing auction** works

**Auction Operations:**
- ✅ **Page loads** - Header, stats, and controls visible
- ✅ **Start Auction** button works
- ✅ **Player selection** works
- ✅ **Captain dropdown** appears with max bid information
- ✅ **Bid assignment** works
- ✅ **Pass button** works
- ✅ **Undo last bid** works
- ✅ **Reset auction** works
- ✅ **Team status** updates in real-time

### Step 5.3: Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for any errors
4. Check **Network** tab - API calls should go to your backend URL

**Common Issues:**
- ❌ CORS errors → Backend CORS not configured correctly
- ❌ 404 on API calls → Wrong `REACT_APP_API_URL`
- ❌ Blank page → Check browser console for errors

---

## Part 6: Custom Domain (Optional)

### Step 6.1: Add Custom Domain to Frontend

1. In Render dashboard, go to your **frontend service**
2. Click **"Settings"** tab
3. Scroll to **"Custom Domain"** section
4. Click **"Add Custom Domain"**
5. Enter your domain (e.g., `auction.yourdomain.com`)
6. Follow Render's DNS instructions

### Step 6.2: Update Backend CORS

After adding custom domain:

1. Go to **backend** → **Environment** tab
2. Update `ALLOWED_ORIGINS` to include your custom domain:
   ```
   https://auction.yourdomain.com,https://shv-auction-frontend.onrender.com
   ```

---

## 🔧 Troubleshooting

### Issue: Backend Build Fails

**Symptoms:** Build logs show errors

**Solutions:**
- ✅ Check `backend/requirements.txt` includes `gunicorn`
- ✅ Verify Python version compatibility
- ✅ Check build logs for specific error messages
- ✅ Ensure all files are committed to GitHub

### Issue: Frontend Build Fails

**Symptoms:** Build logs show npm errors

**Solutions:**
- ✅ Verify `frontend/package.json` is valid
- ✅ Check that `frontend/` directory is correct
- ✅ Ensure Root Directory is set to `frontend` (not empty)
- ✅ Check build logs for specific npm errors

### Issue: Frontend Can't Connect to Backend

**Symptoms:** Network errors, CORS errors in browser console

**Solutions:**
- ✅ Verify `REACT_APP_API_URL` is set correctly in frontend
- ✅ Check that backend URL includes `/api` at the end
- ✅ Ensure `ALLOWED_ORIGINS` in backend includes frontend URL
- ✅ Wait for backend redeploy after changing CORS settings
- ✅ Check browser console Network tab for actual API calls

### Issue: Blank Page or 404

**Symptoms:** Frontend URL shows blank page

**Solutions:**
- ✅ Check browser console for JavaScript errors
- ✅ Verify React build completed successfully
- ✅ Clear browser cache and hard refresh (Ctrl+Shift+R)
- ✅ Check Render deployment logs

### Issue: Backend Returns 500 Errors

**Symptoms:** API calls return server errors

**Solutions:**
- ✅ Check backend logs in Render dashboard
- ✅ Verify `players.yaml` and `captains.yaml` are in repository
- ✅ Check file paths in backend code
- ✅ Look at error logs in Render dashboard → Logs tab

### Issue: Slow Response Times

**Symptoms:** App is slow, long loading times

**Solutions:**
- ✅ **Free tier limitation:** First request after 15min inactivity takes ~30s (cold start)
- ✅ Upgrade to paid tier for always-on service
- ✅ Check Render service logs for errors
- ✅ Verify you're using correct region

---

## 📊 Monitoring & Logs

### View Logs

1. In Render dashboard, select your service
2. Click **"Logs"** tab
3. Real-time logs are displayed
4. Download logs for offline analysis

### Monitor Health

1. Go to service dashboard
2. View **"Metrics"** tab for:
   - CPU usage
   - Memory usage
   - Request rate
   - Response times

---

## 🔄 Updates & Redeployments

### Automatic Deployment

Render automatically deploys when you push to your connected branch.

**To update your app:**
```bash
# Make changes locally
git add .
git commit -m "Update app"
git push origin main
```

Render will automatically:
1. Detect the push
2. Build the new version
3. Deploy it

### Manual Deployment

To manually trigger deployment:

1. Go to service dashboard
2. Click **"Manual Deploy"**
3. Select branch/commit
4. Click **"Deploy"**

### Rollback

If something goes wrong:

1. Go to service dashboard
2. Click **"Events"** tab
3. Find previous successful deployment
4. Click **"Redeploy"**

---

## 💰 Pricing

### Free Tier

**What you get:**
- ✅ 750 hours/month (enough for 24/7 on one service)
- ✅ 512MB RAM
- ✅ Free SSL certificate
- ✅ Custom domains
- ✅ Auto-deploy from Git

**Limitations:**
- ⚠️ Service sleeps after 15 minutes of inactivity (30s wake-up time)
- ⚠️ Shared resources

### Paid Tier (Starter Plan - $7/month)

**What you get:**
- ✅ Always-on (no sleep)
- ✅ Faster wake-up times
- ✅ Better performance
- ✅ Priority support

---

## 🔐 Security Best Practices

### Environment Variables

✅ **Do:**
- Store sensitive data in environment variables
- Never commit secrets to Git
- Use different values for dev/prod

❌ **Don't:**
- Hardcode API keys in code
- Commit `.env` files
- Share environment variable values publicly

### CORS Configuration

✅ **Do:**
- Set specific origins in production:
  ```
  ALLOWED_ORIGINS=https://your-frontend.com
  ```
- Use comma-separated list for multiple origins

❌ **Don't:**
- Use `*` in production (less secure)
- Allow all origins unnecessarily

---

## 📝 Summary Checklist

Use this checklist to ensure everything is set up:

### Before Deployment
- [ ] Code pushed to GitHub
- [ ] `gunicorn` in `backend/requirements.txt`
- [ ] `Procfile` exists in root
- [ ] `runtime.txt` exists (Python version)
- [ ] `players.yaml` and `captains.yaml` committed (default files)
- [ ] User credentials prepared (for environment variables)

### Backend Deployment
- [ ] Backend service created on Render
- [ ] Build command configured (`cd backend && pip install -r requirements.txt`)
- [ ] Start command configured (`cd backend && gunicorn app:app --bind 0.0.0.0:${PORT:-5000} --workers 3 --timeout 120`)
- [ ] Environment variables set:
  - [ ] `FLASK_DEBUG=False`
  - [ ] `ALLOWED_ORIGINS=*` (update after frontend deployment)
  - [ ] `AUCTION_ADMIN_USER` and `AUCTION_ADMIN_PASSWORD` (or `AUCTION_USERS`)
- [ ] Backend URL saved

### Frontend Deployment
- [ ] Frontend static site created
- [ ] Root directory set to `frontend`
- [ ] Build command configured
- [ ] `REACT_APP_API_URL` set correctly
- [ ] Frontend URL saved

### Connection & Testing
- [ ] Backend CORS updated with frontend URL
- [ ] Backend redeployed after CORS change
- [ ] Login tested with credentials
- [ ] Auction creation and configuration tested
- [ ] Full auction flow tested (pick, bid, assign, undo, reset)
- [ ] No errors in browser console
- [ ] No errors in backend logs

---

## 🎉 Success!

If everything is working, you should now have:

- ✅ Backend API running at: `https://your-backend.onrender.com`
- ✅ Frontend app running at: `https://your-frontend.onrender.com`
- ✅ Full functionality tested and working
- ✅ Auto-deploy enabled for future updates

**Congratulations! Your auction app is now live on the internet! 🚀**

---

## 📞 Need Help?

- **Render Support:** [community.render.com](https://community.render.com)
- **Render Docs:** [render.com/docs](https://render.com/docs)
- **Check Logs:** Always check service logs first for errors
- **Community:** Post questions on Render community forum

---

**Last Updated:** For latest Render features, always check [render.com/docs](https://render.com/docs)

