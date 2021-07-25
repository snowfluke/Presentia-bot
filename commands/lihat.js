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
				.addField("1. Melihat Daftar Kelas", ` pr lihat kelas`)
				.addField("1. Melihat Daftar Mata Kuliah", ` pr lihat matkul`);

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

				let kelas = args.slice(1).join(" ");

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
					.sort((a, b) => a.id - b.id);

				const normalEmbedJadwal = normalEmbed(
					"Jadwal Perkuliahan",
					"Dengan perubahan terbaru"
				).setAuthor(`Kelas: ${kelas}`);

				console.log(jadwalData);

				for (let data of jadwalData) {
					let jadwalString = data.name
						.map(
							(el, id) => `${id + 1}.${el} (${data.start[el]}-${data.end[el]})`
						)
						.join("\n");
					console.log(data.day, jadwalString);
					normalEmbedJadwal.addField(data.day, jadwalString);
				}

				message.channel.send("debugging");
				return;
				message.channel.send(normalEmbedJadwal);

				return;
			} catch (error) {
				console.log(error);
				message.channel.send(
					`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
				);
			}
		};

		const execLihatKelas = async () => {
			try {
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

				let kelas = args.slice(1).join(" ");
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
