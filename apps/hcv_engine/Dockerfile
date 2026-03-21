FROM node:lts-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y openssl jq wget gnupg curl netcat-openbsd gettext-base

FROM base AS deps
RUN wget -O - https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com bookworm main" | tee /etc/apt/sources.list.d/hashicorp.list
RUN apt-get update && apt-get install -y vault

COPY config /vault/config
COPY scripts /vault/scripts
RUN find /vault/scripts -type f -exec sed -i 's/\r$//' {} \; \
  && find /vault/scripts -type f -name '*.sh' -exec chmod +x {} \;

FROM deps AS runner
ENV VAULT_ADDR="https://127.0.0.1:8200"
ENV VAULT_SKIP_VERIFY="false"
ENV VAULT_NODE_ID="node01"
ENV VAULT_API_ADDR="https://hcv:8200"
ENV VAULT_CLUSTER_ADDR="https://hcv:8201"
ENV VAULT_LOG_LEVEL="info"
ENV VAULT_TLS_DISABLE="false"
ENV VAULT_TLS_DISABLE_NUMERIC="0"
ENV VAULT_TLS_CERT_FILE="/vault/tls/tls.crt"
ENV VAULT_TLS_KEY_FILE="/vault/tls/tls.key"
ENV VAULT_TLS_CA_FILE="/vault/tls/ca.pem"

RUN mkdir -p /etc/hashicorp_vault/raft_storage /vault/init /vault/audit /vault/backups

CMD ["/vault/scripts/start.sh"]

EXPOSE 8200
EXPOSE 8201
