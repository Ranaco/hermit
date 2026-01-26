import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import forge from "node-forge";

const __dirname = path.resolve();

const encryptedPayload = JSON.parse(
  fs.readFileSync("./encrypted_body.json", "utf8"),
).encrypted_payload;

const password = process.argv[2];
const argPrivateKeyPath = process.argv[3];

if (!password) {
  console.error("Usage: node decrypt_payload.js <password>");
  process.exit(1);
}

const privateKeyPath =
  argPrivateKeyPath ??
  path.join(__dirname, "apps", "hcv_engine", "src", "private_key.pem");

try {
  const privateKeyPem = fs.readFileSync(privateKeyPath, "utf8");

  const tempEncFile = path.join(__dirname, "temp_encrypted.der");
  fs.writeFileSync(tempEncFile, Buffer.from(encryptedPayload, "base64"));

  const command = `openssl smime -decrypt -in "${tempEncFile}" -inform DER -inkey "${privateKeyPath}" -passin pass:"${password}"`;

  try {
    const decryptedData = execSync(command, { encoding: "utf8" });
    console.log("Decrypted Data:");
    console.log(decryptedData);

    fs.unlinkSync(tempEncFile);
  } catch (opensslError) {
    console.log(
      "OpenSSL not available or failed. Trying alternative method...",
    );

    try {
      const decryptedPem = forge.pki.decryptRsaPrivateKey(
        privateKeyPem,
        password,
      );

      const p7 = forge.pkcs7.messageFromPem(
        "-----BEGIN PKCS7-----\n" + encryptedPayload + "\n-----END PKCS7-----",
      );

      p7.decrypt(p7.recipients[0], decryptedPem);

      console.log("Decrypted Data:");
      console.log(p7.content.data);
    } catch (forgeError) {
      console.error(
        "Alternative decryption failed. Install node-forge: npm install node-forge",
      );
      console.error(forgeError.message);

      if (fs.existsSync(tempEncFile)) {
        fs.unlinkSync(tempEncFile);
      }
    }
  }
} catch (error) {
  console.error("Error during decryption:");
  console.error(error.message);
  console.log("\nMake sure:");
  console.log("1. The private key file exists at:", privateKeyPath);
  console.log("2. OpenSSL is installed and available in PATH, OR");
  console.log("3. Install node-forge: npm install node-forge");
}
