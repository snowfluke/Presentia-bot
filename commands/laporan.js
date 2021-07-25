const admin = require("../firebase");
const check3 = require("../check3");

module.exports = {
	name: "laporan",
	description:
		"Perintah untuk menampilkan laporan absensi (dalam format file excel).\n` pr laporan `",
	type: "all",
	async execute(message, args, instanceId) {
		if (
			!message.member.roles.cache.find(
				(r) => r.name === "Admin" || r.name === "Dosen"
			)
		) {
			message.channel.send(
				":worried: Maaf, Anda bukan Dosen maupun Admin, tidak boleh mengakses perintah"
			);
			return;
		}

		const wadah = message.guild.channels.cache.find(
			(channel) => channel.name === "laporan"
		);

		if (!wadah) {
			message.channel.send(
				":worried: Maaf, channel **laporan** tidak ditemukan, silakan tanyakan pada admin untuk membuat channel laporan."
			);
		}
		try {
			wadah.channel.send("Test mengirim di channel laporan");
		} catch (error) {
			console.log(error);
			message.channel.send(
				":x: Terjadi kesalahan, mohon coba beberapa saat lagi"
			);
		}
	},
};
