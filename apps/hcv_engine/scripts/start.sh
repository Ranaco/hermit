#!/bin/sh
vault server -config=/etc/config.hcl &

# Wait for Vault to start
echo "Waiting for Vault to start..."
while ! nc -z 127.0.0.1 8200; do   
  sleep 1
done
echo "Vault started."

# Run setup script
./setup

# Keep container running
wait
