declare module "gradient-string" {
  const gradient: {
    (text: string): string;
    pastel: (text: string) => string;
  };
  export default gradient;
}

declare module "figlet" {
  namespace figlet {
    function textSync(text: string, options?: Record<string, unknown>): string;
  }
  export = figlet;
}

declare module "boxen" {
  function boxen(text: string, options?: Record<string, unknown>): string;
  export default boxen;
}
