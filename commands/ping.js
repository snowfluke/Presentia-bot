// * Import module
const Discord = require("discord.js");

module.exports = {
	name: "ping",
	type: "all",
	description: "Perintah melakukan ping koneksi.\n` pr ping `",
	async execute(message) {
		// parameter:
		// 1. message: message object

		message.channel.send("Mencoba ping...").then((m) => {
			// * response - request time
			let ping = m.createdTimestamp - message.createdTimestamp;
			let pingEmbed = new Discord.MessageEmbed()
				.setDescription(`Latensi: **${ping} ms**`)
				.setColor("#119DA4");
			m.edit(pingEmbed);
		});
	},
};
