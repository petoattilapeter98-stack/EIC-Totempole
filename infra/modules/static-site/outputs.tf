output "bucket_name" {
  description = "Origin bucket name - the sync target for a manual deploy."
  value       = aws_s3_bucket.site.id
}

output "bucket_arn" {
  description = "Origin bucket ARN."
  value       = aws_s3_bucket.site.arn
}

output "distribution_id" {
  description = "CloudFront distribution ID - needed for cache invalidations."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_domain_name" {
  description = "CloudFront-assigned domain, e.g. d111111abcdef8.cloudfront.net."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "site_url" {
  description = "Public URL of the site."
  value       = "https://${var.domain_name}"
}

output "certificate_arn" {
  description = "ARN of the issued ACM certificate (us-east-1)."
  value       = aws_acm_certificate_validation.site.certificate_arn
}

output "deploy_command" {
  description = "Copy-paste manual deploy, run from the repo root after building the app."
  value       = <<-EOT
    aws s3 sync ${var.dist_path}/ s3://${aws_s3_bucket.site.id}/ --delete \
      --exclude "index.html" \
      --cache-control "public,max-age=31536000,immutable"

    aws s3 cp ${var.dist_path}/index.html s3://${aws_s3_bucket.site.id}/index.html \
      --cache-control "no-cache,must-revalidate" \
      --content-type "text/html; charset=utf-8"
  EOT
}
