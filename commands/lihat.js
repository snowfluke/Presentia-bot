const admin = require("../firebase");
const check3 = require("../check3");
const exampleEmbed = require("../exampleEmbed");
const normalEmbed = require("../normalEmbed");
const cmdEmbed = require("../cmdEmbed");

module.exports = {
	name: "lihat",
	description:
		"Perintah untuk melihat jadwal, daftar kelas dan daftar mata kuliah.\n` pr lihat `",
	type: "all",
	async execute(message, args, instanceId) {
		const status = await check3(instanceId);
		if (!status.status) {
			message.channel.send(status.data);
			return;
		}

		if (args.length == 0) {
			const cmdEmbedLihat = cmdEmbed(
				"Lihat",
				"Lihat daftar kelas, daftar mata kuliah dan jadwal sebelum Anda melakukan perintah lainnya."
			)
				.addField("1. Melihat Jadwal", ` pr lihat jadwal`)
				.addField("2. Melihat Daftar Kelas", ` pr lihat kelas`)
				.addField("3. Melihat Daftar Mata Kuliah", ` pr lihat matkul`);

			message.channel.send(cmdEmbedLihat);
			return;
		}

		const mhsRef = admin.firestore().collection("mahasiswa");
		const scheduleRef = admin.firestore().collection("schedule");
		const absentRef = admin.firestore().collection("absent");

		const execLihatJadwal = async () => {
			try {
				if (args.length == 1) {
					const exampleEmbedJadwal = exampleEmbed(
						"pr lihat jadwal <kelas>",
						"pr lihat jadwal TIA",
						"Masing-masing"
					);
					message.channel.send(exampleEmbedJadwal);
					return;
				}

				message.channel.send("Mempersiapkan...");
				let kelas = args.slice(1).join(" ").trim();

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

				const isJadwalExist = await scheduleRef
					.doc(instanceId)
					.collection(kelas)
					.get();

				if (isJadwalExist.docs.length == 0) {
					message.channel.send(
						":worried: Maaf, jadwal tidak ditemukan. Periksa kembali penulisan kelas atau lihat daftar kelas terlebih dahulu."
					);
					return;
				}

				const jadwalData = await isJadwalExist.docs
					.map((doc) => doc.data())
					.filter((el) => el.start.length > 0)
					.sort((a, b) => a.id - b.id);

				const normalEmbedJadwal = normalEmbed(
					"Jadwal Perkuliahan",
					"Dengan perubahan terbaru"
				).setAuthor(`Kelas: ${kelas}`);

				jadwalData.forEach((data) => {
					let jadwalString = data.name
						.map(
							(el, id) => `${id + 1}. ${el} (${data.start[id]}-${data.end[id]})`
						)
						.join("\n");

					normalEmbedJadwal.addField(data.day, jadwalString);
				});

				message.channel.send(normalEmbedJadwal);

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

		const execLihatKelas = async () => {
			try {
				message.channel.send("Mempersiapkan...");

				const kelasSnap = await mhsRef.doc(instanceId).get();
				if (!kelasSnap.exists) {
					message.channel.send(":worried: Maaf, tidak terdapat data kelas");
					return;
				}

				let kelas = kelasSnap.data();
				let kelasString = kelas.kelas
					.map((el, id) => `${id + 1}. ${el}`)
					.join("\n");
				const normalEmbedKelas = normalEmbed("Daftar Kelas", kelasString);
				message.channel.send(normalEmbedKelas);

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

		const execLihatMatkul = async () => {
			try {
				if (args.length == 1) {
					const exampleEmbedMatkul = exampleEmbed(
						"pr lihat matkul <kelas>",
						"pr lihat matkul TIA",
						"Masing-masing"
					);
					message.channel.send(exampleEmbedMatkul);
					return;
				}

				message.channel.send("Mempersiapkan...");

				let kelas = args.slice(1).join(" ");
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

				const listMatkulSnap = await absentRef
					.doc(instanceId)
					.collection(kelas)
					.doc("absensi")
					.get();

				if (!listMatkulSnap.exists) {
					message.channel.send(
						":worried: Maaf, daftar mata kuliah tidak ditemukan. Periksa kembali penulisan kelas atau lihat daftar kelas terlebih dahulu."
					);
					return;
				}

				const listMatkul = listMatkulSnap.data();

				let matkulString = Object.keys(listMatkul)
					.map((el, id) => `${id + 1}. ${el}`)
					.join("\n");

				const normalEmbedMatkul = normalEmbed(
					"Daftar Mata Kuliah",
					matkulString
				).setAuthor(`Kelas: ${kelas}`);

				message.channel.send(normalEmbedMatkul);
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
			case "jadwal":
				execLihatJadwal();
				break;
			case "kelas":
				execLihatKelas();
				break;
			case "matkul":
				execLihatMatkul();
				break;
			default:
				message.channel.send(
					":worried: Maaf, perintah tidak dikenali. Silakan lihat bantuan"
				);
				break;
		}
	},
};
