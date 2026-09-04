variable "project" {
  description = "Project slug, used in resource names and tags."
  type        = string
}

variable "environment" {
  description = "Environment slug (dev, staging, prod). Used in resource names and tags."
  type        = string
}

variable "domain_name" {
  description = "Fully-qualified domain the site is served from, e.g. dev.totempole.wisebeers.com."
  type        = string
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID that is authoritative for domain_name."
  type        = string
}

variable "price_class" {
  description = <<-EOT
    CloudFront price class. Default PriceClass_100 (US/EU edges only): this kiosk
    is a single device in one building, so global edge coverage buys nothing.
    CloudFront is here for TLS on a custom domain, not for CDN reach.
  EOT
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "price_class must be PriceClass_100, PriceClass_200 or PriceClass_All."
  }
}

variable "enable_spa_error_routing" {
  description = <<-EOT
    Map 403/404 to /index.html with a 200. The kiosk app has no client-side
    router (Constitution IV), so this is defensive rather than required: it
    turns a missing S3 key into the app rather than an S3 XML error page.
    Set false while debugging if you would rather see real 404s.
  EOT
  type        = bool
  default     = true
}

variable "hsts_max_age_seconds" {
  description = "Strict-Transport-Security max-age. Default 1 year."
  type        = number
  default     = 31536000
}

variable "dist_path" {
  description = <<-EOT
    Path to the build output, relative to wherever you run the deploy from.
    Used only to render the deploy_command output - it creates no resources.
    In this repo the app is a sibling of infra/, so it is eic-totempole-code/dist.
  EOT
  type        = string
  default     = "dist"
}

variable "tags" {
  description = "Additional tags merged onto every taggable resource."
  type        = map(string)
  default     = {}
}
