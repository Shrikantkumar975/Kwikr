output "ec2_public_ip" {
  description = "Public IP Address of the EC2 Instance"
  value       = aws_instance.kwikr_server.public_ip
}

output "ssh_command" {
  description = "One-line command to SSH into the instance"
  value       = "ssh -i kwikr-key.pem ubuntu@${aws_instance.kwikr_server.public_ip}"
}

output "kwikr_app_url" {
  description = "Kwikr Storefront URL"
  value       = "http://${aws_instance.kwikr_server.public_ip}:${var.app_port}"
}

output "nagios_dashboard_url" {
  description = "Nagios Monitoring Dashboard URL"
  value       = "http://${aws_instance.kwikr_server.public_ip}:${var.nagios_port}/nagios/"
}
