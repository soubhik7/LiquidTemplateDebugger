# Use the .NET 10 ASP.NET runtime for running the application
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
# Minimal APIs natively expose on port 8080 in container environments
EXPOSE 8080

# Use the .NET 10 SDK for building the application
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy project files and restore dependencies
COPY ["LiquidTemplateDebugger.csproj", "./"]
RUN dotnet restore "LiquidTemplateDebugger.csproj"

# Copy the rest of the source code and build
COPY . .
WORKDIR "/src"
RUN dotnet build "LiquidTemplateDebugger.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Publish the application (compiled binaries & wwwroot)
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "LiquidTemplateDebugger.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Final stage/image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Set execution entrypoint
ENTRYPOINT ["dotnet", "LiquidTemplateDebugger.dll"]
