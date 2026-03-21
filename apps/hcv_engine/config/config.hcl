api_addr      = "${VAULT_API_ADDR}"
cluster_addr  = "${VAULT_CLUSTER_ADDR}"
cluster_name  = "hermes_vault"
disable_mlock = true
ui            = true
log_level     = "${VAULT_LOG_LEVEL}"

listener "tcp" {
  address            = "0.0.0.0:8200"
  cluster_address    = "0.0.0.0:8201"
  tls_disable        = ${VAULT_TLS_DISABLE_NUMERIC}
  tls_cert_file      = "${VAULT_TLS_CERT_FILE}"
  tls_key_file       = "${VAULT_TLS_KEY_FILE}"
  tls_client_ca_file = "${VAULT_TLS_CA_FILE}"
}

storage "raft" {
  path    = "/etc/hashicorp_vault/raft_storage"
  node_id = "${VAULT_NODE_ID}"
}
