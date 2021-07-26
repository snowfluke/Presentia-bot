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
					"Laporan per mata kuliah hanya boleh dijalankan di dalam channel mata kuliah yang bersangkutan dan hanya akan mengeluarkan laporan absensi untuk pertemuan terakhir."
				);

			message.channel.send(cmdEmbedLaporan);
			return;
		}

		message.channel.send("Mempersiapkan laporan...");
		const mhsRef = admin.firestore().collection("mahasiswa");
		const absentRef = admin.firestore().collection("absent");

		const generateLaporan = (pesanFile, namaFile, dataFile) => {
			const workbook = XLSX.utils.book_new();
			const filename = namaFile.substring(0, 30);
			const dataSheet = XLSX.utils.json_to_sheet(dataFile);
			XLSX.utils.book_append_sheet(
				workbook,
				dataSheet,
				filename.replace("/", "")
			);
			const f = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

			wadah.send(`Laporan ${pesanFile} <@!${message.author.id}>`);
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
						NIM: data.uniqueId,
						Nama: data.name,
						Kelas: data.kelas,
					};

					listMatkul.forEach((el) => {
						let stat = {
							H: data[el].filter((el) => el == "H").length,
							S: data[el].filter((el) => el[0] == "S").length,
							I: data[el].filter((el) => el[0] == "I").length,
							A: matkulData[el].length - data[el].filter((el) => true).length,
						};

						let kehadiranString = `H:${stat.H} - S:${stat.S} - I:${stat.I} - A:${stat.A} `;
						tempObj[el] = kehadiranString;
					});

					obj.push(tempObj);
				});

				let name = "Laporan_" + new Date().toLocaleDateString("id");
				name = name.split("/").join("_");

				generateLaporan(`kelas ${kelas}`, name, obj);

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

			let kelas = message.channel.parent.name;

			try {
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
				const currentMatkul = matkulData[matkul];

				const dataNya = await dataPerKelas.docs
					.map((doc) => doc.data())
					.sort((a, b) => a.name - b.name);

				const obj = [];

				dataNya.forEach((data, id) => {
					let tempObj = {
						No: id + 1,
						NIM: data.uniqueId,
						Nama: data.name,
						Kelas: data.kelas,
						Matkul: matkul,
						H: "",
						I: "",
						S: "",
						A: "",
						"Bukti Pendukung": "",
					};

					let lastMeetIndex = currentMatkul.length - 1;
					let statRef = data[matkul][lastMeetIndex];

					if (!statRef) {
						tempObj["A"] = 1;
					} else {
						tempObj[statRef] = "1";
					}

					if (statRef?.length > 1) {
						tempObj["Bukti Pendukung"] = statRef.split(":")[1];
					}
					obj.push(tempObj);
				});

				let matkulName = matkul.split(" ").join("_");
				let kelasName = kelas.split(" ").join("_");
				let name =
					"Laporan_matkul_" +
					matkulName +
					kelasName +
					new Date().toLocaleDateString("id");
				name = name.split("/").join("_");

				generateLaporan(`mata kuliah ${matkul}, kelas ${kelas}`, name, obj);

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
