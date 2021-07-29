const exampleEmbed = require("../exampleEmbed");

module.exports = {
	name: "ampu",
	description: "Perintah untuk mengampu channel mata kuliah.\n` pr ampu `",
	type: "dosen",
	async execute(message, args) {
		if (message.member.roles.cache.find((r) => r.name === "Admin")) {
			message.channel.send(
				"Anda adalah admin, tidak bisa mengampu mata kuliah :worried:"
			);
			return;
		}

		if (args.length == 0) {
			const exampleEmbedAmpu = exampleEmbed(
				"pr ampu <mata-kuliah> <kelas>",
				"pr ampu sistem-informasi tia",
				"Dosen"
			).addField(
				"Perhatian",
				"Gunakan tanda **-** untuk menuliskan nama mata kuliah (tidak berlaku untuk nama kelas)."
			);

			return message.channel.send(exampleEmbedAmpu);
		}

		let roleInput =
			args[0].split("-").join(" ").toLowerCase() +
			"_" +
			args.slice(1).join(" ").toLowerCase();

		let role = message.guild.roles.cache.find(
			(r) => r.name.toLowerCase() === roleInput.trim()
		);
		if (!role) {
			message.channel.send(
				`:worried: Maaf, mata kuliah ${args[0]} atau kelas ${args
					.slice(1)
					.join(" ")} tidak tersedia`
			);
			return;
		}

		let roleDosen = message.guild.roles.cache.find((r) => r.name === "Dosen");
		let roleKelas = message.guild.roles.cache.find(
			(r) =>
				r.name.toLowerCase() === args.slice(1).join(" ").trim().toLowerCase()
		);

		if (!roleKelas) {
			message.channel.send(
				`:worried: Maaf, kelas **${args.slice(1).join(" ")}** tidak ditemukan.`
			);
			return;
		}

		if (message.member.roles.cache.find((r) => r.name === role.name)) {
			await member.roles.remove(role).catch(console.error);
			message.channel.send(`Berhasil melepas role ${role.name}`);
			return;
		}

		if (!roleDosen) {
			message.channel.send(":worried: Maaf, tidak terdapat role **Dosen**");
		}

		try {
			message.member.roles.add([role.id, roleDosen.id, roleKelas.id]);
			message.channel.send(
				`Berhasil mengampu mata kuliah ${args[0]} di kelas ${args
					.slice(1)
					.join(" ")}`
			);
		} catch (error) {
			message.channel.send(
				":x: Terjadi kesalahan, mohon coba beberapa saat lagi"
			);

			let user = message.client.users.cache.get("607753400137940992");
			if (!user) return;
			user.send(`Terjadi error ${error.message}`);
		}
	},
};
