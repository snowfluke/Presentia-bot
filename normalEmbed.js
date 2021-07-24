const Discord = require("discord.js");
const {
	botColor,
	botAuthor,
	botYear,
	botAuthorLogo,
} = require("./config.json");

const normalEmbed = (title, description) =>
	new Discord.MessageEmbed()
		.setTitle(title)
		.setDescription(description)
		.setColor(botColor)
		.setFooter(`Dipersembahkan oleh. ${botAuthor} - ${botYear}`, botAuthorLogo);

module.exports = normalEmbed;
