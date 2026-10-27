/**
 * Visualizer - Swiss Precision Oscilloscope & Spectral Analyzer
 * Strict duo-tone technical rendering using HTML5 Canvas
 */
export class Visualizer {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
  }

  /**
   * Helper to retrieve current CSS theme variable colors dynamically
   */
  getThemeColors() {
    const style = getComputedStyle(document.body);
    const ink = style.getPropertyValue('--ink').trim() || '#0D0D0D';
    const bg = style.getPropertyValue('--bg').trim() || '#F4F4F0';
    return { ink, bg };
  }

  /**
   * Draw the audio visualizer frame
   */
  drawAudioFrame({ freqData, timeData, level, triggerThreshold }) {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;
    const { ink, bg } = this.getThemeColors();

    // Clear background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Swiss Precision 1px Grid
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 1;

    // Horizontal grid rules
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }

    // Vertical grid rules
    for (let x = 0; x <= width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    if (!freqData || freqData.length === 0) {
      // Idle horizontal baseline
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // 2. Draw Discrete Spectral Bars (Geometric Precision)
    const barCount = 32;
    const barWidth = Math.floor((width / barCount) * 0.6);
    const gap = Math.floor((width / barCount) * 0.4);
    const step = Math.floor(freqData.length / barCount / 2);

    ctx.fillStyle = ink;
    for (let i = 0; i < barCount; i++) {
      const val = freqData[i * step] / 255;
      const barHeight = Math.max(2, Math.floor(val * (height * 0.85)));
      const x = i * (barWidth + gap) + gap / 2;
      const y = height - barHeight;

      ctx.fillRect(x, y, barWidth, barHeight);
    }

    // 3. Draw High-Precision Oscilloscope Waveform Line
    if (timeData) {
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = ink;
      ctx.beginPath();

      const sliceWidth = width / timeData.length;
      let x = 0;

      for (let i = 0; i < timeData.length; i++) {
        const v = timeData[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }
  }
}
