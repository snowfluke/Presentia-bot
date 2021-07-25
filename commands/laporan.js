const admin = require("../firebase");
const check3 = require("../check3");
const xlsx = require("xlsx");

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

		const data = [
			{ name: "John", city: "Seattle" },
			{ name: "Mike", city: "Los Angeles" },
			{ name: "Zach", city: "New York" },
		];

		try {
			const workbook = XLSX.utils.book_new();
			const filename = "Laporan";
			const dataSheet = XLSX.utils.json_to_sheet(data);
			XLSX.utils.book_append_sheet(
				workbook,
				dataSheet,
				filename.replace("/", "")
			);
			const f = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

			wadah.send(`Test mengirim di channel laporan <@!${message.author.id}>`);
			wadah.send({
				files: [
					{
						attachment: f,
						name: "laporan.xlsx",
					},
				],
			});
		} catch (error) {
			console.log(error);
			message.channel.send(
				":x: Terjadi kesalahan, mohon coba beberapa saat lagi"
			);
		}
	},
};
