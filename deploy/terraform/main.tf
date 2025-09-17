resource "google_project_service" "services" {
  for_each = toset(["run.googleapis.com","artifactregistry.googleapis.com","compute.googleapis.com","certificatemanager.googleapis.com"])
  service = each.value
}
resource "google_compute_region_network_endpoint_group" "gateway_neg" {
  name="api-gateway-neg" network_endpoint_type="SERVERLESS" region=var.region cloud_run{{service="api-gateway"}}
}
resource "google_compute_backend_service" "gateway_backend" {
  name="api-gateway-backend" load_balancing_scheme="EXTERNAL_MANAGED" protocol="HTTP"
  backend{{group=google_compute_region_network_endpoint_group.gateway_neg.id}}
}
resource "google_compute_global_address" "lb_ip" { name="sncrwanda-lb-ip" }
resource "google_compute_url_map" "https_map" { name="sncrwanda-https-map" default_service=google_compute_backend_service.gateway_backend.id }
resource "google_compute_managed_ssl_certificate" "managed_cert" { name="sncrwanda-managed-cert" managed{{domains=var.domain_names}} }
resource "google_compute_target_https_proxy" "https_proxy" { name="sncrwanda-https-proxy" url_map=google_compute_url_map.https_map.id ssl_certificates=[google_compute_managed_ssl_certificate.managed_cert.id] }
resource "google_compute_global_forwarding_rule" "https_rule" { name="sncrwanda-https" target=google_compute_target_https_proxy.https_proxy.id port_range="443" ip_address=google_compute_global_address.lb_ip.address }
resource "google_compute_url_map" "http_redirect_map" { name="sncrwanda-http-redirect-map"
  default_url_redirect{{https_redirect=true redirect_response_code="MOVED_PERMANENTLY_DEFAULT" host_redirect=var.domain_names[0] strip_query=false}}
}
resource "google_compute_target_http_proxy" "http_proxy" { name="sncrwanda-http-redirect-proxy" url_map=google_compute_url_map.http_redirect_map.id }
resource "google_compute_global_forwarding_rule" "http_rule" { name="sncrwanda-http" target=google_compute_target_http_proxy.http_proxy.id port_range="80" ip_address=google_compute_global_address.lb_ip.address }
output "load_balancer_ip" { value = google_compute_global_address.lb_ip.address }
