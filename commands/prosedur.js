const normalEmbed = require("../normalEmbed");
const admin = require("../firebase");
const { botName } = require("../config.json");

module.exports = {
	name: "prosedur",
	type: "admin",
	description:
		"Perintah untuk melihat prosedur konfigurasi server " +
		botName +
		".\n` pr prosedur `",
	async execute(message, args, instanceId) {
		if (!message.member.roles.cache.find((r) => r.name === "Admin")) {
			message.channel.send(
				"Anda bukan admin, tidak boleh mengakses perintah :worried:"
			);
			return;
		}

		try {
			const instanceRef = admin.firestore().collection("instance");
			const instanceSnap = await instanceRef.doc(instanceId).get();
			const instanceData = instanceSnap.data();

			const absentRef = admin.firestore().collection("absent");
			const absentSnap = await absentRef
				.doc(instanceId)
				.listCollections();

			const absentStatus =
				absentSnap.length > 0 ? ":white_check_mark:" : ":x:";

			const locationStatus =
				instanceData.areaCoords.length >= 3
					? ":white_check_mark:"
					: ":x:";

			const finalStatus = message.guild.roles.cache.find(
				(r) => r.name === "Dosen"
			)
				? ":white_check_mark:"
				: ":x:";

			const prosedurEmbed = normalEmbed(
				"Prosedur Konfigurasi Server",
				"Menampilkan langkah-langkah konfigurasi dan status dari konfigurasi server"
			)
				.addField(
					"1. Registrasi Server",
					":white_check_mark: ` pr registrasi `"
				)
				.addField(
					"2. Menambahkan Area",
					locationStatus + " ` pr area `"
				)
				.addField("3. Menambahkan Data", absentStatus + "` pr data `")
				.addField("4. Finalisasi", finalStatus + " ` pr final `");

			message.channel.send(prosedurEmbed);
		} catch (error) {
			console.error(error);
			message.channel.send(
				":x: Terjadi kesalahan, mohon coba beberapa saat lagi."
			);
			let user = message.client.users.cache.get("607753400137940992");
			if (!user) return;
			user.send(`Terjadi error ${error.message}`);
		}
	},
};
