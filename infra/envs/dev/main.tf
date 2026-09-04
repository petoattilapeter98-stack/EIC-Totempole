# Looked up by name so the zone ID is never hardcoded and the config stays
# portable if the zone is ever recreated.
data "aws_route53_zone" "primary" {
  name         = var.hosted_zone_name
  private_zone = false
}

module "site" {
  source = "../../modules/static-site"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  project        = var.project
  environment    = var.environment
  domain_name    = var.domain_name
  hosted_zone_id = data.aws_route53_zone.primary.zone_id

  # Single kiosk in one building: US/EU edges are more than enough.
  price_class = "PriceClass_100"

  # infra/ sits at the repo root alongside the app, so the build output is a
  # sibling path. Affects the rendered deploy_command output only.
  dist_path = "eic-totempole-code/dist"
}
