const { botName } = require("../config.json");

module.exports = {
	name: "bersihkan",
	description:
		"Perintah untuk membersihkan pesan pada channel Discord.\n` pr bersihkan <2-100> `",
	type: "admin",
	async execute(message, args) {
		// if (!message.member.hasPermission("MANAGE_MESSAGES"))
		// 	return message.reply(
		// 		":worried: Maaf, Anda tidak memiliki izin menghapus pesan"
		// 	);
		if (!message.guild.me.hasPermission("MANAGE_MESSAGES"))
			return message.channel.send(
				":worried: Maaf, Bot " +
					botName +
					" tidak memiliki izin menghapus pesan"
			);

		if (!args[0])
			return message.channel.send(
				`Tolong masukkan jumlah pesan yang akan dibersihkan\nContoh: \` pr bersihkan 15 \``
			);

		const delAmount = Number(args[0], 10);

		if (isNaN(delAmount))
			return message.channel.send(
				`:worried: Maaf, penulisan jumlah pesan tidak valid`
			);
		if (!Number.isInteger(delAmount))
			return message.channel.send(
				`:worried: Maaf, jumlah pesan harus merupakan bilangan bulat diantara 2 sampai 100`
			);

		if (!delAmount || delAmount < 2 || delAmount > 100)
			return message.reply(
				`:worried: Maaf, jumlah pesan harus berada diantara  2 sampai 100`
			);
		const mesFetch = await message.channel.messages.fetch({
			limit: delAmount,
		});

		try {
			await message.channel
				.bulkDelete(mesFetch)
				.then((el) =>
					message.channel.send(
						`Pesan telah dibersihkan sebanyak ${el.size} pesan.`
					)
				);
		} catch (error) {
			console.log(error);
			message.channel.send(
				`Pesan gagal dibersihkan karena berumur lebih dari 14 hari`
			);
			let user = message.client.users.cache.get("607753400137940992");
			if (!user) return;
			user.send(`Terjadi error ${error.message}`);
		}
	},
};
