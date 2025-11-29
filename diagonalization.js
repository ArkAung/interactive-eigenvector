class DiagonalizationApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Set canvas to window size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.scale = 80;
        this.origin = { x: this.width / 2, y: this.height / 2 };

        // Animation state (0 to 1, maps to I → P⁻¹ → P⁻¹D → P⁻¹DP)
        this.progress = 0;
        this.isAnimating = false;
        this.animationSpeed = 1; // Speed multiplier

        // Initialize matrices
        this.P = Matrix2D.identity();
        this.D = Matrix2D.identity();
        this.Pinv = Matrix2D.identity();
        this.isDiagonalizable = false;

        // Parse matrix from URL or use default
        this.targetMatrix = this.parseMatrixFromURL() || new Matrix2D(2, 1, 1, 2);

        // Decompose
        this.decompose();

        // Setup UI
        this.setupProgress();
        this.setupButtons();
        this.updateUI();
        this.draw();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.origin = { x: this.width / 2, y: this.height / 2 };
    }

    parseMatrixFromURL() {
        const params = new URLSearchParams(window.location.search);
        const matrixStr = params.get('matrix');
        if (matrixStr) {
            const values = matrixStr.split(',').map(Number);
            if (values.length === 4 && values.every(v => !isNaN(v))) {
                return new Matrix2D(values[0], values[1], values[2], values[3]);
            }
        }
        return null;
    }

    decompose() {
        const eigenvalues = this.targetMatrix.eigenvalues();
        const eigenvectors = this.targetMatrix.getEigenvectors();

        if (!eigenvectors || eigenvalues.isComplex) {
            console.warn('Matrix is not diagonalizable');
            return;
        }

        this.isDiagonalizable = true;

        const v1 = eigenvectors.v1;
        const v2 = eigenvectors.v2;
        this.P = new Matrix2D(v1.x, v2.x, v1.y, v2.y);
        this.D = new Matrix2D(eigenvalues.lambda1.real, 0, 0, eigenvalues.lambda2.real);
        this.Pinv = this.P.inverse();

        if (!this.Pinv) {
            console.warn('Failed to compute inverse');
            this.isDiagonalizable = false;
            return;
        }

        this.eigenvectors = eigenvectors;
        this.eigenvalues = eigenvalues;
    }

    getCurrentMatrix() {
        if (!this.isDiagonalizable) {
            return Matrix2D.identity();
        }

        // Map progress 0→1 to stages: I → P⁻¹ → P⁻¹D → P⁻¹DP
        if (this.progress < 0.33) {
            // Stage 1: I → P⁻¹
            const t = this.progress / 0.33;
            return Matrix2D.lerp(Matrix2D.identity(), this.Pinv, t);
        } else if (this.progress < 0.67) {
            // Stage 2: P⁻¹ → P⁻¹D
            const t = (this.progress - 0.33) / 0.34;
            const PinvD = this.Pinv.multiply(this.D);
            return Matrix2D.lerp(this.Pinv, PinvD, t);
        } else {
            // Stage 3: P⁻¹D → P⁻¹DP = A
            const t = (this.progress - 0.67) / 0.33;
            const PinvD = this.Pinv.multiply(this.D);
            const A = PinvD.multiply(this.P);
            return Matrix2D.lerp(PinvD, A, t);
        }
    }

    setupProgress() {
        const track = document.getElementById('scrubberTrack');
        const handle = document.getElementById('scrubberHandle');
        let isDragging = false;

        const updateProgress = (clientX) => {
            const rect = track.getBoundingClientRect();
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            this.progress = x / rect.width;
            this.updateUI();
            this.draw();
        };

        handle.addEventListener('mousedown', () => {
            isDragging = true;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                updateProgress(e.clientX);
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        track.addEventListener('click', (e) => {
            updateProgress(e.clientX);
        });
    }

    setupButtons() {
        document.getElementById('stepBtn').addEventListener('click', () => this.stepToNextPhase());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());

        // Speed control buttons
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.setSpeed(speed);
            });
        });

        // Space bar to step
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.stepToNextPhase();
            }
        });
    }

    setSpeed(speed) {
        this.animationSpeed = speed;

        // Update active state on speed buttons
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseFloat(btn.dataset.speed) === speed) {
                btn.classList.add('active');
            }
        });
    }

    stepToNextPhase() {
        // Discrete phases: 0, 0.33, 0.67, 1.0
        const phases = [0, 0.33, 0.67, 1.0];

        // Find next phase
        let nextPhaseIndex = phases.findIndex(p => p > this.progress + 0.01);
        if (nextPhaseIndex === -1) {
            // We're at the end, reset to start
            this.animateToProgress(0);
        } else {
            this.animateToProgress(phases[nextPhaseIndex]);
        }
    }

    animateToProgress(targetProgress) {
        if (this.isAnimating) return; // Prevent overlapping animations

        this.isAnimating = true;
        const startProgress = this.progress;
        const baseDuration = 800; // ms
        const duration = baseDuration / this.animationSpeed; // Adjust by speed
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Ease in-out
            const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

            this.progress = startProgress + (targetProgress - startProgress) * eased;
            this.updateUI();
            this.draw();

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.progress = targetProgress;
                this.isAnimating = false;
                this.updateUI();
                this.draw();
            }
        };

        requestAnimationFrame(animate);
    }

    reset() {
        this.progress = 0;
        this.isAnimating = false;
        this.updateUI();
        this.draw();
    }

    updateUI() {
        // Update progress bar
        const percent = this.progress * 100;
        document.getElementById('scrubberProgress').style.width = `${percent}%`;
        document.getElementById('scrubberHandle').style.left = `${percent}%`;

        // Update matrices
        this.updateMatrixDisplay('matrixA', this.targetMatrix);
        this.updateMatrixDisplay('matrixP', this.P);
        this.updateMatrixDisplay('matrixD', this.D, true); // Highlight diagonal
        this.updateMatrixDisplay('matrixPinv', this.Pinv);

        // Update stage description
        this.updateStageDescription();
    }

    updateMatrixDisplay(id, matrix, highlightDiagonal = false) {
        const container = document.getElementById(id);
        if (!container || !matrix) return;

        const cells = [
            { value: matrix.a, diagonal: true },
            { value: matrix.b, diagonal: false },
            { value: matrix.c, diagonal: false },
            { value: matrix.d, diagonal: true }
        ];

        container.innerHTML = cells.map((cell, i) => {
            const highlight = highlightDiagonal && cell.diagonal ? 'highlight' : '';
            return `<div class="matrix-cell ${highlight}">${cell.value.toFixed(2)}</div>`;
        }).join('');
    }

    updateStageDescription() {
        const desc = document.getElementById('stageDescription');
        const descriptions = [
            'Stage 0: Starting with identity I. The unit square is in standard position.',
            'Stage 1: Applying P⁻¹ rotates to eigenvector basis. Watch the grid align with eigenvector directions (cyan & magenta dashed lines).',
            'Stage 2: Applying D scales along eigenvectors. In this basis, transformation is just diagonal scaling - no rotation!',
            'Stage 3: Applying P rotates back to standard basis. Final result: A = PDP⁻¹ ✓'
        ];

        // Match discrete phase points exactly: 0, 0.33, 0.67, 1.0
        // Use a small tolerance to snap to the nearest phase
        const phases = [0, 0.33, 0.67, 1.0];
        let stage = 0;

        // Find the closest phase we've reached or passed
        for (let i = phases.length - 1; i >= 0; i--) {
            if (this.progress >= phases[i] - 0.01) {
                stage = i;
                break;
            }
        }

        desc.innerHTML = `<p>${descriptions[stage]}</p>`;
    }

    draw() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.restore();

        this.ctx.save();
        this.ctx.translate(this.origin.x, this.origin.y);
        this.ctx.scale(1, -1);

        const currentMatrix = this.getCurrentMatrix();

        // Draw grid
        this.drawGrid();

        // Draw eigenvector lines (always show them)
        if (this.isDiagonalizable) {
            this.drawEigenvectorLines();
        }

        // Draw unit square
        this.drawUnitSquare(currentMatrix);

        // Draw basis vectors
        this.drawBasisVectors(currentMatrix);

        // Draw origin
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawGrid() {
        const gridSize = 10;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        this.ctx.lineWidth = 1;

        for (let i = -gridSize; i <= gridSize; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.scale, -gridSize * this.scale);
            this.ctx.lineTo(i * this.scale, gridSize * this.scale);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(-gridSize * this.scale, i * this.scale);
            this.ctx.lineTo(gridSize * this.scale, i * this.scale);
            this.ctx.stroke();
        }

        // Axes
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(-gridSize * this.scale, 0);
        this.ctx.lineTo(gridSize * this.scale, 0);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(0, -gridSize * this.scale);
        this.ctx.lineTo(0, gridSize * this.scale);
        this.ctx.stroke();
    }

    drawEigenvectorLines() {
        const v1 = this.eigenvectors.v1;
        const v2 = this.eigenvectors.v2;
        const length = 12;

        this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 6]);
        this.ctx.beginPath();
        this.ctx.moveTo(-v1.x * length * this.scale, -v1.y * length * this.scale);
        this.ctx.lineTo(v1.x * length * this.scale, v1.y * length * this.scale);
        this.ctx.stroke();

        this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
        this.ctx.beginPath();
        this.ctx.moveTo(-v2.x * length * this.scale, -v2.y * length * this.scale);
        this.ctx.lineTo(v2.x * length * this.scale, v2.y * length * this.scale);
        this.ctx.stroke();

        this.ctx.setLineDash([]);
    }

    drawUnitSquare(matrix) {
        const p1 = { x: 0, y: 0 };
        const p2 = this.transform(1, 0, matrix);
        const p3 = this.transform(1, 1, matrix);
        const p4 = this.transform(0, 1, matrix);

        this.ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
        this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
        this.ctx.lineWidth = 3;

        this.ctx.beginPath();
        this.ctx.moveTo(p1.x * this.scale, p1.y * this.scale);
        this.ctx.lineTo(p2.x * this.scale, p2.y * this.scale);
        this.ctx.lineTo(p3.x * this.scale, p3.y * this.scale);
        this.ctx.lineTo(p4.x * this.scale, p4.y * this.scale);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawBasisVectors(matrix) {
        // Use different colors for basis vectors (not cyan/magenta which are reserved for eigenvectors)
        // i-hat - yellow/gold
        const iHat = this.transform(1, 0, matrix);
        this.drawVector(0, 0, iHat.x, iHat.y, '#F59E0B', 'î');

        // j-hat - white
        const jHat = this.transform(0, 1, matrix);
        this.drawVector(0, 0, jHat.x, jHat.y, '#FFFFFF', 'ĵ');
    }

    drawVector(x1, y1, x2, y2, color, label) {
        const sx1 = x1 * this.scale;
        const sy1 = y1 * this.scale;
        const sx2 = x2 * this.scale;
        const sy2 = y2 * this.scale;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(sx1, sy1);
        this.ctx.lineTo(sx2, sy2);
        this.ctx.stroke();

        const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
        const headLength = 15;

        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(sx2, sy2);
        this.ctx.lineTo(
            sx2 - headLength * Math.cos(angle - Math.PI / 6),
            sy2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            sx2 - headLength * Math.cos(angle + Math.PI / 6),
            sy2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.save();
        this.ctx.scale(1, -1);
        this.ctx.font = 'bold 18px JetBrains Mono';
        this.ctx.fillStyle = color;
        this.ctx.fillText(label, sx2 + 15, -sy2 + 6);
        this.ctx.restore();
    }

    transform(x, y, matrix) {
        return {
            x: matrix.a * x + matrix.b * y,
            y: matrix.c * x + matrix.d * y
        };
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new DiagonalizationApp();
});
