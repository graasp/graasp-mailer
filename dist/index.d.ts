/// <reference types="node" />
import { FastifyPluginAsync } from 'fastify';
import { Member } from 'graasp';
declare module 'fastify' {
    interface FastifyInstance {
        nodemailer: any;
        view: any;
        mailer: {
            sendRegisterEmail: (member: Member, link: string) => Promise<void>;
            sendLoginEmail: (member: Member, link: string) => Promise<void>;
        };
    }
}
interface MailerOptions {
    host: string;
    username: string;
    password: string;
    fromEmail: string;
}
declare const _default: FastifyPluginAsync<MailerOptions, import("http").Server>;
export default _default;
