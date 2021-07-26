// * Import modules
const Discord = require("discord.js");
global.fetch = require("node-fetch");
const admin = require("./firebase");
const fs = require("fs");
const cron = require("cron");

// * Import configuration
const {
	botPrefix,
	botAuthor,
	botYear,
	botAuthorLogo,
} = require("./config.json");

// * Import custom independence command
const registrasi = require("./registrasi");
const normalEmbed = require("./normalEmbed");

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

	// * Create a reference to firestore
	const serverRef = admin.firestore().collection("discord");

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

const cronMingguan = new cron.CronJob(
	"0 20 * * 0",
	() => {
		const wadah = message.guild.channels.cache.find(
			(channel) => channel.name === "laporan"
		);
		if (!wadah) return;

		const haloEmbed = new normalEmbed("Halo semua", "Testing cron mingguan");

		wadah.send(haloEmbed);
	},
	null,
	true,
	"Asia/Jakarta"
);
