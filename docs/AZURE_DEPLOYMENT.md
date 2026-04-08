# Deploying Liquid Template Debugger to Azure Container Apps

This guide walks you through deploying the Liquid Template Debugger as a containerized web application on Azure Container Apps.

## Overview

Azure Container Apps is a fully managed serverless container service that allows you to run containerized applications without managing infrastructure. This deployment method provides:

- **Automatic scaling** - Scale based on HTTP traffic
- **Built-in load balancing** - Handle multiple concurrent users
- **HTTPS support** - Secure connections out of the box
- **Easy updates** - Deploy new versions with zero downtime
- **Cost-effective** - Pay only for what you use

## Prerequisites

Before you begin, ensure you have:

1. **Azure Account** - An active Azure subscription ([Create free account](https://azure.microsoft.com/free/))
2. **Azure CLI** - Installed on your local machine ([Installation guide](https://docs.microsoft.com/cli/azure/install-azure-cli))
3. **Docker** - Installed and running ([Get Docker](https://docs.docker.com/get-docker/))
4. **Git** - To clone the repository (optional)

## Step-by-Step Deployment

### Step 1: Prepare Your Local Environment

Open a terminal or command prompt and verify your tools are installed:

```bash
# Check Azure CLI
az --version

# Check Docker
docker --version

# Login to Azure
az login
```

The `az login` command will open your browser for authentication.

### Step 2: Set Up Azure Resources

Create the necessary Azure resources. Replace `<your-unique-name>` with a unique identifier (e.g., your initials + random numbers):

```bash
# Set variables (customize these)
RESOURCE_GROUP="liquid-debugger-rg"
LOCATION="eastus"
CONTAINER_REGISTRY="liquiddebuggeracr<your-unique-name>"
CONTAINER_APP_ENV="liquid-debugger-env"
CONTAINER_APP_NAME="liquid-debugger-app"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

**Expected output**: Confirmation that the resource group was created.

### Step 3: Create Azure Container Registry

Azure Container Registry (ACR) stores your Docker images:

```bash
# Create container registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_REGISTRY \
  --sku Basic \
  --admin-enabled true

# Get registry credentials (save these for later)
az acr credential show \
  --name $CONTAINER_REGISTRY \
  --resource-group $RESOURCE_GROUP
```

**Note**: Save the username and password from the output - you'll need them later.

### Step 4: Build and Push Docker Image

Navigate to your project directory and build the Docker image:

```bash
# Navigate to project directory
cd /path/to/LiquidTemplateDebugger

# Login to ACR
az acr login --name $CONTAINER_REGISTRY

# Build the Docker image
docker build -t liquid-debugger:latest .

# Tag the image for ACR
docker tag liquid-debugger:latest $CONTAINER_REGISTRY.azurecr.io/liquid-debugger:latest

# Push to ACR
docker push $CONTAINER_REGISTRY.azurecr.io/liquid-debugger:latest
```

**Expected output**: Progress bars showing layers being pushed to the registry.

### Step 5: Create Container Apps Environment

The Container Apps Environment is a secure boundary around your containers:

```bash
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

**Note**: This may take 2-3 minutes to complete.

### Step 6: Deploy the Container App

Deploy your application to Azure Container Apps:

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY --query passwords[0].value -o tsv)

# Create the container app
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $CONTAINER_REGISTRY.azurecr.io/liquid-debugger:latest \
  --registry-server $CONTAINER_REGISTRY.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8080 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars PORT=8080 ASPNETCORE_ENVIRONMENT=Production
```

**Expected output**: JSON response with your app's details, including the application URL.

### Step 7: Get Your Application URL

Retrieve the public URL for your deployed application:

```bash
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

**Example output**: `liquid-debugger-app.proudhill-12345678.eastus.azurecontainerapps.io`

### Step 8: Access Your Application

Open your browser and navigate to the URL from Step 7. You should see the Liquid Template Debugger interface.

The URL will be in the format:
```
https://<your-app-name>.<random-id>.<region>.azurecontainerapps.io
```

## Configuration Options

### Environment Variables

You can configure the application using environment variables:

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars \
    PORT=8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    Logging__LogLevel__Default=Information
```

### Scaling Configuration

Adjust scaling settings based on your needs:

```bash
# Update scaling rules
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 0 \
  --max-replicas 5
```

**Note**: Setting `min-replicas` to 0 enables scale-to-zero, reducing costs when not in use.

### Resource Allocation

Adjust CPU and memory if needed:

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --cpu 1.0 \
  --memory 2.0Gi
```

## Updating Your Application

When you make changes to your code, follow these steps to deploy updates:

### Option 1: Using Azure CLI

```bash
# Rebuild and push new image
docker build -t liquid-debugger:latest .
docker tag liquid-debugger:latest $CONTAINER_REGISTRY.azurecr.io/liquid-debugger:latest
docker push $CONTAINER_REGISTRY.azurecr.io/liquid-debugger:latest

# Update the container app
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $CONTAINER_REGISTRY.azurecr.io/liquid-debugger:latest
```

### Option 2: Using Revisions

Container Apps supports multiple revisions for blue-green deployments:

```bash
# Create a new revision
az containerapp revision copy \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $CONTAINER_REGISTRY.azurecr.io/liquid-debugger:v2
```

## Monitoring and Troubleshooting

### View Application Logs

```bash
# Stream logs in real-time
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --follow

# View recent logs
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --tail 100
```

### Check Application Status

```bash
# Get app status
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.runningStatus
```

### View Metrics

Access metrics through the Azure Portal:
1. Navigate to your Container App
2. Click on "Metrics" in the left menu
3. View CPU, memory, and request metrics

## Security Considerations

### Enable Authentication (Optional)

Add Azure AD authentication to restrict access:

```bash
az containerapp auth update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --enabled true \
  --action RedirectToLoginPage \
  --aad-client-id <your-client-id> \
  --aad-client-secret <your-client-secret> \
  --aad-tenant-id <your-tenant-id>
```

### Custom Domain and SSL

Add a custom domain with automatic SSL:

```bash
# Add custom domain
az containerapp hostname add \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname debugger.yourdomain.com

# Bind SSL certificate (managed certificate)
az containerapp hostname bind \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname debugger.yourdomain.com \
  --environment $CONTAINER_APP_ENV \
  --validation-method CNAME
```

### Network Restrictions

Restrict access to specific IP addresses:

```bash
az containerapp ingress access-restriction set \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --rule-name "office-network" \
  --ip-address 203.0.113.0/24 \
  --action Allow
```

## Cost Management

### Estimate Costs

Azure Container Apps pricing is based on:
- **vCPU seconds** - Compute time used
- **Memory GB-seconds** - Memory allocated
- **Requests** - Number of HTTP requests

**Typical costs** (as of 2024):
- Small app (0.5 vCPU, 1GB RAM): ~$15-30/month
- Medium app (1 vCPU, 2GB RAM): ~$30-60/month

### Cost Optimization Tips

1. **Enable scale-to-zero** - Set `min-replicas` to 0 for development environments
2. **Right-size resources** - Start with minimal CPU/memory and scale up if needed
3. **Use consumption plan** - Pay only for actual usage
4. **Monitor usage** - Set up cost alerts in Azure Portal

### Set Up Cost Alerts

```bash
# Create budget alert
az consumption budget create \
  --budget-name liquid-debugger-budget \
  --amount 50 \
  --time-grain Monthly \
  --start-date 2024-01-01 \
  --end-date 2025-12-31 \
  --resource-group $RESOURCE_GROUP
```

## Cleanup

To remove all resources and stop incurring charges:

```bash
# Delete the entire resource group (removes all resources)
az group delete \
  --name $RESOURCE_GROUP \
  --yes \
  --no-wait
```

**Warning**: This permanently deletes all resources in the resource group.

## Troubleshooting Common Issues

### Issue: Container fails to start

**Solution**: Check logs for errors:
```bash
az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --tail 50
```

### Issue: Application not accessible

**Solution**: Verify ingress is enabled:
```bash
az containerapp ingress show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP
```

### Issue: Image pull errors

**Solution**: Verify ACR credentials:
```bash
az acr credential show --name $CONTAINER_REGISTRY
```

### Issue: High costs

**Solution**: Check scaling configuration and enable scale-to-zero:
```bash
az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.template.scale
```

## Alternative Deployment: Azure Web App for Containers

If you prefer Azure Web App for Containers instead of Container Apps:

```bash
# Create App Service Plan
az appservice plan create \
  --name liquid-debugger-plan \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku B1

# Create Web App
az webapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan liquid-debugger-plan \
  --deployment-container-image-name $CONTAINER_REGISTRY.azurecr.io/liquid-debugger:latest

# Configure container registry
az webapp config container set \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --docker-custom-image-name $CONTAINER_REGISTRY.azurecr.io/liquid-debugger:latest \
  --docker-registry-server-url https://$CONTAINER_REGISTRY.azurecr.io \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD
```

## Next Steps

After successful deployment:

1. **Test the application** - Load sample templates and verify functionality
2. **Set up monitoring** - Configure Application Insights for detailed telemetry
3. **Configure backups** - Set up automated backups if needed
4. **Document your URL** - Share the application URL with your team
5. **Set up CI/CD** - Automate deployments using GitHub Actions or Azure DevOps

## Additional Resources

- [Azure Container Apps Documentation](https://docs.microsoft.com/azure/container-apps/)
- [Azure Container Registry Documentation](https://docs.microsoft.com/azure/container-registry/)
- [Docker Documentation](https://docs.docker.com/)
- [Azure CLI Reference](https://docs.microsoft.com/cli/azure/)

## Support

For issues specific to:
- **Azure deployment**: Check Azure documentation or contact Azure support
- **Application functionality**: Refer to the main project documentation
- **Docker issues**: Consult Docker documentation

---

**Note**: This guide assumes you're deploying for development or internal use. For production deployments handling sensitive data, implement additional security measures including authentication, network isolation, and data encryption.