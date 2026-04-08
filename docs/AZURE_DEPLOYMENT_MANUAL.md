# Azure Deployment Guide - Manual Steps (Azure Portal)

This comprehensive guide walks you through deploying the Liquid Template Debugger to Azure using the Azure Portal (no CLI commands required). It includes detailed comparisons between deployment options to help you choose the best approach for your needs.

## Table of Contents

1. [Deployment Options Comparison](#deployment-options-comparison)
2. [Prerequisites](#prerequisites)
3. [Option 1: Azure Container Apps (Recommended)](#option-1-azure-container-apps-recommended)
4. [Option 2: Azure Web App for Containers](#option-2-azure-web-app-for-containers)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Deployment Options Comparison

### Azure Container Apps vs Azure Web App for Containers

| Feature | Azure Container Apps | Azure Web App for Containers |
|---------|---------------------|------------------------------|
| **Best For** | Modern microservices, event-driven apps, serverless containers | Traditional web applications, long-running services |
| **Pricing Model** | Pay-per-use (consumption-based) | Fixed pricing tiers (Basic, Standard, Premium) |
| **Scaling** | Automatic scale to zero, event-driven scaling | Manual or auto-scale (min instances always running) |
| **Cold Start** | Yes (when scaled to zero) | No (always warm) |
| **Minimum Cost** | ~$0/month (when scaled to zero) | ~$13/month (Basic B1 tier minimum) |
| **Typical Monthly Cost** | $15-30 for light usage | $55-200 depending on tier |
| **Setup Complexity** | Moderate (requires Container Environment) | Simple (direct deployment) |
| **Deployment Speed** | 5-10 minutes | 3-5 minutes |
| **Built-in Load Balancing** | Yes (automatic) | Yes (with App Service Plan) |
| **Custom Domains** | Yes (free SSL) | Yes (free SSL) |
| **VNet Integration** | Yes (built-in) | Yes (requires Standard tier or higher) |
| **Managed Identity** | Yes | Yes |
| **Deployment Slots** | Revisions (similar concept) | Yes (requires Standard tier or higher) |
| **WebJobs Support** | No | Yes |
| **Always On** | Not needed (serverless) | Available (Standard tier+) |
| **Maximum Scale** | Up to 300 instances | Up to 30 instances (Premium tier) |
| **Startup Time** | 2-5 seconds (cold start) | Instant (always running) |
| **Best Use Case** | Development, testing, variable traffic | Production, consistent traffic, enterprise apps |

### Cost Comparison Examples

#### Scenario 1: Development/Testing Environment (Low Usage)
- **Usage**: 2 hours/day, 5 days/week
- **Azure Container Apps**: ~$5-10/month (scale to zero when not in use)
- **Azure Web App**: ~$55/month (Standard S1 - always running)
- **Winner**: Container Apps (80-90% cost savings)

#### Scenario 2: Production Environment (Moderate Usage)
- **Usage**: 24/7 availability, moderate traffic
- **Azure Container Apps**: ~$30-50/month (0.5 vCPU, 1GB RAM)
- **Azure Web App**: ~$55-100/month (Standard S1)
- **Winner**: Container Apps (slight cost advantage)

#### Scenario 3: High-Traffic Production (Heavy Usage)
- **Usage**: 24/7 availability, high traffic, multiple instances
- **Azure Container Apps**: ~$100-200/month (auto-scaling)
- **Azure Web App**: ~$200-400/month (Premium tier)
- **Winner**: Container Apps (better scaling economics)

### Feature Comparison Matrix

| Capability | Container Apps | Web App | Notes |
|------------|----------------|---------|-------|
| **HTTP/HTTPS Traffic** | ✅ Excellent | ✅ Excellent | Both support custom domains and SSL |
| **Container Support** | ✅ Native | ✅ Native | Both run Docker containers |
| **Automatic Scaling** | ✅ Advanced | ⚠️ Basic | Container Apps has more sophisticated scaling |
| **Scale to Zero** | ✅ Yes | ❌ No | Container Apps can reduce to zero instances |
| **Deployment Slots** | ⚠️ Revisions | ✅ Yes | Web App has traditional slots |
| **Integrated Monitoring** | ✅ Yes | ✅ Yes | Both integrate with Application Insights |
| **Managed Certificates** | ✅ Free | ✅ Free | Both provide free SSL certificates |
| **Custom VNet** | ✅ Built-in | ⚠️ Requires Standard+ | Container Apps includes VNet by default |
| **Dapr Integration** | ✅ Built-in | ❌ No | Container Apps has native Dapr support |
| **Microservices** | ✅ Optimized | ⚠️ Possible | Container Apps designed for microservices |
| **Legacy App Support** | ⚠️ Limited | ✅ Excellent | Web App better for traditional apps |

### Advantages Summary

#### Azure Container Apps Advantages
✅ **Cost-Effective**: Pay only for actual usage, scale to zero  
✅ **Modern Architecture**: Built for cloud-native applications  
✅ **Advanced Scaling**: Event-driven, automatic scaling  
✅ **Microservices Ready**: Native support for distributed apps  
✅ **Dapr Integration**: Built-in support for microservices patterns  
✅ **Flexible**: Better for variable workloads  
✅ **Future-Proof**: Microsoft's recommended serverless container platform  

#### Azure Web App Advantages
✅ **Simplicity**: Easier to set up and manage  
✅ **Predictable Costs**: Fixed monthly pricing  
✅ **No Cold Starts**: Always warm and ready  
✅ **Deployment Slots**: Traditional blue-green deployments  
✅ **Enterprise Features**: WebJobs, Always On, extensive integrations  
✅ **Mature Platform**: Well-established with extensive documentation  
✅ **Better for Traditional Apps**: Ideal for monolithic applications  

### Recommendation

**Choose Azure Container Apps if:**
- You want to minimize costs (especially for dev/test)
- Your application has variable traffic patterns
- You're building modern, cloud-native applications
- You need advanced auto-scaling capabilities
- You want to scale to zero during idle periods

**Choose Azure Web App for Containers if:**
- You need predictable, consistent performance
- Your application requires always-on availability
- You prefer traditional deployment slots
- You have enterprise requirements (WebJobs, etc.)
- You want the simplest setup possible
- Cold starts are unacceptable for your use case

**For this Liquid Template Debugger application**, we recommend **Azure Container Apps** for most scenarios due to cost-effectiveness and modern architecture, unless you specifically need always-on availability.

---

## Prerequisites

Before starting, ensure you have:

1. **Azure Account**
   - Active Azure subscription
   - If you don't have one, create a [free account](https://azure.microsoft.com/free/)
   - Free tier includes $200 credit for 30 days

2. **Docker Desktop** (for building the container image)
   - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
   - Install and ensure it's running

3. **Project Files**
   - Clone or download the Liquid Template Debugger repository
   - Ensure you have all project files locally

4. **Web Browser**
   - Modern browser (Chrome, Edge, Firefox, Safari)
   - For accessing Azure Portal

---

## Option 1: Azure Container Apps (Recommended)

### Overview
Azure Container Apps is a fully managed serverless container service. This option provides the best balance of cost, scalability, and modern features.

### Step 1: Sign in to Azure Portal

1. Open your web browser and navigate to [https://portal.azure.com](https://portal.azure.com)
2. Sign in with your Azure account credentials
3. You'll see the Azure Portal dashboard

### Step 2: Create a Resource Group

A resource group is a container that holds related Azure resources.

1. In the Azure Portal, click **"Create a resource"** (top-left corner)
2. In the search box, type **"Resource group"** and press Enter
3. Click **"Resource group"** from the results
4. Click **"Create"** button

**Configure the resource group:**
- **Subscription**: Select your Azure subscription
- **Resource group name**: Enter `liquid-debugger-rg` (or your preferred name)
- **Region**: Select a region close to you (e.g., `East US`, `West Europe`, `Southeast Asia`)
- Click **"Review + create"**
- Click **"Create"**

**Wait**: Resource group creation takes 5-10 seconds.

### Step 3: Create Azure Container Registry (ACR)

Container Registry stores your Docker images securely.

1. In the Azure Portal search bar (top), type **"Container registries"**
2. Click **"Container registries"** from the results
3. Click **"+ Create"** button

**Configure the registry:**

**Basics tab:**
- **Subscription**: Select your subscription
- **Resource group**: Select `liquid-debugger-rg` (created in Step 2)
- **Registry name**: Enter a unique name (e.g., `liquiddebuggeracr123`)
  - Must be globally unique (5-50 characters, alphanumeric only)
  - If name is taken, try adding random numbers
- **Location**: Same region as your resource group
- **SKU**: Select **"Basic"** (sufficient for most needs)
  - Basic: $5/month, 10 GB storage
  - Standard: $20/month, 100 GB storage
  - Premium: $500/month, 500 GB storage + geo-replication

**Networking tab:**
- **Public access**: Select **"All networks"** (default)

**Encryption tab:**
- Leave defaults (Microsoft-managed keys)

- Click **"Review + create"**
- Review the settings
- Click **"Create"**

**Wait**: Registry creation takes 1-2 minutes.

**After creation:**
1. Click **"Go to resource"**
2. In the left menu, click **"Access keys"**
3. Toggle **"Admin user"** to **Enabled**
4. **IMPORTANT**: Copy and save these credentials (you'll need them later):
   - **Login server**: (e.g., `liquiddebuggeracr123.azurecr.io`)
   - **Username**: (e.g., `liquiddebuggeracr123`)
   - **Password**: Click the copy icon next to password

### Step 4: Build and Push Docker Image

Now we'll build the Docker image locally and push it to Azure Container Registry.

**On Windows:**

1. Open **PowerShell** or **Command Prompt**
2. Navigate to your project directory:
   ```powershell
   cd C:\path\to\LiquidTemplateDebugger
   ```

3. Build the Docker image:
   ```powershell
   docker build -t liquid-debugger:latest .
   ```
   **Wait**: Build takes 2-5 minutes depending on your machine.

4. Tag the image for ACR (replace with your registry name):
   ```powershell
   docker tag liquid-debugger:latest liquiddebuggeracr123.azurecr.io/liquid-debugger:latest
   ```

5. Login to ACR (replace with your credentials from Step 3):
   ```powershell
   docker login liquiddebuggeracr123.azurecr.io
   ```
   - **Username**: Enter the username from Step 3
   - **Password**: Enter the password from Step 3

6. Push the image to ACR:
   ```powershell
   docker push liquiddebuggeracr123.azurecr.io/liquid-debugger:latest
   ```
   **Wait**: Push takes 2-5 minutes depending on your internet speed.

**On macOS/Linux:**

1. Open **Terminal**
2. Navigate to your project directory:
   ```bash
   cd /path/to/LiquidTemplateDebugger
   ```

3. Build the Docker image:
   ```bash
   docker build -t liquid-debugger:latest .
   ```

4. Tag the image for ACR:
   ```bash
   docker tag liquid-debugger:latest liquiddebuggeracr123.azurecr.io/liquid-debugger:latest
   ```

5. Login to ACR:
   ```bash
   docker login liquiddebuggeracr123.azurecr.io
   ```

6. Push the image:
   ```bash
   docker push liquiddebuggeracr123.azurecr.io/liquid-debugger:latest
   ```

**Verify the push:**
1. Return to Azure Portal
2. Go to your Container Registry
3. Click **"Repositories"** in the left menu
4. You should see **"liquid-debugger"** listed
5. Click on it to see the **"latest"** tag

### Step 5: Create Container Apps Environment

The Container Apps Environment is a secure boundary for your containers.

1. In Azure Portal search bar, type **"Container Apps"**
2. Click **"Container Apps"** from results
3. Click **"+ Create"** button

**You'll see a wizard. First, create the environment:**

1. On the **"Basics"** tab, click **"Create new"** next to **Container Apps Environment**

**Configure the environment:**
- **Environment name**: Enter `liquid-debugger-env`
- **Region**: Same region as your resource group
- **Zone redundancy**: **Disabled** (to save costs)
- Click **"Create"**

**Wait**: Environment creation takes 3-5 minutes.

### Step 6: Create the Container App

Now we'll create the actual container app.

**Basics tab:**
- **Subscription**: Select your subscription
- **Resource group**: Select `liquid-debugger-rg`
- **Container app name**: Enter `liquid-debugger-app`
- **Region**: Same as your environment
- **Container Apps Environment**: Select `liquid-debugger-env` (created in Step 5)

Click **"Next: Container >"**

**Container tab:**

1. **Uncheck** "Use quickstart image"

2. **Container details:**
   - **Name**: Enter `liquid-debugger`
   - **Image source**: Select **"Azure Container Registry"**
   - **Registry**: Select your registry (e.g., `liquiddebuggeracr123.azurecr.io`)
   - **Image**: Select `liquid-debugger`
   - **Image tag**: Select `latest`
   - **Authentication**: Select **"Admin credentials"**

3. **Container resource allocation:**
   - **CPU cores**: `0.5` (sufficient for most use cases)
   - **Memory (Gi)**: `1.0` (1 GB RAM)

4. **Environment variables** (click "Add" to add each):
   - **Name**: `PORT`, **Value**: `8080`
   - **Name**: `ASPNETCORE_ENVIRONMENT`, **Value**: `Production`

Click **"Next: Ingress >"**

**Ingress tab:**

- **Ingress**: Check **"Enabled"**
- **Ingress traffic**: Select **"Accepting traffic from anywhere"**
- **Ingress type**: Select **"HTTP"**
- **Target port**: Enter `8080`
- **Transport**: Select **"HTTP"**

Click **"Next: Tags >"** (optional, skip if not needed)

Click **"Review + create"**

**Review your configuration:**
- Verify all settings are correct
- Check the estimated cost (should show consumption-based pricing)

Click **"Create"**

**Wait**: Deployment takes 3-5 minutes.

### Step 7: Access Your Application

1. After deployment completes, click **"Go to resource"**

2. On the **Overview** page, find **"Application Url"**
   - It will look like: `https://liquid-debugger-app.proudhill-12345678.eastus.azurecontainerapps.io`

3. **Click the URL** or copy it to your browser

4. You should see the Liquid Template Debugger interface!

**Bookmark this URL** - this is your application's permanent address.

### Step 8: Configure Scaling (Optional but Recommended)

Optimize costs by configuring auto-scaling:

1. In your Container App, click **"Scale"** in the left menu

2. **Scale rule configuration:**
   - **Minimum replicas**: `0` (enables scale-to-zero for cost savings)
   - **Maximum replicas**: `3` (adjust based on expected load)

3. Click **"Save"**

**What this does:**
- When no one is using the app, it scales to 0 instances (no cost)
- When someone accesses it, it automatically starts (2-5 second delay)
- Under load, it can scale up to 3 instances automatically

---

## Option 2: Azure Web App for Containers

### Overview
Azure Web App for Containers is a traditional PaaS offering. Choose this if you need always-on availability and prefer simpler management.

### Step 1: Sign in to Azure Portal

1. Navigate to [https://portal.azure.com](https://portal.azure.com)
2. Sign in with your Azure account

### Step 2: Create a Resource Group

(If you already created one in Option 1, skip to Step 3)

1. Click **"Create a resource"**
2. Search for **"Resource group"**
3. Click **"Create"**

**Configure:**
- **Resource group name**: `liquid-debugger-rg`
- **Region**: Select your preferred region
- Click **"Review + create"** → **"Create"**

### Step 3: Create Azure Container Registry

(If you already created one in Option 1, skip to Step 4)

Follow the same steps as in **Option 1, Step 3** to create and configure ACR.

### Step 4: Build and Push Docker Image

(If you already did this in Option 1, skip to Step 5)

Follow the same steps as in **Option 1, Step 4** to build and push your Docker image.

### Step 5: Create App Service Plan

App Service Plan defines the compute resources for your web app.

1. In Azure Portal search bar, type **"App Service plans"**
2. Click **"App Service plans"** from results
3. Click **"+ Create"**

**Configure the plan:**

**Basics tab:**
- **Subscription**: Select your subscription
- **Resource group**: Select `liquid-debugger-rg`
- **Name**: Enter `liquid-debugger-plan`
- **Operating System**: Select **"Linux"** (required for containers)
- **Region**: Same region as your resource group

**Pricing tier:**
- Click **"Explore pricing plans"**
- **For Development/Testing**: Select **"Basic B1"** (~$13/month)
  - 1 vCPU, 1.75 GB RAM
  - Custom domains, SSL
- **For Production**: Select **"Standard S1"** (~$55/month)
  - 1 vCPU, 1.75 GB RAM
  - Deployment slots, auto-scaling
  - Daily backups
- **For High Performance**: Select **"Premium P1V2"** (~$100/month)
  - 1 vCPU, 3.5 GB RAM
  - Enhanced performance
  - VNet integration

**Recommendation**: Start with **Basic B1** for testing, upgrade to Standard for production.

- Click **"Select"**
- Click **"Review + create"**
- Click **"Create"**

**Wait**: Plan creation takes 30-60 seconds.

### Step 6: Create Web App

1. In Azure Portal search bar, type **"App Services"**
2. Click **"App Services"** from results
3. Click **"+ Create"** → **"Web App"**

**Configure the web app:**

**Basics tab:**
- **Subscription**: Select your subscription
- **Resource group**: Select `liquid-debugger-rg`
- **Name**: Enter a unique name (e.g., `liquid-debugger-app-123`)
  - This becomes your URL: `liquid-debugger-app-123.azurewebsites.net`
  - Must be globally unique
- **Publish**: Select **"Container"**
- **Operating System**: **"Linux"** (auto-selected)
- **Region**: Same as your App Service Plan
- **App Service Plan**: Select `liquid-debugger-plan` (created in Step 5)

Click **"Next: Container >"**

**Container tab:**

- **Image Source**: Select **"Azure Container Registry"**
- **Registry**: Select your registry (e.g., `liquiddebuggeracr123`)
- **Image**: Select `liquid-debugger`
- **Tag**: Select `latest`
- **Startup Command**: Leave empty (uses Dockerfile ENTRYPOINT)

Click **"Next: Networking >"**

**Networking tab:**
- **Enable public access**: **"On"** (default)
- **Enable network injection**: **"Off"** (unless you need VNet)

Click **"Next: Monitoring >"**

**Monitoring tab:**
- **Enable Application Insights**: **"Yes"** (recommended for production)
  - Creates monitoring automatically
  - Or select **"No"** to save costs in development

Click **"Review + create"**

**Review and create:**
- Verify all settings
- Check estimated monthly cost
- Click **"Create"**

**Wait**: Deployment takes 2-3 minutes.

### Step 7: Configure Application Settings

1. After deployment, click **"Go to resource"**

2. In the left menu, click **"Configuration"**

3. Under **"Application settings"** tab, click **"+ New application setting"**

Add these settings (click "OK" after each):

**Setting 1:**
- **Name**: `PORT`
- **Value**: `8080`

**Setting 2:**
- **Name**: `ASPNETCORE_ENVIRONMENT`
- **Value**: `Production`

**Setting 3:**
- **Name**: `WEBSITES_PORT`
- **Value**: `8080`

4. Click **"Save"** at the top
5. Click **"Continue"** when prompted (app will restart)

**Wait**: Restart takes 30-60 seconds.

### Step 8: Access Your Application

1. Go back to **"Overview"** page

2. Find the **"Default domain"** (URL)
   - Format: `https://liquid-debugger-app-123.azurewebsites.net`

3. **Click the URL** or copy to your browser

4. You should see the Liquid Template Debugger interface!

**Note**: First load may take 10-20 seconds as the container starts.

### Step 9: Configure Always On (Optional - Standard tier only)

If you're using Standard tier or higher:

1. In your Web App, click **"Configuration"** in left menu
2. Click **"General settings"** tab
3. **Always On**: Toggle to **"On"**
4. Click **"Save"**

**What this does:**
- Keeps your app always loaded (no cold starts)
- Prevents automatic shutdown after 20 minutes of inactivity
- Ensures instant response times

---

## Post-Deployment Configuration

### Adding a Custom Domain

**For both Container Apps and Web App:**

1. Purchase a domain from a domain registrar (GoDaddy, Namecheap, etc.)

2. In Azure Portal, go to your app resource

3. Click **"Custom domains"** in the left menu

4. Click **"+ Add custom domain"**

5. Enter your domain name (e.g., `debugger.yourdomain.com`)

6. Azure will provide DNS records to add:
   - **CNAME record**: Points to your Azure app
   - **TXT record**: Verifies domain ownership

7. Add these records in your domain registrar's DNS settings

8. Wait for DNS propagation (5-60 minutes)

9. Return to Azure Portal and click **"Validate"**

10. Click **"Add"**

11. Azure automatically provisions a free SSL certificate

**Result**: Your app is now accessible at `https://debugger.yourdomain.com`

### Enabling Authentication (Optional)

Restrict access to authorized users only:

**For Container Apps:**

1. Go to your Container App
2. Click **"Authentication"** in left menu
3. Click **"Add identity provider"**
4. Select **"Microsoft"** (Azure AD)
5. Follow the wizard to configure
6. Choose **"Require authentication"**
7. Click **"Add"**

**For Web App:**

1. Go to your Web App
2. Click **"Authentication"** in left menu
3. Click **"Add identity provider"**
4. Select **"Microsoft"**
5. Configure settings
6. Click **"Add"**

**Result**: Users must sign in with Microsoft account to access the app.

### Setting Up Continuous Deployment

**Option A: Using Azure Container Registry Webhooks**

1. Go to your Container Registry
2. Click **"Webhooks"** in left menu
3. Click **"+ Add"**
4. Configure webhook to trigger on image push
5. Set webhook URL to your app's deployment endpoint

**Option B: Using GitHub Actions**

1. Create `.github/workflows/deploy.yml` in your repository
2. Configure workflow to build and push on commits
3. Add Azure credentials as GitHub secrets
4. Workflow automatically deploys on push to main branch

### Monitoring and Alerts

**Enable Application Insights:**

1. Go to your app resource
2. Click **"Application Insights"** in left menu
3. Click **"Turn on Application Insights"**
4. Select or create workspace
5. Click **"Apply"**

**Create Cost Alerts:**

1. In Azure Portal, search for **"Cost Management + Billing"**
2. Click **"Cost alerts"**
3. Click **"+ Add"**
4. Set budget threshold (e.g., $50/month)
5. Configure email notifications
6. Click **"Create"**

---

## Monitoring and Maintenance

### Viewing Application Logs

**For Container Apps:**

1. Go to your Container App
2. Click **"Log stream"** in left menu
3. View real-time logs
4. Or click **"Logs"** for historical queries

**For Web App:**

1. Go to your Web App
2. Click **"Log stream"** in left menu
3. View real-time logs
4. Or use **"Diagnose and solve problems"** for analysis

### Checking Application Health

**For both deployment types:**

1. Go to your app resource
2. Click **"Metrics"** in left menu
3. View key metrics:
   - **CPU usage**
   - **Memory usage**
   - **Request count**
   - **Response time**
   - **HTTP errors**

### Updating Your Application

**When you make code changes:**

1. **Rebuild Docker image locally:**
   ```powershell
   docker build -t liquid-debugger:latest .
   ```

2. **Tag with new version:**
   ```powershell
   docker tag liquid-debugger:latest liquiddebuggeracr123.azurecr.io/liquid-debugger:v2
   ```

3. **Push to ACR:**
   ```powershell
   docker push liquiddebuggeracr123.azurecr.io/liquid-debugger:v2
   ```

4. **Update app in Azure Portal:**

   **For Container Apps:**
   - Go to Container App → **"Containers"**
   - Click **"Edit and deploy"**
   - Update image tag to `v2`
   - Click **"Create"**

   **For Web App:**
   - Go to Web App → **"Deployment Center"**
   - Update image tag to `v2`
   - Click **"Save"**
   - App automatically restarts with new version

### Scaling Your Application

**For Container Apps (Automatic):**

1. Go to Container App → **"Scale"**
2. Adjust min/max replicas
3. Add custom scale rules (HTTP, CPU, memory)
4. Click **"Save"**

**For Web App (Manual or Auto):**

**Manual scaling:**
1. Go to App Service Plan → **"Scale up (App Service plan)"**
2. Select higher tier
3. Click **"Apply"**

**Auto-scaling (Standard tier+):**
1. Go to App Service Plan → **"Scale out (App Service plan)"**
2. Click **"Custom autoscale"**
3. Add scale rules (CPU, memory, schedule)
4. Set min/max instances
5. Click **"Save"**

---

## Troubleshooting

### Issue: Application Not Loading

**Symptoms**: Browser shows error or timeout

**Solutions:**

1. **Check if app is running:**
   - Go to app resource → **"Overview"**
   - Check **"Status"** (should be "Running")

2. **Check logs:**
   - Click **"Log stream"**
   - Look for errors or startup issues

3. **Verify port configuration:**
   - Go to **"Configuration"**
   - Ensure `PORT=8080` is set
   - For Web App, also check `WEBSITES_PORT=8080`

4. **Restart the app:**
   - Click **"Restart"** button on Overview page
   - Wait 1-2 minutes

### Issue: Container Image Not Found

**Symptoms**: Deployment fails with "image not found" error

**Solutions:**

1. **Verify image exists in ACR:**
   - Go to Container Registry → **"Repositories"**
   - Check if `liquid-debugger` repository exists
   - Verify `latest` tag is present

2. **Check ACR credentials:**
   - Go to Container Registry → **"Access keys"**
   - Ensure **"Admin user"** is enabled
   - Verify credentials are correct in app configuration

3. **Re-push image:**
   - Follow Step 4 again to rebuild and push

### Issue: High Costs

**Symptoms**: Unexpected Azure charges

**Solutions:**

1. **For Container Apps:**
   - Enable scale-to-zero: Set min replicas to 0
   - Reduce max replicas if not needed
   - Check if app is scaling unnecessarily

2. **For Web App:**
   - Downgrade App Service Plan tier
   - Stop app when not in use (Development only)
   - Consider switching to Container Apps for variable workloads

3. **Check metrics:**
   - Go to **"Cost Management + Billing"**
   - Analyze cost by resource
   - Identify expensive resources

### Issue: Slow Performance

**Symptoms**: Application responds slowly

**Solutions:**

1. **Check resource allocation:**
   - **Container Apps**: Increase CPU/memory in container settings
   - **Web App**: Upgrade App Service Plan tier

2. **Enable Application Insights:**
   - Identify slow operations
   - Optimize code based on telemetry

3. **Check scaling:**
   - Ensure auto-scaling is configured
   - Increase max replicas/instances

### Issue: Cannot Access Custom Domain

**Symptoms**: Custom domain not working

**Solutions:**

1. **Verify DNS records:**
   - Check CNAME and TXT records in domain registrar
   - Use online DNS checker tools
   - Wait for DNS propagation (up to 48 hours)

2. **Check SSL certificate:**
   - Go to **"Custom domains"** in Azure
   - Verify certificate status
   - Regenerate if needed

3. **Verify domain binding:**
   - Ensure domain is properly added in Azure
   - Check for any validation errors

---

## Cost Optimization Tips

### For Development/Testing

1. **Use Container Apps with scale-to-zero**
   - Set min replicas to 0
   - App only runs when accessed
   - Can reduce costs by 80-90%

2. **Stop resources when not needed**
   - Stop Web App outside working hours
   - Delete test resources after use

3. **Use Basic tiers**
   - Basic B1 for Web App ($13/month)
   - Minimal resources for Container Apps

### For Production

1. **Right-size resources**
   - Start small, scale up based on metrics
   - Monitor CPU/memory usage
   - Don't over-provision

2. **Use reserved instances** (if applicable)
   - 1-year or 3-year commitments
   - Up to 72% savings
   - Only for predictable workloads

3. **Implement caching**
   - Reduce compute requirements
   - Improve performance
   - Lower costs

4. **Set up cost alerts**
   - Get notified before overspending
   - Review costs monthly
   - Optimize based on usage patterns

---

## Security Best Practices

### 1. Enable HTTPS Only

**For both deployment types:**
1. Go to app resource
2. Click **"TLS/SSL settings"**
3. Toggle **"HTTPS Only"** to **"On"**
4. Click **"Save"**

### 2. Restrict Network Access

**For Container Apps:**
1. Go to **"Ingress"**
2. Configure IP restrictions
3. Or use VNet integration for private access

**For Web App:**
1. Go to **"Networking"**
2. Click **"Access restriction"**
3. Add allowed IP ranges
4. Click **"Save"**

### 3. Enable Managed Identity

**For both deployment types:**
1. Go to **"Identity"**
2. Toggle **"System assigned"** to **"On"**
3. Click **"Save"**
4. Use for secure access to other Azure resources

### 4. Regular Updates

1. Rebuild Docker image regularly with latest base images
2. Update dependencies in your application
3. Monitor security advisories
4. Apply patches promptly

### 5. Secure Secrets

1. Never hardcode secrets in code
2. Use Azure Key Vault for sensitive data
3. Reference secrets via environment variables
4. Rotate credentials regularly

---

## Next Steps

After successful deployment:

1. ✅ **Test thoroughly**
   - Load sample templates
   - Test all features
   - Verify performance

2. ✅ **Set up monitoring**
   - Enable Application Insights
   - Configure alerts
   - Review metrics regularly

3. ✅ **Document your setup**
   - Save URLs and credentials
   - Document custom configurations
   - Share with team

4. ✅ **Plan for updates**
   - Establish deployment process
   - Consider CI/CD pipeline
   - Schedule maintenance windows

5. ✅ **Optimize costs**
   - Review usage patterns
   - Adjust scaling settings
   - Set up cost alerts

---

## Additional Resources

### Official Documentation
- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [Azure App Service Documentation](https://learn.microsoft.com/azure/app-service/)
- [Azure Container Registry Documentation](https://learn.microsoft.com/azure/container-registry/)
- [Docker Documentation](https://docs.docker.com/)

### Pricing Calculators
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [Container Apps Pricing](https://azure.microsoft.com/pricing/details/container-apps/)
- [App Service Pricing](https://azure.microsoft.com/pricing/details/app-service/)

### Support
- [Azure Support](https://azure.microsoft.com/support/)
- [Azure Community Forums](https://learn.microsoft.com/answers/products/azure)
- [Stack Overflow - Azure Tag](https://stackoverflow.com/questions/tagged/azure)

---

## Summary

This guide covered two deployment options for the Liquid Template Debugger:

**Azure Container Apps** (Recommended for most scenarios)
- ✅ Cost-effective with scale-to-zero
- ✅ Modern serverless architecture
- ✅ Advanced auto-scaling
- ⚠️ May have cold starts

**Azure Web App for Containers** (Best for always-on scenarios)
- ✅ Simple setup and management
- ✅ No cold starts
- ✅ Predictable costs
- ⚠️ Higher minimum cost

Both options provide:
- Secure HTTPS endpoints
- Custom domain support
- Automatic SSL certificates
- Built-in monitoring
- Easy scaling

Choose based on your specific requirements for cost, performance, and operational preferences.

---

**Need Help?** Refer to the troubleshooting section or consult Azure documentation for specific issues.