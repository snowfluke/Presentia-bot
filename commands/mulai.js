const exampleEmbed = require("../exampleEmbed");
const admin = require("../firebase");
const normalEmbed = require("../normalEmbed");
const check3 = require("../check3");

module.exports = {
	name: "mulai",
	description:
		"Perintah untuk memulai absensi jika sudah memasuki waktu matkul.\n` pr mulai `",
	type: "dosen",
	async execute(message, args, instanceId) {
		try {
			if (
				!message.member.roles.cache.find(
					(r) => r.name === "Dosen" || r.name === "Admin"
				)
			) {
				message.channel.send(
					":worried: Maaf, Anda bukan Dosen, tidak boleh mengakses perintah"
				);
				return;
			}

			if (args?.length != 1) {
				const exampleEmbedMulai = exampleEmbed(
					"pr mulai <daring/lokasi>",
					"pr mulai lokasi",
					"Dosen"
				);
				message.channel.send(exampleEmbedMulai);
				return;
			}

			const status = await check3(instanceId);
			if (!status.status) {
				message.channel.send(status.data);
				return;
			}

			let tipe = args[0].toLowerCase().trim();

			if (tipe != "daring") {
				if (tipe != "lokasi") {
					const exampleEmbedMulai = exampleEmbed(
						"pr mulai <daring/lokasi>",
						"pr mulai lokasi",
						"Dosen"
					);
					message.channel.send(exampleEmbedMulai);
					return;
				}
			}

			let tipeAbsen;
			let onlineAbsent;
			if (tipe == "daring") {
				tipeAbsen = "Daring";
				onlineAbsent = true;
			}

			if (tipe == "lokasi") {
				tipeAbsen = "Lokasi";
				onlineAbsent = false;
			}

			let day = [
				"Minggu",
				"Senin",
				"Selasa",
				"Rabu",
				"Kamis",
				"Jum'at",
				"Sabtu",
			];

			const absentRef = admin.firestore().collection("absent");
			const scheduleRef = admin.firestore().collection("schedule");

			let dayId = new Date()
				.getDay()
				.toLocaleString("id", { timeZone: "Asia/Jakarta" });
			day = day[dayId];

			let kelas = message.channel.parent.name;
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

			const todaySnap = await scheduleRef
				.doc(instanceId)
				.collection(kelas)
				.doc(day)
				.get();

			if (!todaySnap.exists) {
				message.channel.send(`:worried: Maaf, kelas ${kelas} tidak ada`);
				return;
			}

			let todayData = todaySnap.data();

			if (!todayData.name.includes(matkul)) {
				message.channel.send(
					`:worried: Maaf, jam mata kuliah ${matkul} tidak ada hari ini`
				);
				return;
			}

			const absentSnap = await absentRef
				.doc(instanceId)
				.collection(kelas)
				.doc("absensi")
				.get();
			const absentData = absentSnap.data();
			let curabdata = absentData[matkul];

			let tglHariini = new Date().toLocaleDateString("id").split(" ")[0];

			if (tglHariini == curabdata[curabdata.length - 1]) {
				let index = todayData.name.indexOf(matkul);
				if (todayData.onlineAbsent[index] == onlineAbsent) {
					message.channel.send(
						`:worried: Maaf, mata kuliah ${matkul} sudah memulai absensi hari ini`
					);

					return;
				}
				let newAbsentTypeArr = todayData.onlineAbsent;
				newAbsentTypeArr[index] = onlineAbsent;
				await scheduleRef.doc(instanceId).collection(kelas).doc(day).update({
					onlineAbsent: newAbsentTypeArr,
				});
				message.channel.send(
					`Berhasil mengubah mode absensi menjadi ${
						onlineAbsent ? "daring" : "lokasi"
					} :partying_face:`
				);
				return;
			}

			let index = todayData.name.indexOf(matkul);
			let jam = new Date()
				.getHours()
				.toLocaleString("id", { timeZone: "Asia/Jakarta" });

			let menit = new Date()
				.getMinutes()
				.toLocaleString("id", { timeZone: "Asia/Jakarta" });

			let todayTime =
				(jam.toString().length == 1 ? "0" + jam : jam) +
				"." +
				(menit.toString().length == 1 ? "0" + menit : menit);

			let start = todayData.start[index];
			let end = todayData.end[index];
			let newAbsentTypeArr = todayData.onlineAbsent;
			newAbsentTypeArr[index] = onlineAbsent;

			if (!(start < todayTime && todayTime < end)) {
				message.channel.send(`Waktu sekarang: ${todayTime}`);
				message.channel.send(
					`:worried: Maaf, di luar jam mata kuliah ${matkul}(${start}-${end})`
				);
				return;
			}

			const normalEmbedMulai = normalEmbed(matkul, `Jam: ${start} - ${end}`)
				.setAuthor("Apakah anda yakin ingin memulai jam absensi?")
				.addField("Tipe Absen", tipeAbsen);

			const execMulai = async () => {
				let date = new Date()
					.toLocaleString("id", { timeZone: "Asia/Jakarta" })
					.split(" ")[0];
				let topic = (instanceId + kelas).substring(0, 20);

				const msg = {
					notification: {
						title: "Absensi Dimulai!",
						body: `Dosen mata kuliah ${matkul} sudah memulai absensi terbaru. Jangan lupa untuk menyegarkan layar absensi!`,
					},
					topic: topic,
					android: {
						priority: "high",
						notification: {
							sound: "default",
							priority: "high",
							channelId: "presentia",
						},
					},
					apns: {
						headers: {
							"apns-priority": "10",
						},
					},
					webpush: {
						headers: {
							Urgency: "high",
						},
					},
				};

				await absentRef
					.doc(instanceId)
					.collection(kelas)
					.doc("absensi")
					.update({
						[matkul]: admin.firestore.FieldValue.arrayUnion(date),
					});
				await scheduleRef.doc(instanceId).collection(kelas).doc(day).update({
					onlineAbsent: newAbsentTypeArr,
				});
				await admin.messaging().send(msg);

				message.channel.send(
					"Berhasil memulai absensi :partying_face:\nSilakan melihat laporan dengan ` pr laporan matkul ` setelah jam mata kuliah selesai."
				);
				return;
			};

			const filter = (reaction, user) => {
				return (
					["🇾", "🇳"].includes(reaction.emoji.name) &&
					user.id === message.author.id
				);
			};

			message.channel.send(normalEmbedMulai).then((m) => {
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
							return execMulai();
						}

						return m.channel.send(":x: Perintah dibatalkan");
					})
					.catch((collected) => {
						message.channel.send(
							":worried: Maaf, waktu tunggu habis. Silakan mulai ulang perintah"
						);
					});
			});
		} catch (error) {
			console.log(error);
			let user = message.client.users.cache.get("607753400137940992");
			if (!user) return;
			user.send(`Terjadi error ${error.message}`);
		}
	},
};
