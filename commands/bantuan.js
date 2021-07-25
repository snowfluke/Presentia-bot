// * Import modules
const fs = require("fs");

// * Import config file
const { botPrefix } = require("../config.json");

// * Import command file from commands folder
const commandFiles = fs
	.readdirSync("./commands")
	.filter((file) => file.endsWith(".js"));

const cmdEmbed = require("../cmdEmbed");

module.exports = {
	name: "bantuan",
	type: "all",
	description: "Perintah untuk menampilkan menu bantuan.\n` pr bantuan `",
	async execute(message, args) {
		// parameter:
		// 1. message: message object
		// 2. args: admin/dosen

		if (args.length == 0 || args.length > 1) {
			const cmdEmbedBantuan = cmdEmbed(
				"Bantuan",
				"Penjelasan lebih mendetail tersedia di buku panduan: http://presentia.stmikkomputama.ac.id/#panduan"
			)
				.addField("1. Bantuan Admin", "` pr bantuan admin `")
				.addField("2. Bantuan Dosen", "` pr bantuan dosen `")
				.addField(
					"Hubungi Pengembang",
					"Jika masih terdapat kesulitan, pertanyaan, saran maupun kritikan. Dapat langsung menghubungi kami atau mengundang kami untuk masuk ke dalam server.\nhttps://discord.com/channels/@me/786089341981294602"
				);
			return message.channel.send(cmdEmbedBantuan);
		}

		const tipe = args[0];

		const helpEmbed = cmdEmbed(
			`Bantuan Presentia [${args}]`,
			`Daftar perintah yang dapat digunakan oleh ${tipe}`
		).addField("Awalan", `\` ${botPrefix}<perintah> \``);

		let index = 1;

		// * Loop the command file
		for (const com of commandFiles) {
			const cmd = require(`./${com}`);

			// * Filter based on tipe & all
			if (cmd.type == tipe || cmd.type == "all") {
				helpEmbed.addField(`${index}. ${cmd.name}`, cmd.description);
				index++;
			}
		}

		message.channel.send(helpEmbed);
	},
};
