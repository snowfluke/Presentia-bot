const admin = require("../firebase");
const exampleEmbed = require("../exampleEmbed");
const normalEmbed = require("../normalEmbed");
const check3 = require("../check3");

module.exports = {
	name: "cari",
	description:
		"Perintah untuk mencari mahasiswa berdasarkan nama atau NIM.\n` pr cari `",
	type: "all",
	async execute(message, args, instanceId) {
		try {
			const status = await check3(instanceId);
			if (!status.status) {
				message.channel.send(status.data);
				return;
			}

			const mhsRef = admin.firestore().collection("mahasiswa");
			if (args.length == 0) {
				const exampleEmbedMhs = exampleEmbed(
					"pr cari <Nama Lengkap/NIM>",
					"pr cari Melly Goeslaw",
					"Masing-masing"
				).addField(
					"Perhatian",
					"Perhatikan besar/kecil huruf pada nama. Huruf pertama tiap kata pada nama adalah huruf kapital"
				);

				message.channel.send(exampleEmbedMhs);
				return;
			}

			if (args.length > 5) {
				const exampleEmbedMhs = exampleEmbed(
					"pr cari <Nama/NIM>",
					"pr cari Melly Goeslaw",
					"Masing-masing"
				).addField(
					"Perhatian",
					"Perhatikan besar/kecil huruf pada nama. Huruf pertama tiap kata pada nama adalah huruf kapital"
				);

				message.channel.send(exampleEmbedMhs);
				return;
			}

			let keyword = args.join(" ");

			const mhsByNimSnap = await mhsRef
				.doc(instanceId)
				.collection("mhs")
				.where("uniqueId", "==", keyword)
				.get();

			const mhsByNameSnap = await mhsRef
				.doc(instanceId)
				.collection("mhs")
				.where("name", "==", keyword)
				.get();

			let nameStatus = true;
			let nimStatus = true;

			if (mhsByNimSnap.size == 0) {
				nimStatus = false;
			}

			if (mhsByNameSnap.size == 0) {
				nameStatus = false;
			}

			if (nameStatus) {
				const mhsSnapshot = await mhsByNameSnap.docs[0].ref.get();
				const mhsData = mhsSnapshot.data();
				const normalEmbedMhs = normalEmbed(
					mhsData.name,
					`Kelas: ${mhsData.kelas}`
				)
					.setAuthor(mhsData.uniqueId)
					.addField(
						"Status Perangkat",
						mhsData.device.length != 0 ? "Terdaftar" : "Belum Terdaftar"
					);

				if (mhsData.trouble) {
					normalEmbedMhs.addField("Status Spesial", "Terkendala Perangkat");
				}

				if (mhsData.trusted) {
					normalEmbedMhs.addField("Status Spesial", "Dipercayai Titipan");
				}

				message.channel.send(normalEmbedMhs);
				return;
			}

			if (nimStatus) {
				const mhsSnapshot = await mhsByNimSnap.docs[0].ref.get();
				const mhsData = mhsSnapshot.data();

				const normalEmbedMhs = normalEmbed(
					mhsData.name,
					`Kelas: ${mhsData.kelas}`
				)
					.setAuthor(mhsData.uniqueId)
					.addField(
						"Status Perangkat",
						mhsData.device.length != 0 ? "Terdaftar" : "Belum Terdaftar"
					);

				if (mhsData.trouble) {
					normalEmbedMhs.addField("Status Spesial", "Terkendala Perangkat");
				}

				if (mhsData.trusted) {
					normalEmbedMhs.addField("Status Spesial", "Dipercayai Titipan");
				}

				message.channel.send(normalEmbedMhs);
				return;
			}

			message.channel.send(
				`:worried: Maaf, mahasiswa dengan kata kunci ${keyword} tidak ditemukan`
			);
			return;
		} catch (error) {
			console.log(error);
			message.channel.send(
				":x: Terjadi kesalahan, mohon coba beberapa saat lagi"
			);
		}
	},
};
