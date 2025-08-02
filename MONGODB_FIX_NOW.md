# 🚨 URGENT: Fix MongoDB Atlas Connection

## Current Issue
Your MongoDB Atlas connection is failing because your IP `165.225.124.223` is not whitelisted.

## IMMEDIATE FIX STEPS

### Option 1: Whitelist Your IP (Recommended)
1. Go to: https://cloud.mongodb.com
2. Sign in with your credentials
3. Select cluster: `cluster0.oggojey`
4. Click "Network Access" (left sidebar)
5. Click "Add IP Address"
6. Enter: `165.225.124.223`
7. Click "Confirm"

### Option 2: Allow Access from Anywhere (Quick Fix)
1. Go to: https://cloud.mongodb.com
2. Sign in with your credentials
3. Select cluster: `cluster0.oggojey`
4. Click "Network Access" (left sidebar)
5. Click "Add IP Address"
6. Click "Allow Access from Anywhere" (adds `0.0.0.0/0`)
7. Click "Confirm"

## Your Connection String
```
mongodb+srv://shikharsingh122z:Z5evbgL8G3ceBYZh@cluster0.oggojey.mongodb.net/civictrack?retryWrites=true&w=majority
```

## After Whitelisting
1. Wait 1-2 minutes for changes to take effect
2. Run: `npm run dev` in the root directory
3. Test registration at: http://localhost:3000/register

## Alternative: Create New Cluster
If the current cluster has issues:
1. Go to: https://www.mongodb.com/atlas
2. Create a new free cluster
3. Get new connection string
4. Update `.env` file

## Test Connection
After whitelisting, test with:
```bash
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb+srv://shikharsingh122z:Z5evbgL8G3ceBYZh@cluster0.oggojey.mongodb.net/civictrack?retryWrites=true&w=majority').then(() => console.log('✅ Connected!')).catch(err => console.log('❌ Failed:', err.message))"
``` 