variable "aws_region" {
  description = "Region for the S3 origin bucket. CloudFront is global; ACM is pinned to us-east-1 separately."
  type        = string
  default     = "us-west-2"
}

variable "project" {
  description = "Project slug used in resource names and tags."
  type        = string
  default     = "eic-totempole"
}

variable "environment" {
  description = "Environment slug."
  type        = string
  default     = "dev"
}

variable "domain_name" {
  description = "FQDN the kiosk is served from."
  type        = string
  default     = "dev.totempole.wisebeers.com"
}

variable "hosted_zone_name" {
  description = "Public hosted zone that is authoritative for domain_name. Looked up rather than hardcoding the zone ID."
  type        = string
  default     = "wisebeers.com"
}
