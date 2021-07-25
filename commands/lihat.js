const admin = require("../firebase");
const check3 = require("../check3");

module.exports = {
	name: "lihat",
	description:
		"Perintah untuk melihat jadwal, daftar kelas dan daftar mata kuliah.\n` pr lihat `",
	type: "all",
	async execute(message, args, instanceId) {
		message.channel.send("Memulai pembuatan laporan");
	},
};
