resource "local_file" "ansible_inventory" {
  content = format(
    "[kwikr_servers]\nkwikr_host ansible_host=%s ansible_user=ubuntu ansible_ssh_private_key_file=../terraform/kwikr-key.pem ansible_ssh_common_args='-o StrictHostKeyChecking=no'\n",
    aws_instance.kwikr_server.public_ip
  )
  filename        = "${path.module}/../ansible/inventory.ini"
  file_permission = "0644"
}