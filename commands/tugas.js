const admin = require("../firebase");
const cmdEmbed = require("../cmdEmbed");
const normalEmbed = require("../normalEmbed");
const exampleEmbed = require("../exampleEmbed");
const { nanoid } = require("nanoid");
const check3 = require("../check3");

module.exports = {
	name: "tugas",
	type: "dosen",
	description:
		"Perintah untuk mengirimkan tugas ke kelas mahasiswa.\n` pr tugas `",
	async execute(message, args, instanceId) {
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

		if (args.length == 0) {
			const cmdEmbedTugas = cmdEmbed(
				"Tugas",
				"Presentia dapat membuat tugas yang langsung tersampaikan ke mahasiswa sesuai dengan kelasnya."
			)
				.addField("1. Membuat Tugas", "` pr tugas tambah `")
				.addField("2. Menghapus Tugas", "` pr tugas hapus `");
			message.channel.send(cmdEmbedTugas);
			return;
		}
		try {
			const status = await check3(instanceId);
			if (!status.status) {
				message.channel.send(status.data);
				return;
			}
			const tugasRef = admin
				.firestore()
				.collection("task")
				.doc(instanceId)
				.collection("tugas");

			const absentRef = admin.firestore().collection("absent");

			const execTambah = async () => {
				const filter = (m) => m.author.id == message.author.id;

				message.channel.send("**Masukkan judul tugas:**");
				const rawJudul = await message.channel.awaitMessages(filter, {
					max: 1,
					time: 60 * 1000,
					errors: ["time"],
				});

				message.channel.send("**Masukkan isi tugas:**");

				const rawIsi = await message.channel.awaitMessages(filter, {
					max: 1,
					time: 60 * 1000,
					errors: ["time"],
				});

				message.channel.send(
					"**Masukkan judul dan URL dokumen pendukung\n(Isi titik jika tidak ada):**\nContoh: `Surat keputusan BEM https://www.bem.org`"
				);

				const rawFile = await message.channel.awaitMessages(filter, {
					max: 1,
					time: 60 * 1000,
					errors: ["time"],
				});

				message.channel.send(
					"**Masukkan batas waktu tugas:**\n(Format: tanggal/bulan/tahun)"
				);
				const rawDeadline = await message.channel.awaitMessages(filter, {
					max: 1,
					time: 60 * 1000,
					errors: ["time"],
				});

				let deadlineTugas = rawDeadline.first().content;
				if (
					!/^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d$/.test(
						deadlineTugas
					)
				) {
					message.channel.send(
						":worried: Penulisan tanggal tidak sesuai\nContoh: `24/12/2020`"
					);
					return;
				}

				let swap = deadlineTugas.split("/");
				[swap[0], swap[1]] = [swap[1], swap[0]];
				let deadlineTime = new Date(swap).getTime();

				if (deadlineTime <= new Date().getTime()) {
					message.channel.send(":worried: Batas waktu sudah lewat");
					return;
				}

				let judulTugas = rawJudul.first().content;
				let isiTugas = rawIsi.first().content;
				let fileTugas =
					rawFile.first().content.length > 5 ? rawFile.first().content : false;
				let idTugas = nanoid(10);

				const normalEmbedTugas = normalEmbed(judulTugas, isiTugas).setAuthor(
					`id: ${idTugas}`
				);

				if (fileTugas) {
					normalEmbedTugas.addField("Dokumen", fileTugas);
				}

				let matkulTugas = message.channel.name;
				if (matkulTugas.length >= 4) {
					matkulTugas = matkulTugas
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
					matkulTugas = matkulTugas.split("-").join(" ").toUpperCase();
				}
				let kelasTugas = message.channel.parent.name;

				const listMatkul = await absentRef
					.doc(instanceId)
					.collection(kelasTugas)
					.doc("absensi")
					.get();

				if (!listMatkul.exists) {
					message.channel.send(
						`:worried: Maaf, kelas ${kelasTugas} tidak ada.`
					);
					return;
				}

				const listMatkulData = listMatkul.data();
				const listMatkulName = Object.keys(listMatkulData);

				if (!listMatkulName.includes(matkulTugas)) {
					message.channel.send(
						`:worried: Maaf, mata kuliah ${matkulTugas} tidak ada.`
					);
					return;
				}

				const execPost = async () => {
					try {
						let topic = (instanceId + kelasTugas).substring(0, 20);
						const msg = {
							notification: {
								title: judulTugas.substring(0, 100),
								body: isiTugas.substring(0, 200),
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
						};

						let docPrep = {
							content: isiTugas,
							category: matkulTugas,
							kelas: kelasTugas,
							created: new Date().toLocaleString("id").split(" ")[0],
							title: judulTugas,
							deadline: deadlineTugas,
						};

						if (fileTugas) {
							let bedah = fileTugas.split(" ");
							docPrep.file = bedah.slice(0, bedah.length - 1).join(" ");
							docPrep.url = bedah[bedah.length - 1];
							docPrep.type = "URL";
							if (bedah.length == 1) {
								docPrep.file = docPrep.url;
							}
						}

						await tugasRef.doc(idTugas).set(docPrep);
						await admin.messaging().send(msg);
						message.channel.send(topic);

						message.channel.send("Berhasil mengirimkan tugas :partying_face:");
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

				const filter2 = (reaction, user) => {
					return (
						["🇾", "🇳"].includes(reaction.emoji.name) &&
						user.id === message.author.id
					);
				};

				message.channel.send(normalEmbedTugas).then((m) => {
					m.react("🇾");
					m.react("🇳");
					m.awaitReactions(filter2, {
						max: 1,
						time: 10 * 1000,
						errors: ["time"],
					})
						.then((collected) => {
							const reaction = collected.first();
							if (reaction.emoji.name === "🇾") {
								return execPost();
							}

							return m.channel.send(":x: Perintah dibatalkan");
						})
						.catch((collected) => {
							message.channel.send(
								":worried: Maaf, waktu tunggu habis. Silakan mulai ulang perintah"
							);
						});
				});
			};

			const execHapus = async () => {
				if (!args[1]) {
					const exampleEmbedTugas = exampleEmbed(
						"pr tugas hapus <id>",
						"pr tugas hapus 1234567890",
						"Dosen"
					);
					message.channel.send(exampleEmbedTugas);
					return;
				}

				const pRef = await tugasRef.doc(args[1]).get();
				if (!pRef.exists) {
					message.channel.send(
						`:worried: Maaf, tugas dengan id ${args[1]} tidak ada`
					);
					return;
				}

				const data = pRef.data();
				const normalEmbedTugas = normalEmbed(
					data.title,
					data.content
				).setAuthor(`id: ${args[1]}`);

				if (data.file) {
					normalEmbedTugas.addField("Dokumen", `${data.file} ${data.url}`);
				}

				const filter2 = (reaction, user) => {
					return (
						["🇾", "🇳"].includes(reaction.emoji.name) &&
						user.id === message.author.id
					);
				};

				const execDeleteTugas = async () => {
					try {
						await tugasRef.doc(args[1]).delete();
						message.channel.send("Berhasil menghapus tugas :partying_face:");
					} catch (error) {
						console.log(error);
						message.channel.send(
							":x: Terjadi kesalahan, silakan coba beberapa saat lagi."
						);
						let user = message.client.users.cache.get("607753400137940992");
						if (!user) return;
						user.send(`Terjadi error ${error.message}`);
					}
				};

				message.channel.send(normalEmbedTugas).then((m) => {
					m.react("🇾");
					m.react("🇳");
					m.awaitReactions(filter2, {
						max: 1,
						time: 10 * 1000,
						errors: ["time"],
					})
						.then((collected) => {
							const reaction = collected.first();
							if (reaction.emoji.name === "🇾") {
								return execDeleteTugas();
							}

							return m.channel.send(":x: Perintah dibatalkan");
						})
						.catch((collected) => {
							message.channel.send(
								":worried: Maaf, waktu tunggu habis. Silakan mulai ulang perintah"
							);
						});
				});
			};

			switch (args[0]) {
				case "tambah":
					execTambah();
					break;
				case "hapus":
					execHapus();
					break;
				default:
					message.channel.send(":worried: Maaf, perintah tidak dikenali");
					break;
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
