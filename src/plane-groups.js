
const interpolate = ({value1, value2, proportion}) => {
	// linear
	return (proportion * value2) + ((1 - proportion) * value1);
};
const interpolateBeforeTransition = ({value1, value2, progress}) => {
	if (progress >= 0) return value2;

	return interpolate({value1, value2, proportion: progress + 1});
};
const interpolateAfterTransition = ({value1, value2, progress}) => {
	if (progress <= 0) return value1;

	return interpolate({value1, value2, proportion: progress});
};
const interpolateAcrossTransition = ({value1, value2, progress}) => {
	return interpolate({value1, value2, proportion: (progress + 1) / 2});
};

export default {
	p1: {
		equivalents: [
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
		],
		transitions: [{
			planeGroup: "p2",
			mappings: [0, 0],
			getPositions: aspect => (aspect < 1) ? [[0, 0.5], [0.5, 0.5]] : [[0.5, 0], [0.5, 0.5]],
			getTheta: interpolateAcrossTransition,
			getAspect: ({value1, value2, progress}) => {
				const midValue = (value1 + value2) / 2;

				if (value2 < 1) { // flat - side-by-side subcells
					if (progress <= 0) { // each subcell
						const terminalValue = midValue * Math.SQRT2;

						return interpolate({value1, value2: terminalValue, proportion: progress + 1});
					} else { // combined
						return interpolate({value1: midValue, value2, proportion: progress});
					}
				} else { // tall - one-upon-the-other subcells
					if (progress <= 0) { // each subcell
						const terminalValue = midValue / Math.SQRT2;

						return interpolate({value1, value2: terminalValue, proportion: progress + 1});
					} else { // combined
						return interpolate({value1: midValue, value2, proportion: progress});
					}
				}
			},
		}, {
			planeGroup: "p3",
			mappings: [0, 0, 0],
			getPositions: () => [[1/3, 2/3], [2/3, 1/3]],
			getTheta: interpolateBeforeTransition,
			getAspect: interpolateBeforeTransition,
		}],
	},
	p2: {
		equivalents: [
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
			[-1, 0, 0, 0, -1, 0, 0, 0, 1],
		],
		transitions: [{
			planeGroup: "p1",
			mappings: [0],
			getPositions: aspect => (aspect < 1) ? [[0.25, 0], [0.25, 0.5], [0.75, 0], [0.75, 0.5]] : [[0, 0.25], [0, 0.75], [0.5, 0.25], [0.5, 0.75]],
			getTheta: interpolateAcrossTransition,
			getAspect: ({value1, value2, progress}) => {
				const midValue = (value1 + value2) / 2;

				if (value2 < 1) { // flat cells on top of each other
					if (progress <= 0) { // joined cell
						return interpolate({value1, value2: midValue, proportion: progress + 1});
					} else {
						const startValue = midValue / Math.SQRT2;

						return interpolate({value1: startValue, value2, proportion: progress});
					}
				} else { // cells side-by-side
					if (progress <= 0) {
						return interpolate({value1, value2: midValue, proportion: progress + 1});
					} else {
						const startValue = midValue * Math.SQRT2;

						return interpolate({value1: startValue, value2, proportion: progress});
					}
				}
			},
		}],
	},
	p3: {
		equivalents: [
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
			[0, -1, 0, 1, -1, 0, 0, 0, 1],
			[-1, 1, 0, -1, 0, 0, 0, 0, 1],
		],
		flipped: true,
		transitions: [{
			planeGroup: "p1",
			mappings: [0],
			getPositions: () => [[1/3, 0], [2/3, 0], [0, 1/3], [0, 2/3], [1/3, 1/3], [2/3, 2/3]],
			getTheta: interpolateAfterTransition,
			getAspect: interpolateAfterTransition,
		}],
	}
};