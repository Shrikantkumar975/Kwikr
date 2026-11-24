data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "tls_private_key" "kwikr_ssh_key" {
  algorithm = "ED25519"
}

resource "aws_key_pair" "kwikr_key" {
  key_name_prefix = "kwikr-aws-key-"
  public_key      = tls_private_key.kwikr_ssh_key.public_key_openssh
}

resource "local_file" "private_key" {
  content         = tls_private_key.kwikr_ssh_key.private_key_pem
  filename        = "${path.module}/kwikr-key.pem"
  file_permission = "0400"
}

resource "aws_security_group" "kwikr_sg" {
  name_prefix = "kwikr-sg-"
  description = "Allow SSH, HTTP App Traffic, and Nagios Monitoring"

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    description = "SSH for administration & Ansible"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Kwikr Web Traffic (HTTP)"
    from_port   = var.app_port
    to_port     = var.app_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Nagios Dashboard Access"
    from_port   = var.nagios_port
    to_port     = var.nagios_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "kwikr-sg"
    Project = "Kwikr DevOps"
  }
}

resource "aws_instance" "kwikr_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.kwikr_key.key_name
  vpc_security_group_ids = [aws_security_group.kwikr_sg.id]

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name    = var.instance_name
    Project = "Kwikr DevOps"
  }
}

resource "local_file" "ansible_inventory" {
  content         = <<-EOT
[kwikr_servers]
kwikr_host ansible_host=${aws_instance.kwikr_server.public_ip} ansible_user=ubuntu ansible_ssh_private_key_file=../terraform/kwikr-key.pem ansible_ssh_common_args='-o StrictHostKeyChecking=no'
EOT
  filename        = "${path.module}/../ansible/inventory.ini"
  file_permission = "0644"
}
