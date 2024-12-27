class DiscordMessageBuilder {
  constructor() {
    this.content =
      CONFIG.discord.content.mode === "static"
        ? CONFIG.discord.content.staticText || ""
        : "";
    this.items = [];
    this.selectedRole = null;
    this.MAX_FIELDS_PER_EMBED = 25;
    this.MAX_EMBEDS_PER_MESSAGE = 10;
    this.MAX_FIELD_VALUE_LENGTH = 1024;
  }

  addMentionsByRole(roleName) {
    const role = ROLES[roleName];
    if (!role) {
      console.warn(`Role ${roleName} not found`);
      // Don't return early - we still want to keep the static content
      this.selectedRole = null;
      return;
    }

    this.selectedRole = role;

    // Only modify content if in dynamic mode
    if (CONFIG.discord.content.mode === "dynamic") {
      const mentions = [];
      const { includeMentions } = CONFIG.discord.content;

      // Add mentions in specific order: Curator -> Head -> Dep.Head
      if (includeMentions.curator && role.curatorRoleId) {
        mentions.push(`<@&${role.curatorRoleId}>`);
      }

      if (includeMentions.head && role.headRoleId) {
        mentions.push(`<@&${role.headRoleId}>`);
      }

      if (includeMentions.depHead && role.depHeadRoleId) {
        mentions.push(`<@&${role.depHeadRoleId}>`);
      }

      this.content = mentions.join(" ") + (mentions.length > 0 ? " " : "");
    }
  }

  addField(question, answer) {
    if (!answer && answer !== 0) return;

    try {
      const value = String(answer).trim();
      if (!value) return;

      // Split value if it exceeds Discord's limit
      if (value.length > this.MAX_FIELD_VALUE_LENGTH) {
        // Split by newlines first to try to keep URLs together
        const parts = value.split("\n");
        let currentPart = "";
        let partNumber = 1;

        parts.forEach((part) => {
          if (
            (currentPart + "\n" + part).length > this.MAX_FIELD_VALUE_LENGTH
          ) {
            if (currentPart) {
              this.items.push({
                name: `${String(question).trim()} (Часть ${partNumber})`,
                value: currentPart,
                inline: false,
              });
              partNumber++;
              currentPart = part;
            } else {
              // Single line is too long, need to split it
              this.items.push({
                name: `${String(question).trim()} (Часть ${partNumber})`,
                value: part.substring(0, this.MAX_FIELD_VALUE_LENGTH),
                inline: false,
              });
              partNumber++;
            }
          } else {
            currentPart = currentPart ? currentPart + "\n" + part : part;
          }
        });

        // Add remaining content
        if (currentPart) {
          this.items.push({
            name: `${String(question).trim()}${
              partNumber > 1 ? ` (Часть ${partNumber})` : ""
            }`,
            value: currentPart,
            inline: false,
          });
        }
      } else {
        this.items.push({
          name: String(question).trim(),
          value: value,
          inline: false,
        });
      }
    } catch (error) {
      console.error(`Error processing field ${question}:`, error);
    }
  }

  getEmbedColor() {
    try {
      if (
        CONFIG.discord.embed.color.useRoleColors &&
        this.selectedRole?.embedColor
      ) {
        return ColorUtils.hexToDecimal(this.selectedRole.embedColor) || 7506394;
      }
      return (
        ColorUtils.hexToDecimal(CONFIG.discord.embed.color.defaultColor) ||
        7506394
      );
    } catch (error) {
      console.error("Error processing color:", error);
      return 7506394;
    }
  }

  createFooter() {
    if (!CONFIG.discord.embed.footerText?.trim()) {
      return undefined;
    }

    const footer = {
      text: CONFIG.discord.embed.footerText.trim(),
    };

    if (CONFIG.discord.embed.footerIcon?.trim()) {
      footer.icon_url = CONFIG.discord.embed.footerIcon.trim();
    }

    return footer;
  }

  createEmbed(fields, isFirst, isLast) {
    const embed = {
      color: this.getEmbedColor(),
      fields: fields,
    };

    if (isFirst) {
      embed.title = CONFIG.discord.embed.title || "Form Submission";
      if (CONFIG.discord.embed.url) {
        embed.url = CONFIG.discord.embed.url;
      }
    }

    if (isLast) {
      const footer = this.createFooter();
      if (footer) {
        embed.footer = footer;
      }

      if (CONFIG.discord.embed.showTimestamp) {
        embed.timestamp = new Date().toISOString();
      }

      if (CONFIG.discord.embed.imageUrl?.trim()) {
        embed.image = {
          url: CONFIG.discord.embed.imageUrl.trim(),
        };
      }
    }

    return embed;
  }

  buildPayload() {
    // Calculate how many fields can fit in total
    const maxTotalFields =
      this.MAX_FIELDS_PER_EMBED * this.MAX_EMBEDS_PER_MESSAGE;

    if (this.items.length > maxTotalFields) {
      console.warn(
        `Too many fields (${this.items.length}). Truncating to ${maxTotalFields} fields.`
      );
      this.items = this.items.slice(0, maxTotalFields);
    }

    const chunks = [];
    for (let i = 0; i < this.items.length; i += this.MAX_FIELDS_PER_EMBED) {
      chunks.push(this.items.slice(i, i + this.MAX_FIELDS_PER_EMBED));
    }

    const embeds = chunks.map((chunk, index) => {
      const isFirst = index === 0;
      const isLast = index === chunks.length - 1;
      return this.createEmbed(chunk, isFirst, isLast);
    });

    const payload = {
      embeds: embeds,
    };

    // Add content only if it's not empty
    if (this.content.trim()) {
      payload.content = this.content.trim();
    }

    // Add username only if it's provided and not empty
    if (CONFIG.discord.username?.trim()) {
      payload.username = CONFIG.discord.username.trim();
    }

    // Add avatar URL only if it's provided and not empty
    if (CONFIG.discord.avatarUrl?.trim()) {
      payload.avatar_url = CONFIG.discord.avatarUrl.trim();
    }

    return payload;
  }
}
