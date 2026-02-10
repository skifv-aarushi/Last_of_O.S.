/**
 * PID Game Logic - Balanced PID Simulation
 * 
 * This module handles the simulation of a PID-controlled system where
 * all three parameters (P, I, D) are equally important and require
 * tuning across their full ranges for optimal performance.
 */

export interface Environment {
    gravity: number;
    wind: number;
    mass: number;
    airDensity: number;
    sensorNoise: number;
    turbulence: number;
    targetHeight: number;
    startHeight: number;
    // Optimal PID values for this environment (hidden from player)
    optimalKp: number;
    optimalKi: number;
    optimalKd: number;
}

export class PIDGame {
    private sessionDuration: number;
    private maxRounds: number;
    private startTime: number = 0;
    private isActive: boolean = false;
    private roundErrors: number[] = [];
    public currentEnv: Environment | null = null;

    constructor(duration: number = 60, maxRounds: number = 4) {
        this.sessionDuration = duration;
        this.maxRounds = maxRounds;
        this.resetSession();
    }

    resetSession(): void {
        this.startTime = 0;
        this.isActive = false;
        this.roundErrors = [];
        this.currentEnv = null;
    }

    startSession(): void {
        this.resetSession();
        this.isActive = true;
        this.startTime = Date.now();
        this.generateNextProblem();
    }

    generateNextProblem(): void {
        // Generate random optimal values that span the full range of sliders
        // This ensures players need to use the entire slider range
        const optimalKp = 5 + Math.random() * 40; // 5 to 45 (P slider: 0-50)
        const optimalKi = 2 + Math.random() * 16; // 2 to 18 (I slider: 0-20)
        const optimalKd = 5 + Math.random() * 40; // 5 to 45 (D slider: 0-50)

        this.currentEnv = {
            gravity: 8.0 + Math.random() * 10.0, // 8 to 18
            wind: -20.0 + Math.random() * 40.0, // -20 to 20
            mass: 3.0 + Math.random() * 8.0, // 3 to 11
            airDensity: 0.8 + Math.random() * 0.6, // 0.8 to 1.4
            sensorNoise: 1.0 + Math.random() * 2.0, // 1 to 3
            turbulence: 3.0 + Math.random() * 8.0, // 3 to 11
            targetHeight: 40 + Math.random() * 40, // 40 to 80
            startHeight: 0.0,
            optimalKp,
            optimalKi,
            optimalKd,
        };
    }

    /**
     * Balanced PID Simulation
     * 
     * The error is calculated based on how far each P, I, D value is from its optimal.
     * This ensures:
     * 1. All three sliders matter equally
     * 2. The full range of each slider is utilized
     * 3. There's no single "easy" solution - players must balance all three
     */
    runSimulation(kp: number, ki: number, kd: number): number {
        if (!this.currentEnv) return 50;

        const env = this.currentEnv;

        // Calculate how far each parameter is from optimal (normalized to 0-1)
        const pError = Math.abs(kp - env.optimalKp) / 50; // Max slider is 50
        const iError = Math.abs(ki - env.optimalKi) / 20; // Max slider is 20
        const dError = Math.abs(kd - env.optimalKd) / 50; // Max slider is 50

        // Weight each parameter equally
        // This makes P, I, D equally important
        const combinedError = (pError + iError + dError) / 3;

        // Add some environmental factors for variety
        const envFactor = 1 + (env.turbulence / 100) + (Math.abs(env.wind) / 200);

        // Add small random noise to prevent exact memorization
        const noise = (Math.random() - 0.5) * 0.05;

        // Scale to 0-100 range
        // Error of 0 = perfect tuning, Error of 100 = completely wrong
        const avgError = Math.max(0, Math.min(100, combinedError * 100 * envFactor + noise));

        return avgError;
    }

    submitRound(avgError: number): void {
        this.roundErrors.push(avgError);
        // Continue to next round if not at max
        if (this.roundErrors.length < this.maxRounds) {
            this.generateNextProblem();
        }
    }

    getRoundsCompleted(): number {
        return this.roundErrors.length;
    }

    isGameOver(): boolean {
        return this.roundErrors.length >= this.maxRounds || this.getTimeRemaining() <= 0;
    }

    getFinalScore(): number {
        /**
         * Scoring based on maxRounds:
         * - Base: 60
         * - Bonus Pool: 40 points
         * - Lower error = higher bonus
         */
        const roundsCompleted = this.roundErrors.length;
        if (roundsCompleted === 0) return 0;

        let totalRoundPoints = 0;
        const pointsPerRound = 40.0 / this.maxRounds;

        for (const err of this.roundErrors) {
            // Error 0-100 maps to score 1.0-0.0
            const score = Math.max(0, 1.0 - (err / 100));
            totalRoundPoints += pointsPerRound * score;
        }

        const finalScore = 60 + totalRoundPoints;
        return Math.min(100, Math.floor(finalScore));
    }

    getTimeRemaining(): number {
        if (!this.isActive) return 0;
        const elapsed = (Date.now() - this.startTime) / 1000;
        return Math.max(0, this.sessionDuration - elapsed);
    }

    getIsActive(): boolean {
        return this.isActive;
    }

    setIsActive(active: boolean): void {
        this.isActive = active;
    }

    getRoundErrors(): number[] {
        return [...this.roundErrors];
    }
}

// Helper to convert error to tilt angle for robot visualization
export function errorToTiltAngle(avgError: number): number {
    // Visual sensitivity: error 0-100 maps to tilt 0-90 degrees
    const clampedError = Math.min(avgError, 100);
    return (clampedError / 100) * 90;
}
