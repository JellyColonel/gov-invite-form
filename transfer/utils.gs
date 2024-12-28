class DiscordMessageBuilder {
  constructor() {
    this.content =
      CONFIG.discord.content.mode === "static"
        ? CONFIG.discord.content.staticText || ""
        : "";
    this.items = [];
    this.departments = new Set(); // Track department names
    this.selectedRoles = []; // Store role objects
    this.MAX_FIELDS_PER_EMBED = 25;
    this.MAX_EMBEDS_PER_MESSAGE = 10;
    this.MAX_FIELD_VALUE_LENGTH = 1024;
  }

  addMentionsByRole(roleName) {
    // Skip if we've already processed this department
    if (this.departments.has(roleName)) {
      console.log(`Department ${roleName} already processed, skipping...`);
      return;
    }

    const role = ROLES[roleName];
    if (!role) {
      console.warn(`Role ${roleName} not found in ROLES configuration`);
      return;
    }

    console.log(`Processing department: ${roleName}`);
    this.departments.add(roleName);
    this.selectedRoles.push({
      name: roleName,
      ...role,
    });

    // Update mentions if in dynamic mode
    if (CONFIG.discord.content.mode === "dynamic") {
      this.updateMentions();
    }
  }

  updateMentions() {
    const mentions = new Set(); // Use Set to automatically handle duplicates
    const { includeMentions } = CONFIG.discord.content;

    console.log(`Updating mentions for ${this.selectedRoles.length} roles`);

    this.selectedRoles.forEach((role) => {
      console.log(`Processing mentions for department: ${role.name}`);

      // Add curator mention if enabled and exists
      if (includeMentions.curator && role.curatorRoleId) {
        mentions.add(`<@&${role.curatorRoleId}>`);
        console.log(
          `Added curator mention for ${role.name}: ${role.curatorRoleId}`
        );
      }

      // Add head mention if enabled and exists
      if (includeMentions.head && role.headRoleId) {
        mentions.add(`<@&${role.headRoleId}>`);
        console.log(`Added head mention for ${role.name}: ${role.headRoleId}`);
      }

      // Add deputy head mention if enabled and exists
      if (includeMentions.depHead && role.depHeadRoleId) {
        mentions.add(`<@&${role.depHeadRoleId}>`);
        console.log(
          `Added deputy head mention for ${role.name}: ${role.depHeadRoleId}`
        );
      }
    });

    // Convert Set to array and join with spaces
    const mentionsArray = Array.from(mentions);
    this.content =
      mentionsArray.join(" ") + (mentionsArray.length > 0 ? " " : "");
    console.log(`Final mentions content: ${this.content}`);
  }

  addField(question, answer) {
    if (!answer && answer !== 0) return;

    try {
      const value = String(answer).trim();
      if (!value) return;

      // Split value if it exceeds Discord's limit
      if (value.length > this.MAX_FIELD_VALUE_LENGTH) {
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
        this.selectedRoles.length > 0
      ) {
        // Use the color of the target department (last selected role)
        const targetRole = this.selectedRoles[this.selectedRoles.length - 1];
        return ColorUtils.hexToDecimal(targetRole.embedColor) || 7506394;
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

    if (this.content.trim()) {
      payload.content = this.content.trim();
    }

    if (CONFIG.discord.username?.trim()) {
      payload.username = CONFIG.discord.username.trim();
    }

    if (CONFIG.discord.avatarUrl?.trim()) {
      payload.avatar_url = CONFIG.discord.avatarUrl.trim();
    }

    return payload;
  }
}
