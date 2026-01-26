path "transit/keys/*" {
  capabilities = ["create", "read", "list", "update", "delete"]
}

path "transit/encrypt/*" {
  capabilities = ["create", "update"]
}

path "transit/decrypt/*" {
  capabilities = ["create", "update"]
}

path "transit/rewrap/*" {
  capabilities = ["create", "update"]
}

path "transit/rotate/*" {
  capabilities = ["create", "update"]
}

path "transit/datakey/*" {
  capabilities = ["create", "update"]
}

path "transit/config/*" {
  capabilities = ["read", "update"]
}
