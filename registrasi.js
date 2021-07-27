// * Import firebase module
const admin = require("./firebase");
const exampleEmbed = require("./exampleEmbed");

module.exports = {
	name: "registrasi",
	description: "Perintah untuk meregistrasikan server pertama kali",

	async execute(message, args) {
		//  parameter:
		// 	1. message: message Object
		// 	2. args: discordClient token for verification

		try {
			if (args?.length == 0 || !args) {
				const exampleEmbedRegis = exampleEmbed(
					"pr registrasi <token>",
					"pr registrasi 1234567890",
					"Admin"
				);
				message.channel.send(exampleEmbedRegis);
				return;
			}
			// * Create an instance and discord database reference
			const instanceRef = admin.firestore().collection("instance");
			const discordRef = admin.firestore().collection("discord");
			// * Search in instance database where the token is equal and not yet registered (admin still null)
			const server = await instanceRef
				.where("discordClient", "==", args)
				.where("admin", "==", "")
				.get();

			if (server.empty)
				return message.channel.send(
					":x: Kampus tidak ada atau sudah terdaftar di server lain"
				);

			// * Create the snapshot because it's queryObject and we need to transform into documentReferrence
			const serverSnapshot = await server.docs[0].ref.get();
			const serverData = serverSnapshot.data();

			// * Registering the server with channel owner id and guild id
			await instanceRef.doc(serverData.instanceId).update({
				admin: message.guild.ownerID.toString(),
				discordServer: message.guild.id.toString(),
			});

			// * Update the registered discord server list
			await discordRef.doc(message.guild.id.toString()).set({
				admin: message.guild.ownerID.toString(),
				instanceId: serverData.instanceId,
			});

			message.channel.send(
				"Berhasil mendaftarkan server! :partying_face:\nAnda sudah bisa mengakses perintah bantuan dengan perintah ` pr bantuan `.\nLihat prosedur konfigurasi server ` pr prosedur `."
			);
		} catch (error) {
			console.log(error);
			message.channel.send(
				":x: Terjadi kesalahan, mohon coba beberapa saat lagi"
			);

			let user = message.client.users.cache.get("607753400137940992");
			if (!user) return;
			user.send(error.message);
		}
	},
};
