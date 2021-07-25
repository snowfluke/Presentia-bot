const check3 = require("../check3");
const admin = require("../firebase");

module.exports = {
	name: "[konfigurasi-3] final",
	type: "admin",
	description:
		"Perintah untuk finalisasi konfigurasi server presentia.\n` pr final `",
	async execute(message, args, instanceId) {
		if (!message.member.roles.cache.find((r) => r.name === "Admin")) {
			message.channel.send(
				"Anda bukan admin, tidak boleh mengakses perintah :worried:"
			);
			return;
		}

		try {
			const status = await check3(instanceId);
			if (!status.status) {
				message.channel.send(status.data);
				return;
			}

			const mhsRef = admin.firestore().collection("mahasiswa");
			const mhsSnap = await mhsRef.doc(instanceId).get();
			const mhsData = mhsSnap.data();

			const absentRef = admin.firestore().collection("absent");

			let kelas = mhsData.kelas;
			let matkul = [];

			for (let k of kelas) {
				const snap = await absentRef
					.doc(instanceId)
					.collection(k)
					.doc("absensi")
					.get();
				const snapData = snap.data();
				let mats = [];
				Object.keys(snapData).forEach((el) => mats.push(el));
				matkul.push({ kelas: k, matkul: mats });
			}

			message.channel.send(
				":white_check_mark: Memeriksa kelengkapan prosedur konfigurasi"
			);

			message.channel.send(":white_check_mark: Mempersiapkan pembuatan role");
			let checkRole = message.guild.roles.cache.find((r) => r.name === "Dosen");
			let roleAdmin = message.guild.roles.cache.find((r) => r.name === "Admin");

			if (checkRole) {
				message.channel.send(":x: Sudah terdapat role Dosen");
				return;
			}

			if (!roleAdmin) {
				message.channel.send(
					":x: Tidak terdapat role Admin. Silakan buat role Admin (lihat buku panduan)"
				);
				return;
			}

			await message.guild.roles.create({
				data: {
					name: "Dosen",
					color: "BLUE",
				},
				reason: "Role untuk dosen",
			});

			for (let s of kelas) {
				await message.guild.roles.create({
					data: {
						name: s,
						color: "YELLOW",
					},
					reason: "Role untuk kelas",
				});
			}

			for (let m of matkul) {
				for (let m2 of m.matkul) {
					await message.guild.roles.create({
						data: {
							name: m2 + "_" + m.kelas,
							color: "GREEN",
							permissions: 137481792,
						},
						reason: "Role untuk per matkul",
					});
				}
			}
			let categoryTotal = message.guild.channels.cache.filter(
				(c) => c.type === "category"
			).length;
			let index = 2;

			message.channel.send(":white_check_mark: Membuat role");

			message.channel.send(
				":white_check_mark: Mempersiapkan pembuatan channel"
			);

			let dosenRole = message.guild.roles.cache.find((r) => r.name === "Dosen");

			for (let kk of matkul) {
				message.guild.channels
					.create(kk.kelas, {
						type: "category",
						position: categoryTotal - 2 + index,
						permissionOverwrites: [
							{
								id: message.guild.id,
								deny: ["VIEW_CHANNEL"],
							},
						],
					})
					.then((cat) => {
						for (let mm of kk.matkul) {
							let mmm = message.guild.roles.cache.find(
								(r) => r.name === mm + "_" + kk.kelas
							);
							message.guild.channels.create(mm, {
								type: "text",
								parent: cat,
								permissionOverwrites: [
									{
										id: message.guild.id,
										deny: ["VIEW_CHANNEL"],
									},
									{
										id: roleAdmin.id,
										allow: 137481792,
									},
									{
										id: mmm.id,
										allow: 137481792,
									},
								],
							});
						}
					})
					.catch((err) => {
						console.log(err);
					});
				index++;
			}

			message.channel.send(":white_check_mark: Membuat channel");

			message.channel.send(
				"Berhasil menyelesaikan seluruh tahapan konfigurasi :partying_face:"
			);
			message.channel.send(
				":warning: Dimohon untuk tidak merubah konfigurasi nama channel, kategori channel, dan nama-nama role supaya Bot Presentia dapat berjalan dengan optimal"
			);
		} catch (error) {
			console.log(error);
			message.channel.send(
				":x: Terjadi kesalahan, mohon coba beberapa saat lagi"
			);
		}
	},
};
