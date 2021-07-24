const exampleEmbed = require("../exampleEmbed");
const admin = require("../firebase");
const normalEmbed = require("../normalEmbed");
const cmdEmbed = require("../cmdEmbed");

module.exports = {
	name: "jadwal",
	description: "Perintah untuk mengatur jadwal. ` pr jadwal `",
	type: "dosen",
	async execute(message, args, instanceId) {
		try {
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

			if (args?.length == 0 || !args) {
				const cmdEmbedJadwal = cmdEmbed(
					"Jadwal",
					"Presentia akan langsung memberitahukan mahasiswa jika terjadi perubahan jadwal"
				)
					.addField("1. Mengubah Jadwal", "` pr jadwal ubah `")
					.addField("2. Melihat Jadwal", "` pr jadwal lihat `");

				return message.channel.send(cmdEmbedLokasi);
			}

			const scheduleRef = admin.firestore().collection("schedule");
			const absentRef = admin.firestore().collection("absent");

			const execUbah = async () => {
				try {
					if (!args[1]) {
						const exampleEmbedUbah = exampleEmbed(
							"pr jadwal ubah <Hari asal matkul>",
							"pr jadwal ubah Rabu",
							"Dosen"
						);
						message.channel.send(exampleEmbedUbah);
						return;
					}

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

					const listMatkul = await absentRef
						.doc(instanceId)
						.collection(kelas)
						.doc("absensi")
						.get();

					if (!listMatkul.exists) {
						message.channel.send(`:worried: Maaf, kelas ${kelas} tidak ada.`);
						return;
					}

					const listMatkulData = listMatkul.data();
					const listMatkulName = Object.keys(listMatkulData);

					if (!listMatkulName.includes(matkul)) {
						message.channel.send(
							`:worried: Maaf, mata kuliah ${matkul} tidak ada.`
						);
						return;
					}

					let hariAsal = args[1];
					hariAsal = hariAsal[0].toUpperCase() + hariAsal.substring(1);

					const filter = (m) => m.author.id == message.author.id;

					const refData = await scheduleRef
						.doc(instanceId)
						.collection(kelas)
						.doc(hariAsal)
						.get();

					if (!refData.exists) {
						message.channel.send(
							`:worried: Maaf, penulisan hari **${hariAsal}** tidak valid.`
						);
						return;
					}

					let DataRef = refData.data();
					if (!DataRef.name.includes(matkul)) {
						message.channel.send(
							`:worried: Maaf, mata kuliah **${matkul}** tidak ada di hari **${hariAsal}**`
						);
						return;
					}

					let IndexDataRef = DataRef.name.indexOf(matkul);

					const normalEmbedUbah = normalEmbed(
						"<Hari> <Jam.mulai>-<Jam.berakhir>",
						"Selasa 08.15-09.30"
					).setAuthor("Format penulisan");
					message.channel.send(normalEmbedUbah);

					message.channel.send(
						"**Masukkan hari tujuan dan jam matkul tujuan sesuai format:**"
					);
					const rawUbah = await message.channel.awaitMessages(filter, {
						max: 1,
						time: 60 * 1000,
						errors: ["time"],
					});

					message.channel.send("Memproses...");
					let ubahData = rawUbah.first().content;
					let dayList = [
						"Minggu",
						"Senin",
						"Selasa",
						"Rabu",
						"Kamis",
						"Jum'at",
						"Sabtu",
					];

					let hari = ubahData.split(" ")[0];
					let waktu = ubahData.split(" ")[1];

					hari = hari[0].toUpperCase() + hari.substring(1);

					let waktuMulai = waktu.split("-")[0];
					let waktuBerakhir = waktu.split("-")[1];

					if (!dayList.includes(hari)) {
						message.channel.send(
							`:worried: Maaf, penulisan hari **${hari}** tidak valid.`
						);
						return;
					}

					if (
						!/^(0?[0-9]|1[0-9]|2[0-3])\.([0-5][0-9])+-(0?[0-9]|1[0-9]|2[0-3])\.([0-5][0-9])+$/.test(
							waktu
						)
					) {
						message.channel.send(
							`:worried: Maaf, penulisan waktu ${waktu} tidak valid.`
						);
						return;
					}

					if (waktuMulai >= waktuBerakhir) {
						message.channel.send(
							`:worried: Maaf, penulisan jangka waktu ${waktu} tidak valid.`
						);
						return;
					}

					const destination = await scheduleRef
						.doc(instanceId)
						.collection(kelas)
						.doc(hari)
						.get();

					let collision;
					let destinationData = destination.data();
					if (destinationData?.start.length !== 0) {
						destinationData.start.forEach((el, id) => {
							if (
								waktuMulai >= el &&
								waktuBerakhir <= destinationData.end[id]
							) {
								collision = true;
								return;
							}
						});
					}

					if (collision) {
						message.channel.send(
							":worried: Maaf, sudah terdapat jadwal di waktu tersebut.\nLihat jadwal dengan ` pr jadwal lihat `."
						);
						return;
					}

					DataRef.name[IndexDataRef] = undefined;
					DataRef.start[IndexDataRef] = undefined;
					DataRef.end[IndexDataRef] = undefined;
					DataRef.onlineAbsent[IndexDataRef] = undefined;

					DataRef.name = DataRef.name.filter((el) => el != undefined);
					DataRef.start = DataRef.start.filter((el) => el != undefined);
					DataRef.end = DataRef.end.filter((el) => el != undefined);
					DataRef.onlineAbsent = DataRef.onlineAbsent.filter(
						(el) => el != undefined
					);

					await scheduleRef
						.doc(instanceId)
						.collection(kelas)
						.doc(hariAsal)
						.update({
							name: DataRef.name,
							start: DataRef.start,
							end: DataRef.end,
							onlineAbsent: DataRef.onlineAbsent,
						});

					destinationData.start.push(waktuMulai);
					destinationData.end.push(waktuBerakhir);
					destinationData.name.push(matkul);
					destinationData.onlineAbsent.push(false);

					let tempObj = destinationData.start
						.map((e, i) => {
							return {
								name: destinationData.name[i],
								start: destinationData.start[i],
								end: destinationData.end[i],
								onlineAbsent: destinationData.onlineAbsent[i],
							};
						})
						.sort((a, b) => a.start - b.start);

					destinationData.start = tempObj.map((el) => el.start);
					destinationData.end = tempObj.map((el) => el.end);
					destinationData.name = tempObj.map((el) => el.name);
					destinationData.onlineAbsent = tempObj.map((el) => el.onlineAbsent);

					let tanggalHariIni = new Date().toLocaleString("id").split(" ")[0];

					await scheduleRef.doc(instanceId).collection(kelas).doc(hari).update({
						name: destinationData.name,
						start: destinationData.start,
						end: destinationData.end,
						changed: true,
						lastChangedAt: tanggalHariIni,
						onlineAbsent: destinationData.onlineAbsent,
					});

					const msg = {
						notification: {
							title: `Pergantian Jadwal Hari ${hariAsal}`,
							body: `Mata kuliah ${matkul} di pindah ke hari ${hari}. Pastikan untuke menyegarkan halaman jadwal.`,
						},
						topic: kelas,
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
					await admin.messaging().send(msg);

					message.channel.send(`Berhasil mengubah jadwal :partying_face:`);
					return;
				} catch (error) {
					console.log(error);
					message.channel.send(
						":x: Terjadi kesalahan, mohon coba beberapa saat lagi."
					);
				}
			};

			const execLihat = async () => {};

			switch (args[0]) {
				case "ubah":
					execUbah();
					break;
				case "lihat":
					execLihat();
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