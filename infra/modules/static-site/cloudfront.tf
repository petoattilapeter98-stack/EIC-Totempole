# Managed cache policies, looked up by name rather than hardcoding AWS's UUIDs.
data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${local.name_prefix}-oac"
  description                       = "OAC for ${var.domain_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_response_headers_policy" "site" {
  name    = "${local.name_prefix}-security-headers"
  comment = "Security headers for ${var.domain_name}"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = var.hsts_max_age_seconds
      include_subdomains         = true
      preload                    = false
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  # Deliberately no Content-Security-Policy yet: a wrong CSP fails silently in
  # the browser, which on an unattended kiosk means a blank screen nobody sees
  # for days. Add one only after verifying it against the built bundle.
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name_prefix} kiosk shell"
  default_root_object = "index.html"
  price_class         = var.price_class
  aliases             = [var.domain_name]

  origin {
    origin_id                = "s3-${aws_s3_bucket.site.id}"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  # ---------------------------------------------------------------------------
  # Cache strategy - the part that actually matters for a kiosk.
  #
  # index.html is NOT cached at the edge. It is ~1 KB and loaded roughly once
  # per kiosk restart, so the cost is nil, and it removes the entire class of
  # "deployed but the kiosk still serves the old bundle" failures. It also means
  # a routine deploy needs no CloudFront invalidation at all.
  # ---------------------------------------------------------------------------
  default_cache_behavior {
    target_origin_id           = "s3-${aws_s3_bucket.site.id}"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.disabled.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id
  }

  # Vite content-hashes everything under /assets, so these are immutable:
  # a changed file gets a new filename and can never be served stale.
  ordered_cache_behavior {
    path_pattern               = "/assets/*"
    target_origin_id           = "s3-${aws_s3_bucket.site.id}"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id
  }

  # Fonts live at stable, unhashed paths (research.md R2), so they are cached
  # hard but DO require an invalidation if a file is ever replaced.
  ordered_cache_behavior {
    path_pattern               = "/fonts/*"
    target_origin_id           = "s3-${aws_s3_bucket.site.id}"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id
  }

  dynamic "custom_error_response" {
    for_each = var.enable_spa_error_routing ? [403, 404] : []

    content {
      error_code            = custom_error_response.value
      response_code         = 200
      response_page_path    = "/index.html"
      error_caching_min_ttl = 0
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = local.common_tags
}
