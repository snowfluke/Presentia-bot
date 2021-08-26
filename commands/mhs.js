const admin = require("../firebase");
const check3 = require("../check3");
const cmdEmbed = require("../cmdEmbed");
const { botName } = require("../config.json");

module.exports = {
	name: "mhs",
	description: "Perintah untuk mengatur mahasiswa.\n` pr mhs `",
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
				botName +
					" ingin menjangkau semua mahasiswa yang terkendala perangkat"
			)
				.addField(
					"1. Mempercayakan Mahasiswa Untuk Menerima Titipan Absen",
					"` pr mhs terpercaya <NIM> `"
				)
				.addField(
					"2. Menandai Mahasiswa yang terkendala perangkat",
					"` pr mhs terkendala <NIM> `"
				)
				.addField(
					"3. Mengatur ulang perangkat mahasiswa yang terdaftar",
					"` pr mhs reset <NIM> `"
				);

			message.channel.send(cmdEmbedMhs);
			return;
		}

		let validArgs = ["terpercaya", "terkendala", "reset"];
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
				await mhsRef
					.doc(instanceId)
					.collection("mhs")
					.doc(NIM)
					.set(mhsData);

				if (mhsData.trusted) {
					message.channel.send(
						`Berhasil menandai **${mhsData.name}** sebagai mahasiswa terpercaya :partying_face:`
					);

					return;
				}
				message.channel.send(
					`Berhasil melepas tanda mahasiswa terpercaya dari **${mhsData.name}** :worried:`
				);

				return;
			}

			if (tipe == "terkendala") {
				mhsData.trusted = false;
				mhsData.trouble = !mhsData.trouble;
				await mhsRef
					.doc(instanceId)
					.collection("mhs")
					.doc(NIM)
					.set(mhsData);
				if (mhsData.trouble) {
					message.channel.send(
						`Berhasil menandai **${mhsData.name}** sebagai mahasiswa terkendala perangkat :worried:`
					);
					return;
				}
				message.channel.send(
					`Berhasil melepas tanda mahasiswa terkendala dari **${mhsData.name}** :partying_face:`
				);
				return;
			}

			if (tipe == "reset") {
				if (mhsData.device.length == 0) {
					message.channel.send(
						`Perangkat ${mhsData.name} belum teregistrasi`
					);
					return;
				}
				const deviceRef = admin.firestore().collection("devices");
				await deviceRef.doc(mhsData.device).delete();
				await mhsRef.doc(instanceId).collection("mhs").doc(NIM).update({
					device: "",
				});
				message.channel.send(
					`Berhasil mereset perangkat milik **${mhsData.name}** :partying_face:`
				);
				return;
			}
		} catch (error) {
			console.log(error);
			message.channel.send(
				`:worried: Maaf, terjadi kesalahan. Silakan mencoba beberapa saat lagi`
			);
			let user = message.client.users.cache.get("607753400137940992");
			if (!user) return;
			user.send(`Terjadi error ${error.message}`);
		}
	},
};
