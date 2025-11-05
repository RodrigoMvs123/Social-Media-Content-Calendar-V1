# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Social Media Content Calendar project.

## Workflows Overview

### 🔧 CI Pipeline (`ci.yml`)
- **Triggers**: Push to main/develop, PRs to main/develop
- **Features**:
  - Multi-Node.js version testing (18, 20)
  - Code linting and type checking
  - Frontend build validation
  - Backend testing
  - Build artifact uploads

### 🐳 Docker Build (`docker.yml`)
- **Triggers**: Push to main, tags, PRs to main
- **Features**:
  - Multi-platform builds (AMD64, ARM64)
  - GitHub Container Registry integration
  - Automated tagging (branch, PR, semver, SHA)
  - Build caching optimization

### 🚀 Deploy to Render (`deploy.yml`)
- **Triggers**: Push to main, manual dispatch
- **Features**:
  - Automated Render deployment
  - Health check validation
  - Deployment status notifications
  - Production environment protection

### 🔒 Security Scanning (`security.yml`)
- **Triggers**: Push to main/develop, PRs to main, weekly schedule
- **Features**:
  - Dependency vulnerability scanning (npm audit)
  - Snyk security analysis
  - CodeQL static analysis
  - Secret detection with TruffleHog

### 🔍 PR Automation (`pr-checks.yml`)
- **Triggers**: PR opened, synchronized, reopened
- **Features**:
  - Breaking change detection
  - Bundle size monitoring
  - Automated PR comments
  - Repository size analysis

## Required Secrets

Configure these secrets in your GitHub repository settings:

### Render Deployment
- `RENDER_SERVICE_ID`: Your Render service ID
- `RENDER_API_KEY`: Your Render API key

### Security Scanning (Optional)
- `SNYK_TOKEN`: Snyk API token for enhanced security scanning

## Environment Setup

The workflows are configured to work with:
- Node.js versions 18 and 20
- SQLite for testing
- Universal Authentication System
- Cross-database compatibility

## Workflow Status

Monitor workflow status in the GitHub Actions tab. Each workflow provides:
- ✅ Success indicators
- ❌ Failure notifications
- 📊 Performance metrics
- 🔍 Detailed logs

## Customization

To modify workflows:
1. Edit the respective `.yml` files
2. Test changes in feature branches
3. Monitor workflow runs for issues
4. Update documentation as needed

## Best Practices

- All workflows use the latest action versions
- Caching is enabled for faster builds
- Security scanning runs on schedule
- PR validation prevents broken deployments
- Health checks ensure deployment success