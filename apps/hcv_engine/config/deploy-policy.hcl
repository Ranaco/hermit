path "auth/approle/role/hermit-read/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/hermit-read/secret-id" {
  capabilities = ["update"]
}

path "auth/approle/role/hermit-write/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/hermit-write/secret-id" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}
