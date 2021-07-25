const admin = require("../firebase");

module.exports = {
	name: "adminkan",
	description:
		"Perintah untuk memberi role admin kepada _user_ yang di _mention_.\n` pr adminkan `",
	type: "admin",
	async execute(message, args, instanceId) {
		if (!message.member.roles.cache.find((r) => r.name === "Admin")) {
			if (message.author.id != message.guild.ownerID) {
				message.channel.send(
					":worried: Maaf, Anda bukan admin, tidak boleh mengakses perintah"
				);
				return;
			}
		}

		try {
			let member = message.mentions.members.first();

			if (member == undefined) {
				message.channel.send(
					":worried: Maaf, tidak ada _user_ yang di _mention_"
				);
				return;
			}

			let role = message.guild.roles.cache.find((r) => r.name === "Admin");
			if (!role) {
				message.channel.send(
					":worried: Maaf, role Admin tidak ditemukan. Silakan buat role **Admin** terlebih dahulu _(case sensitive)_. Lihat pada buku panduan untuk informasi lebih lanjut."
				);
				return;
			}

			await member.roles.add(role).catch(console.error);
			message.channel.send(
				`Berhasil menjadikan <@!${member.id}> sebagai admin`
			);
		} catch (error) {
			console.log(error);
			message.channel.send(
				`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
			);
		}
	},
};
