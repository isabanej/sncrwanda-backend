variable "project_id" { type = string }
variable "region"     { type = string  default = "us-central1" }
variable "domain_names" { type = list(string) }
