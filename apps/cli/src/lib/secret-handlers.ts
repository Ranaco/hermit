import { requireByIdOrName } from "./context.js";
import { abort, renderData, requireAuth } from "./command-helpers.js";
import { promptConfirm, promptEditor, promptInput, promptPassword, promptSelect } from "./prompts.js";
import { getAccessibleGroupChildren } from "./resource-resolver.js";
import { isNonInteractive, isPlainMode, isRawMode } from "./runtime.js";
import * as sdk from "./sdk.js";
import { renderSecretListOutput, renderSecretValueOutput } from "./secret-output.js";
import {
  detectSecretValueType,
  findSecretsForQuery,
  readSecretFileValue,
  readSecretStdinValue,
  resolveSecretKeyId,
  resolveSecretScope,
  valueTypes,
  type DeleteSecretParams,
  type GetSecretParams,
  type ListSecretsParams,
  type RevealApiError,
  type SetSecretParams,
  type ValueType,
} from "./secret-utils.js";
import * as ui from "./ui.js";

export {
  parseSecretPathArg,
  resolveSecretKeyId,
  valueTypes,
  type DeleteSecretParams,
  type GetSecretParams,
  type ListSecretsParams,
  type SetSecretParams,
  type ValueType,
} from "./secret-utils.js";

export async function handleSecretList(params: ListSecretsParams): Promise<void> {
  requireAuth();

  const { vault, group } = await resolveSecretScope(params);
  const childGroups = params.search ? [] : await getAccessibleGroupChildren(vault.id, group?.id);
  const secrets = await sdk.getSecrets(vault.id, {
    secretGroupId: group?.id,
    search: params.search,
    cliScope: true,
  });

  renderData({ vault, group, childGroups, secrets });
  renderSecretListOutput(vault, group, childGroups, secrets);
}

export async function handleSecretSet(params: SetSecretParams): Promise<void> {
  requireAuth();

  const { vault, group } = await resolveSecretScope(params);
  const secrets = await sdk.getSecrets(vault.id, { secretGroupId: group?.id, cliScope: true });
  const name =
    params.name ||
    (await promptInput(
      {
        message: "Secret name:",
        validate: (value: string) => (/^[a-zA-Z0-9-_. ]+$/.test(value) ? true : "Invalid secret name"),
      },
      "Secret name is required in non-interactive mode.",
    ));

  const existing = secrets.find((secret) => secret.name.toLowerCase() === name.toLowerCase());

  let value = params.value;
  let inferredType: ValueType | undefined;

  if (value === undefined && params.file) {
    value = readSecretFileValue(params.file);
    inferredType = detectSecretValueType(value);
  }

  if (value === undefined) {
    const stdinValue = await readSecretStdinValue();
    if (stdinValue !== undefined) {
      value = stdinValue;
      inferredType = detectSecretValueType(stdinValue);
    }
  }

  const valueType =
    params.type ||
    inferredType ||
    (isNonInteractive()
      ? "STRING"
      : await promptSelect<ValueType>(
          {
            message: "Secret type:",
            choices: valueTypes.map((type) => ({ name: type, value: type })),
          },
          "Secret type is required in non-interactive mode.",
        ));

  if (value === undefined) {
    if (valueType === "MULTILINE") {
      value = await promptEditor({ message: "Secret value:" }, "Secret value is required in non-interactive mode.");
    } else if (valueType === "BOOLEAN") {
      value = await promptSelect<string>(
        {
          message: "Secret value:",
          choices: [
            { name: "true", value: "true" },
            { name: "false", value: "false" },
          ],
        },
        "Secret value is required in non-interactive mode.",
      );
    } else {
      value = await promptPassword({ message: "Secret value:" }, "Secret value is required in non-interactive mode.");
    }
  }

  let password: string | undefined;
  if (params.password) {
    password = await promptPassword({ message: "Secret password:" }, "Secret password is required in non-interactive mode.");
    const confirmation = await promptPassword(
      { message: "Confirm secret password:" },
      "Secret password confirmation is required in non-interactive mode.",
    );
    if (password !== confirmation) {
      abort("Secret passwords do not match.");
    }
  }

  if (existing) {
    const result = await sdk.updateSecret(existing.id, {
      value,
      valueType,
      description: params.description,
      password,
      secretGroupId: group?.id || null,
    });
    renderData({ secret: result.secret, mode: "updated" });
    ui.success(`Secret "${name}" updated`);
    ui.newline();
    return;
  }

  const keyId = await resolveSecretKeyId(vault.id, params.keyId);
  const result = await sdk.createSecret({
    name,
    value,
    vaultId: vault.id,
    keyId,
    valueType,
    secretGroupId: group?.id,
    password,
    description: params.description,
  });
  renderData({ secret: result.secret, mode: "created" });
  ui.success(`Secret "${name}" created`);
  ui.newline();
}

export async function handleSecretGet(params: GetSecretParams): Promise<void> {
  requireAuth();

  const { vault, group } = await resolveSecretScope(params);
  const secrets = await findSecretsForQuery(vault.id, group?.id, params.query);
  if (secrets.length === 0) {
    abort("No secrets found.");
  }

  let secret = params.query ? requireByIdOrName(secrets, params.query, "secret") : undefined;
  if (!secret) {
    const selected = await promptSelect(
      {
        message: "Select secret:",
        choices: secrets.map((item) => ({ name: item.name, value: item.id })),
      },
      "Secret id or name is required in non-interactive mode.",
    );
    secret = secrets.find((item) => item.id === selected);
  }

  if (!secret) {
    abort(`Secret "${params.query}" not found.`);
  }

  let secretPassword = params.password;
  let vaultPassword = params.vaultPassword;
  let revealed: sdk.SecretRevealResult;

  try {
    revealed = await sdk.revealSecretCli(secret.id, {
      password: secretPassword,
      vaultPassword,
    });
  } catch (error: unknown) {
    const apiError = error as RevealApiError;
    const code = apiError.details?.error?.code;

    if (apiError.statusCode === 403 && code === "SECRET_PASSWORD_REQUIRED") {
      secretPassword = await promptPassword(
        { message: "Secret password:" },
        "Secret password is required in non-interactive mode.",
      );
      revealed = await sdk.revealSecretCli(secret.id, { password: secretPassword });
    } else if (apiError.statusCode === 403 && code === "VAULT_PASSWORD_REQUIRED") {
      vaultPassword = await promptPassword(
        { message: "Vault password:" },
        "Vault password is required in non-interactive mode.",
      );
      revealed = await sdk.revealSecretCli(secret.id, { vaultPassword });
    } else {
      throw error;
    }
  }

  renderData(revealed);
  renderSecretValueOutput(revealed);

  if (params.copy) {
    const clipboardy = await import("clipboardy");
    await clipboardy.default.write(revealed.secret.value);
    if (!isRawMode() && !(isPlainMode() && !process.stdout.isTTY)) {
      ui.info("Value copied to clipboard");
    }
  }

  if (!isRawMode() && !(isPlainMode() && !process.stdout.isTTY)) {
    ui.newline();
  }
}

export async function handleSecretDelete(params: DeleteSecretParams): Promise<void> {
  requireAuth();

  const { vault, group } = await resolveSecretScope(params);
  const secrets = await findSecretsForQuery(vault.id, group?.id, params.query);
  if (secrets.length === 0) {
    abort("No secrets found.");
  }

  let secret = params.query ? requireByIdOrName(secrets, params.query, "secret") : undefined;
  if (!secret) {
    const selected = await promptSelect(
      {
        message: "Select secret:",
        choices: secrets.map((item) => ({ name: item.name, value: item.id })),
      },
      "Secret selection requires interactive mode or an explicit id or name.",
    );
    secret = secrets.find((item) => item.id === selected);
  }

  if (!secret) {
    abort(`Secret "${params.query}" not found.`);
  }

  if (!params.yes) {
    const confirmed = await promptConfirm(
      { message: `Delete secret "${secret.name}"?`, default: false },
      "Use --yes when deleting a secret in non-interactive mode.",
    );
    if (!confirmed) {
      ui.warn("Cancelled");
      ui.newline();
      return;
    }
  }

  await sdk.deleteSecret(secret.id);
  renderData({ success: true, secretId: secret.id });
  ui.success(`Secret "${secret.name}" deleted`);
  ui.newline();
}
