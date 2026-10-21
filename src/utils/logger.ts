export interface Logger {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  log(message: string): void;
}

export const logger: Logger = {
  info(message: string): void {
    console.log(`ℹ ${message}`);
  },
  success(message: string): void {
    console.log(`✔ ${message}`);
  },
  warn(message: string): void {
    console.warn(`⚠ ${message}`);
  },
  error(message: string): void {
    console.error(`✖ ${message}`);
  },
  log(message: string): void {
    console.log(message);
  },
};
