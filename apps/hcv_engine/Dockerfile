FROM node:lts-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y openssl jq wget gnupg curl netcat-openbsd
# ==============================================
# DEPENDENCIES STAGE
# ==============================================
FROM base AS deps
RUN wget -O - https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com bookworm main" | tee /etc/apt/sources.list.d/hashicorp.list
RUN apt update && apt install vault

COPY config/config.hcl /etc/config.hcl
COPY scripts/setup ./setup
RUN sed -i 's/\r$//' setup
RUN chmod +x setup
COPY scripts/cert.pem ./cert.pem
COPY scripts/start.sh ./start.sh
RUN sed -i 's/\r$//' start.sh
RUN chmod +x start.sh
# ==============================================
# RUNNER STAGE
# ==============================================
FROM deps AS runner
ENV VAULT_ADDR='http://127.0.0.1:8200'
ENV VAULT_SKIP_VERIFY=true

RUN mkdir -p /etc/hashicorp_vault/raft_storage

CMD ["./start.sh"]

EXPOSE 8200
