const admin = require("../firebase");
const check3 = require("../check3");
const cmdEmbed = require("../cmdEmbed");
const normalEmbed = require("../normalEmbed");
const paginationEmbed = require("discord.js-pagination");

module.exports = {
	name: "absensi",
	description:
		"Perintah untuk melihat riwayat absensi mahasiswa.\n` pr absensi `",
	type: "all",
	async execute(message, args, instanceId) {
		if (
			!message.member.roles.cache.find(
				(r) => r.name === "Admin" || r.name === "Dosen"
			)
		) {
			message.channel.send(
				":worried: Maaf, Anda bukan admin, tidak boleh mengakses perintah"
			);
			return;
		}

		if (args.length != 2) {
			const cmdEmbedMhs = cmdEmbed(
				"Mhs",
				"Presentia ingin menjangkau semua mahasiswa yang terkendala perangkat"
			)
				.addField("1. Melihat riwayat absensi", "` pr absensi lihat <NIM> `")
				.addField("2. Mengubah riwayat absensi", "` pr absensi ubah <NIM> `");

			message.channel.send(cmdEmbedMhs);
			return;
		}

		const status = await check3(instanceId);
		if (!status.status) {
			message.channel.send(status.data);
			return;
		}

		const mhsRef = admin.firestore().collection("mahasiswa");
		const absentRef = admin.firestore().collection("absent");
		let NIM = args[1];

		let matkul = message.channel.name;
		let kelas = message.channel.parent.name;
		if (matkul.length >= 4) {
			matkul = matkul
				.toLowerCase()
				.split("-")
				.slice(0, 6)
				.map((e) =>
					e.length >= 3 ? e[0].toUpperCase() + e.substring(1) : e.toUpperCase()
				)
				.join(" ")
				.substring(0, 50);
		} else {
			matkul = matkul.split("-").join(" ").toUpperCase();
		}

		const execLihatAbsensi = async () => {
			if (args.length == 1) {
				const exampleEmbedAbsensi = exampleEmbed(
					"pr absensi lihat <NIM>",
					"pr absensi lihat 195540001",
					"Masing-masing"
				);
				message.channel.send(exampleEmbedAbsensi);
				return;
			}

			try {
				const mhsSnap = await mhsRef
					.doc(instanceId)
					.collection("mhs")
					.doc(NIM)
					.get();

				if (!mhsSnap.exists) {
					message.channel.send(
						`:worried: Maaf, mahasiswa dengan NIM ${NIM} tidak ditemukan.`
					);
					return;
				}

				const mhs = mhsSnap.data();

				const absentSnap = await absentRef
					.doc(instanceId)
					.collection(kelas)
					.doc("absensi")
					.get();

				if (!absentSnap.exists) {
					message.channel.send(
						`:worried: Maaf, data absensi untuk kelas ${kelas} tidak ditemukan`
					);
					return;
				}

				const absentData = absentSnap.data();
				const listMatkul = Object.keys(absentData);

				if (!listMatkul.includes(matkul)) {
					message.channel.send(
						`:worried: Maaf, mata kuliah ${matkul} tidak ada.`
					);
					return;
				}

				const currentAbsentRecords = absentData[matkul];
				const currentMhsRecords = mhs[matkul];

				if (currentAbsentRecords.length == 0) {
					message.channel.send(
						`:worried: Maaf, belum ada pertemuan di mata kuliah ${matkul}`
					);
					return;
				}

				let embedList = [];
				let normalEmbedRecord = normalEmbed(
					mhs.name,
					`**Kelas:** ${mhs.kelas}`
				).setAuthor(NIM);

				currentAbsentRecords.forEach((el, id) => {
					let statusString;
					if (!currentMhsRecords[id]) {
						statusString = "A";
					} else {
						statusString = currentMhsRecords[id];
						if (statusString.length > 1) {
							statusString =
								statusString[0] + `\n**Bukti**: ${statusString.substring(2)}`;
						}
					}

					normalEmbedRecord.addField(
						`Pertemuan ke-${id + 1}`,
						`**Tgl:** ${el}\n**Status:** ${statusString}`
					);

					if ((id + 1) % 4 == 0) {
						embedList.push(normalEmbedRecord);
					}
				});

				paginationEmbed(message, embedList);
				return;
			} catch (error) {
				console.log(error);
				message.channel.send(
					`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
				);
			}
		};

		const execUbahAbsensi = async () => {
			if (args.length == 1) {
				const exampleEmbedAbsensi = exampleEmbed(
					"pr absensi ubah <NIM>",
					"pr absensi ubah 195540001",
					"Masing-masing"
				);
				message.channel.send(exampleEmbedAbsensi);
				return;
			}
			try {
			} catch (error) {
				console.log(error);
				message.channel.send(
					`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
				);
			}
		};

		switch (args[0]) {
			case "lihat":
				execLihatAbsensi();
				break;
			case "ubah":
				execUbahAbsensi();
				break;
			default:
				message.channel.send(
					":worried: Maaf, perintah tidak dikenali. Silakan lihat bantuan"
				);
				break;
		}
	},
};
