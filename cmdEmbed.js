const Discord = require("discord.js");
const {
	botName,
	botColor,
	botAuthor,
	botLogo,
	botYear,
	botAuthorLogo,
} = require("./config.json");

const cmdEmbed = (title, description) =>
	new Discord.MessageEmbed()
		.setTitle(`Menu ${title}`)
		.setDescription(description)
		.setAuthor(botName, botLogo)
		.setThumbnail(botLogo)
		.setColor(botColor)
		.setFooter(`Dipersembahkan oleh. ${botAuthor} - ${botYear}`, botAuthorLogo);

module.exports = cmdEmbed;
