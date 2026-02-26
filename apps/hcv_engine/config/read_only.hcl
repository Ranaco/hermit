path "secret/data/hermes_vault/*" {
  capabilities = ["read", "list"]
}

path "transit/*" {
  capabilities = ["read", "list"]
}