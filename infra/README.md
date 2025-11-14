# Kira Payment Link - Infrastructure

Infrastructure as code using Terraform to deploy the API on AWS Lambda with API Gateway.

## 📋 Requirements

- Terraform >= 1.0
- AWS CLI configured
- AWS Account
- GitHub CLI (optional, for configuring secrets)

## 🚀 Quick Start

### 1. Configure Terraform

```bash
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Edit with your values
```

### 2. Deploy Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

### 3. Get API URL

```bash
terraform output api_url
```

Update the `API_BASE_URL` secret in GitHub with this URL.

## 📚 Documentation

- **[DEPLOY-GUIDE.md](./DEPLOY-GUIDE.md)** - Complete step-by-step deployment guide
- **[GITHUB-SECRETS.md](./GITHUB-SECRETS.md)** - Secrets configuration (17 variables)
- **[ENV-VARS-SETUP.md](./ENV-VARS-SETUP.md)** - Environment variables summary
- **[AWS-PERMISSIONS-GUIDE.md](./AWS-PERMISSIONS-GUIDE.md)** - AWS permissions
- **[GITHUB-ACTIONS.md](./GITHUB-ACTIONS.md)** - Workflow details

## 🔧 Scripts

- `setup-github-secrets.sh` - Configure GitHub secrets interactively

## 📦 Configuration Files

- `main.tf` - Main resources (Lambda + API Gateway)
- `variables.tf` - Terraform variables
- `outputs.tf` - Deployment outputs
- `terraform.tfvars.example` - Configuration template

## 🔑 AWS Permissions

- `aws-permissions-admin.json` - For your user (create infrastructure)
- `aws-permissions-github-action.json` - For GitHub Actions (automatic deployment)

## 🗑️ Delete Infrastructure

```bash
terraform destroy
```

## 📝 Created Resources

- Lambda Function (Node.js 20, 512MB, 30s timeout)
- API Gateway HTTP API
- IAM Role and policies
- CloudWatch Logs (auto-created)

## 💰 Estimated Costs

AWS Free Tier: ~$0-5/month for small projects
- 1M requests/month free (Lambda + API Gateway)
- 400,000 GB-seconds free (Lambda)
