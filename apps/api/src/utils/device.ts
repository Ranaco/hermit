/**
 * Device Fingerprinting and Management Utilities
 */

import type { Request } from 'express';
import crypto from 'crypto';
import getPrismaClient from '../services/prisma.service';

type CliEnrollmentInput = {
  cliPublicKey?: string;
  cliLabel?: string;
  hardwareFingerprint?: string;
  clientType?: "BROWSER" | "CLI";
};

/**
 * Generate device fingerprint from request
 * Creates a hash based on user agent, IP, and other identifiable info
 */
export function generateDeviceFingerprint(req: Request, customFingerprint?: string): string {
  if (customFingerprint) {
    return customFingerprint;
  }

  // Collect device information
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  // Create fingerprint from available headers
  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  
  // Generate SHA-256 hash
  return crypto
    .createHash('sha256')
    .update(fingerprintData)
    .digest('hex');
}

/**
 * Extract device information from request
 */
export function extractDeviceInfo(req: Request) {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';
  
  // Parse user agent to extract device name (simplified)
  let deviceName = 'Unknown Device';
  if (userAgent.includes('Mobile')) {
    deviceName = 'Mobile Device';
  } else if (userAgent.includes('Tablet')) {
    deviceName = 'Tablet';
  } else if (userAgent.includes('Windows')) {
    deviceName = 'Windows PC';
  } else if (userAgent.includes('Mac')) {
    deviceName = 'Mac';
  } else if (userAgent.includes('Linux')) {
    deviceName = 'Linux PC';
  } else if (userAgent.includes('PostmanRuntime')) {
    deviceName = 'Postman';
  } else if (userAgent.includes('curl')) {
    deviceName = 'cURL';
  }

  return {
    userAgent,
    ipAddress,
    deviceName,
  };
}

/**
 * Get or create device for user
 * This function handles device registration and retrieval
 */
export async function getOrCreateDevice(userId: string, req: Request, customFingerprint?: string) {
  const prisma = getPrismaClient();
  
  // Generate fingerprint
  const fingerprint = generateDeviceFingerprint(req, customFingerprint);
  
  // Extract device info
  const { userAgent, ipAddress, deviceName } = extractDeviceInfo(req);

  // Try to find existing device
  let device = await prisma.device.findUnique({
    where: {
      userId_fingerprint: {
        userId,
        fingerprint,
      },
    },
  });

  // If device doesn't exist, create it
  if (!device) {
    device = await prisma.device.create({
      data: {
        userId,
        fingerprint,
        name: deviceName,
        userAgent,
        ipAddress,
        isTrusted: false, // New devices are untrusted by default
      },
    });
  } else {
    // Update last used and potentially IP/user agent if changed
    device = await prisma.device.update({
      where: { id: device.id },
      data: {
        ipAddress,
        userAgent,
        lastUsedAt: new Date(),
      },
    });
  }

  return device;
}

export async function enrollCliDevice(
  deviceId: string,
  data: {
    cliPublicKey: string;
    cliLabel?: string;
    hardwareFingerprint: string;
  },
) {
  const prisma = getPrismaClient();

  return prisma.device.update({
    where: { id: deviceId },
    data: {
      clientType: "CLI",
      publicKey: data.cliPublicKey,
      hardwareFingerprint: data.hardwareFingerprint,
      name: data.cliLabel || "Official CLI",
      isTrusted: true,
      enrolledAt: new Date(),
      trustedAt: new Date(),
    },
  });
}

export async function registerRequestNonce(deviceId: string, nonce: string, expiresAt: Date) {
  const prisma = getPrismaClient();

  try {
    await prisma.cliRequestNonce.create({
      data: {
        deviceId,
        nonce,
        expiresAt,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cleanupExpiredCliNonces(deviceId: string) {
  const prisma = getPrismaClient();
  await prisma.cliRequestNonce.deleteMany({
    where: {
      deviceId,
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}

export async function finalizeDeviceEnrollment(
  device: {
    id: string;
    clientType: "BROWSER" | "CLI";
    isTrusted: boolean;
  },
  cliEnrollment?: CliEnrollmentInput,
) {
  if (
    cliEnrollment?.clientType === "CLI" &&
    cliEnrollment.cliPublicKey &&
    cliEnrollment.hardwareFingerprint
  ) {
    return enrollCliDevice(device.id, {
      cliPublicKey: cliEnrollment.cliPublicKey,
      cliLabel: cliEnrollment.cliLabel,
      hardwareFingerprint: cliEnrollment.hardwareFingerprint,
    });
  }

  return device;
}

/**
 * Create session for user and device
 */
export async function createSession(
  userId: string,
  deviceId: string,
  refreshToken: string,
  expiresAt: Date
) {
  const prisma = getPrismaClient();

  return await prisma.session.create({
    data: {
      userId,
      deviceId,
      refreshToken,
      expiresAt,
      isValid: true,
    },
  });
}
