const { createContainer } = require('./component-v2');
const emojis = require('../emoji.json');

function createProfileContainer(user, member = null, actionRows = []) {
  const joinedTimestamp = member?.joinedTimestamp
    ? Math.floor(member.joinedTimestamp / 1000)
    : null;

  return createContainer([
    `### **${user.username}'s Profile**`,
    '',
    '### **User Info**',
    `> -# **${emojis.tag} ID:** \`${user.id}\``,
    `> -# **${emojis.icons8cutebluecursor100} Mention:** <@${user.id}>`,
    `> -# **${emojis.hourglass} Server Joined:** ${joinedTimestamp ? `<t:${joinedTimestamp}:F>` : 'Unavailable'}`,
    '',
    '### **Client Stats**',
    `> -# **${emojis.icons8cutenote100} Deal Count:** Not tracked`,
    `> -# **${emojis.banknotes} Total Exchanged:** Not tracked`,
    `> -# **${emojis.coins} Average Amount:** Not tracked`,
    `> -# **${emojis.hourglass} Latest Deal:** No deal data available`,
    `-# ${emojis.india} All right's reserved by INDIA EXCHANGE.`
  ].join('\n'), { actionRows });
}

module.exports = { createProfileContainer };
