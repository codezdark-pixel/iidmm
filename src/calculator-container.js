const emojis = require('../emoji.json');
const { createContainer } = require('./component-v2');

function createCalculatorContainer(expression, result) {
  return createContainer([
    `### ${emojis.icons8lightningbolticon100} Calculator`,
    `> **Expression:** \`${expression}\``,
    `> **Result:** **\`${result}\`**`,
    `-# ${emojis.india} INDIA EXCHANGE • Math Calculator`
  ].join('\n'));
}

module.exports = { createCalculatorContainer };
