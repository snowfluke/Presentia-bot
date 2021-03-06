const admin = require("../firebase");
const check3 = require("../check3");
const XLSX = require("xlsx");
const exampleEmbed = require("../exampleEmbed");
const cmdEmbed = require("../cmdEmbed");
const { botName } = require("../config.json");

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
			return;
		}

		const status = await check3(instanceId);
		if (!status.status) {
			message.channel.send(status.data);
			return;
		}

		if (args.length == 0) {
			const cmdEmbedLaporan = cmdEmbed(
				"Laporan",
				botName +
					" akan membuatkan laporan dalam bentuk file excel (.xlsx). Selain itu mengirimkan statistik absensi mahasiswa per minggu pukul 20.00 dan per bulan tanggal 30 pukul 20.00"
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

		message.channel.send(`Mempersiapkan laporan di channel <#${wadah.id}>`);
		const mhsRef = admin.firestore().collection("mahasiswa");
		const absentRef = admin.firestore().collection("absent");

		const generateLaporan = (
			pesanFile,
			namaFile,
			dataFile,
			multiple = false
		) => {
			if (!multiple) {
				const workbook = XLSX.utils.book_new();
				const filename = namaFile.substring(0, 30);
				const dataSheet = XLSX.utils.json_to_sheet(dataFile);
				XLSX.utils.book_append_sheet(
					workbook,
					dataSheet,
					filename.replace("/", "")
				);
				const f = XLSX.write(workbook, {
					type: "buffer",
					bookType: "xlsx",
				});

				wadah.send(`<@!${message.author.id}> Laporan ${pesanFile}.`);
				wadah.send({
					files: [
						{
							attachment: f,
							name: `${namaFile}.xlsx`,
						},
					],
				});
				return;
			}

			const wb = XLSX.utils.book_new();
			dataFile.forEach((el, id) => {
				let sheetname = el.kelas.substring(0, 30);
				let ws = XLSX.utils.json_to_sheet(el.obj);
				XLSX.utils.book_append_sheet(
					wb,
					ws,
					sheetname.replace("/", "")
				);
			});

			const f = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
			let d = new Date().toLocaleDateString("id");
			d = d.split("/").join("_");

			wadah.send(`<@!${message.author.id}> Laporan lengkap semua kelas.`);
			wadah.send({
				files: [
					{
						attachment: f,
						name: `Laporan_Lengkap_${d}.xlsx`,
					},
				],
			});
			return;
		};

		const getDataLaporan = async (kelas) => {
			const snapKelas = await mhsRef.doc(instanceId).get();
			const data = snapKelas.data();
			let checker = data.kelas.map((el) => el.toLowerCase());

			if (!checker.includes(kelas.toLowerCase())) {
				message.channel.send(
					`:worried: Maaf, kelas ${kelas} tidak ditemukan`
				);
				return { empty: true };
			}

			let indexKelas = checker.indexOf(kelas.toLowerCase());
			kelas = data.kelas[indexKelas];

			const dataPerKelas = await mhsRef
				.doc(instanceId)
				.collection("mhs")
				.where("kelas", "==", kelas)
				.get();

			if (dataPerKelas.docs.length == 0) {
				message.channel.send(
					`:worried: Maaf, data kelas **${kelas}** tidak ditemukan`
				);
				return { empty: true };
			}

			const matkulSnap = await absentRef
				.doc(instanceId)
				.collection(kelas)
				.doc("absensi")
				.get();

			if (!matkulSnap.exists) {
				message.channel.send(
					`:worried: Maaf, data absensi tidak ditemukan`
				);
				return { empty: true };
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
						A:
							matkulData[el].length -
							data[el].filter((el) => true).length,
					};

					let kehadiranString = `H:${stat.H} - S:${stat.S} - I:${stat.I} - A:${stat.A} `;
					tempObj[el] = kehadiranString;
				});

				obj.push(tempObj);
			});

			let name =
				"Laporan_" + kelas + "_" + new Date().toLocaleDateString("id");
			name = name.split("/").join("_");
			return { name: name, obj: obj, kelas: kelas };
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
				const lap = await getDataLaporan(kelas);
				if (lap.empty) return;

				generateLaporan(`kelas ${lap.kelas}`, lap.name, lap.obj);

				return;
			} catch (error) {
				console.log(error);
				message.channel.send(
					`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
				);
				let user = message.client.users.cache.get("607753400137940992");
				if (!user) return;
				user.send(`Terjadi error ${error.message}`);
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
					message.channel.send(
						`:worried: Maaf, data kelas **${kelas}** tidak ditemukan`
					);
					return;
				}

				const matkulSnap = await absentRef
					.doc(instanceId)
					.collection(kelas)
					.doc("absensi")
					.get();

				if (!matkulSnap.exists) {
					message.channel.send(
						`:worried: Maaf, data absensi untuk kelas ${kelas} tidak ditemukan`
					);
					return;
				}

				const matkulData = matkulSnap.data();
				const currentMatkul = matkulData[matkul];

				if (currentMatkul.length == 0) {
					message.channel.send(
						`:worried: Maaf, belum terdapat pertemuan di mata kuliah ${matkul}`
					);
					return;
				}

				const dataNya = await dataPerKelas.docs
					.map((doc) => doc.data())
					.sort((a, b) => a.name - b.name);

				const obj = [];

				dataNya.forEach((data, id) => {
					let lastMeetIndex = currentMatkul.length - 1;
					let tempObj = {
						No: id + 1,
						NIM: data.uniqueId,
						Nama: data.name,
						Kelas: data.kelas,
						Matkul: matkul,
						Tanggal: currentMatkul[lastMeetIndex],
						H: "",
						I: "",
						S: "",
						A: "",
						"Bukti Pendukung": "",
					};

					let statRef = data[matkul][lastMeetIndex];

					if (!statRef) {
						tempObj["A"] = 1;
					} else {
						tempObj[statRef[0]] = 1;
						if (statRef.length > 1) {
							tempObj["Bukti Pendukung"] = statRef.split(":")[1];
						}
					}

					obj.push(tempObj);
				});

				let matkulName = matkul.split(" ").join("_");
				let kelasName = kelas.split(" ").join("_");
				let name =
					"Laporan_" +
					matkulName +
					kelasName +
					new Date().toLocaleDateString("id");
				name = name.split("/").join("_");

				generateLaporan(
					`mata kuliah ${matkul}, kelas ${kelas}`,
					name,
					obj
				);

				return;
			} catch (error) {
				console.log(error);
				message.channel.send(
					`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
				);
				let user = message.client.users.cache.get("607753400137940992");
				if (!user) return;
				user.send(`Terjadi error ${error.message}`);
			}
		};

		const execLaporMhs = async () => {
			if (args.length != 2) {
				const exampleEmbedMhs = exampleEmbed(
					"pr laporan mhs <NIM>",
					"pr laporan mhs 195540001",
					"Masing-masing"
				);
				message.channel.send(exampleEmbedMhs);
				return;
			}

			const NIM = args[1];

			try {
				const mhsSnap = await mhsRef
					.doc(instanceId)
					.collection("mhs")
					.doc(NIM)
					.get();

				if (!mhsSnap.exists) {
					message.channel.send(
						`:worried: Maaf, mahasiswa dengan NIM ${NIM} tidak ditemukan`
					);
					return;
				}

				const mhs = mhsSnap.data();
				let kelas = mhs.kelas;

				const matkulSnap = await absentRef
					.doc(instanceId)
					.collection(kelas)
					.doc("absensi")
					.get();

				if (!matkulSnap.exists) {
					message.channel.send(
						`:worried: Maaf, data absensi tidak ditemukan`
					);
					return;
				}

				const matkulData = matkulSnap.data();
				const obj = [];

				Object.keys(matkulData).forEach((el, id) => {
					let tempData = {
						NIM: "",
						Nama: "",
						Kelas: "",
						Matkul: "",
						H: "",
						S: "",
						I: "",
						A: "",
					};

					if (id == 0) {
						tempData.NIM = mhs.uniqueId;
						tempData.Nama = mhs.name;
						tempData.Kelas = mhs.kelas;
					}

					tempData.Matkul = el;
					let stat = {
						H: mhs[el].filter((el) => el == "H").length,
						S: mhs[el].filter((el) => el[0] == "S").length,
						I: mhs[el].filter((el) => el[0] == "I").length,
						A:
							matkulData[el].length -
							mhs[el].filter((el) => true).length,
					};

					tempData.H = stat.H;
					tempData.S = stat.S;
					tempData.I = stat.I;
					tempData.A = stat.A;

					obj.push(tempData);
				});

				let name =
					"Laporan_" + NIM + new Date().toLocaleDateString("id");
				name = name.split("/").join("_");

				generateLaporan(`mahasiswa ${mhs.name}`, name, obj);
				return;
			} catch (error) {
				console.log(error);
				message.channel.send(
					`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
				);
				let user = message.client.users.cache.get("607753400137940992");
				if (!user) return;
				user.send(`Terjadi error ${error.message}`);
			}
		};

		const execLaporSemua = async () => {
			try {
				const snapKelas = await mhsRef.doc(instanceId).get();
				const data = snapKelas.data();

				let obj = [];

				for (let i = 0; i < data.kelas.length; i++) {
					let datas = await getDataLaporan(data.kelas[i]);

					if (datas.empty) return;

					obj.push(datas);
				}

				if (obj.length == 0) return;
				generateLaporan(``, ``, obj, true);

				return;
			} catch (error) {
				console.log(error);
				message.channel.send(
					`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
				);
				let user = message.client.users.cache.get("607753400137940992");
				if (!user) return;
				user.send(`Terjadi error ${error.message}`);
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
