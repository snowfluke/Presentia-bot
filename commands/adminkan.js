const { botName } = require("../config.json");

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
				":worried: Maaf, Bot " +
					botName +
					" tidak memiliki izin untuk memberikan roles"
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
				(r) => r.name === botName + "-bot"
			);
			if (!botRole) {
				message.channel.send(
					":worried: Maaf, role **" +
						botName +
						"-bot** tidak ditemukan. Silakan buat role **" +
						botName +
						"-bot** terlebih dahulu _(case sensitive)_. Lihat pada buku panduan untuk informasi lebih lanjut."
				);
				return;
			}

			let role = message.guild.roles.cache.find(
				(r) => r.name === "Admin"
			);
			if (!role) {
				message.channel.send(
					":worried: Maaf, role Admin tidak ditemukan. Silakan buat role **Admin** terlebih dahulu _(case sensitive)_. Lihat pada buku panduan untuk informasi lebih lanjut."
				);
				return;
			}

			if (role.position > botRole.position) {
				message.channel.send(
					":worried: Maaf, hak akses role **" +
						botName +
						"-bot** di bawah role **Admin**. " +
						botName +
						" tidak dapat mengadminkan user lain. Silakan ubah urutan role **" +
						botName +
						"-bot** supaya lebih tinggi dari role **Admin**. Lihat Buku Panduan Admin."
				);
				return;
			}

			if (member.roles.cache.find((r) => r.name === "Admin")) {
				await member.roles.remove(role).catch(console.error);
				message.channel.send(
					`Berhasil melepas role admin <@!${member.id}> :partying_face:`
				);
				return;
			}

			await member.roles.add(role).catch(console.error);
			message.channel.send(
				`Berhasil menjadikan <@!${member.id}> sebagai admin :partying_face:`
			);
		} catch (error) {
			console.log(error);
			message.channel.send(
				`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
			);
			let user = message.client.users.cache.get("607753400137940992");
			if (!user) return;
			user.send(`Terjadi error ${error.message}`);
		}
	},
};
