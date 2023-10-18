const hexagonalTheta = Math.PI / 6;

export default planeGroup => {
	switch(planeGroup) {
		case "p1":
		case "p2":
			return Math.random() * Math.PI / 4; // 0 to 45 degrees

		case "p3": return hexagonalTheta;
	}

	return 0; // right angles (theta = gamma - pi/2)
};