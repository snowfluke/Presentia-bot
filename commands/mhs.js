const admin = require("../firebase");
const check3 = require("../check3");
const cmdEmbed = require("../cmdEmbed");

module.exports = {
	name: "mhs",
	description: "Perintah untuk mengatur mahasiswa.\n` pr mhs `",
	type: "admin",
	async execute(message, args, instanceId) {
		if (!message.member.roles.cache.find((r) => r.name === "Admin")) {
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
				.addField(
					"1. Mempercayakan Mahasiswa Untuk Menerima Titipan Absen",
					`pr mhs terpercaya <NIM>`
				)
				.addField(
					"2. Menandai Mahasiswa yang terkendala perangkat",
					"` pr mhs terkendala <NIM> `"
				);

			message.channel.send(cmdEmbedMhs);
			return;
		}

		let validArgs = ["terpercaya", "terkendala"];
		let tipe = args[0];

		if (!validArgs.includes(tipe)) {
			message.channel.send(
				`:worried: Maaf, tidak ada tipe ${tipe}, tipe valid hanya **terpercaya** dan **terkendala**`
			);
			return;
		}

		try {
			const status = await check3(instanceId);
			if (!status.status) {
				message.channel.send(status.data);
				return;
			}

			const NIM = args[1];
			const mhsRef = admin.firestore().collection("mahasiswa");
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

			const mhsData = mhsSnap.data();
			if (tipe == "terpercaya") {
				mhsData.trouble = false;
				mhsData.trusted = !mhsData.trusted;
				message.channel.send(
					`Berhasil menjadikan ${mhsData.name} sebagai mahasiswa terpercaya :partying_face:`
				);
			}

			if (tipe == "terkendala") {
				mhsData.trusted = false;
				mhsData.trouble = !mhsData.trouble;
				message.channel.send(
					`Berhasil menandai ${mhsData.name} sebagai mahasiswa terkendala perangkat`
				);
			}
			await mhsRef.doc(instanceId).collection("mhs").doc(NIM).set(mhsData);
		} catch (error) {
			console.log(error);
			message.channel.send(
				`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
			);
		}
	},
};
