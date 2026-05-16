export interface AuthConfig {
    email: string;
    name: string;
    rollNo: string;
    accessCode: string;
    clientID: string;
    clientSecret: string;
}
export declare function configureLogger(config: AuthConfig): void;
export declare function Log(stack: string, level: string, pkg: string, message: string): Promise<any>;
//# sourceMappingURL=index.d.ts.map