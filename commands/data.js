// * Import SheetJS module
const XLSX = require("xlsx");
const admin = require("../firebase");
const cmdEmbed = require("../cmdEmbed");

module.exports = {
	name: "data",
	type: "admin",
	description:
		"Perintah untuk mengunggah data keperluan konfigurasi Presentia.\n` pr data `",
	async execute(message, args, instanceId) {
		// parameter:
		// 1. message: message object
		// 2. args: <mhs, jadwal>
		if (!message.member.roles.cache.find((r) => r.name === "Admin")) {
			message.channel.send(
				"Anda bukan admin, tidak boleh mengakses perintah :worried:"
			);
			return;
		}

		if (args.length != 1) {
			const cmdEmbedLokasi = cmdEmbed(
				"Data",
				"Presentia membutuhkan data agar bisa berjalan untuk mengatur jadwal, pengumuman, tugas kelas dan pencatatan kehadiran mahasiswa."
			)
				.addField("1. Menambahkan Data Mahasiswa", "` pr data mhs `")
				.addField("2. Menambahkan Data Jadwal", "` pr data jadwal `")
				.addField("4. Menghapus Seluruh Data", "` pr data reset `");

			return message.channel.send(cmdEmbedLokasi);
		}
		try {
			const db = admin.firestore();
			const mhsRef = admin.firestore().collection("mahasiswa");
			const mhsSnap = await mhsRef.doc(instanceId).get();
			const isMhsExist = mhsSnap.exists;
			const tugasRef = admin.firestore().collection("task");
			const umumRef = admin.firestore().collection("announcement");
			const jadwalRef = admin.firestore().collection("schedule");
			const jadwalSnap = await jadwalRef.doc(instanceId).listCollections();
			const isJadwalExist = jadwalSnap.length > 0 ? true : false;
			const absentRef = admin.firestore().collection("absent");

			let urlFile;
			const checkAttachment = async () => {
				message.channel.send(":white_check_mark: Menganalisis file");

				// * Get the first attachment
				let msgAttachmentFirst = message.attachments.array()[0];

				// * Check if there is an attachment
				if (msgAttachmentFirst) {
					// * Get the attachment URL and the filetype based on the last dot (.) in URL
					// * Return if it's not xlsx
					const urlAttachment = msgAttachmentFirst?.url;
					if (!urlAttachment) {
						message.channel.send(":x: Gagal mendapatkan file yang diunggah");
						return false;
					}

					const urlAttachmentArray = urlAttachment.split(".");
					const fileTypeAttachment =
						urlAttachmentArray[urlAttachmentArray.length - 1];

					if (fileTypeAttachment !== "xlsx") {
						message.channel.send(
							":x: Format file tidak didukung, hanya menerima tipe (xlsx)"
						);
						return false;
					}

					urlFile = urlAttachment;
					message.channel.send(":white_check_mark: Mengubah format data");
					return true;
				}
				message.channel.send(":x: File tidak ada");
				return false;
			};

			const upMhs = async () => {
				if (isMhsExist)
					return message.channel.send(":x: Data Mahasiswa sudah ada");

				const isValid = await checkAttachment();
				if (!isValid)
					return message.channel.send(
						":worried: Maaf, gagal mengunggah data. Silakan mencoba kembali"
					);

				message.channel.send(":white_check_mark: Membuat database mahasiswa");
				let mhsList;
				await fetch(urlFile)
					.then(async (response) => {
						if (!response.ok) throw new Error("fetch failed");
						return response.arrayBuffer();
					})
					.then(function (arrayBuffer) {
						// * Parsing the received buffer
						const data = new Uint8Array(arrayBuffer);
						const workbook = XLSX.read(data, { type: "array" });

						const firstSheetName = workbook.SheetNames[0];
						const worksheet = workbook.Sheets[firstSheetName];
						const jsonResult = XLSX.utils.sheet_to_json(worksheet, {
							raw: true,
						});

						const result = JSON.parse(JSON.stringify(jsonResult));

						mhsList = result;
					})
					.catch((er) => {
						console.log(er);
						message.channel.send(
							":x: Terjadi kesalahan saat membuka file, mohon coba beberapa saat lagi"
						);
					});

				message.channel.send(":white_check_mark: Mengecek data mahasiswa");
				let kelasList = [...new Set(mhsList.map((el) => el.Kelas))];
				if (
					mhsList.length == 0 ||
					mhsList.length > 400 ||
					kelasList.length == 0 ||
					kelasList.length > 15
				)
					return message.channel.send(
						":worried: Maaf, kami hanya menerima 450 mahasiswa dan 15 kelas, silakan buat server baru untuk memitigasi kerumitan server"
					);

				mhsList = mhsList.map((el) => {
					return {
						NIM: el.NIM.toString(),
						Nama: el.Nama.toLowerCase()
							.split(" ")
							.map((el) => el[0].toUpperCase() + el.substring(1))
							.join(" "),
						Kelas: el.Kelas,
					};
				});

				message.channel.send(
					":white_check_mark: Memperbarui database mahasiswa"
				);
				let batch = db.batch();

				mhsList.forEach((el) => {
					let mhsEachRef = mhsRef.doc(instanceId).collection("mhs").doc(el.NIM);
					batch.set(mhsEachRef, {
						device: "",
						kelas: el.Kelas,
						name: el.Nama,
						uniqueId: el.NIM,
					});
				});

				try {
					await batch.commit();
					await mhsRef.doc(instanceId).set({
						kelas: kelasList,
					});
					message.channel.send(
						"Berhasil menambahkan data mahasiswa :partying_face:"
					);
				} catch (error) {
					console.log(error);
					message.channel.send(
						":x: Terjadi kesalahan, mohon coba beberapa saat lagi"
					);
				}
			};

			const upJadwal = async () => {
				if (!isMhsExist)
					return message.channel.send(":x: Data Mahasiswa belum ada");
				if (isJadwalExist)
					return message.channel.send(":x: Data Jadwal sudah ada");

				const isValid = await checkAttachment();
				if (!isValid)
					return message.channel.send(
						":worried: Maaf, gagal mengunggah data. Silakan coba lagi"
					);
				message.channel.send(":white_check_mark: Mengecek kelengkapan data");

				let jadwalList;
				await fetch(urlFile)
					.then(async (response) => {
						if (!response.ok) throw new Error("fetch failed");
						return response.arrayBuffer();
					})
					.then(function (arrayBuffer) {
						// * Parsing the received buffer
						const data = new Uint8Array(arrayBuffer);
						const workbook = XLSX.read(data, { type: "array" });

						const firstSheetName = workbook.SheetNames[0];
						const worksheet = workbook.Sheets[firstSheetName];
						const jsonResult = XLSX.utils.sheet_to_json(worksheet, {
							raw: true,
						});

						const result = JSON.parse(JSON.stringify(jsonResult));

						jadwalList = result;
					})
					.catch((er) => {
						console.log(er);
						message.channel.send(
							":x: Terjadi kesalahan saat membuka file, mohon coba beberapa saat lagi"
						);
					});

				message.channel.send(":white_check_mark: Menganalisis file");

				const daftarKelas = [...new Set(jadwalList.map((el) => el.Kelas))];
				const dataMhs = mhsSnap.data();
				const daftarKelasMhs = dataMhs.kelas;

				if (daftarKelas.length != daftarKelasMhs.length) {
					message.channel.send(":x: Daftar kelas tidak sesuai\n");

					let list = daftarKelas.join(", ");
					let list2 = daftarKelasMhs.join(", ");

					message.channel.send("Daftar kelas dalam data mahasiswa: " + list);
					message.channel.send("Daftar kelas dalam data jadwal: " + list2);

					return;
				}

				let isSync = [];
				daftarKelasMhs.forEach((el) => {
					if (!daftarKelas.includes(el)) {
						isSync.push(el);
					}
				});

				if (isSync.length != 0) {
					message.channel.send(
						`:x: Kelas ${isSync.join(", ")} tidak terdapat dalam data jadwal.`
					);
					return;
				}
				message.channel.send(":white_check_mark: Sinkronisasi data kelas");

				const validate =
					/^(0?[0-9]|1[0-9]|2[0-3])\.([0-5][0-9])+-(0?[0-9]|1[0-9]|2[0-3])\.([0-5][0-9])+:[a-zA-Z ]+$/i;
				const isValidSchedule = (schedule) => {
					let isValidResult = true;

					for (let obj of schedule) {
						for (let key in obj) {
							if (key != "Kelas") {
								let jadwal = obj[key]
									.split(",")
									.map((perMatkul) => perMatkul.trim());

								for (let perMatkul of jadwal) {
									if (!validate.test(perMatkul)) {
										return { isValid: false, data: perMatkul };
									}

									let perWaktu = perMatkul.split(":")[0].split("-");
									if (perWaktu[0] > perWaktu[1]) {
										return { isValid: false, data: perMatkul };
									}
								}

								let waktu = jadwal
									.map((perMatkul) => perMatkul.split(":")[0].split("-"))
									.flat();
								waktu.forEach((el, id, arr) => {
									if (el > arr[id + 1]) {
										return { isValid: false, data: obj[key] };
									}
								});
							}
						}
					}
					return { isValid: true };
				};

				const validation = isValidSchedule(jadwalList);
				if (!validation.isValid) {
					message.channel.send(`:worried: ${validation.data} tidak valid`);
				}
				message.channel.send(":white_check_mark: Validasi data jadwal");

				const listMatkul = jadwalList.map((el) => {
					let listMatkul = [];

					for (let day in el) {
						if (day != "Kelas") {
							let jadwal = el[day]
								.split(",")
								.map((perMatkul) => perMatkul.trim());

							let matkul = jadwal
								.map((perMatkul) => perMatkul.split(":")[1])
								.flat();

							for (let m in matkul) {
								let name = matkul[m];
								if (name.length >= 4) {
									name = name
										.toLowerCase()
										.split(" ")
										.slice(0, 6)
										.map((e) =>
											e.length >= 3
												? e[0].toUpperCase() + e.substring(1)
												: e.toUpperCase()
										)
										.join(" ")
										.substring(0, 50);
								} else {
									name = name.toUpperCase();
								}
								listMatkul.push(name);
							}
						}
					}
					return {
						Kelas: el.Kelas,
						ListMatkul: [...new Set(listMatkul)],
					};
				});

				message.channel.send(":white_check_mark: Mengekstrak data mata kuliah");

				let batch = db.batch();
				let copyObj = {};

				for (let i in listMatkul) {
					let e = listMatkul[i];
					let eObj = {};

					e.ListMatkul.forEach((s) => (eObj[s] = []));
					copyObj[e.Kelas] = eObj;

					await mhsRef
						.doc(instanceId)
						.collection("mhs")
						.where("kelas", "==", e.Kelas)
						.get()
						.then((q) => {
							q.forEach((el) => {
								let eData = el.data();
								let mhsEachRef = mhsRef
									.doc(instanceId)
									.collection("mhs")
									.doc(eData.uniqueId);

								batch.set(mhsEachRef, { ...eData, ...eObj });
							});
						})
						.catch((err) => {
							console.log(err);
							message.channel.send(
								":x: Gagal memperbarui data mahasiswa, periksa kembali data jadwal dan coba beberapa saat lagi"
							);
						});
				}

				message.channel.send(
					":white_check_mark: Memperbarui database mahasiswa"
				);

				for (let index in listMatkul) {
					let e = listMatkul[index];
					let xRef = absentRef
						.doc(instanceId)
						.collection(e.Kelas)
						.doc("absensi");

					batch.set(xRef, copyObj[e.Kelas]);
				}

				message.channel.send(":white_check_mark: Membuat database absensi");

				let jadwalRef = admin.firestore().collection("schedule");
				let comparator = [
					"Minggu",
					"Senin",
					"Selasa",
					"Rabu",
					"Kamis",
					"Jumat",
					"Sabtu",
				];

				const obstruct = (day, id, dayName) => {
					let templateObj = {
						id: id,
						day: dayName,
						onlineAbsent: [],
						start: [],
						end: [],
						name: [],
						changed: false,
						lastChangedAt: "",
					};

					if (day !== undefined) {
						let d = day.split(",").map((e) => e.trim().split(":"));
						for (let dId of d) {
							templateObj.start.push(dId[0].split("-")[0]);
							templateObj.end.push(dId[0].split("-")[1]);

							let name = dId[1];
							if (name.length >= 4) {
								name = name
									.toLowerCase()
									.split(" ")
									.slice(0, 6)
									.map((e) =>
										e.length >= 3
											? e[0].toUpperCase() + e.substring(1)
											: e.toUpperCase()
									)
									.join(" ")
									.substring(0, 50);
							} else {
								name = name.toUpperCase();
							}
							templateObj.name.push(name);
							templateObj.onlineAbsent.push(false);
						}
					}

					return templateObj;
				};

				for (let objId in jadwalList) {
					let obj = jadwalList[objId];

					for (let dayId in comparator) {
						let day = comparator[dayId];
						let dayName = day == "Jumat" ? "Jum'at" : day;

						let eachDayObj = obstruct(obj[day], dayId, dayName);
						let eachDayRef = jadwalRef
							.doc(instanceId)
							.collection(obj.Kelas)
							.doc(dayName);

						batch.set(eachDayRef, eachDayObj);
					}
				}

				const announcementRef = admin
					.firestore()
					.collection("announcement")
					.doc(instanceId);
				const taskRef = admin.firestore().collection("task").doc(instanceId);
				batch.set(announcementRef, { init: "init" });
				batch.set(taskRef, { init: "init" });

				message.channel.send(":white_check_mark: Membuat database jadwal");

				try {
					await batch.commit();
					message.channel.send(
						"Berhasil mengunggah data jadwal :partying_face:"
					);
				} catch (error) {
					console.log(er);
					message.channel.send(
						":x: Terjadi Kesalahan dalam menggungah data jadwal"
					);
				}
			};

			async function deleteCollection(collectionRef) {
				const query = collectionRef.orderBy("__name__").limit(400);

				return new Promise((resolve, reject) => {
					deleteQueryBatch(query, resolve).catch(reject);
				});
			}

			async function deleteQueryBatch(query, resolve) {
				const snapshot = await query.get();

				const batchSize = snapshot.size;
				if (batchSize === 0) {
					// When there are no documents left, we are done
					resolve();
					return;
				}

				// Delete documents in a batch
				const batch = db.batch();
				snapshot.docs.forEach((doc) => {
					batch.delete(doc.ref);
				});
				await batch.commit();

				// Recurse on the next process tick, to avoid
				// exploding the stack.
				process.nextTick(() => {
					deleteQueryBatch(query, resolve);
				});
			}

			const execDeleteAll = async () => {
				if (!isMhsExist)
					return message.channel.send(":x: Data Mahasiswa belum ada");

				if (!isJadwalExist)
					return message.channel.send(":x: Data Jadwal belum ada");

				message.channel.send(":white_check_mark: Mengecek kelengkapan data");

				try {
					let mhsData = mhsSnap.data();
					let kelas = mhsData.kelas;

					let deviceRef = admin.firestore().collection("devices");
					let batchDevice = db.batch();
					for (let s of kelas) {
						await mhsRef
							.doc(instanceId)
							.collection("mhs")
							.where("kelas", "==", s)
							.get()
							.then((q) => {
								q.forEach((el) => {
									let eData = el.data();
									if (eData.device != "") {
										batchDevice.delete(deviceRef.doc(eData.device));
									}
								});
							});
					}

					batchDevice.commit();

					message.channel.send(
						":white_check_mark: Menghapus seluruh data perangkat"
					);

					await deleteCollection(mhsRef.doc(instanceId).collection("mhs"));
					await mhsRef.doc(instanceId).delete();
					message.channel.send(
						":white_check_mark: Menghapus seluruh data mahasiswa"
					);

					await deleteCollection(tugasRef.doc(instanceId).collection("tugas"));
					await deleteCollection(
						umumRef.doc(instanceId).collection("pengumuman")
					);
					message.channel.send(
						":white_check_mark: Menghapus seluruh data tugas dan pengumuman"
					);

					for (let k of kelas) {
						await deleteCollection(absentRef.doc(instanceId).collection(k));
						await deleteCollection(jadwalRef.doc(instanceId).collection(k));
					}

					await absentRef.doc(instanceId).delete();
					message.channel.send(
						":white_check_mark: Menghapus seluruh data absensi"
					);

					await jadwalRef.doc(instanceId).delete();
					message.channel.send(
						":white_check_mark: Menghapus seluruh data jadwal"
					);

					await admin
						.firestore()
						.collection("announcement")
						.doc(instanceId)
						.delete();

					message.channel.send(
						":white_check_mark: Menghapus seluruh data pengumuman"
					);

					await admin.firestore().collection("task").doc(instanceId).delete();
					message.channel.send(
						":white_check_mark: Menghapus seluruh data tugas"
					);

					let blacklistRoles = ["Admin", "Presentia-bot", "@everyone"];
					await message.guild.roles.fetch().then((roles) => {
						roles.cache.forEach((el) => {
							if (!blacklistRoles.includes(el.name)) {
								console.log(el);

								el.delete();
							}
						});
					});
					message.channel.send(":white_check_mark: Menghapus semua role");

					let blacklistChannels = [
						"publik",
						"moderasi",
						"selamat-datang",
						"konfigurasi",
						"pengumuman",
						"ampu-matkul",
						"diskusi",
						"data-prepare",
						"coretan",
						"diskusi-suara",
						"lainnya",
						"perintah-bot",
						"catatan",
						"laporan",
					];

					await message.guild.fetch().then((guild) => {
						guild.channels.cache.forEach((el) => {
							if (!blacklistChannels.includes(el.name.toLowerCase())) {
								console.log(el.name);
								el.delete();
							}
						});
					});
					message.channel.send(":white_check_mark: Menghapus semua channel");

					message.channel.send("Berhasil menghapus semua data :partying_face:");
				} catch (error) {
					console.log(error);
					message.channel.send(
						":x: Terjadi kesalahan, mohon coba beberapa saat lagi"
					);
				}
			};

			const upReset = async () => {
				// if (message.author.id != message.guild.ownerID)
				// 	return message.channel.send(
				// 		":worried: Maaf, Anda bukan pemilik server"
				// 	);

				const filter = (reaction, user) => {
					return (
						["🇾", "🇳"].includes(reaction.emoji.name) &&
						user.id === message.author.id
					);
				};

				message.channel
					.send(
						"**Apakah anda yakin ingin menghapus seluruh data? (termasuk catatan absensi)**"
					)
					.then((m) => {
						m.react("🇾");
						m.react("🇳");
						m.awaitReactions(filter, {
							max: 1,
							time: 15 * 1000,
							errors: ["time"],
						})
							.then((collected) => {
								const reaction = collected.first();
								if (reaction.emoji.name === "🇾") {
									return execDeleteAll();
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
				case "mhs":
					upMhs();
					break;
				case "jadwal":
					upJadwal();
					break;
				case "reset":
					upReset();
					break;
				default:
					message.channel.send(":worried: Maaf, perintah tidak dikenali");
					break;
			}
		} catch (error) {
			console.log(error);
			message.channel.send(
				":x: Terjadi kesalahan, mohon coba beberapa saat lagi"
			);
		}
	},
};
