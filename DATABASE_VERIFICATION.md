# Database Verification Guide

## How Content Persistence Works

Your content is stored in a MySQL database, which means:
- ✅ **Content survives code deployments** - Database is separate from code
- ✅ **Content survives server restarts** - Database is persistent storage
- ✅ **Multiple deployments safe** - Each deployment uses the same database

## Database Configuration

The application uses these environment variables (with fallback defaults):
- `DB_HOST` - Database host (default: 'localhost' → '127.0.0.1' on Hostinger)
- `DB_USER` - Database username (default: 'u790981395_cursor')
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (default: 'u790981395_anna')

## How to Verify Database is Working

1. **Check Server Logs on Hostinger**
   - Look for: `MySQL database connected successfully`
   - If you see: `Falling back to file-based storage` - database connection failed

2. **Test Content Persistence**
   - Make a small change in the admin panel (e.g., change brand name)
   - Save the content
   - Deploy new code changes
   - Check if your change is still there

3. **Check Database Table**
   - The content is stored in a table called `content`
   - It stores the entire content JSON in a `data` TEXT field

## Fallback Behavior

If the database connection fails, the system falls back to file-based storage:
- Uses `data/content.json` file
- This means content would be stored in files (not ideal for persistence across deployments)
- Check logs to ensure database is being used, not fallback

## Recommended: Set Environment Variables on Hostinger

For better security and configuration, set these environment variables in your Hostinger hosting panel:
1. Go to your Hostinger hosting control panel
2. Find "Environment Variables" or "App Settings"
3. Set: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
4. This ensures your database credentials are managed properly

## Current Status

Based on the code, the database connection should work with the default values, but it's recommended to verify by checking the server logs after deployment.



