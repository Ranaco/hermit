path "secret/data/medusa_vault/*" {
  capabilities = ["create", "update", "read", "list"]
}

path "transit/*" {
  capabilities = ["create", "read", "update", "list"]
}
