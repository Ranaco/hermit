import crypto from "crypto";
import os from "os";
import {
  getCliDevice,
  saveCliDevice,
  type CliDeviceInfo,
} from "./auth-store.js";

function computeHardwareFingerprint() {
  const interfaces = os.networkInterfaces();
  const macs = Object.values(interfaces)
    .flat()
    .filter((details): details is NonNullable<typeof details> => Boolean(details))
    .map((details) => details.mac)
    .filter((mac) => mac && mac !== "00:00:00:00:00:00")
    .sort()
    .join("|");

  const payload = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.userInfo().username,
    macs,
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
}

function createCliDevice(): CliDeviceInfo {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    hardwareFingerprint: computeHardwareFingerprint(),
    label: `${os.hostname()} (${os.platform()})`,
    clientType: "CLI",
  };
}

export function ensureCliDevice() {
  const existing = getCliDevice();
  if (existing) {
    return existing;
  }

  const created = createCliDevice();
  saveCliDevice(created);
  return created;
}

function getBodyHash(body?: unknown) {
  const payload = body ? JSON.stringify(body) : "";
  return crypto.createHash("sha256").update(payload).digest("base64");
}

export function buildCliSignatureHeaders(
  method: string,
  pathWithQuery: string,
  body?: unknown,
) {
  const device = ensureCliDevice();
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  // We use asymmetric Ed25519 signing for request integrity. 
  // The private key is generated locally and never leaves the device.
  const signingPayload = [
    method.toUpperCase(),
    pathWithQuery,
    timestamp,
    nonce,
    getBodyHash(body),
  ].join("\n");

  const signature = crypto.sign(
    null,
    Buffer.from(signingPayload),
    device.privateKey,
  ).toString("base64");

  return {
    "X-Hermit-Device-Id": device.deviceId || "",
    "X-Hermit-Timestamp": timestamp,
    "X-Hermit-Nonce": nonce,
    "X-Hermit-Signature": signature,
  };
}
