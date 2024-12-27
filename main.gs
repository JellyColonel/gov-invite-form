function onSubmit(e) {
  try {
    console.log("Starting form submission process...");

    // Validate config first
    validateConfig();
    console.log("Config validation passed");

    const messageBuilder = new DiscordMessageBuilder();
    const formResponses = e.response.getItemResponses();
    console.log(`Processing ${formResponses.length} form responses`);

    // Track if we found department question
    let foundDepartment = false;

    // Process form responses
    formResponses.forEach((responseAnswer) => {
      const question = responseAnswer.getItem().getTitle();
      let answer = responseAnswer.getResponse();

      console.log(
        `Processing question: "${question}" with answer: "${answer}"`
      );

      // Handle Discord ID formatting
      if (question.includes(CONFIG.form.discordIdIdentifier)) {
        answer = `<@${answer}>`;
        console.log(`Formatted Discord ID as: ${answer}`);
      }

      // Handle department selection and role mentions
      if (question.includes(CONFIG.form.multipleChoiceQuestionName)) {
        foundDepartment = true;
        console.log(`Found department selection: ${answer}`);
        messageBuilder.addMentionsByRole(answer);
      }

      messageBuilder.addField(question, answer);
    });

    if (!foundDepartment) {
      console.log("Warning: No department question found in form responses");
    }

    // Build and log the payload
    const payload = messageBuilder.buildPayload();
    console.log("Built payload:", JSON.stringify(payload, null, 2));

    // Send to Discord
    const options = {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      muteHttpExceptions: true,
      payload: JSON.stringify(payload),
    };

    console.log("Sending request to Discord...");
    const webhookResponse = UrlFetchApp.fetch(
      CONFIG.discord.webhookUrl,
      options
    );

    const responseCode = webhookResponse.getResponseCode();
    console.log(`Discord response code: ${responseCode}`);

    if (responseCode !== 204) {
      const responseContent = webhookResponse.getContentText();
      console.log(`Discord error response: ${responseContent}`);
      throw new Error(
        `Discord webhook failed: Status ${responseCode}, Response: ${responseContent}`
      );
    }

    console.log("Successfully sent to Discord!");
  } catch (error) {
    console.error("Detailed error in onSubmit:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}
