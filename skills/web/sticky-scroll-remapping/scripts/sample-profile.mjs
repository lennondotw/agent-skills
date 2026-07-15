#!/usr/bin/env node

const defaults = {
  drift: 0.16,
  samples: 21,
  sectionHeight: 2880,
  stickyHeight: 1440,
  transitionLowRegionRatio: 0.68,
  transitionViewportRatio: 0.75,
  viewportHeight: 1440,
};

const optionMap = {
  "--drift": "drift",
  "--samples": "samples",
  "--section-height": "sectionHeight",
  "--sticky-height": "stickyHeight",
  "--transition-low-region-ratio": "transitionLowRegionRatio",
  "--transition-viewport-ratio": "transitionViewportRatio",
  "--viewport-height": "viewportHeight",
};

const parseOptions = (arguments_) => {
  const options = { ...defaults };

  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    const key = optionMap[flag];

    if (!key || value === undefined) {
      throw new Error(`Unknown or incomplete option: ${flag ?? "<missing>"}`);
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`${flag} must be a finite number`);

    options[key] = parsed;
  }

  if (options.samples < 3 || !Number.isInteger(options.samples)) {
    throw new Error("--samples must be an integer greater than or equal to 3");
  }

  for (const key of ["sectionHeight", "stickyHeight", "viewportHeight"]) {
    if (options[key] <= 0) throw new Error(`${key} must be greater than zero`);
  }

  if (options.drift < 0 || options.drift >= 1) {
    throw new Error("drift must be greater than or equal to zero and less than one");
  }

  for (const key of ["transitionLowRegionRatio", "transitionViewportRatio"]) {
    if (options[key] <= 0 || options[key] >= 1) {
      throw new Error(`${key} must be greater than zero and less than one`);
    }
  }

  return options;
};

const clampUnitInterval = (value) => Math.min(1, Math.max(0, value));

const integrateSmootherstep = (progress) => {
  const t = clampUnitInterval(progress);
  const t2 = t * t;
  const t4 = t2 * t2;

  return t * t * t4 - 3 * t * t4 + 2.5 * t4;
};

const getNativeDisplacement = ({ inputDistance, plateauDistance, viewportHeight }) => {
  if (inputDistance <= viewportHeight) return inputDistance;
  if (inputDistance <= viewportHeight + plateauDistance) return viewportHeight;

  return inputDistance - plateauDistance;
};

const getProfileParameters = (options) => {
  const plateauDistance = Math.max(0, options.sectionHeight - options.stickyHeight);
  const outerDistance = options.viewportHeight + options.stickyHeight;

  if (plateauDistance <= 0) {
    return {
      drift: 0,
      driftDistance: 0,
      leadingDistance: options.viewportHeight,
      trailingDistance: options.stickyHeight,
      transitionDistance: 0,
    };
  }

  const maximumFeasibleDrift = outerDistance / (plateauDistance + outerDistance);
  // Preserve five percent of the mathematical feasibility range for a visible
  // transition. An epsilon-only reserve can collapse easing into a sub-pixel interval.
  const drift = Math.min(options.drift, maximumFeasibleDrift * 0.95);
  const equivalentLowVelocityDistance = plateauDistance / (1 - drift);
  const driftRecoveryDistance = (plateauDistance * drift) / (1 - drift);
  const availableTransitionDistance = Math.max(0, outerDistance - driftRecoveryDistance);
  const transitionDistance = Math.min(
    options.viewportHeight * options.transitionViewportRatio,
    equivalentLowVelocityDistance * options.transitionLowRegionRatio,
    availableTransitionDistance,
  );
  const driftDistance = equivalentLowVelocityDistance - transitionDistance;
  const outerDistanceReduction = driftRecoveryDistance + transitionDistance;
  const outerDistanceScale = 1 - outerDistanceReduction / outerDistance;

  return {
    drift,
    driftDistance,
    leadingDistance: options.viewportHeight * outerDistanceScale,
    trailingDistance: options.stickyHeight * outerDistanceScale,
    transitionDistance,
  };
};

const getRemappedDisplacement = (progress, options) => {
  const {
    sectionHeight,
    stickyHeight,
    viewportHeight,
  } = options;
  const plateauDistance = sectionHeight - stickyHeight;
  const totalInputDistance = viewportHeight + sectionHeight;

  if (plateauDistance <= 0) {
    return getNativeDisplacement({
      inputDistance: clampUnitInterval(progress) * totalInputDistance,
      plateauDistance: Math.max(0, plateauDistance),
      viewportHeight,
    });
  }

  const {
    drift,
    driftDistance,
    leadingDistance,
    trailingDistance,
    transitionDistance,
  } = getProfileParameters(options);
  const inputDistance = clampUnitInterval(progress) * totalInputDistance;

  if (inputDistance <= leadingDistance) return inputDistance;

  let remainingDistance = inputDistance - leadingDistance;
  let displacement = leadingDistance;

  if (remainingDistance <= transitionDistance) {
    const t = remainingDistance / transitionDistance;

    return displacement + transitionDistance * (t + (drift - 1) * integrateSmootherstep(t));
  }

  displacement += transitionDistance * ((1 + drift) / 2);
  remainingDistance -= transitionDistance;

  if (remainingDistance <= driftDistance) {
    return displacement + remainingDistance * drift;
  }

  displacement += driftDistance * drift;
  remainingDistance -= driftDistance;

  if (remainingDistance <= transitionDistance) {
    const t = remainingDistance / transitionDistance;

    return displacement + transitionDistance * (drift * t + (1 - drift) * integrateSmootherstep(t));
  }

  displacement += transitionDistance * ((1 + drift) / 2);
  remainingDistance -= transitionDistance;

  return displacement + Math.min(remainingDistance, trailingDistance);
};

const getVelocity = (progress, options) => {
  const totalInputDistance = options.viewportHeight + options.sectionHeight;
  const epsilon = 0.000_001;
  const clampedProgress = clampUnitInterval(progress);

  if (clampedProgress === 0) {
    const start = getRemappedDisplacement(0, options);
    const after = getRemappedDisplacement(epsilon, options);

    return (after - start) / (epsilon * totalInputDistance);
  }

  if (clampedProgress === 1) {
    const before = getRemappedDisplacement(1 - epsilon, options);
    const end = getRemappedDisplacement(1, options);

    return (end - before) / (epsilon * totalInputDistance);
  }

  const before = getRemappedDisplacement(clampedProgress - epsilon, options);
  const after = getRemappedDisplacement(clampedProgress + epsilon, options);

  return (after - before) / (2 * epsilon * totalInputDistance);
};

const getSample = (progress, options) => {
  const totalInputDistance = options.viewportHeight + options.sectionHeight;
  const plateauDistance = Math.max(0, options.sectionHeight - options.stickyHeight);
  const inputDistance = clampUnitInterval(progress) * totalInputDistance;
  const native = getNativeDisplacement({
    inputDistance,
    plateauDistance,
    viewportHeight: options.viewportHeight,
  });
  const remapped = getRemappedDisplacement(progress, options);

  return {
    compensation: native - remapped,
    native,
    progress,
    remapped,
    velocity: getVelocity(progress, options),
  };
};

const options = parseOptions(process.argv.slice(2));
const rows = Array.from(
  { length: options.samples },
  (_, index) => getSample(index / (options.samples - 1), options),
);
const diagnosticSampleCount = 10_000;
const diagnosticDisplacements = Array.from(
  { length: diagnosticSampleCount + 1 },
  (_, index) => getRemappedDisplacement(index / diagnosticSampleCount, options),
);
const diagnosticVelocities = Array.from(
  { length: diagnosticSampleCount - 1 },
  (_, index) => getVelocity((index + 1) / diagnosticSampleCount, options),
);
const maximumInteriorVelocityJump = diagnosticVelocities
  .slice(1)
  .reduce((maximum, velocity, index) => {
    const previous = diagnosticVelocities[index];

    return Math.max(maximum, Math.abs(velocity - previous));
  }, 0);
const minimumDisplacementStep = diagnosticDisplacements
  .slice(1)
  .reduce(
    (minimum, displacement, index) =>
      Math.min(minimum, displacement - diagnosticDisplacements[index]),
    Number.POSITIVE_INFINITY,
  );
const profileParameters = getProfileParameters(options);

const round = (value) => Number(value.toFixed(6));

console.log(
  JSON.stringify(
    {
      invariants: {
        endCompensation: round(rows.at(-1).compensation),
        endDisplacementDelta: round(rows.at(-1).native - rows.at(-1).remapped),
        effectiveDriftVelocity: round(profileParameters.drift),
        maximumInteriorVelocityJump: round(maximumInteriorVelocityJump),
        midpointVelocity: round(getVelocity(0.5, options)),
        minimumDisplacementStep: round(minimumDisplacementStep),
        startCompensation: round(rows[0].compensation),
        transitionDistance: round(profileParameters.transitionDistance),
      },
      options,
      samples: rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key, round(value)]),
        )
      ),
    },
    null,
    2,
  ),
);
