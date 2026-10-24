
export const isDebugBuild = process.env.GOOSE_DEBUG === "1";

export const debugSourcemap: boolean = isDebugBuild;

export const debugMinify: boolean = !isDebugBuild;
