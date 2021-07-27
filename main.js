// * Import modules
const Discord = require("discord.js");
global.fetch = require("node-fetch");
const admin = require("./firebase");
const fs = require("fs");
const cron = require("cron");
const XLSX = require("xlsx");

// * Import configuration
const {
	botPrefix,
	botAuthor,
	botYear,
	botAuthorLogo,
} = require("./config.json");

// * Import custom independence command
const registrasi = require("./registrasi");

// * Genereate discord client and command collection
const client = new Discord.Client();
client.commands = new Discord.Collection();

// * Import commands from commands folder
const commandFiles = fs
	.readdirSync("./commands")
	.filter((file) => file.endsWith(".js"));

// * Assign imported command into discord command collection
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

// * Event listener when the bot is ready
client.once("ready", () => {
	console.log("Bot Presentia siap melaksanakan tugas!");

	// * Set the bot description
	client.user.setActivity("bantuan | pr bantuan", {
		type: "PLAYING",
		url: "http://presentia.stmikkomputama.ac.id/",
	});
});

const serverRef = admin.firestore().collection("discord");
const absentRef = admin.firestore().collection("absent");
const mhsRef = admin.firestore().collection("mahasiswa");

// * Event listener when there is a message send in a server
client.on("message", async (message) => {
	// parameter:
	// 1. message: message object

	// * Message checking
	if (!message.guild) return;
	if (message.author.bot) return;
	if (!message.content.startsWith(botPrefix)) return;

	// * Separate argument and command name
	const args = message.content.slice(botPrefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	// * Check if the server is registered or not
	const server = await serverRef.doc(message.guild.id.toString()).get();
	if (!server.exists) {
		// * If server is not registered and try to register
		if (commandName == "registrasi") {
			// * Registering with the token
			await registrasi.execute(message, args[0]);
			return;
		}
		return message.channel.send(":x: Server belum diregistrasikan");
	}

	const serverData = server.data();
	// * Execute the following command
	const command = client.commands.get(commandName);
	try {
		command.execute(message, args, serverData.instanceId);
	} catch (error) {
		message.channel.send(":worried: Maaf, perintah tidak dikenali");
	}
});

// * Login the bot
client.login(process.env.BOT_TOKEN);

client.on("guildMemberAdd", (member) => {
	const welcomeChannel = member.guild.channels.cache.find(
		(channel) => channel.name === "selamat-datang"
	);
	if (!welcomeChannel) return;

	const welcomeEmbed = new Discord.MessageEmbed()
		.setTitle(`Halo, ${member.user.username}`)
		.setDescription(
			`Selamat datang di server ${member.guild.name}. Silakan mengunjungi channel **#ampu-matkul** untuk mengampu mata kuliah. Untuk bantuan, ketikkan perintah \` pr bantuan \` pada channel **#ampu-matkul**.\n**:wave: Selamat bergabung, ${member}**`
		)
		.setThumbnail(member.user.displayAvatarURL())
		.setColor("#119DA4")
		.setFooter(`Dipersembahkan oleh. ${botAuthor} - ${botYear}`, botAuthorLogo);

	welcomeChannel.send(welcomeEmbed);
});

const getDataLaporan = async (kelas, weekly, instanceId) => {
	const snapKelas = await mhsRef.doc(instanceId).get();
	const data = snapKelas.data();
	let checker = data.kelas.map((el) => el.toLowerCase());

	if (!checker.includes(kelas.toLowerCase())) return { empty: true };

	let indexKelas = checker.indexOf(kelas.toLowerCase());
	kelas = data.kelas[indexKelas];

	const dataPerKelas = await mhsRef
		.doc(instanceId)
		.collection("mhs")
		.where("kelas", "==", kelas)
		.get();

	if (dataPerKelas.docs.length == 0) return { empty: true };

	const matkulSnap = await absentRef
		.doc(instanceId)
		.collection(kelas)
		.doc("absensi")
		.get();

	if (!matkulSnap.exists) return { empty: true };

	const matkulData = matkulSnap.data();
	const listMatkul = Object.keys(matkulData);

	const obj = [];
	const dataNya = await dataPerKelas.docs
		.map((doc) => doc.data())
		.sort((a, b) => a.name - b.name);

	dataNya.forEach((data, id) => {
		let tempObj = {
			No: id + 1,
			NIM: data.uniqueId,
			Nama: data.name,
			Kelas: data.kelas,
			H: 0,
			S: 0,
			I: 0,
			A: 0,
			"Total Pertemuan": 0,
			Performa: "",
		};

		listMatkul.forEach((el) => {
			if (weekly) {
				if (matkulData[el].length == 0) return;
				let lastMeetIndex = matkulData[el].length - 1;
				let statRef = data[el][lastMeetIndex];

				if (!statRef) {
					tempObj["A"] += 1;
				} else {
					tempObj[statRef[0]] += 1;
				}
				if (matkulData[el].length != 0) {
					tempObj["Total Pertemuan"] += 1;
				}
				return;
			}

			let stat = {
				H: data[el].filter((el) => el == "H").length,
				S: data[el].filter((el) => el[0] == "S").length,
				I: data[el].filter((el) => el[0] == "I").length,
				A: matkulData[el].length - data[el].filter((el) => true).length,
			};

			tempObj.H += parseInt(stat.H);
			tempObj.S += parseInt(stat.S);
			tempObj.I += parseInt(stat.I);
			tempObj.A += parseInt(stat.A);
			tempObj["Total Pertemuan"] += parseInt(matkulData[el].length);
		});

		let performa = (tempObj.H / tempObj["Total Pertemuan"]) * 100;
		tempObj.Performa = isNaN(performa) ? "0%" : performa + "%";

		if (tempObj.H == 0) tempObj.H = "";
		if (tempObj.S == 0) tempObj.S = "";
		if (tempObj.I == 0) tempObj.I = "";
		if (tempObj.A == 0) tempObj.A = "";

		obj.push(tempObj);
	});

	let name = "Laporan_" + kelas + "_" + new Date().toLocaleDateString("id");
	name = name.split("/").join("_");
	return { name: name, obj: obj, kelas: kelas };
};

const cronMingguan = new cron.CronJob(
	"0 20 * * 0",
	() => {
		client.guilds.cache.forEach(async (g) => {
			try {
				let server = await serverRef.doc(g.id.toString()).get();
				if (!server.exists) return;

				let serverData = server.data();
				let instanceId = serverData.instanceId;

				let snapKelas = await mhsRef.doc(instanceId).get();
				if (!snapKelas.exists) return;

				let listKelas = snapKelas.data();

				let obj = [];

				for (let i = 0; i < listKelas.kelas.length; i++) {
					let datas = await getDataLaporan(
						listKelas.kelas[i],
						true,
						instanceId
					);
					if (datas.empty) return;

					obj.push(datas);
				}

				if (obj.length == 0) return;

				let wadah = g.channels.cache.find(
					(channel) => channel.name === "laporan"
				);
				if (!wadah) return;

				const wb = XLSX.utils.book_new();
				obj.forEach((el, id) => {
					let sheetname = el.kelas.substring(0, 30);
					let ws = XLSX.utils.json_to_sheet(el.obj);
					XLSX.utils.book_append_sheet(wb, ws, sheetname.replace("/", ""));
				});

				const f = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
				let d = new Date().toLocaleDateString("id");
				d = d.split("/").join("_");

				wadah.send(`Statistik performa absensi mahasiswa 1 minggu terakhir`);
				wadah.send({
					files: [
						{
							attachment: f,
							name: `Statistik_Absensi_Mingguan_${d}.xlsx`,
						},
					],
				});
			} catch (error) {
				console.log(error);
			}
		});
	},
	null,
	true,
	"Asia/Jakarta"
);

const cronBulanan = new cron.CronJob(
	"25 17 27 * *",
	() => {
		client.guilds.cache.forEach(async (g) => {
			try {
				let server = await serverRef.doc(g.id.toString()).get();
				if (!server.exists) return;

				let serverData = server.data();
				let instanceId = serverData.instanceId;

				let snapKelas = await mhsRef.doc(instanceId).get();
				if (!snapKelas.exists) return;

				let listKelas = snapKelas.data();

				let obj = [];

				for (let i = 0; i < listKelas.kelas.length; i++) {
					let datas = await getDataLaporan(
						listKelas.kelas[i],
						false,
						instanceId
					);
					if (datas.empty) return;

					obj.push(datas);
				}

				if (obj.length == 0) return;

				let wadah = g.channels.cache.find(
					(channel) => channel.name === "laporan"
				);
				if (!wadah) return;

				const wb = XLSX.utils.book_new();
				obj.forEach((el, id) => {
					let sheetname = el.kelas.substring(0, 30);
					let ws = XLSX.utils.json_to_sheet(el.obj);
					XLSX.utils.book_append_sheet(wb, ws, sheetname.replace("/", ""));
				});

				const f = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
				let d = new Date().toLocaleDateString("id");
				d = d.split("/").join("_");

				wadah.send(
					`Statistik performa absensi mahasiswa dari pertemuan 0 sampai sekarang`
				);
				wadah.send({
					files: [
						{
							attachment: f,
							name: `Statistik_Absensi_Bulanan_${d}.xlsx`,
						},
					],
				});
			} catch (error) {
				console.log(error);
			}
		});
	},
	null,
	true,
	"Asia/Jakarta"
);
