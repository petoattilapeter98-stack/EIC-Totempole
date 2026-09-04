output "site_url" {
  description = "Public URL of the kiosk."
  value       = module.site.site_url
}

output "bucket_name" {
  description = "Origin bucket - the sync target for a manual deploy."
  value       = module.site.bucket_name
}

output "distribution_id" {
  description = "CloudFront distribution ID - needed for cache invalidations."
  value       = module.site.distribution_id
}

output "distribution_domain_name" {
  description = "CloudFront-assigned domain name."
  value       = module.site.distribution_domain_name
}

output "certificate_arn" {
  description = "ACM certificate ARN (us-east-1)."
  value       = module.site.certificate_arn
}

output "deploy_command" {
  description = "Copy-paste manual deploy, run from the repo root after npm run build."
  value       = module.site.deploy_command
}
