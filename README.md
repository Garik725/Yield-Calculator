# Yield Calculator — Deployment Guide

## Project Structure
```
yield-calculator/
├── pages/
│   ├── index.js          ← Landing page (yieldcalculator.tech)
│   ├── calc.js           ← Calculator (yieldcalculator.tech/calc)
│   ├── _app.js           ← Next.js wrapper
│   └── api/
│       └── bond.js       ← Secure EODHD API endpoint
├── lib/
│   └── bondMath.js       ← All bond math calculations
├── .env.example          ← Template for environment variables
├── .gitignore            ← Keeps .env.local out of GitHub
├── next.config.js
└── package.json
```

## Deploy to Vercel — Step by Step

### 1. Push to GitHub
```bash
cd yield-calculator
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/Garik725/yield-calculator.git
git push -u origin main
```

### 2. Import to Vercel
1. Go to vercel.com → New Project
2. Import from GitHub → select yield-calculator
3. Framework: Next.js (auto-detected)
4. Click Deploy

### 3. Add Environment Variable in Vercel
1. Go to Project → Settings → Environment Variables
2. Add: EODHD_API_KEY = [your key]
3. Click Save
4. Go to Deployments → Redeploy

### 4. Connect Domain
1. Go to Project → Settings → Domains
2. Add: yieldcalculator.tech
3. Copy the two nameserver values Vercel gives you
4. In Namecheap → Advanced DNS → Nameservers → Custom DNS
5. Paste both values → Save
6. Wait 10-30 minutes

### 5. Update Gumroad URL
In pages/index.js, replace:
  const GUMROAD_URL = "https://YOUR_USERNAME.gumroad.com/l/yield-calculator";
With your real Gumroad product URL.

Then push the change:
```bash
git add .
git commit -m "Add Gumroad URL"
git push
```
Vercel auto-deploys on every push.

## URLs after deployment
- Landing page: https://yieldcalculator.tech
- Calculator:   https://yieldcalculator.tech/calc
- Bond API:     https://yieldcalculator.tech/api/bond?isin=US91282CJM14

## IMPORTANT — Security
- .env.local is in .gitignore and will NEVER be pushed to GitHub
- Your EODHD API key is added directly in Vercel's dashboard
- Users never see the API key — it only runs server-side in /api/bond.js
