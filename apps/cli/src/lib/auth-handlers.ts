import * as authStore from "./auth-store.js";
import { abort, renderData, requireAuth } from "./command-helpers.js";
import { ensureCliDevice } from "./cli-device.js";
import { promptInput, promptPassword } from "./prompts.js";
import * as sdk from "./sdk.js";
import * as ui from "./ui.js";

export interface LoginOptions {
  server?: string;
  email?: string;
  password?: string;
  mfaToken?: string;
}

interface MfaApiError {
  statusCode?: number;
  details?: { error?: { code?: string } };
}

export async function handleLogin(opts: LoginOptions): Promise<void> {
  ui.newline();
  if (opts.server) {
    authStore.setServerUrl(opts.server);
  }

  const email =
    opts.email ||
    (await promptInput(
      {
        message: "Email:",
        validate: (value: string) => (value.includes("@") ? true : "Enter a valid email"),
      },
      "Email is required in non-interactive mode.",
    ));
  const password =
    opts.password ||
    (await promptPassword(
      { message: "Password:" },
      "Password is required in non-interactive mode.",
    ));

  const cliDevice = ensureCliDevice();
  const loginPayload = {
    email,
    password,
    mfaToken: opts.mfaToken,
    deviceFingerprint: cliDevice.hardwareFingerprint,
    clientType: "CLI" as const,
    cliPublicKey: cliDevice.publicKey,
    cliLabel: cliDevice.label,
    hardwareFingerprint: cliDevice.hardwareFingerprint,
  };

  let result: sdk.LoginResult;
  try {
    result = await sdk.login(loginPayload);
  } catch (error: unknown) {
    const apiError = error as MfaApiError;
    const code = apiError.details?.error?.code;
    if (apiError.statusCode === 401 && code === "MFA_REQUIRED") {
      const mfaToken =
        opts.mfaToken ||
        (await promptInput(
          {
            message: "MFA token:",
            validate: (value: string) => (/^\d{6}$/.test(value) ? true : "Enter a 6-digit token"),
          },
          "MFA token is required in non-interactive mode.",
        ));
      result = await sdk.login({ ...loginPayload, mfaToken });
    } else {
      throw error;
    }
  }

  authStore.saveTokens(result.tokens);
  authStore.updateCliDevice({
    deviceId: result.device?.id,
  });
  authStore.saveUser({
    id: result.user.id,
    email: result.user.email,
    username: result.user.username,
    name:
      `${result.user.firstName || ""} ${result.user.lastName || ""}`.trim() ||
      result.user.email,
    mfaEnabled: result.user.isTwoFactorEnabled,
  });
  if (result.organization) {
    authStore.saveOrg(result.organization);
  }

  renderData({
    success: true,
    user: result.user,
    organization: result.organization,
    server: authStore.getServerUrl(),
  });

  ui.success(`Logged in as ${result.user.email}`);
  if (result.organization) {
    ui.info(`Organization: ${result.organization.name}`);
  }
  ui.newline();
}

export async function handleLogout(): Promise<void> {
  requireAuth();
  const tokens = authStore.getTokens();
  if (!tokens?.refreshToken) {
    abort("No refresh token found.");
  }

  await sdk.logout(tokens.refreshToken);
  authStore.clearTokens();
  renderData({ success: true });
  ui.success("Logged out");
  ui.newline();
}
