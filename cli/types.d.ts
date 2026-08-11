declare module "gradient-string" {
  interface Gradient {
    (text: string): string;
    pastel: Gradient;
    teen: Gradient;
    summer: Gradient;
  }
  const gradient: Gradient;
  export default gradient;
}

declare module "figlet" {
  function figlet(text: string, options?: Record<string, unknown>, callback?: (err: Error | null, result: string) => void): void;
  function textSync(text: string, options?: Record<string, unknown>): string;
  export default figlet;
  export { textSync };
}

declare module "boxen" {
  function boxen(text: string, options?: Record<string, unknown>): string;
  export default boxen;
}
