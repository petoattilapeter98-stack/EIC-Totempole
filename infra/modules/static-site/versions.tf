terraform {
  # >= 1.10 for S3 native state locking (use_lockfile) - no DynamoDB table needed.
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"

      # CloudFront only accepts ACM certificates from us-east-1, regardless of
      # where the rest of the stack lives. The caller must pass this alias.
      configuration_aliases = [aws.us_east_1]
    }
  }
}
