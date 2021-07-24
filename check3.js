const admin = require("./firebase");

const check3 = async (instanceId) => {
	try {
		const mhsRef = admin.firestore().collection("mahasiswa");
		const mhsSnap = await mhsRef.doc(instanceId).get();
		if (!mhsSnap.exists) {
			return {
				status: false,
				data: ":x: Data Mahasiswa belum ada. Admin harap melengkapi.",
			};
		}

		const scheduleRef = admin.firestore().collection("absent");
		const scheduleSnap = await scheduleRef.doc(instanceId).listCollections();
		if (scheduleSnap.length == 0) {
			return {
				status: false,
				data: ":x: Data Jadwal belum ada. Admin harap melengkapi.",
			};
		}

		const instanceRef = admin.firestore().collection("instance");
		const instanceSnap = await instanceRef.doc(instanceId).get();
		const instanceData = instanceSnap.data();
		if (instanceData.areaCoords.length == 0) {
			return {
				status: false,
				data: ":x: Data titik area belum ada. Admin harap melengkapi.",
			};
		}

		return { status: true, data: "" };
	} catch (error) {
		console.log(error);
		return { status: false, data: "Terjadi kesalahan, mohon coba lagi nanti" };
	}
};

module.exports = check3;
