const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

const BRAND_ACCENT_COLOR = 0x00bfff;

function createContainer(content, { actionRows = [] } = {}) {
  const container = new ContainerBuilder()
    .setAccentColor(BRAND_ACCENT_COLOR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

  if (actionRows.length) container.addActionRowComponents(...actionRows);
  return container;
}

function componentV2Payload(container, ephemeral = false) {
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 | (ephemeral ? MessageFlags.Ephemeral : 0)
  };
}

module.exports = { BRAND_ACCENT_COLOR, createContainer, componentV2Payload };
