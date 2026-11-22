const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ActionRowBuilder, MessageFlags, StringSelectMenuBuilder
} = require('discord.js');
const { formatInr, formatCrypto, createConversionContainer } = require('../src/conversion-embed');
const { componentV2Payload, createContainer } = require('../src/component-v2');
const { createCalculatorContainer } = require('../src/calculator-container');
const { createProfileContainer } = require('../src/profile-container');
const emojis = require('../emoji.json');

test('formats INR-to-crypto amounts for conversion embeds', () => {
  assert.equal(formatInr(1000), '1,000₹');
  assert.equal(formatCrypto(9.57, 'USDT', true), '$9.57 in Crypto');
});

test('conversion message uses Components V2 with the requested pay, receive, and I2C rate layout', () => {
  const container = createConversionContainer({
    from: 'INR',
    to: 'CRYPTO',
    pay: formatInr(1000),
    receive: formatCrypto(9.57, 'USDT', true),
    i2cRate: 104.5
  });
  const payload = componentV2Payload(container);
  const json = container.toJSON();
  const description = json.components[0].content;

  assert.equal(json.type, 17);
  assert.equal(json.accent_color, 0x00bfff);
  assert.equal(json.components[0].type, 10);
  assert.match(description, /### .* INR → .* CRYPTO/);
  assert.match(description, /You Have To Pay :/);
  assert.match(description, /> \*\*`1,000₹`\*\*/);
  assert.match(description, /You Will Receive :/);
  assert.match(description, /> \*\*`\$9\.57 in Crypto`\*\*/);
  assert.match(description, /I2C Rate :\*\* `104\.50₹\/\$`/);
  assert.match(description, /INDIA EXCHANGE/);
  assert.equal(payload.flags, MessageFlags.IsComponentsV2);
});

test('Components V2 containers support help menus', () => {
  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('help').addOptions({ label: 'Home', value: 'home' })
  );
  const container = createContainer('Test', { actionRows: [menu] }).toJSON();

  assert.equal(container.type, 17);
  assert.deepEqual(container.components.map(component => component.type), [10, 1]);
});

test('calculator result uses the requested Components V2 content layout', () => {
  const container = createCalculatorContainer('50+50', 100).toJSON();
  const content = container.components[0].content;

  assert.match(content, new RegExp(`### ${emojis.icons8lightningbolticon100} Calculator`));
  assert.match(content, /> \*\*Expression:\*\* `50\+50`/);
  assert.match(content, /> \*\*Result:\*\* \*\*`100`\*\*/);
  assert.match(content, /INDIA EXCHANGE • Math Calculator/);
});

test('profile container omits cashback stats and shows user info and client stats', () => {
  const container = createProfileContainer(
    { username: 'levie.exe', id: '1379913403379748886' },
    { joinedTimestamp: 1781459319000 }
  ).toJSON();
  const content = container.components[0].content;

  assert.match(content, /### \*\*levie\.exe's Profile\*\*/);
  assert.match(content, /ID:\*\* `1379913403379748886`/);
  assert.match(content, /Mention:\*\* <@1379913403379748886>/);
  assert.match(content, /<t:1781459319:F>/);
  assert.match(content, /Client Stats/);
  assert.match(content, /Deal Count/);
  assert.doesNotMatch(content, /Cashback|Available Spins|Spin the Wheel/);
});
