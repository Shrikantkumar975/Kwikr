variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
  default     = "t3.micro"
}

variable "instance_name" {
  description = "Name tag for the EC2 instance"
  type        = string
  default     = "kwikr-production-server"
}

variable "app_port" {
  description = "Port for the Kwikr web application"
  type        = number
  default     = 8000
}

variable "nagios_port" {
  description = "Port for the Nagios monitoring dashboard"
  type        = number
  default     = 9000
}
