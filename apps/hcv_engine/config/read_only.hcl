path "secret/data/medusa_vault/*" {
  capabilities = ["read", "list"]
}

path "transit/*" {
  capabilities = ["read", "list"]
}