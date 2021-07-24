// * Import firebase-admin SDK
const admin = require("firebase-admin");

// * Import the firebase credential
const serviceAccount = require("./presentia-ca8ff-firebase-adminsdk-64cqv-add939783c.json");

// * check if there is an instance of firebase app
if (!admin.apps.length) {
	// * Initialize the app
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
	});
}

module.exports = admin;
