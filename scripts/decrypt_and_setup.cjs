const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const payloadStr = '{"encrypted_payload": "MIIFhwYJKoZIhvcNAQcDoIIFeDCCBXQCAQAxggKLMIIChwIBADBvMFcxCzAJBgNVBAYTAlVTMQ4wDAYDVQQIDAVTdGF0ZTENMAsGA1UEBwwEQ2l0eTEVMBMGA1UECgwMT3JnYW5pemF0aW9uMRIwEAYDVQQDDAlsb2NhbGhvc3QCFFBcavGXa7uBAFPeOpMN4qiO7yo/MA0GCSqGSIb3DQEBAQUABIICAKlmOGLATiJXuTagB6rPg837IuemDPMaeGgii1xJmpO+CbB4sbi2d9nhT+hvE6EOAwMpVLrHjm/gDmqaEOXLwnh3fADHahyd3tLCjpXLOtOCgx6+6B9poVAx5Ny7DmtXpQ1pcQ7u/fQOK47TEXGA8SjL2jFrpRjiHbL1ug3LZED7wAqNH3XxThaTORUR1kMWUXvtfcGvr5RoDJS0/s1BzAs5VIZK+Sh8mck2LC6yaoazFoSopN3IGXjWZn1y4HV9cr60vQpHI1c1LXT9r4xlTxxIPF9QQnxHe3ZeLF3QaN85M/+Y7HyZ9q1KIYhz1KfvU6gaFCN/lgFjCdN8OwkA0qfuq/Eitr9C2Y1bSPzz/VSBwutCb22JaClFzXpLgZTkbZbIXszYkSLJlNFygKGoRi7cYsfABWpHfoE4J1YBbT+EVbvg17JueyD2Cp6QtYX0kOV5xcu4GDHLWHpH3h6l1fAcZhl3xLXgCstMsqWndhjtPfiAZEYaIK7WTiziJwBWidHBKmfuFTY8nM9N3tQIWihlVOeLVFOupso7qokxuU+kZrCq3OBCvfOGtM1hr7M1+w0OWyXI0YM6+20vtFUIfWJHGt2uElA3TzcdcwUpq0eYl4yeQInAra2nLKhcmdutZPg6MXsxn03UdiypX5mDe4iCLn9JKtxv0Qv9OZg5w7yYMIIC3gYJKoZIhvcNAQcBMB0GCWCGSAFlAwQBKgQQ8kSQhgMnMfVNvfbsPZmtSYCCArAEEoVHiNICe9AWPRXu3TDZjoc0kM3R3/5X+5n6r1xJRoqyVt0ylislM/uDUEtKVqham7cZj9KpPMZXAa/azGNFy/X/8DRUUsuWcw6MNYT4wSW57XLL21u06FP+a+vQ+Zjl9kxJGcDmdgt2tQDkBEYH3GUJ5cGavzpsjGLa9DPoZm36/l+35pnrmlZu+7GrCGDYZJZTafmdcvf8wZU2dGQwIp7v7fxntkZEkCSFwIoF/A0mebYUIT8SFHx7kT6z/6POypQYYmVNNrKzuYSXqZf1FsYgAza3unCu20z7s9C2BSvCxNBi9JS7XgGfibIjzyogBTjipnX0RHI4S3j4BGdlOMhTHPJLHEV1SuzTkjM9o2fgaJEZ2ArIAQ4OkWt0n4hwJtTvMynf6dJha5bK2dY6s4SHJGLHIWEllpxWeAUnbP2/D/KVmq68mXYeRJlG4JV96XxyGDk+FTeeSObqSB4eIi6Vc2pf4qUWT9jVsKUai1M01GGw2evzJ+/ALudcFqYlJL6bdrXbHm41GAm4SlodwlsqkYTCRw3xpebLYNbOcQTcVIbj/4HocIzGXhvLK3wMV/yxxdnz8CkWZw7eK+nHJMqMUOqPSxHzcc7JJZEq9+nTrvWGM5Xk3OgqJmiaC2XaGttr1lCz7Bz6Tr6kkH7C3PqDc4/wSCRjvOErbJjotqoJyaDiVfYCxh0xKRt3J0SvejF99+K0VJWrKewYzzIk30/SNlHFXXIl/CMqEMU/k5KvZL70ZczdqA08X4IhZWxGBuEgwRluQwJscxH5R0MONbaf7oU2E0BSxHAGjg+Z6qH2+sO/sWaQhhDW4ZXJIeiGpw3LH5AKGIIdYCVCEhuMztdOviMOVjqSbVASsNOnlHNRWkwhnvS1pJGbiB31SnFnNNBUe/zNji7Aylk49hSQ"}';
  const encryptedPayload = JSON.parse(payloadStr).encrypted_payload;
  const privateKeyPath = path.resolve(__dirname, '../apps/hcv_engine/certs/key.pem');
  const tempEncFile = path.resolve(__dirname, 'temp_encrypted.der');
  
  fs.writeFileSync(tempEncFile, Buffer.from(encryptedPayload, 'base64'));
  
  const decryptedDataStr = execSync(`openssl smime -decrypt -in "${tempEncFile}" -inform DER -inkey "${privateKeyPath}"`, { encoding: 'utf8' });
  const data = JSON.parse(decryptedDataStr);
  
  console.log("=== Decrypted Payload Data ===");
  console.log("Write Role ID:", data.credentials.write.role_id);

  // Use the root token to unwrap the secret_id!
  // We can just curl local vault directly.
  const unwrapCmd = `curl -s -X POST -H "X-Vault-Token: ${data.root_token}" http://127.0.0.1:8200/v1/sys/wrapping/unwrap`;
  
  const unwrapRes = execSync(unwrapCmd, { encoding: 'utf8', input: JSON.stringify({ token: data.credentials.write.wrapped_secret_id }) });
  const unwrapped = JSON.parse(unwrapRes);
  
  if (unwrapped.errors) {
      console.error("Failed to unwrap secret:", unwrapped.errors);
  } else {
    const unwrappedSecretId = unwrapped.data.secret_id;
    console.log("Unwrapped Write Secret ID:", unwrappedSecretId);

    // Update .env
    const envPath = path.resolve(__dirname, '../apps/api/.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/^VAULT_APPROLE_ROLE_ID_WRITE=.*$/m, `VAULT_APPROLE_ROLE_ID_WRITE="${data.credentials.write.role_id}"`);
    envContent = envContent.replace(/^VAULT_APPROLE_SECRET_ID_WRITE=.*$/m, `VAULT_APPROLE_SECRET_ID_WRITE="${unwrappedSecretId}"`);
    
    fs.writeFileSync(envPath, envContent);
    console.log(".env updated successfully.");
  }
  
  fs.unlinkSync(tempEncFile);
} catch (error) {
  console.error(error.message);
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
}
