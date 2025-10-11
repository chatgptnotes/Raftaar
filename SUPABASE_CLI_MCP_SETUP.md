# Supabase CLI & MCP Server Setup Guide

## ✅ Completed Installation

### 1. Supabase CLI
- **Version**: 2.48.3 (latest)
- **Location**: `/usr/local/bin/supabase`
- **Status**: ✅ Installed and updated

### 2. Supabase Project
- **Status**: ✅ Initialized locally
- **Config**: `supabase/config.toml`
- **Git Ignore**: `supabase/.gitignore` (automatically created)

### 3. Supabase MCP Server
- **Version**: 0.5.6
- **Location**: `/usr/local/bin/supabase-mcp-server`
- **Status**: ✅ Installed
- **Purpose**: Provides Supabase integration with Claude Code via Model Context Protocol (MCP)

---

## 🔗 Link Local Project to Remote Supabase

To link your local Supabase project to the remote one, you need to authenticate first.

### Step 1: Get Supabase Access Token

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click on your profile (top right)
3. Go to **Access Tokens**
4. Click **Generate New Token**
5. Give it a name (e.g., "CLI Access")
6. Copy the generated token

### Step 2: Login via CLI

```bash
# Option 1: Using token flag
supabase login --token YOUR_ACCESS_TOKEN

# Option 2: Set environment variable
export SUPABASE_ACCESS_TOKEN="YOUR_ACCESS_TOKEN"
supabase login
```

### Step 3: Link to Remote Project

```bash
supabase link --project-ref feuqkbefbfqnqkkfzgwt
```

This will link your local Supabase project to the remote project at:
`https://feuqkbefbfqnqkkfzgwt.supabase.co`

---

## 🔧 Configure Supabase MCP Server in Claude Code

The Supabase MCP server allows Claude Code to interact directly with your Supabase database and storage.

### Step 1: Locate Claude Code MCP Config

Claude Code MCP configuration is stored at:
```
~/.config/claude-code/mcp_servers.json
```

If this file doesn't exist, create it.

### Step 2: Add Supabase MCP Server Configuration

Add the following to `~/.config/claude-code/mcp_servers.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "supabase-mcp-server",
      "args": [],
      "env": {
        "SUPABASE_URL": "https://feuqkbefbfqnqkkfzgwt.supabase.co",
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzA2NTUsImV4cCI6MjA3NTc0NjY1NX0.Qo6dF1wElf-KFINMOX2I1BdFVy9QZ5-hIhr3RUB4JGI"
      }
    }
  }
}
```

### Step 3: Restart Claude Code

After adding the configuration:
1. Quit Claude Code completely
2. Reopen Claude Code
3. The Supabase MCP server will be automatically connected

---

## 🚀 What Can MCP Server Do?

Once configured, the Supabase MCP server provides Claude Code with tools to:

### 1. **Database Operations**
- Query tables directly
- Insert, update, delete records
- Run complex SQL queries
- View table schemas

### 2. **Storage Operations**
- Upload files to buckets
- Download files
- List bucket contents
- Delete files

### 3. **Authentication**
- Create users
- Manage user sessions
- Check authentication status

### 4. **Real-time Subscriptions**
- Subscribe to table changes
- Get real-time updates

---

## 📝 Example Usage in Claude Code

Once the MCP server is configured, you can ask Claude Code to do things like:

```
"Show me all drivers from the Supabase database"
"Upload this image to the driver-files bucket"
"Create a new driver with the following details..."
"Get the schema of the drivers table"
"Delete driver with ID 123"
```

Claude Code will automatically use the Supabase MCP server to perform these operations!

---

## 🎯 Supabase CLI Useful Commands

### Database Management

```bash
# Pull remote database changes
supabase db pull

# Push local migrations to remote
supabase db push

# Reset local database
supabase db reset

# Create a new migration
supabase migration new your_migration_name

# Generate TypeScript types from database
supabase gen types typescript --local > src/types/supabase.ts
```

### Functions

```bash
# Create a new Edge Function
supabase functions new function-name

# Deploy function
supabase functions deploy function-name

# Invoke function locally
supabase functions serve
```

### Storage

```bash
# List storage buckets
supabase storage ls

# Create a bucket
supabase storage mb bucket-name

# Upload file
supabase storage cp local-file.txt bucket-name/remote-file.txt
```

### Secrets Management

```bash
# Set a secret
supabase secrets set MY_SECRET=value

# List secrets
supabase secrets list

# Unset secret
supabase secrets unset MY_SECRET
```

---

## 🔐 Environment Variables

### For CLI Operations
```bash
# Set in your shell profile (~/.zshrc or ~/.bashrc)
export SUPABASE_ACCESS_TOKEN="your-access-token"
export SUPABASE_PROJECT_REF="feuqkbefbfqnqkkfzgwt"
```

### For Application (.env)
```bash
VITE_SUPABASE_URL=https://feuqkbefbfqnqkkfzgwt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzA2NTUsImV4cCI6MjA3NTc0NjY1NX0.Qo6dF1wElf-KFINMOX2I1BdFVy9QZ5-hIhr3RUB4JGI
```

---

## 📚 Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase MCP Server GitHub](https://github.com/supabase/mcp)
- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [Claude Code MCP Integration](https://docs.claude.com/en/docs/claude-code/mcp)

---

## 🐛 Troubleshooting

### CLI Login Issues
```bash
# If login fails, try setting token directly
export SUPABASE_ACCESS_TOKEN="your-token"
supabase login
```

### MCP Server Not Working
1. Check if server is installed: `which supabase-mcp-server`
2. Verify config file exists: `cat ~/.config/claude-code/mcp_servers.json`
3. Restart Claude Code completely
4. Check Claude Code logs for MCP errors

### Database Connection Issues
```bash
# Test connection
supabase status

# Check if linked
supabase link --project-ref feuqkbefbfqnqkkfzgwt
```

---

## ✨ Next Steps

1. ✅ Login to Supabase CLI with access token
2. ✅ Link local project to remote
3. ✅ Configure MCP server in Claude Code
4. ✅ Generate TypeScript types from database
5. ⏳ Create database migrations
6. ⏳ Set up Edge Functions
7. ⏳ Configure storage buckets via CLI

---

## 📝 Notes

- The MCP server runs automatically when Claude Code starts
- It uses the same credentials from your `.env` file
- All operations are authenticated and secured
- The server respects Row Level Security (RLS) policies
