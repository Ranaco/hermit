import { Command } from "commander";
import { requireActiveOrganization, requireByIdOrName, resolveOrganization } from "../lib/context.js";
import { abort, renderData, requireAuth, runCommand } from "../lib/command-helpers.js";
import { promptInput, promptSelect } from "../lib/prompts.js";
import * as sdk from "../lib/sdk.js";
import * as ui from "../lib/ui.js";
import { isNonInteractive } from "../lib/runtime.js";

interface TeamScopedOptions {
  org?: string;
}

interface TeamCreateOptions extends TeamScopedOptions {
  name?: string;
  description?: string;
}

interface TeamAddMemberOptions extends TeamScopedOptions {
  user?: string;
}

export const teamCommand = new Command("team").description("Manage teams");

teamCommand
  .command("list")
  .description("List teams in the active organization")
  .option("--org <query>", "Organization name or id")
  .action((opts: TeamScopedOptions) =>
    runCommand(async () => {
      requireAuth();
      const organization = opts.org ? await resolveOrganization(opts.org) : await requireActiveOrganization();
      const teams = await sdk.getTeams(organization.id);
      renderData({ organization, teams });
      if (teams.length === 0) {
        ui.warn("No teams found");
        ui.newline();
        return;
      }
      ui.cards(
        teams.map((team) => ({
          id: team.id,
          name: team.name,
          fields: [
            ...(team.description ? [{ value: team.description, overflow: "wrap" as const }] : []),
            { label: "Members", value: String(team._count?.members || team.members?.length || 0), overflow: "truncate" },
          ],
        })),
      );
    }),
  );

teamCommand
  .command("create")
  .description("Create a team in the active organization")
  .option("--org <query>", "Organization name or id")
  .option("-n, --name <name>", "Team name")
  .option("-d, --description <description>", "Description")
  .action((opts: TeamCreateOptions) =>
    runCommand(async () => {
      requireAuth();
      const organization = opts.org ? await resolveOrganization(opts.org) : await requireActiveOrganization();
      const name =
        opts.name ||
        (await promptInput(
          { message: "Team name:", validate: (value: string) => (value.trim() ? true : "Name is required") },
          "Team name is required in non-interactive mode.",
        ));
      const description =
        opts.description ??
        (!isNonInteractive()
          ? await promptInput({ message: "Description (optional):" }, "")
          : undefined);
      const team = await sdk.createTeam(organization.id, {
        name: name.trim(),
        description: description?.trim() || undefined,
      });
      renderData({ team });
      ui.success(`Team "${team.name}" created`);
      ui.newline();
    }),
  );

teamCommand
  .command("members")
  .description("List members of a team")
  .argument("<teamQuery>", "Team name or id")
  .option("--org <query>", "Organization name or id")
  .action((teamQuery: string, opts: TeamScopedOptions) =>
    runCommand(async () => {
      requireAuth();
      const organization = opts.org ? await resolveOrganization(opts.org) : await requireActiveOrganization();
      const teams = await sdk.getTeams(organization.id);
      const team = requireByIdOrName(teams, teamQuery, "team");
      renderData({ team, members: team.members || [] });
      ui.panel(team.name, (team.members || []).map((member) => ui.kv("User", ui.colors.primary(member.user.email), { overflow: "truncate" })));
      ui.newline();
    }),
  );

teamCommand
  .command("add-member")
  .description("Add a member to a team")
  .argument("<teamQuery>", "Team name or id")
  .option("--org <query>", "Organization name or id")
  .option("--user <userId>", "User id to add")
  .action((teamQuery: string, opts: TeamAddMemberOptions) =>
    runCommand(async () => {
      requireAuth();
      const organization = opts.org ? await resolveOrganization(opts.org) : await requireActiveOrganization();
      const teams = await sdk.getTeams(organization.id);
      const team = requireByIdOrName(teams, teamQuery, "team");
      const organizationDetail = await sdk.getOrganization(organization.id);
      const availableMembers = organizationDetail.members || [];
      if (availableMembers.length === 0) {
        abort("No organization members available to add.");
      }
      const userId: string =
        opts.user ||
        (await promptSelect(
          {
            message: "Select member:",
            choices: availableMembers.map((member) => ({
              name: member.user.email,
              value: member.userId,
            })),
          },
          "User id is required in non-interactive mode.",
        ));
      await sdk.addTeamMember(organization.id, team.id, userId);
      renderData({ success: true, teamId: team.id, userId });
      ui.success("Team member added");
      ui.newline();
    }),
  );

