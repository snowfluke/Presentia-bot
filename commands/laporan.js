const admin = require("../firebase");
const check3 = require("../check3");
const XLSX = require("xlsx");
const exampleEmbed = require("../exampleEmbed");
const cmdEmbed = require("../cmdEmbed");

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

		const status = await check3(instanceId);
		if (!status.status) {
			message.channel.send(status.data);
			return;
		}

		if (args.length == 0) {
			const cmdEmbedLaporan = cmdEmbed(
				"Laporan",
				"Presentia akan membuatkan laporan dalam bentuk file excel (.xlsx). Selain itu mengirimkan statistik absensi mahasiswa per minggu pukul 20.00 dan per bulan tanggal 30 pukul 20.00"
			)
				.addField("1. Laporan per kelas", ` pr laporan kelas `)
				.addField("2. Laporan per mata kuliah", ` pr laporan matkul `)
				.addField("3. Laporan per mahasiswa", ` pr laporan mhs `)
				.addField("4. Semua laporan", ` pr laporan semua `)
				.addField(
					"Perhatian",
					"Laporan per mata kuliah hanya boleh dijalankan di dalam channel mata kuliah yang bersangkutan."
				);

			message.channel.send(cmdEmbedLaporan);
			return;
		}

		const mhsRef = admin.firestore().collection("mahasiswa");
		const absentRef = admin.firestore().collection("absent");
		const generateLaporan = (pesanFile, namaFile, dataFile) => {
			const workbook = XLSX.utils.book_new();
			const filename = namaFile;
			const dataSheet = XLSX.utils.json_to_sheet(dataFile);
			XLSX.utils.book_append_sheet(
				workbook,
				dataSheet,
				filename.replace("/", "")
			);
			const f = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

			wadah.send(`Mengirimkan laporan ${pesanFile} <@!${message.author.id}>`);
			wadah.send({
				files: [
					{
						attachment: f,
						name: `${namaFile}.xlsx`,
					},
				],
			});
		};

		const execLaporKelas = async () => {
			if (args.length <= 1 || args.length >= 5) {
				const exampleEmbedKelas = exampleEmbed(
					"pr laporan kelas <kelas>",
					"pr laporan kelas TIA",
					"Masing-masing"
				);
				message.channel.send(exampleEmbedKelas);
				return;
			}
			let kelas = args.slice(1).join(" ");
			try {
				message.channel.send("Mempersiapkan laporan...");

				const snapKelas = await mhsRef.doc(instanceId).get();
				const data = snapKelas.data();
				let checker = data.kelas.map((el) => el.toLowerCase());

				if (!checker.includes(kelas.toLowerCase())) {
					message.channel.send(
						`:worried: Maaf, kelas ${kelas} tidak ditemukan`
					);
					return;
				}

				let indexKelas = checker.indexOf(kelas.toLowerCase());
				kelas = data.kelas[indexKelas];

				const dataPerKelas = await mhsRef
					.doc(instanceId)
					.collection("mhs")
					.where("kelas", "==", kelas)
					.get();

				if (dataPerKelas.docs.length == 0) {
					message.channel.send(`:worried: Maaf, data kelas tidak ditemukan`);
					return;
				}

				const matkulSnap = await absentRef
					.doc(instanceId)
					.collection(kelas)
					.doc("absensi")
					.get();

				if (!matkulSnap.exists) {
					message.channel.send(`:worried: Maaf, data absensi tidak ditemukan`);
					return;
				}

				const matkulData = matkulSnap.data();
				const listMatkul = Object.keys(matkulData);

				const obj = [];
				const dataNya = await dataPerKelas.docs
					.map((doc) => doc.data())
					.sort((a, b) => a.name - b.name);
				dataNya.forEach((data, id) => {
					let tempObj = {
						No: id + 1,
						Nama: data.name,
					};

					listMatkul.forEach((el) => {
						tempObj[el] = "";
					});

					obj.push(tempObj);
				});

				let name = "Laporan_" + new Date().toLocaleDateString("id");
				name = name.split("/").join("_");

				generateLaporan(kelas, name, obj);

				return;
			} catch (error) {
				console.log(error);
				message.channel.send(
					`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
				);
			}
		};

		const execLaporMatkul = async () => {
			let matkul = message.channel.name;
			if (matkul.length >= 4) {
				matkul = matkul
					.toLowerCase()
					.split("-")
					.slice(0, 6)
					.map((e) =>
						e.length >= 3
							? e[0].toUpperCase() + e.substring(1)
							: e.toUpperCase()
					)
					.join(" ")
					.substring(0, 50);
			} else {
				matkul = matkul.split("-").join(" ").toUpperCase();
			}

			try {
				message.channel.send("Mempersiapkan laporan...");
				return;
			} catch (error) {
				console.log(error);
				message.channel.send(
					`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
				);
			}
		};

		const execLaporMhs = async () => {
			if (args.length <= 1 || args.length >= 5) {
				const exampleEmbedMhs = exampleEmbed(
					"pr laporan mhs <NIM>",
					"pr laporan mhs 195540001",
					"Masing-masing"
				);
				message.channel.send(exampleEmbedMhs);
				return;
			}

			try {
				message.channel.send("Mempersiapkan laporan...");
				return;
			} catch (error) {
				console.log(error);
				message.channel.send(
					`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
				);
			}
		};

		const execLaporSemua = async () => {
			try {
				message.channel.send("Mempersiapkan laporan...");
				return;
			} catch (error) {
				console.log(error);
				message.channel.send(
					`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
				);
			}
		};

		switch (args[0]) {
			case "kelas":
				execLaporKelas();
				break;
			case "matkul":
				execLaporMatkul();
				break;
			case "mhs":
				execLaporMhs();
				break;
			case "semua":
				execLaporSemua();
				break;
			default:
				message.channel.send(
					":worried: Maaf, perintah tidak dikenali. Silakan lihat bantuan"
				);
				break;
		}
	},
};
