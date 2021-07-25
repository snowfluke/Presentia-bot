// * Import module
const admin = require("../firebase");
const cmdEmbed = require("../cmdEmbed");
const exampleEmbed = require("../exampleEmbed");
const normalEmbed = require("../normalEmbed");

module.exports = {
	name: "[konfigurasi-1] area",
	type: "admin",
	description:
		"Perintah untuk mengatur koordinat mode absensi area.\n` pr area `",
	async execute(message, args, instanceId) {
		// parameter
		// 1. message: message object
		// 2. args: tambah/hapus/

		if (!message.member.roles.cache.find((r) => r.name === "Admin")) {
			message.channel.send(
				":worried: Maaf, Anda bukan admin, tidak boleh mengakses perintah"
			);
			return;
		}

		if (args?.length == 0 || !args) {
			const cmdEmbedLokasi = cmdEmbed(
				"Area",
				"Presentia hanya menampung satu area absensi, jika ingin mengganti area maka perlu menghapus area lama terlebih dahulu."
			)
				.addField("1. Menambahkan Area", "` pr area tambah `")
				.addField("2. Menghapus Area", "` pr area hapus `")
				.addField("3. Melihat Area", "` pr area lihat `");

			return message.channel.send(cmdEmbedLokasi);
		}

		// * Check location in database
		try {
			const instanceRef = admin.firestore().collection("instance");
			const instanceSnap = await instanceRef.doc(instanceId).get();
			const instanceData = instanceSnap.data();
			const isLocationExist =
				instanceData.areaCoords.length >= 3 ? true : false;

			const coordsLihat = async () => {
				if (!isLocationExist)
					return message.reply(
						":x: Tidak dapat melihat area, belum terdapat area"
					);

				const point = instanceData.areaCoords?.map((el) => el.point);

				const coordsEmbed = normalEmbed(
					`Area ${instanceData.instanceName}`,
					"Menampilkan titik-titik batas area untuk absensi mode lokasi"
				);

				point.forEach((el, id) => {
					coordsEmbed.addField(
						`${id + 1}. ${el[0]},${el[1]}`,
						`https://maps.google.co.id/maps?q=${el[0]},${el[1]}`
					);
				});

				const backUpPoint = point.map((pip) => pip.join(",")).join("x");

				coordsEmbed.addField(`Cadangkan Area`, backUpPoint);

				return message.channel.send(coordsEmbed);
			};

			const coordsTambah = async () => {
				if (isLocationExist) {
					message.reply(
						":x: Tidak dapat menambahkan area, sudah terdapat area"
					);
					return;
				}

				const exampleEmbedTambahLokasi = exampleEmbed(
					"pr area tambah <latitude,longitude>x<latitude,longitude>x...",
					"pr area tambah -7.295166,108.766218x-7.295167,108.766314x-7.295254,108.766220x-7.295255,108.766314",
					"Admin"
				);
				exampleEmbedTambahLokasi.addField(
					"Perhatian!",
					`Tidak ada spasi di dalam titik koordinat, hapus spasi setelah koma jika Anda menyalin titik dari Google Maps`
				);

				if (!args[1] || args.length > 2)
					return message.channel.send(exampleEmbedTambahLokasi);

				message.channel.send(":white_check_mark: Mempersiapkan area baru");

				const points = args[1].split("x");
				if (points.length < 3 || points.length > 8)
					return message.reply(
						":x: Untuk membuat sebuah area, diperlukan minimal 3 buah titik dan maksimal 8 titik"
					);

				const pointsInPoint = points.map((point) => point.split(","));
				let isOnlyNumber;

				pointsInPoint.forEach((point) =>
					point.every((el) => !isNaN(el))
						? (isOnlyNumber = true)
						: (isOnlyNumber = false)
				);

				if (!isOnlyNumber)
					return message.reply(":x: Titik tidak boleh mengandung selain angka");
				message.channel.send(":white_check_mark: Memperbarui database area");
				const newAreaCoords = pointsInPoint.map((el) => {
					let temp = { point: el };
					return temp;
				});

				await instanceRef.doc(instanceId).update({
					areaCoords: newAreaCoords,
				});

				message.channel.send("Berhasil menambahkan area baru :partying_face:");
				return;
			};

			const coordsHapus = async () => {
				if (!isLocationExist)
					return message.reply(
						":x: Tidak dapat menghapus area, belum terdapat area"
					);

				coordsLihat();

				const execDeleteCoords = async () => {
					message.channel.send(
						":white_check_mark: Mempersiapkan penghapusan area"
					);

					try {
						await instanceRef.doc(instanceId).update({
							areaCoords: [],
						});
						message.channel.send("Berhasil menghapus area :partying_face:");
					} catch (err) {
						message.channel.send(
							":x: Terjadi kesalahan, mohon coba beberapa saat lagi"
						);
					}
				};

				const filter = (reaction, user) => {
					return (
						["🇾", "🇳"].includes(reaction.emoji.name) &&
						user.id === message.author.id
					);
				};

				message.channel
					.send("**Apakah anda yakin ingin menghapus area?**")
					.then((m) => {
						m.react("🇾");
						m.react("🇳");
						m.awaitReactions(filter, {
							max: 1,
							time: 10 * 1000,
							errors: ["time"],
						})
							.then((collected) => {
								const reaction = collected.first();
								if (reaction.emoji.name === "🇾") {
									return execDeleteCoords();
								}

								return m.channel.send(":x: Perintah dibatalkan");
							})
							.catch((collected) => {
								message.channel.send(
									":worried: Maaf, waktu tunggu habis. Untuk menghapus lokasi silakan mulai ulang perintah"
								);
							});
					});
			};

			switch (args[0]) {
				case "tambah":
					coordsTambah();
					break;
				case "hapus":
					coordsHapus();
					break;
				case "lihat":
					coordsLihat();
					break;
				default:
					message.channel.send(":worried: Maaf, perintah tidak dikenali");
					break;
			}
		} catch (error) {
			console.log(error);
			message.channel.send(
				":x: Terjadi kesalahan, mohon coba beberapa saat lagi."
			);
		}
	},
};
