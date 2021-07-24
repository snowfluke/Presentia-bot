module.exports = {
	name: "laporan",
	description:
		"Perintah untuk menampilkan laporan absensi (dalam format file excel).\n` pr laporan `",
	type: "all",
	async execute(message, args, instanceId) {
		message.channel.send("Memulai pembuatan laporan");
	},
};
