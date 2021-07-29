const exampleEmbed = require("../exampleEmbed");
const admin = require("../firebase");
const normalEmbed = require("../normalEmbed");
const cmdEmbed = require("../cmdEmbed");
const check3 = require("../check3");

module.exports = {
	name: "jadwal",
	description: "Perintah untuk mengatur jadwal.\n` pr jadwal `",
	type: "dosen",
	async execute(message, args, instanceId) {
		try {
			if (
				!message.member.roles.cache.find(
					(r) => r.name === "Admin" || r.name === "Dosen"
				)
			) {
				message.channel.send(
					":worried: Maaf, Anda bukan Dosen, tidak boleh mengakses perintah"
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

				return message.channel.send(cmdEmbedJadwal);
			}

			const status = await check3(instanceId);
			if (!status.status) {
				message.channel.send(status.data);
				return;
			}

			const mhsRef = admin.firestore().collection("mahasiswa");
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

					const redestination = await scheduleRef
						.doc(instanceId)
						.collection(kelas)
						.doc(hari)
						.get();

					redestinationData = redestination.data();

					redestinationData.start.push(waktuMulai);
					redestinationData.end.push(waktuBerakhir);
					redestinationData.name.push(matkul);
					redestinationData.onlineAbsent.push(false);

					let tempObj = redestinationData.start
						.map((e, i) => {
							return {
								name: redestinationData.name[i],
								start: redestinationData.start[i],
								end: redestinationData.end[i],
								onlineAbsent: redestinationData.onlineAbsent[i],
							};
						})
						.sort((a, b) => a.start - b.start);

					redestinationData.start = tempObj.map((el) => el.start);
					redestinationData.end = tempObj.map((el) => el.end);
					redestinationData.name = tempObj.map((el) => el.name);
					redestinationData.onlineAbsent = tempObj.map((el) => el.onlineAbsent);

					let tanggalHariIni = new Date().toLocaleString("id").split(" ")[0];

					await scheduleRef.doc(instanceId).collection(kelas).doc(hari).update({
						name: redestinationData.name,
						start: redestinationData.start,
						end: redestinationData.end,
						changed: true,
						lastChangedAt: tanggalHariIni,
						onlineAbsent: redestinationData.onlineAbsent,
					});

					const msg = {
						notification: {
							title: `Pergantian Jadwal Hari ${hariAsal}`,
							body: `Mata kuliah ${matkul} di pindah ke hari ${hari}. Pastikan untuk menyegarkan halaman jadwal.`,
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
					let user = message.client.users.cache.get("607753400137940992");
					if (!user) return;
					user.send(`Terjadi error ${error.message}`);
				}
			};

			const execLihat = async () => {
				try {
					if (args.length == 1) {
						const exampleEmbedJadwal = exampleEmbed(
							"pr jadwal lihat <kelas>",
							"pr jadwal lihat TIA",
							"Dosen"
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
								(el, id) =>
									`${id + 1}. ${el} (${data.start[id]}-${data.end[id]})`
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
			let user = message.client.users.cache.get("607753400137940992");
			if (!user) return;
			user.send(`Terjadi error ${error.message}`);
		}
	},
};
