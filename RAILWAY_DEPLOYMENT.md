# Railway Deployment Guide

This guide will help you deploy the Brand Toolkit application to Railway.

## Prerequisites

- Your code is already on GitHub: `https://github.com/annafranques/brandtoolkit2.git`
- A Railway account (sign up at https://railway.app if needed)

## Deployment Methods

### Method 1: Deploy via Railway Web Interface (Recommended)

1. **Sign in to Railway**
   - Go to https://railway.app
   - Sign in with your GitHub account

2. **Create a New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository: `annafranques/brandtoolkit2`
   - Select the `main` branch

3. **Configure Environment Variables**
   - In your Railway project dashboard, go to "Variables" tab
   - Add the following environment variables (if needed):
     - `FIGMA_TOKEN` - Your Figma API token (optional, for Figma integration)
     - `MONGO_URL` - MongoDB connection string (optional, if using MongoDB)
     - `SESSION_SECRET` - A random secret for session encryption (recommended for production)
     - `PORT` - Railway sets this automatically, but defaults to 3000

   **Note:** The app works with file-based storage if `MONGO_URL` is not set, but for production, MongoDB is recommended.

4. **Add MongoDB (Optional but Recommended)**
   - In Railway dashboard, click "New" → "Database" → "Add MongoDB"
   - Railway will automatically create a `MONGO_URL` variable
   - The app will automatically use MongoDB if `MONGO_URL` is set

5. **Deploy**
   - Railway will automatically detect your Node.js app and start building
   - The deployment will begin automatically
   - Check the "Deployments" tab to see build logs

6. **Get Your App URL**
   - Once deployed, Railway will provide a URL like `https://your-app.up.railway.app`
   - You can set a custom domain in the "Settings" tab if needed

### Method 2: Deploy via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Railway in your project**
   ```bash
   railway init
   ```

4. **Set Environment Variables**
   ```bash
   railway variables set FIGMA_TOKEN=your_token_here
   railway variables set SESSION_SECRET=your_random_secret_here
   # If using MongoDB, Railway will set MONGO_URL automatically when you add MongoDB service
   ```

5. **Deploy**
   ```bash
   railway up
   ```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port (Railway sets this automatically) |
| `FIGMA_TOKEN` | No | (empty) | Figma API token for integration |
| `MONGO_URL` | No | (none) | MongoDB connection string. If not set, uses file-based storage |
| `SESSION_SECRET` | No | 'brand-toolkit-secret-key-change-in-production' | Secret for session encryption. **Change this in production!** |

## Storage Options

### File-based Storage (Default)
- If `MONGO_URL` is not set, the app uses file-based storage
- Content is stored in `data/content.json`
- **Note:** File-based storage may not persist across deployments on Railway
- Recommended for development/testing only

### MongoDB (Recommended for Production)
- Set `MONGO_URL` to use MongoDB
- Content persists across deployments
- Add MongoDB via Railway dashboard for automatic configuration
- More reliable for production use

## Post-Deployment

1. **Test the Application**
   - Visit your Railway app URL
   - Check the public site at `https://your-app.up.railway.app`
   - Check the admin panel at `https://your-app.up.railway.app/admin`

2. **Check Logs**
   - In Railway dashboard, go to "Deployments" tab
   - Click on your deployment to see logs
   - Look for: `✅ Connected to MongoDB successfully` or `✅ Using file-based storage`

3. **Set Custom Domain (Optional)**
   - Go to "Settings" → "Networking"
   - Add your custom domain

## Troubleshooting

- **Build Fails**: Check the build logs in Railway dashboard. Ensure Node.js version is compatible (requires Node 18+)
- **App Crashes**: Check deployment logs. Verify environment variables are set correctly
- **MongoDB Connection Issues**: Ensure `MONGO_URL` is set correctly. Check Railway MongoDB service status
- **Port Issues**: Railway automatically sets the PORT variable. Don't override it unless necessary

## Continuous Deployment

Railway automatically deploys when you push to the connected branch (usually `main`). Every time you push to GitHub, Railway will:
1. Detect the changes
2. Build your application
3. Deploy the new version

You can disable automatic deployments in the Railway project settings if needed.

