class PerformanceTimer {
  private startTime: number = 0;
  private marks: { [key: string]: number } = {};

  start(label?: string) {
    this.startTime = performance.now();
    if (label) console.log(`[TIMER] ${label} - Iniciado`);
  }

  mark(label: string) {
    const now = performance.now();
    const elapsed = now - this.startTime;
    this.marks[label] = elapsed;
    console.log(`[TIMER] ${label}: ${elapsed.toFixed(2)}ms`);
    return elapsed;
  }

  lap(label: string) {
    const now = performance.now();
    const lastMark = Math.max(...Object.values(this.marks), this.startTime);
    const lapTime = now - lastMark;
    this.marks[label] = now - this.startTime;
    console.log(
      `[TIMER] ${label}: ${lapTime.toFixed(2)}ms (lap) | Total: ${(now - this.startTime).toFixed(2)}ms`
    );
    return lapTime;
  }

  end(label?: string) {
    const total = performance.now() - this.startTime;
    console.log(`[TIMER] ${label || 'Total'}: ${total.toFixed(2)}ms`);
    return total;
  }
}

export { PerformanceTimer };
