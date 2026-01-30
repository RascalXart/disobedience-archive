# Cloudflare API Token Setup Guide

## Step 1: Create API Token

1. Click the **"Create Token"** button on the API Tokens page
2. You can either:
   - Use the **"Create Custom Token"** option (recommended for specific permissions)
   - Or use a template like "Edit Cloudflare Workers" and customize it

## Step 2: Set Permissions

For the custom token, you need:

**Account Permissions:**
- **Cloudflare Pages** → **Edit**

**Account Resources:**
- Include → **All accounts** (or select your specific account)

## Step 3: Account Resources

- Select your account from the dropdown

## Step 4: Create and Copy Token

1. Click **"Continue to summary"**
2. Review the permissions
3. Click **"Create Token"**
4. **IMPORTANT:** Copy the token immediately - you won't be able to see it again!

## Step 5: Get Your Account ID

1. Go to any Cloudflare dashboard page
2. Look at the URL or sidebar - your Account ID is usually visible
3. Or go to: **Overview** → Your account name → Account ID is shown there

## Step 6: Run the Script

Once you have:
- ✅ API Token
- ✅ Account ID  
- ✅ Project name (likely "disobedience-archive")

Run:
```bash
./set-cloudflare-env.sh
```

The script will prompt you for these values and set the environment variables automatically.

