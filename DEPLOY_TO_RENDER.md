# 🚀 Deploy Personal AI Coach to Render (Public Web Guide)

This guide shows you how to push your project to GitHub and deploy it publicly on **Render** so anyone in the world can use your **Personal AI Coach** website.

---

## 📋 Prerequisites
1. A **GitHub account** ([github.com](https://github.com))
2. A free **Render account** ([render.com](https://render.com))
3. Your **Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/app/apikey))

---

## 🛠 STEP 1: Push Code to GitHub

All Render configuration files (`render.yaml`, `Dockerfile`, `.dockerignore`, `.nvmrc`, `package.json`) have already been generated in your project.

Follow these 4 simple commands in your terminal to push your repository to GitHub:

### 1. Create a New Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Set the repository name to: `personal-ai-coach` (or your preferred name).
3. Choose **Public** (or **Private**).
4. Do **NOT** check "Add a README" or ".gitignore" (these already exist in the project).
5. Click **Create repository**.
6. Copy your repository's URL (e.g. `https://github.com/<YOUR-USERNAME>/personal-ai-coach.git`).

### 2. Commit and Push Local Files
Run the following commands in your project root terminal:

```bash
# 1. Initialize git and stage all files
git init -b main
git add .

# 2. Make your initial release commit
git commit -m "feat: complete Personal AI Coach with ChatGPT streaming & Render deployment configuration"

# 3. Link your GitHub repository (replace with your actual GitHub URL)
git remote add origin https://github.com/<YOUR-USERNAME>/personal-ai-coach.git

# 4. Push to main branch
git push -u origin main
```

---

## 🌐 STEP 2: Deploy on Render

There are **two easy ways** to deploy on Render:

---

### Option A: The 1-Click Blueprint (Recommended ⭐)
Because this project includes a pre-configured `render.yaml` file, Render can configure everything automatically:

1. Log into [dashboard.render.com](https://dashboard.render.com).
2. Click the **New +** button at the top right and select **Blueprint**.
3. Connect your GitHub account and select your `personal-ai-coach` repository.
4. Render will read `render.yaml` and show:
   - **Service Name**: `personal-ai-coach`
   - **Environment**: `Node`
   - **Plan**: `Free`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Under Environment Variables:
   - Enter your **`GEMINI_API_KEY`**: Paste your Google Gemini API key.
6. Click **Apply**.
7. Render will build the Vite frontend and start the Express server!

---

### Option B: Manual Web Service Setup
If you prefer setting up manually without Blueprints:

1. In the Render Dashboard, click **New +** → **Web Service**.
2. Select **Build and deploy from a Git repository** and pick your `personal-ai-coach` repo.
3. Configure the following settings:
   - **Name**: `personal-ai-coach`
   - **Region**: Select the region closest to you (e.g., *Oregon (US West)*, *Frankfurt (EU)*, *Singapore*)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Expand **Advanced** → **Environment Variables**:
   Add these 3 variables:
   | Key | Value | Notes |
   | --- | --- | --- |
   | `NODE_VERSION` | `22.14.0` | **Important**: Needed for `node:sqlite` |
   | `NODE_ENV` | `production` | Enables optimized static production assets |
   | `GEMINI_API_KEY` | `AIzaSy...` | Your Gemini API Key from Google AI Studio |
   | `PORT` | `10000` | (Render sets this automatically, but you can specify 10000) |
5. Under **Health Check Path**, enter:
   ```
   /api/health
   ```
6. Click **Create Web Service**.

---

## 🔍 STEP 3: Verify Your Live Deployment

1. Watch the Render deploy logs. You will see:
   ```
   ✓ built in 813ms (dist/index.html, assets)
   ==> Uploading build...
   ==> Starting service with 'npm start'...
   🚀 Personal AI Coach Full-Stack Server running at http://0.0.0.0:10000
   - Database: Persistent SQLite (data/personal_ai_coach.db)
   - Gemini AI: Configured
   - Demo account ready: raghav@example.com / Password123!
   ==> Service is live 🎉
   ```
2. Your public URL will be ready at:
   `https://personal-ai-coach-xxxx.onrender.com`
3. Click the URL and share it with anyone!

---

## 💡 Important Tips for Render Free Tier

1. **Free Tier Spin-down (Cold Starts)**:
   - On the Render Free tier, the web service enters sleep mode if there is no traffic for 15 minutes.
   - When someone visits the website after it has been asleep, the first request may take 30–50 seconds to spin back up. Subsequent requests will be instant.
   - To keep it awake 24/7 for free, you can use a free pinging service like [UptimeRobot](https://uptimerobot.com) to ping your `https://<your-app>.onrender.com/api/health` URL every 10 minutes.

2. **Database Persistence**:
   - The application automatically initializes the SQLite database with all tables, migrations, and demo data on startup in the `data/` folder.
   - On Render Free instances, the filesystem is ephemeral (resets upon redeployment or cold restarts).
   - If you want permanently persistent SQLite storage across redeployments on Render, you can upgrade to a Render paid instance ($7/mo) and add a **Render Persistent Disk** mounted at `/app/data`, or connect to an external PostgreSQL database using `DATABASE_URL`.

3. **Custom Domain (Optional)**:
   - In Render, click on your service → **Settings** → **Custom Domains**.
   - You can connect your own domain (e.g. `mycoach.com` or `interviewprep.ai`) with free automatic SSL certificates!
