import { handleCommand, handleComponent, handleModal, runAdviceCommand } from "./discord-commands";
import { deferredEphemeral, editOriginalInteractionResponse, ephemeral, InteractionResponseType, InteractionType } from "./discord";
import { env } from "./env";

type DiscordInteraction = {
  type: number;
  application_id?: string;
  token?: string;
  data?: {
    name?: string;
    custom_id?: string;
    components?: Array<{ components?: Array<{ custom_id: string; value: string }> }>;
    options?: Array<{ name: string; value?: string | number | boolean }>;
  };
  guild_id?: string;
  channel_id?: string;
  member?: { user?: { id: string; username?: string; global_name?: string } };
  user?: { id: string; username?: string; global_name?: string };
  app_base_url?: string;
};

type InteractionResponse = {
  type: number;
  data?: {
    content?: string;
    flags?: number;
    components?: unknown[];
  };
};

type ScheduleTask = (task: () => Promise<void>) => void;

export async function handleInteraction(interaction: DiscordInteraction, schedule: ScheduleTask = runDetached): Promise<InteractionResponse> {
  try {
    if (interaction.type === InteractionType.Ping) {
      return { type: InteractionResponseType.Pong };
    }

    if (interaction.type === InteractionType.ApplicationCommand) {
      const adviceKind = adviceKindFromCommand(interaction.data?.name);
      if (adviceKind) {
        schedule(async () => {
          await completeDeferredAdvice(interaction, adviceKind);
        });
        return deferredEphemeral();
      }
      return await handleCommand(interaction);
    }

    if (interaction.type === InteractionType.MessageComponent) {
      return await handleComponent(interaction);
    }

    if (interaction.type === InteractionType.ModalSubmit) {
      return await handleModal(interaction);
    }

    return ephemeral("未対応のInteractionです。");
  } catch (error) {
    console.error("Discord interaction failed", errorMessage(error));
    return ephemeral("処理中にエラーが発生しました。時間をおいて再実行してください。");
  }
}

async function completeDeferredAdvice(interaction: DiscordInteraction, kind: "analyze" | "next" | "advice") {
  const applicationId = interaction.application_id ?? env.DISCORD_APPLICATION_ID;
  const token = interaction.token;
  if (!applicationId || !token) return;

  try {
    const content = await runAdviceCommand(interaction, kind);
    await editOriginalInteractionResponse(applicationId, token, content);
  } catch (error) {
    console.error("Deferred advice command failed", errorMessage(error));
    await editOriginalInteractionResponse(
      applicationId,
      token,
      "分析中にエラーが発生しました。時間をおいて再実行してください。"
    );
  }
}

function adviceKindFromCommand(name: string | undefined) {
  if (name === "analyze" || name === "next" || name === "advice") return name;
  return null;
}

function runDetached(task: () => Promise<void>) {
  void task();
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}
