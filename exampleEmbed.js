const Discord = require("discord.js");
const { botColor } = require("./config.json");

const exampleEmbed = (format, perintah, tipe) =>
	new Discord.MessageEmbed()
		.setColor(botColor)
		.addField("Format Perintah", "` " + format + " `")
		.addField("Contoh Perintah", perintah)
		.setFooter(`Pastikan Anda telah membaca Buku Panduan ${tipe}`);

module.exports = exampleEmbed;
