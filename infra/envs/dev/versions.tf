terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Reuses the existing shared state bucket, matching the key-per-project
  # convention already in use there (weather-app/terraform.tfstate).
  # use_lockfile is S3 native locking - no DynamoDB table required (TF >= 1.10).
  backend "s3" {
    bucket       = "common-terraform-state-066925181728-us-west-2-an"
    key          = "eic-totempole/dev/terraform.tfstate"
    region       = "us-west-2"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Repo        = "eic-totempole"
    }
  }
}

# CloudFront requires its ACM certificate to live in us-east-1, no matter where
# the rest of the stack is. This alias exists solely for that certificate.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Repo        = "eic-totempole"
    }
  }
}
