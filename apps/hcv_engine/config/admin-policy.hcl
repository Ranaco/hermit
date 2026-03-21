path "sys/auth/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

path "sys/mounts/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

path "sys/policies/acl/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

path "sys/wrapping/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

path "sys/audit*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

path "auth/approle/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

path "transit/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
