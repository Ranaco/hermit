api_addr      = "http://0.0.0.0:8200"
cluster_addr  = "http://127.0.0.1:8201"
cluster_name  = "medusa_vault"
disable_mlock = true
ui            = true

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = true
}
storage "raft" {
  path    = "/etc/hashicorp_vault/raft_storage/"
  node_id = "node01"
}
