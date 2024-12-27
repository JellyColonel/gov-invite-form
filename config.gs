function initializeConfig() {
  const activeForm = FormApp.getActiveForm();
  const formUrl = activeForm.getPublishedUrl();
  const formTitle = activeForm.getTitle();

  return {
    discord: {
      webhookUrl:
        "https://discord.com/api/webhooks/1322152408859803660/vK1qgtZ-OBdkp6KU_NP9hBAvCYQ6cfF2dpCamCLcUb2xV6jOpWhc7sFpsPcjYdWhN8cZ",
      username: "Секретарь GOV",
      avatarUrl: "",
      embed: {
        title: formTitle,
        color: {
          useRoleColors: false,
          defaultColor: "#7289DA",
        },
        url: formUrl,
        imageUrl: "",
        footerText: "by Brian(ds: jellycolonel)",
        footerIcon:
          "https://cdn.discordapp.com/emojis/1230130771990282250.webp?size=96&quality=lossless",
        showTimestamp: true,
      },
      content: {
        mode: "dynamic",
        staticText: "",
        includeMentions: {
          curator: false,
          head: true,
          depHead: true,
        },
      },
    },
    form: {
      multipleChoiceQuestionName: "Желаемое место работы",
      discordIdIdentifier: "Ваш Discord тег",
    },
  };
}

// Create a global CONFIG object
const CONFIG = initializeConfig();

// Optional: Function to validate config
function validateConfig() {
  const configErrors = [];

  if (!CONFIG.discord.embed.url) {
    configErrors.push("Form URL is not set");
  }

  if (!CONFIG.discord.webhookUrl) {
    configErrors.push("Discord webhook URL is not set");
  }

  // Add content mode validation
  if (!["static", "dynamic"].includes(CONFIG.discord.content.mode)) {
    configErrors.push("Invalid content mode. Must be 'static' or 'dynamic'");
  }

  // Validate static text is present when in static mode
  if (
    CONFIG.discord.content.mode === "static" &&
    !CONFIG.discord.content.staticText
  ) {
    configErrors.push("Static text must be provided when using static mode");
  }

  // Validate mention settings structure when in dynamic mode
  if (CONFIG.discord.content.mode === "dynamic") {
    const requiredSettings = ["curator", "head", "depHead"];
    const { includeMentions } = CONFIG.discord.content;

    requiredSettings.forEach((setting) => {
      if (typeof includeMentions[setting] !== "boolean") {
        configErrors.push(
          `Missing or invalid ${setting} setting in includeMentions`
        );
      }
    });
  }

  if (configErrors.length > 0) {
    throw new Error(`Configuration errors found:\n${configErrors.join("\n")}`);
  }

  return true;
}
