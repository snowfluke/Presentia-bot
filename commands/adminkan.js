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

		if (!message.guild.me.hasPermission("MANAGE_ROLES"))
			return message.channel.send(
				":worried: Maaf, Bot Presentia tidak memiliki izin untuk memberikan roles"
			);

		try {
			let member = message.mentions.members.first();

			if (member == undefined) {
				message.channel.send(
					":worried: Maaf, tidak ada _user_ yang di _mention_"
				);
				return;
			}

			let botRole = message.guild.roles.cache.find(
				(r) => r.name === "Presentia-bot"
			);
			if (!botRole) {
				message.channel.send(
					":worried: Maaf, role **Presenita-bot** tidak ditemukan. Silakan buat role **Presentia-bot** terlebih dahulu _(case sensitive)_. Lihat pada buku panduan untuk informasi lebih lanjut."
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

			if (role.position > botRole.position) {
				message.channel.send(
					":worried: Maaf, hak akses role **Presentia-bot** di bawah role **Admin**. Presentia tidak dapat mengadminkan user lain. Silakan ubah urutan role **Presentia-bot** supaya lebih tinggi dari role **Admin**. Lihat Buku Panduan Admin."
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
