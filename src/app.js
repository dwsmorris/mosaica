import React, {useReducer, useEffect, useRef} from 'react';
import {Stage, Layer, Circle, Line} from "react-konva";
import getColor from "./get-color.js";
import getMetrics from './get-metrics.js';
import transformVector from './transform-vector.js';
import generateEquivalents from './generate-equivalents.js';
import getLchs from "./get-lchs.js";
import chooseNextPlaneGroup from './choose-next-plane-group.js';
import getTheta from './get-theta.js';
import getAspect from "./get-aspect.js";
import applyAnimation from './apply-animation.js';
import constants from "./constants.js";
import getTransitionDetails from "./get-transition-details.js";

const {showCircles} = constants;
const transitionDuration = 10000; // ms

export default () => {
	const targetRef = useRef({X: window.innerWidth / 2, Y: window.innerHeight / 2});
	const [{
		windowSize, // {width: I, height: I}
		maxCellLineX, // I
		maxCellLineY, // I
		equivalents, // [[I, I]]
		locus, // {X: I, Y: I}
		currentPlaneGroup, // {planeGroup: S, theta: R}
		previousPlaneGroup, // {planeGroup: S, theta: R}?
		previousPlaneGroups, // {[planeGroup]: I}
		nextPlaneGroup, // {planeGroup: S, positions: [[R, R]], theta: R}
		theta, // R
		aspect, // srt(0.5-2)
		transitionPoint, // {X: R, Y: R}?
		lastLocusUpdate, // I
		transitionStart, // {ms: I, locus: {X: I, Y: I}}?
		lchs, // [{l: -1|0|1, c: -1|0|1, h: -1|0|1}]
		cells, // [{x, y}]
		flipped, // B
		cellHeight,
		cellWidth,
	}, dispatch] = useReducer((state, action) => {
		switch (action.type) {
			case "WINDOW_SIZE": return generateEquivalents({...state, ...getMetrics({...action.payload, theta: state.theta, aspect: state.aspect, flipped: state.flipped})});
			case "CALCULATE_TRANSITION": return (() => {
				const {X, Y} = state.locus;
				const [x, y] = transformVector(state.toCoordinates)([X, Y]);
				const cell = [Math.floor(x), Math.floor(y)];
				// generate transition points in this cell and those at +1 along each axis
				const transitionPoints = state.nextPlaneGroup.positions.flatMap(([x, y], position) => [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => 
					[transformVector(state.fromCoordinates)([a + cell[0] + x, b + cell[1] + y]), {position, translation: [a + cell[0], b + cell[1]]}])).map(([[x, y], indices]) => {
						const diffX = X - x;
						const diffY = Y - y;

						return [(diffX * diffX) + (diffY * diffY), indices, [x, y]];
					}).sort(([a], [b]) => a - b);
				const closest = transitionPoints[0][2];

				return {...state, transitionPoint: {X: closest[0], Y: closest[1], ...transitionPoints[0][1]}, transitionStart: {ms: Date.now(), locus: state.locus}};
			})();
			case "ANIMATE": return (() => {
				const ms = Date.now();

				if (state.transitionStart) {
					const offset = ms - state.transitionStart.ms;
					const progress = Math.min((offset / transitionDuration) * 2 - 1, 1);
					const magProgress = Math.abs(progress);
					const locus = {
						X: (state.transitionStart.locus.X * magProgress) + (state.transitionPoint.X * (1 - magProgress)),
						Y: (state.transitionStart.locus.Y * magProgress) + (state.transitionPoint.Y * (1 - magProgress)),
					};
					const transitionDetails = getTransitionDetails({planeGroup1: state.previousPlaneGroup || state.currentPlaneGroup, planeGroup2: state.nextPlaneGroup || state.currentPlaneGroup, progress});
					const updatedState = {
						...state,
						locus,
						lastLocusUpdate: ms,
						...transitionDetails,
						...(((progress > 0) && !state.previousPlaneGroup) ? {
							previousPlaneGroups: {
								...state.previousPlaneGroups,
								[state.currentPlaneGroup.planeGroup]: (state.previousPlaneGroups[state.currentPlaneGroup.planeGroup] || 0) + 1,
							},
							previousPlaneGroup: state.currentPlaneGroup,
							currentPlaneGroup: state.nextPlaneGroup,
							nextPlaneGroup: undefined,
						} : {}),
						...((progress === 1) ? {
							transitionStart: undefined,
							previousPlaneGroup: undefined,
							nextPlaneGroup: chooseNextPlaneGroup({currentPlaneGroup: state.currentPlaneGroup, previousPlaneGroups: state.previousPlaneGroups}),
						} : {}),
					};
					const metrics = getMetrics(updatedState);

					return generateEquivalents(metrics);
				} else {
					return applyAnimation({state, attractor: targetRef.current, ms});
				}
			})();
		}

		return state;
	}, undefined, () => {
		const currentPlaneGroup = {planeGroup: "p1", theta: getTheta("p1"), aspect: getAspect("p1"), lchs: [{}], mappings: [0], flipped: false, equivalents: [1]}; // dummy mappings to check cell arity

		return generateEquivalents({
			...getMetrics({
				width: window.innerWidth,
				height: window.innerHeight,
				theta: currentPlaneGroup.theta,
				aspect: currentPlaneGroup.aspect,
				flipped: currentPlaneGroup.flipped,
				locus: {
					X: window.innerWidth / 2,
					Y: window.innerHeight / 2,
				},
				currentPlaneGroup,
				nextPlaneGroup: chooseNextPlaneGroup({currentPlaneGroup, previousPlaneGroups: {}}),
				previousPlaneGroups: {},
				transitionPoint: undefined,
				lastLocusUpdate: Date.now(),
				transitionStartTime: undefined,
				previousPlaneGroup: undefined,
				lchs: [{}],
			}),
		});
	});
	const animationFrameRef = useRef();

	useEffect(() => {
		const handleResize = () => {
			// Use requestAnimationFrame to schedule the update
			requestAnimationFrame(() => {
				dispatch({
					type: "WINDOW_SIZE",
					payload: {
						width: window.innerWidth,
						height: window.innerHeight,
					},
				})
			});
		};

		// Attach the event listener
		window.addEventListener('resize', handleResize);

		// every period enact phase transition
		const transitionInterval = setInterval(() => dispatch({type: "CALCULATE_TRANSITION"}), 17000); // 7sec transition period

		// Clean up the event listener when the component is unmounted
		return () => {
			window.removeEventListener('resize', handleResize);
			clearInterval(transitionInterval);
		};
	}, []); // Empty dependency array to ensure this effect only runs once

	useEffect(() => {
		animationFrameRef.current = requestAnimationFrame(() => dispatch({type: "ANIMATE"}));

		return () => cancelAnimationFrame(animationFrameRef.current);
	}, [locus, transitionPoint]); // run every time we set a new locus or apply transition

	const delta = windowSize[flipped ? "width" : "height"] / 2 * Math.tan(theta);
	const cellArity = currentPlaneGroup.mappings.length;

	return <Stage
		width={windowSize.width}
		height={windowSize.height}
		onMouseMove={e => targetRef.current = {X: e.evt.clientX, Y: e.evt.clientY}}
	>
		<Layer>
			{/* horizontal axis */}
			{(() => {  // circles mode
				if (!showCircles) return null;

				if (flipped) return Array.from({length: maxCellLineY * 2 + 1}, (_, index) => index - maxCellLineY).map(offset => (y => <Line stroke="black" strokeWidth={0.3} key={`horizontal-${offset}`} points={[y, 0, y, windowSize.height]}/>)((windowSize.width / 2) + (offset * cellHeight)));

				return Array.from({length: maxCellLineY * 2 + 1}, (_, index) => index - maxCellLineY).map(offset => (y => <Line stroke="black" strokeWidth={0.3} key={`horizontal-${offset}`} points={[0, y, windowSize.width, y]}/>)((windowSize.height / 2) + (offset * cellHeight)));
			})()}

			{/* vertical axes */}
			{(() => {
				if (!showCircles) return null;

				if (flipped) return Array.from({length: maxCellLineX * 2 + 1}, (_, index) => index - maxCellLineX).map(offset => (x => <Line stroke="black" strokeWidth={0.3} key={`vertical-${offset}`} points={[0, x - delta, windowSize.width, x + delta]}/>)((windowSize.height / 2) + (offset * cellWidth)));

				return Array.from({length: maxCellLineX * 2 + 1}, (_, index) => index - maxCellLineX).map(offset => (x => <Line stroke="black" strokeWidth={0.3} key={`vertical-${offset}`} points={[x + delta, 0, x - delta, windowSize.height]}/>)((windowSize.width / 2) + (offset * cellWidth)));
			})()}

			{/* cells */}
			{showCircles ? null : cells.map((points, index) => points ? <Line key={`line-${index}`} points={points} closed fill={getColor(lchs[index % cellArity])} stroke="black"/> : null)}

			{/* symmetry equivalent points of locus */}
			{showCircles ? equivalents.map(([X, Y], index) => <Circle key={`circle-${index}`} x={X} y={Y} radius={10} fill={getColor(lchs[index % cellArity])}/>) : null}
		</Layer>
	</Stage>
};
