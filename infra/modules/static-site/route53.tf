# Alias records to CloudFront. Alias (not CNAME) so the apex-style rules and
# AWS's own health/latency handling apply, and so there is no extra DNS hop.
resource "aws_route53_record" "site_a" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

# The distribution has IPv6 enabled, so publish AAAA too - otherwise IPv6-only
# resolvers silently fall back or fail.
resource "aws_route53_record" "site_aaaa" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
