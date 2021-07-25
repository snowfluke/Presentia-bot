const admin = require("../firebase");
const check3 = require("../check3");

module.exports = {
	name: "mhs",
	description: "Perintah untuk mengatur mahasiswa.\n` pr mhs `",
	type: "admin",
	async execute(message, args, instanceId) {
		message.channel.send("Memulai pembuatan laporan");
	},
};
