const admin = require("../firebase");
const cmdEmbed = require("../cmdEmbed");
const normalEmbed = require("../normalEmbed");
const exampleEmbed = require("../exampleEmbed");
const { nanoid } = require("nanoid");
const check3 = require("../check3");

module.exports = {
	name: "pengumuman",
	type: "admin",
	description:
		"Perintah untuk mengirimkan pengumuman ke semua mahasiswa.\n` pr pengumuman `",
	async execute(message, args, instanceId) {
		if (!message.member.roles.cache.find((r) => r.name === "Admin")) {
			message.channel.send(
				":worried: Maaf, Anda bukan admin, tidak boleh mengakses perintah"
			);
			return;
		}

		if (args.length == 0) {
			const cmdEmbedPengumuman = cmdEmbed(
				"Pengumuman",
				"Presentia dapat membuat pengumuman yang langsung tersampaikan ke seluruh mahasiswa."
			)
				.addField("1. Membuat Pengumuman", "` pr pengumuman tambah `")
				.addField("2. Menghapus Pengumuman", "` pr pengumuman hapus `");
			message.channel.send(cmdEmbedPengumuman);
			return;
		}
		try {
			const status = await check3(instanceId);
			if (!status.status) {
				message.channel.send(status.data);
				return;
			}
			const umumRef = admin
				.firestore()
				.collection("announcement")
				.doc(instanceId)
				.collection("pengumuman");

			const execTambah = async () => {
				const filter = (m) => m.author.id == message.author.id;

				message.channel.send("**Masukkan judul pengumuman:**");
				const titlePengumuman = await message.channel.awaitMessages(filter, {
					max: 1,
					time: 60 * 1000,
					errors: ["time"],
				});

				message.channel.send("**Masukkan isi pengumuman:**");

				const rawPengumuman = await message.channel.awaitMessages(filter, {
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

				let judulPengumuman = titlePengumuman.first().content;
				let isiPengumuman = rawPengumuman.first().content;
				let isiFile =
					rawFile.first().content.length > 5 ? rawFile.first().content : false;
				let id = nanoid(10);

				const normalEmbedPengumuman = normalEmbed(
					judulPengumuman,
					isiPengumuman
				).setAuthor(`id: ${id}`);

				if (isiFile) {
					normalEmbedPengumuman.addField("Dokumen", isiFile);
				}

				const execPost = async () => {
					try {
						const msg = {
							notification: {
								title: judulPengumuman.substring(0, 100),
								body: isiPengumuman.substring(0, 200),
							},
							topic: instanceId,
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
							content: isiPengumuman,
							created: new Date().toLocaleString("id").split(" ")[0],
							title: judulPengumuman,
						};

						if (isiFile) {
							let bedah = isiFile.split(" ");
							docPrep.file = bedah.slice(0, bedah.length - 1).join(" ");
							docPrep.url = bedah[bedah.length - 1];
							docPrep.type = "URL";
						}

						await umumRef.doc(id).set(docPrep);
						await admin.messaging().send(msg);

						message.channel.send(
							"Berhasil mengirimkan pengumuman :partying_face:"
						);
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

				message.channel.send(normalEmbedPengumuman).then((m) => {
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
					const exampleEmbedPengumuman = exampleEmbed(
						"pr pengumuman hapus <id>",
						"pr pengumuman hapus 1234567890",
						"Admin"
					);
					message.channel.send(exampleEmbedPengumuman);
					return;
				}

				const pRef = await umumRef.doc(args[1]).get();
				if (!pRef.exists) {
					message.channel.send(
						`:worried: Maaf, pengumuman dengan id ${args[1]} tidak ada`
					);
					return;
				}

				const data = pRef.data();
				const normalEmbedPengumuman = normalEmbed(
					data.title,
					data.content
				).setAuthor(`id: ${args[1]}`);

				if (data.file) {
					normalEmbedPengumuman.addField("Dokumen", `${data.file} ${data.url}`);
				}

				const filter2 = (reaction, user) => {
					return (
						["🇾", "🇳"].includes(reaction.emoji.name) &&
						user.id === message.author.id
					);
				};

				const execDeletePengumuman = async () => {
					try {
						await umumRef.doc(args[1]).delete();
						message.channel.send(
							"Berhasil menghapus pengumuman :partying_face:"
						);
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

				message.channel.send(normalEmbedPengumuman).then((m) => {
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
								return execDeletePengumuman();
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
