const admin = require("../firebase");
const check3 = require("../check3");

module.exports = {
	name: "laporan",
	description:
		"Perintah untuk menampilkan laporan absensi (dalam format file excel).\n` pr laporan `",
	type: "all",
	async execute(message, args, instanceId) {
		message.channel.send("Memulai pembuatan laporan");
	},
};
